import { get as getStoreValue, writable, type Subscriber } from 'svelte/store'
import type { ModelId, ModelParameterValues } from '../../../cad-contract/units'
import { getModelDefinition, modelDefinitions } from '../model-catalog'

export const COMPONENT_PARAMETER_STORAGE_KEY =
  'replicad-web-cad.component-parameters'
export const COMPONENT_PARAMETER_STORAGE_VERSION = 1 as const

export type ComponentParameterStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

type ComponentParameterEntries = Partial<Record<ModelId, ModelParameterValues>>

type PersistedParameterPayload = {
  version: typeof COMPONENT_PARAMETER_STORAGE_VERSION
  values: Record<string, unknown>
}

export type ComponentParameterStore = {
  subscribe: (subscriber: Subscriber<ComponentParameterEntries>) => () => void
  get: (modelId: ModelId) => ModelParameterValues
  set: (modelId: ModelId, parameters: ModelParameterValues) => boolean
  dispose: () => void
}

export type CreateComponentParameterStoreOptions = {
  storage?: ComponentParameterStorage | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneParameters(
  parameters: ModelParameterValues,
): ModelParameterValues {
  if ('customScrewPositions' in parameters && 'chamferCorners' in parameters) {
    return {
      ...parameters,
      chamferCorners: { ...parameters.chamferCorners },
      connectorSides: { ...parameters.connectorSides },
      customScrewPositions: parameters.customScrewPositions.map((position) => ({
        ...position,
      })),
    }
  }
  return { ...parameters }
}

function getDefinition(modelId: ModelId) {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
  return definition
}

function getBrowserStorage(): ComponentParameterStorage | null {
  try {
    if (typeof globalThis === 'undefined' || !globalThis.localStorage) {
      return null
    }
    return globalThis.localStorage
  } catch {
    return null
  }
}

function readPayload(storage: ComponentParameterStorage | null): unknown {
  if (!storage) return null

  try {
    const raw = storage.getItem(COMPONENT_PARAMETER_STORAGE_KEY)
    if (raw === null) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function hydrateEntries(
  storage: ComponentParameterStorage | null,
): ComponentParameterEntries {
  const payload = readPayload(storage)
  if (!isRecord(payload)) return {}
  if (payload.version !== COMPONENT_PARAMETER_STORAGE_VERSION) return {}
  if (!isRecord(payload.values)) return {}

  const entries: ComponentParameterEntries = {}
  for (const definition of modelDefinitions) {
    const candidate = payload.values[definition.id]
    if (candidate === undefined) continue

    try {
      const validation = definition.validateParameters(candidate)
      if (!validation.valid) continue
      entries[definition.id] = cloneParameters(validation.value.parameters)
    } catch {
      continue
    }
  }
  return entries
}

function serializeEntries(entries: ComponentParameterEntries): string {
  const values: Record<string, ModelParameterValues> = {}

  for (const definition of modelDefinitions) {
    const parameters = entries[definition.id]
    if (!parameters) continue

    try {
      const validation = definition.validateParameters(parameters)
      if (!validation.valid) continue
      values[definition.id] = cloneParameters(validation.value.parameters)
    } catch {
      continue
    }
  }

  const payload: PersistedParameterPayload = {
    version: COMPONENT_PARAMETER_STORAGE_VERSION,
    values,
  }
  return JSON.stringify(payload)
}

function persistEntries(
  storage: ComponentParameterStorage | null,
  entries: ComponentParameterEntries,
): void {
  if (!storage) return

  try {
    storage.setItem(COMPONENT_PARAMETER_STORAGE_KEY, serializeEntries(entries))
  } catch {
    // Browser storage is optional; the in-memory store remains authoritative.
  }
}

export function createComponentParameterStore(
  options: CreateComponentParameterStoreOptions = {},
): ComponentParameterStore {
  const storage =
    options.storage === undefined ? getBrowserStorage() : options.storage
  const state = writable<ComponentParameterEntries>(hydrateEntries(storage))
  let skipInitialPersistence = true
  let disposed = false

  const unsubscribe = state.subscribe((entries) => {
    if (skipInitialPersistence) {
      skipInitialPersistence = false
      return
    }
    persistEntries(storage, entries)
  })

  const get = (modelId: ModelId): ModelParameterValues => {
    const definition = getDefinition(modelId)
    const parameters = getStoreValue(state)[modelId]
    return cloneParameters(parameters ?? definition.defaultParameters)
  }

  const set = (modelId: ModelId, parameters: ModelParameterValues): boolean => {
    const definition = getDefinition(modelId)
    const validation = definition.validateParameters(parameters)
    if (!validation.valid) return false

    state.update((entries) => ({
      ...entries,
      [modelId]: cloneParameters(validation.value.parameters),
    }))
    return true
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    unsubscribe()
  }

  return {
    subscribe: state.subscribe,
    get,
    set,
    dispose,
  }
}

import type { CadError } from '../../../cad-contract/errors'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import {
  BOX_NORMAL_CONFIGURATION,
  HEXAGONAL_COLUMN_CONFIGURATION,
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_SNAP_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
  type BoxParameters,
  type ModelId,
  type ModelParameterValues,
} from '../../../cad-contract/units'

export type CadStatus =
  | 'booting'
  | 'loading-engine'
  | 'generating'
  | 'ready'
  | 'invalid-input'
  | 'recoverable-error'
  | 'fatal-worker-error'

export type ExportStatus = 'disabled' | 'idle' | 'exporting'

export type CommittedModel = {
  revision: string
  workerEpoch: string
  generation: number
  modelId: ModelId
  parameters: ModelParameterValues
  mesh: MeshSnapshot
}

export type CadState = {
  status: CadStatus
  exportStatus: ExportStatus
  generation: number
  modelId: ModelId
  input: ModelParameterValues
  workerEpoch: string | null
  committed: CommittedModel | null
  stale: boolean
  error: CadError | null
}

export const INITIAL_PARAMETERS: BoxParameters = {
  ...PROTOTYPE_CONFIGURATION.defaultDimensions,
}

function defaultParametersForModel(modelId: ModelId): ModelParameterValues {
  if (modelId === 'box') return { ...INITIAL_PARAMETERS }
  if (modelId === 'box-normal') {
    return {
      x: BOX_NORMAL_CONFIGURATION.defaultX,
      y: BOX_NORMAL_CONFIGURATION.defaultY,
      height: BOX_NORMAL_CONFIGURATION.defaultHeight,
      cornerPosts: true,
    }
  }
  if (modelId === 'modular-grid-base') return { rows: 1, columns: 1 }
  if (modelId === 'hsw-cell') return { rows: 1, columns: 1 }
  if (modelId === 'hexagonal-column') {
    return {
      height: HEXAGONAL_COLUMN_CONFIGURATION.defaultHeight,
      count: HEXAGONAL_COLUMN_CONFIGURATION.defaultCount,
      gap: HEXAGONAL_COLUMN_CONFIGURATION.defaultGap,
      orientation: HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation,
    }
  }
  if (modelId === 'opengrid') {
    return {
      ...OPENGRID_CONFIGURATION.defaultParameters,
      customScrewPositions: [],
    }
  }
  if (modelId === 'opengrid-stackable-box') {
    return {
      x: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultX,
      y: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultY,
      height: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHeight,
      fullBottomHoleGrid:
        OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultFullBottomHoleGrid,
    }
  }
  if (modelId === 'opengrid-snap') {
    return { ...OPENGRID_SNAP_CONFIGURATION.defaultParameters }
  }
  throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
}

export function initialCadState(
  modelId: ModelId = 'box',
  initialInput?: ModelParameterValues,
): CadState {
  const input = initialInput
    ? { ...initialInput }
    : defaultParametersForModel(modelId)

  return {
    status: 'booting',
    exportStatus: 'disabled',
    generation: 0,
    modelId,
    input,
    workerEpoch: null,
    committed: null,
    stale: false,
    error: null,
  }
}

export type CadAction =
  | { type: 'engine-start' }
  | { type: 'engine-ready'; workerEpoch: string }
  | {
      type: 'input-valid'
      modelId: ModelId
      input: ModelParameterValues
      generation: number
    }
  | {
      type: 'input-invalid'
      modelId: ModelId
      input: ModelParameterValues
      generation: number
      error: CadError
    }
  | { type: 'generation-start'; generation: number }
  | { type: 'model-ready'; model: CommittedModel }
  | { type: 'export-start' }
  | { type: 'export-end' }
  | { type: 'worker-restarted' }
  | { type: 'recoverable-error'; error: CadError }
  | { type: 'fatal-worker-error'; error: CadError }
  | { type: 'reset' }

export function cadReducer(state: CadState, action: CadAction): CadState {
  switch (action.type) {
    case 'engine-start':
      return { ...state, status: 'loading-engine', error: null }
    case 'engine-ready':
      return {
        ...state,
        status: 'generating',
        workerEpoch: action.workerEpoch,
        error: null,
      }
    case 'input-valid':
      return {
        ...state,
        modelId: action.modelId,
        input: action.input,
        generation: action.generation,
        status: 'generating',
        exportStatus: 'disabled',
        stale: Boolean(state.committed),
        error: null,
      }
    case 'input-invalid':
      return {
        ...state,
        modelId: action.modelId,
        input: action.input,
        generation: action.generation,
        status: 'invalid-input',
        exportStatus: 'disabled',
        stale: Boolean(state.committed),
        error: action.error,
      }
    case 'generation-start':
      return {
        ...state,
        generation: action.generation,
        status: 'generating',
        exportStatus: 'disabled',
        stale: Boolean(state.committed),
      }
    case 'model-ready':
      return {
        ...state,
        status: 'ready',
        exportStatus: 'idle',
        generation: action.model.generation,
        workerEpoch: action.model.workerEpoch,
        committed: action.model,
        stale: false,
        error: null,
      }
    case 'export-start':
      return { ...state, exportStatus: 'exporting' }
    case 'export-end':
      return { ...state, exportStatus: 'idle' }
    case 'worker-restarted':
      return {
        ...initialCadState(state.modelId, state.input),
        status: 'loading-engine',
      }
    case 'recoverable-error':
      return {
        ...state,
        status: 'recoverable-error',
        exportStatus: 'disabled',
        stale: Boolean(state.committed),
        error: action.error,
      }
    case 'fatal-worker-error':
      return {
        ...state,
        status: 'fatal-worker-error',
        exportStatus: 'disabled',
        stale: Boolean(state.committed),
        error: action.error,
      }
    case 'reset':
      return initialCadState()
  }
}

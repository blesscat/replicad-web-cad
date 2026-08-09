import { normalizeError, type CadError } from '../../../cad-contract/errors'
import type { WorkerClientError } from '../../../features/cad/worker-client'
import {
  HEXAGONAL_COLUMN_CONFIGURATION,
  parseOpenGridSnapDecimalInput,
  parseDimensionInput,
  validateModelParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridSnapParameters,
  type ScalarModelParameterKey,
} from '../../../cad-contract/units'
import type { RawParameters } from './types'

export const DIMENSION_KEYS: ScalarModelParameterKey[] = [
  'width',
  'depth',
  'height',
]
export const GRID_PARAMETER_KEYS: ScalarModelParameterKey[] = [
  'rows',
  'columns',
]
export const BOX_NORMAL_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'cornerPosts',
]
export const OPENGRID_STACKABLE_BOX_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'fullBottomHoleGrid',
]
export const HEXAGONAL_COLUMN_PARAMETER_KEYS: ScalarModelParameterKey[] = [
  'height',
  'count',
  'gap',
  'orientation',
]

function parameterKeysForModel(modelId: ModelId): readonly ModelParameterKey[] {
  if (modelId === 'box') return DIMENSION_KEYS
  if (modelId === 'box-normal') return BOX_NORMAL_PARAMETER_KEYS
  if (modelId === 'modular-grid-base') return GRID_PARAMETER_KEYS
  if (modelId === 'hsw-cell') return GRID_PARAMETER_KEYS
  if (modelId === 'hexagonal-column') return HEXAGONAL_COLUMN_PARAMETER_KEYS
  if (modelId === 'opengrid-stackable-box') {
    return OPENGRID_STACKABLE_BOX_PARAMETER_KEYS
  }
  if (modelId === 'opengrid-snap') return ['variant', 'offset']
  throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
}

export function rawFromParameters(
  parameters: ModelParameterValues,
): RawParameters {
  if ('width' in parameters) {
    return {
      width: String(parameters.width),
      depth: String(parameters.depth),
      height: String(parameters.height),
    }
  }

  if ('cornerPosts' in parameters) {
    return {
      x: String(parameters.x),
      y: String(parameters.y),
      height: String(parameters.height),
      cornerPosts: String(parameters.cornerPosts),
    }
  }

  if (
    'x' in parameters &&
    'y' in parameters &&
    'height' in parameters &&
    'fullBottomHoleGrid' in parameters
  ) {
    const stackableParameters = parameters as {
      x: number
      y: number
      height: number
      fullBottomHoleGrid: boolean
    }
    return {
      x: String(stackableParameters.x),
      y: String(stackableParameters.y),
      height: String(stackableParameters.height),
      fullBottomHoleGrid: String(stackableParameters.fullBottomHoleGrid),
    }
  }

  if ('x' in parameters && 'y' in parameters && 'height' in parameters) {
    return {
      x: String(parameters.x),
      y: String(parameters.y),
      height: String(parameters.height),
    }
  }

  if ('orientation' in parameters) {
    return {
      height: String(parameters.height),
      count: String(parameters.count),
      gap: String(parameters.gap),
      orientation: parameters.orientation,
    }
  }

  if ('offset' in parameters) {
    return {
      variant: parameters.variant,
      offset: String(parameters.offset),
    }
  }

  return {
    rows: String(parameters.rows),
    columns: String(parameters.columns),
  }
}

export function parseRawParameters(
  raw: RawParameters,
  modelId: ModelId = 'box',
):
  | { valid: true; value: ModelParameterValues }
  | { valid: false; message: string; field?: ModelParameterKey } {
  const keys = parameterKeysForModel(modelId)
  const unexpectedKey = Object.keys(raw).find(
    (key) => !keys.includes(key as ModelParameterKey),
  )
  if (unexpectedKey) {
    return { valid: false, message: '包含不支援的參數欄位。' }
  }

  if (modelId === 'opengrid-snap') {
    const variant = raw.variant
    if (variant !== 'Full' && variant !== 'Lite') {
      return {
        valid: false,
        message: '型號必須是 Full 或 Lite。',
        field: 'variant',
      }
    }

    const offset = parseOpenGridSnapDecimalInput(raw.offset ?? '')
    if (offset === null) {
      return {
        valid: false,
        message: '外框總增量必須是有限的小數。',
        field: 'offset',
      }
    }

    const validation = validateModelParameters(modelId, {
      variant,
      offset,
    } satisfies OpenGridSnapParameters)
    if (!validation.valid) {
      const issue = validation.issues[0]
      const field = issue?.field
      return {
        valid: false,
        message: issue?.message ?? 'OpenGrid Snap 輸入無效。',
        field: field === 'parameters' ? undefined : field,
      }
    }
    return { valid: true, value: validation.value.parameters }
  }

  const parsed: Partial<
    Record<ModelParameterKey, number | string | boolean | null>
  > = {}
  for (const key of keys) {
    if (key === 'cornerPosts' || key === 'fullBottomHoleGrid') {
      const rawValue = raw[key]
      if (rawValue !== 'true' && rawValue !== 'false') {
        return {
          valid: false,
          message: '必須是 true 或 false。',
          field: key,
        }
      }
      parsed[key] = rawValue === 'true'
      continue
    }
    if (key === 'orientation') {
      parsed[key] =
        raw[key] ?? HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation
      continue
    }
    const rawValue = raw[key] ?? ''
    if (
      modelId === 'opengrid-stackable-box' &&
      (key === 'x' || key === 'y')
    ) {
      parsed[key] = parseHalfStepInput(rawValue)
      continue
    }
    parsed[key] = parseDimensionInput(rawValue)
  }

  const validation = validateModelParameters(modelId, parsed)
  if (!validation.valid) {
    const issue = validation.issues[0]
    const field = issue?.field
    return {
      valid: false,
      message: issue?.message ?? '尺寸輸入無效。',
      field: field === 'parameters' ? undefined : field,
    }
  }
  return { valid: true, value: validation.value.parameters }
}

function parseHalfStepInput(raw: string): number | null {
  const value = raw.trim()
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) return null

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || !Number.isSafeInteger(parsed * 2)) {
    return null
  }
  return parsed
}

export function supportsCadBrowser():
  { supported: true } | { supported: false; message: string } {
  if (typeof window === 'undefined') {
    return { supported: false, message: '需要瀏覽器環境。' }
  }
  if (typeof WebAssembly === 'undefined') {
    return { supported: false, message: '此瀏覽器不支援 WebAssembly。' }
  }
  if (typeof Worker === 'undefined') {
    return { supported: false, message: '此瀏覽器不支援 Web Worker。' }
  }
  const canvas = document.createElement('canvas')
  const webgl =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  if (!webgl) {
    return { supported: false, message: '此瀏覽器不支援 WebGL。' }
  }
  return { supported: true }
}

export function errorForInput(message: string): CadError {
  return normalizeError(new Error(message), {
    stage: 'validation',
    code: 'INVALID_INPUT',
    userMessage: message,
    recoverable: true,
  })
}

export function errorForCapability(message: string): CadError {
  return normalizeError(new Error(message), {
    stage: 'worker',
    code: 'BROWSER_UNSUPPORTED',
    userMessage: message,
    recoverable: false,
  })
}

export function errorForWorker(error: WorkerClientError): CadError {
  return normalizeError(error.error, {
    stage: error.kind === 'protocol-error' ? 'protocol' : 'worker',
    code:
      error.kind === 'protocol-error'
        ? 'PROTOCOL_INVALID'
        : 'WORKER_TERMINATED',
    recoverable: true,
  })
}

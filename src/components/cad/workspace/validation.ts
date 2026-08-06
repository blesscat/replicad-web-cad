import { normalizeError, type CadError } from '../../../cad-contract/errors'
import type { WorkerClientError } from '../../../features/cad/worker-client'
import {
  HEXAGONAL_COLUMN_CONFIGURATION,
  parseDimensionInput,
  validateModelParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../cad-contract/units'
import type { RawParameters } from './types'

export const DIMENSION_KEYS: ModelParameterKey[] = ['width', 'depth', 'height']
export const GRID_PARAMETER_KEYS: ModelParameterKey[] = ['rows', 'columns']
export const BOX_NORMAL_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'cornerPosts',
]
export const HEXAGONAL_COLUMN_PARAMETER_KEYS: ModelParameterKey[] = [
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

  if ('orientation' in parameters) {
    return {
      height: String(parameters.height),
      count: String(parameters.count),
      gap: String(parameters.gap),
      orientation: parameters.orientation,
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

  const parsed: Partial<
    Record<ModelParameterKey, number | string | boolean | null>
  > = {}
  for (const key of keys) {
    if (key === 'cornerPosts') {
      const rawValue = raw[key]
      if (rawValue !== 'true' && rawValue !== 'false') {
        return {
          valid: false,
          message: '必須是 true 或 false。',
          field: 'cornerPosts',
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
    parsed[key] = parseDimensionInput(raw[key] ?? '')
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

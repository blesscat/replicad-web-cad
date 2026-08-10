import { normalizeError, type CadError } from '../../../cad-contract/errors'
import type { WorkerClientError } from '../../../features/cad/worker-client'
import {
  HEXAGONAL_COLUMN_CONFIGURATION,
  parseOpenGridSnapDecimalInput,
  parseDimensionInput,
  validateModelParameters,
  type HexagonalColumnParameters,
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
export const OPENGRID_STACKABLE_CYLINDER_PARAMETER_KEYS: ModelParameterKey[] = [
  'diameter',
  'height',
  'thinBottomMode',
  'bottomPlateMode',
  'bottomHolesEnabled',
]
export const OPENGRID_DIVIDER_PARAMETER_KEYS: ModelParameterKey[] = [
  'left',
  'right',
  'up',
  'down',
  'height',
]
export const HEXAGONAL_COLUMN_PARAMETER_KEYS: ScalarModelParameterKey[] = [
  'height',
  'count',
  'gap',
  'orientation',
]
export const PILLAR_PARAMETER_KEYS: ModelParameterKey[] = [
  'length',
  'baseConnection',
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
  if (modelId === 'opengrid-stackable-cylinder') {
    return OPENGRID_STACKABLE_CYLINDER_PARAMETER_KEYS
  }
  if (modelId === 'opengrid-snap') {
    return ['variant', 'offset', 'halfCellX', 'halfCellY']
  }
  if (modelId === 'opengrid-snap-remover') return []
  if (modelId === 'opengrid-divider') return OPENGRID_DIVIDER_PARAMETER_KEYS
  if (modelId === 'opengrid-pillar') return PILLAR_PARAMETER_KEYS
  throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
}

function usesHalfStepInput(modelId: ModelId, key: ModelParameterKey): boolean {
  if (modelId === 'opengrid-stackable-box') {
    return key === 'x' || key === 'y'
  }
  if (modelId === 'opengrid-divider') {
    return key === 'left' || key === 'right' || key === 'up' || key === 'down'
  }
  return false
}

function legacyBooleanDefault(
  modelId: ModelId,
  key: ModelParameterKey,
): string | undefined {
  if (modelId !== 'opengrid-stackable-cylinder') return undefined
  if (key === 'thinBottomMode') return 'false'
  if (key === 'bottomPlateMode') return 'false'
  if (key === 'bottomHolesEnabled') return 'true'
  return undefined
}

export function rawFromParameters(
  parameters: ModelParameterValues,
): RawParameters {
  if (Object.keys(parameters).length === 0) return {}

  if ('diameter' in parameters && 'height' in parameters) {
    return {
      diameter: String(parameters.diameter),
      height: String(parameters.height),
      thinBottomMode: String(
        'thinBottomMode' in parameters ? parameters.thinBottomMode : false,
      ),
      bottomPlateMode: String(
        'bottomPlateMode' in parameters ? parameters.bottomPlateMode : false,
      ),
      bottomHolesEnabled: String(
        'bottomHolesEnabled' in parameters
          ? parameters.bottomHolesEnabled
          : true,
      ),
    }
  }

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

  if ('baseConnection' in parameters) {
    const pillarParameters = parameters as {
      length: number
      baseConnection: boolean
    }
    return {
      length: String(pillarParameters.length),
      baseConnection: String(pillarParameters.baseConnection),
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
    const hexagonalParameters = parameters as HexagonalColumnParameters
    return {
      height: String(hexagonalParameters.height),
      count: String(hexagonalParameters.count),
      gap: String(hexagonalParameters.gap),
      orientation: hexagonalParameters.orientation,
    }
  }

  if ('offset' in parameters) {
    const snapParameters = parameters as OpenGridSnapParameters
    return {
      variant: snapParameters.variant,
      offset: String(snapParameters.offset),
      halfCellX: snapParameters.halfCellX,
      halfCellY: snapParameters.halfCellY,
    }
  }

  if ('rows' in parameters) {
    const gridParameters = parameters as { rows: number; columns: number }
    return {
      rows: String(gridParameters.rows),
      columns: String(gridParameters.columns),
    }
  }

  if ('left' in parameters) {
    const dividerParameters = parameters as {
      left: number
      right: number
      up: number
      down: number
      height: number
    }
    return {
      left: String(dividerParameters.left),
      right: String(dividerParameters.right),
      up: String(dividerParameters.up),
      down: String(dividerParameters.down),
      height: String(dividerParameters.height),
    }
  }

  throw new Error('MODEL_PARAMETERS_EMPTY_OR_UNSUPPORTED')
}

export function parseRawParameters(
  raw: RawParameters,
  modelId: ModelId = 'box',
):
  | { valid: true; value: ModelParameterValues }
  | { valid: false; message: string; field?: ModelParameterKey } {
  if (modelId === 'opengrid-snap-remover') {
    const validation = validateModelParameters(modelId, {})
    if (validation.valid) {
      return { valid: true, value: validation.value.parameters }
    }
    return {
      valid: false,
      message: validation.issues[0]?.message ?? '參數輸入無效。',
    }
  }

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

    const halfCellX = raw.halfCellX ?? 'none'
    if (halfCellX !== 'none' && halfCellX !== 'left' && halfCellX !== 'right') {
      return {
        valid: false,
        message: 'X 半格方向必須是 none、left 或 right。',
        field: 'halfCellX',
      }
    }

    const halfCellY = raw.halfCellY ?? 'none'
    if (halfCellY !== 'none' && halfCellY !== 'top' && halfCellY !== 'bottom') {
      return {
        valid: false,
        message: 'Y 半格方向必須是 none、top 或 bottom。',
        field: 'halfCellY',
      }
    }

    const validation = validateModelParameters(modelId, {
      variant,
      offset,
      halfCellX,
      halfCellY,
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
    if (
      key === 'cornerPosts' ||
      key === 'fullBottomHoleGrid' ||
      key === 'baseConnection' ||
      key === 'thinBottomMode' ||
      key === 'bottomPlateMode' ||
      key === 'bottomHolesEnabled'
    ) {
      const rawValue = raw[key] ?? legacyBooleanDefault(modelId, key)
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
    parsed[key] = usesHalfStepInput(modelId, key)
      ? parseHalfStepInput(rawValue)
      : parseDimensionInput(rawValue)
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

import { normalizeError, type CadError } from '../../../cad-contract/errors'
import type { WorkerClientError } from '../../../features/cad/worker-client'
import {
  HEXAGONAL_COLUMN_CONFIGURATION,
  isOpenGridSnapFootprint,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
  OPENGRID_LOCATING_SEAT_MODES,
  parseOpenGridSnapDecimalInput,
  parseDimensionInput,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  type OpenGridOpenShelfParameters,
  PILLAR_CONFIGURATION,
  validateModelParameters,
  validatePillarParameters,
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
export const OPENGRID_STACKABLE_BOX_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'cornerSeatMode',
  'fullBottomHoleGrid',
  'basePlateMode',
  'thinShellMode',
  'honeycombMode',
  ...OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
]
export const OPENGRID_STACKABLE_CYLINDER_PARAMETER_KEYS: ModelParameterKey[] = [
  'diameter',
  'height',
  'thinBottomMode',
  'bottomPlateMode',
  'bottomSeatMode',
  'honeycombMode',
  ...OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
]
export const OPENGRID_DIVIDER_PARAMETER_KEYS: ModelParameterKey[] = [
  'left',
  'right',
  'up',
  'down',
  'height',
  'wallThickness',
]
export const HEXAGONAL_COLUMN_PARAMETER_KEYS: ScalarModelParameterKey[] = [
  'height',
  'count',
  'gap',
  'orientation',
]
export const PILLAR_PARAMETER_KEYS: ModelParameterKey[] = [
  'mode',
  'length',
  'offsetX',
  'offsetY',
]
export const OPENGRID_OPEN_SHELF_PARAMETER_KEYS: ModelParameterKey[] = [
  'x',
  'y',
  'height',
  'cellX',
  'cellZ',
  'angle',
  'honeycombMode',
]

function parameterKeysForModel(modelId: ModelId): readonly ModelParameterKey[] {
  if (modelId === 'box') return DIMENSION_KEYS
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
    return [
      'variant',
      'profile',
      'offset',
      'footprint',
      'fourCornerLocatingHoles',
      'centerRemoverHole',
    ]
  }
  if (modelId === 'opengrid-snap-remover') return []
  if (modelId === 'opengrid-divider') return OPENGRID_DIVIDER_PARAMETER_KEYS
  if (modelId === 'opengrid-pillar') return PILLAR_PARAMETER_KEYS
  if (modelId === 'opengrid-open-shelf') {
    return OPENGRID_OPEN_SHELF_PARAMETER_KEYS
  }
  throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
}

function usesHalfStepInput(modelId: ModelId, key: ModelParameterKey): boolean {
  if (modelId === 'opengrid-stackable-box') {
    return key === 'x' || key === 'y'
  }
  if (modelId === 'opengrid-open-shelf') {
    return key === 'x' || key === 'y'
  }
  if (modelId === 'opengrid-divider') {
    return key === 'left' || key === 'right' || key === 'up' || key === 'down'
  }
  return false
}

function legacyParameterDefault(
  modelId: ModelId,
  key: ModelParameterKey,
): string | undefined {
  if (modelId === 'opengrid-stackable-box' && key === 'cornerSeatMode') {
    return 'hole'
  }
  if (modelId === 'opengrid-stackable-box' && key === 'thinShellMode') {
    return 'false'
  }
  if (
    (modelId === 'opengrid-stackable-box' ||
      modelId === 'opengrid-stackable-cylinder' ||
      modelId === 'opengrid-open-shelf') &&
    key === 'honeycombMode'
  ) {
    return 'false'
  }
  if (modelId !== 'opengrid-stackable-cylinder') return undefined
  if (key === 'thinBottomMode') return 'false'
  if (key === 'bottomPlateMode') return 'false'
  if (key === 'bottomSeatMode') return 'hole'
  const defaultValue = (
    OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS as Record<string, unknown>
  )[key]
  if (typeof defaultValue === 'number') return String(defaultValue)
  return undefined
}

function legacyNumericDefault(
  modelId: ModelId,
  key: ModelParameterKey,
): string | undefined {
  if (
    modelId !== 'opengrid-stackable-box' ||
    !OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS.includes(
      key as (typeof OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS)[number],
    )
  ) {
    return undefined
  }
  const defaultValue =
    OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[
      key as (typeof OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS)[number]
    ]
  return String(defaultValue)
}

function parseBooleanRawParameter(
  rawValue: string | undefined,
  field: ModelParameterKey,
):
  | { valid: true; value: boolean }
  | { valid: false; message: string; field: ModelParameterKey } {
  const value = rawValue ?? 'false'
  if (value === 'true') return { valid: true, value: true }
  if (value === 'false') return { valid: true, value: false }
  return {
    valid: false,
    message: '必須是 true 或 false。',
    field,
  }
}

function parseSeatModeRawParameter(
  rawValue: string | undefined,
  field: ModelParameterKey,
):
  | { valid: true; value: (typeof OPENGRID_LOCATING_SEAT_MODES)[number] }
  | { valid: false; message: string; field: ModelParameterKey } {
  const value = rawValue ?? 'hole'
  if ((OPENGRID_LOCATING_SEAT_MODES as readonly string[]).includes(value)) {
    return {
      valid: true,
      value: value as (typeof OPENGRID_LOCATING_SEAT_MODES)[number],
    }
  }
  return {
    valid: false,
    message: '角座模式必須是 none、hole 或 integrated。',
    field,
  }
}

function parsePillarRawParameters(
  raw: RawParameters,
):
  | { valid: true; value: ModelParameterValues }
  | { valid: false; message: string; field?: ModelParameterKey } {
  const mode = raw.mode
  if (mode !== 'standard' && mode !== 'thin-shell' && mode !== 'positioning') {
    return {
      valid: false,
      message: '模式必須是 standard、thin-shell 或 positioning。',
      field: 'mode',
    }
  }

  const rawOffset = (field: 'offsetX' | 'offsetY'): number | null => {
    const value = raw[field] ?? '0'
    const trimmed = value.trim()
    if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  const offsetX = rawOffset('offsetX')
  if (offsetX === null) {
    return {
      valid: false,
      message: 'X 偏移必須是有限的小數 mm。',
      field: 'offsetX',
    }
  }
  const offsetY = rawOffset('offsetY')
  if (offsetY === null) {
    return {
      valid: false,
      message: 'Y 偏移必須是有限的小數 mm。',
      field: 'offsetY',
    }
  }

  if (mode !== 'positioning') {
    const validation = validatePillarParameters({ mode, offsetX, offsetY })
    if (!validation.valid) {
      const issue = validation.issues[0]
      return {
        valid: false,
        message: issue?.message ?? '支柱模式輸入無效。',
        field: issue?.field === 'parameters' ? undefined : issue?.field,
      }
    }
    return { valid: true, value: validation.value }
  }

  const rawLength =
    raw.length ?? String(PILLAR_CONFIGURATION.positioningDefaultLength)
  const length = parseDimensionInput(rawLength)
  if (length === null) {
    return {
      valid: false,
      message: '物件定位用支柱長度必須是有限的整數 mm。',
      field: 'length',
    }
  }

  const validation = validatePillarParameters({
    mode,
    length,
    offsetX,
    offsetY,
  })
  if (!validation.valid) {
    const issue = validation.issues[0]
    return {
      valid: false,
      message: issue?.message ?? '物件定位用支柱輸入無效。',
      field: issue?.field === 'parameters' ? undefined : issue?.field,
    }
  }
  return { valid: true, value: validation.value }
}

export function rawFromParameters(
  parameters: ModelParameterValues,
): RawParameters {
  if (Object.keys(parameters).length === 0) return {}

  if ('diameter' in parameters && 'height' in parameters) {
    const raw: RawParameters = {
      diameter: String(parameters.diameter),
      height: String(parameters.height),
      thinBottomMode: String(
        'thinBottomMode' in parameters ? parameters.thinBottomMode : false,
      ),
      bottomPlateMode: String(
        'bottomPlateMode' in parameters ? parameters.bottomPlateMode : false,
      ),
      bottomSeatMode: String(
        'bottomSeatMode' in parameters ? parameters.bottomSeatMode : 'hole',
      ),
      honeycombMode: String(
        'honeycombMode' in parameters ? parameters.honeycombMode : false,
      ),
    }
    for (const key of OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS) {
      raw[key] = String(
        key in parameters
          ? parameters[key]
          : OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS[key],
      )
    }
    return raw
  }

  if ('width' in parameters) {
    return {
      width: String(parameters.width),
      depth: String(parameters.depth),
      height: String(parameters.height),
    }
  }

  if ('mode' in parameters) {
    if (parameters.mode === 'positioning' && 'length' in parameters) {
      return {
        mode: parameters.mode,
        length: String(parameters.length),
        offsetX: String(parameters.offsetX),
        offsetY: String(parameters.offsetY),
      }
    }
    return {
      mode: parameters.mode,
      offsetX: String(parameters.offsetX),
      offsetY: String(parameters.offsetY),
    }
  }

  if ('cellX' in parameters && 'cellZ' in parameters && 'angle' in parameters) {
    const openShelfParameters = parameters as OpenGridOpenShelfParameters
    return {
      x: String(openShelfParameters.x),
      y: String(openShelfParameters.y),
      height: String(openShelfParameters.height),
      cellX: String(openShelfParameters.cellX),
      cellZ: String(openShelfParameters.cellZ),
      angle: String(openShelfParameters.angle),
      honeycombMode: String(openShelfParameters.honeycombMode ?? false),
    }
  }

  if (
    'x' in parameters &&
    'y' in parameters &&
    'height' in parameters &&
    'cornerSeatMode' in parameters &&
    'fullBottomHoleGrid' in parameters &&
    'basePlateMode' in parameters
  ) {
    const stackableParameters = parameters as Partial<{
      x: number
      y: number
      height: number
      cornerSeatMode: (typeof OPENGRID_LOCATING_SEAT_MODES)[number]
      fullBottomHoleGrid: boolean
      basePlateMode: boolean
      thinShellMode: boolean
      honeycombMode: boolean
    }> &
      Partial<
        Record<
          (typeof OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS)[number],
          number
        >
      >
    const rawParameters: RawParameters = {
      x: String(stackableParameters.x),
      y: String(stackableParameters.y),
      height: String(stackableParameters.height),
      cornerSeatMode: String(stackableParameters.cornerSeatMode),
      fullBottomHoleGrid: String(stackableParameters.fullBottomHoleGrid),
      basePlateMode: String(stackableParameters.basePlateMode),
      thinShellMode: String(stackableParameters.thinShellMode ?? false),
      honeycombMode: String(stackableParameters.honeycombMode ?? false),
    }
    for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
      const value =
        stackableParameters[key] ??
        OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS[key]
      rawParameters[key] = String(value)
    }
    return rawParameters
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
      profile: snapParameters.profile,
      offset: String(snapParameters.offset),
      footprint: snapParameters.footprint,
      fourCornerLocatingHoles: String(snapParameters.fourCornerLocatingHoles),
      centerRemoverHole: String(snapParameters.centerRemoverHole),
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
      wallThickness: number
    }
    return {
      left: String(dividerParameters.left),
      right: String(dividerParameters.right),
      up: String(dividerParameters.up),
      down: String(dividerParameters.down),
      height: String(dividerParameters.height),
      wallThickness: String(dividerParameters.wallThickness),
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

  if (modelId === 'opengrid-pillar') {
    return parsePillarRawParameters(raw)
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

    const profile = raw.profile ?? 'Standard'
    if (profile !== 'Standard' && profile !== 'Directional') {
      return {
        valid: false,
        message: '幾何 profile 必須是 Standard 或 Directional。',
        field: 'profile',
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

    const footprint = raw.footprint ?? 'full'
    if (!isOpenGridSnapFootprint(footprint)) {
      return {
        valid: false,
        message: '格型必須是 full、half 或 quarter。',
        field: 'footprint',
      }
    }

    const fourCornerLocatingHoles = parseBooleanRawParameter(
      raw.fourCornerLocatingHoles,
      'fourCornerLocatingHoles',
    )
    if (!fourCornerLocatingHoles.valid) return fourCornerLocatingHoles

    const centerRemoverHole = parseBooleanRawParameter(
      raw.centerRemoverHole,
      'centerRemoverHole',
    )
    if (!centerRemoverHole.valid) return centerRemoverHole

    const validation = validateModelParameters(modelId, {
      variant,
      profile,
      offset,
      footprint,
      fourCornerLocatingHoles: fourCornerLocatingHoles.value,
      centerRemoverHole: centerRemoverHole.value,
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
    if (key === 'mode') {
      const mode = raw.mode
      if (mode !== 'standard' && mode !== 'thin-shell') {
        return {
          valid: false,
          message: '模式必須是 standard 或 thin-shell。',
          field: 'mode',
        }
      }
      parsed.mode = mode
      continue
    }
    if (key === 'cornerSeatMode' || key === 'bottomSeatMode') {
      const seatMode = parseSeatModeRawParameter(raw[key], key)
      if (!seatMode.valid) return seatMode
      parsed[key] = seatMode.value
      continue
    }
    if (
      key === 'fullBottomHoleGrid' ||
      key === 'thinBottomMode' ||
      key === 'bottomPlateMode' ||
      key === 'basePlateMode' ||
      key === 'thinShellMode' ||
      key === 'honeycombMode'
    ) {
      const rawValue = raw[key] ?? legacyParameterDefault(modelId, key)
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
    const rawValue =
      raw[key] ??
      legacyParameterDefault(modelId, key) ??
      legacyNumericDefault(modelId, key) ??
      ''
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

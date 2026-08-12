import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from './opengrid-locating-assembly'

export type PillarMode = 'standard' | 'thin-shell' | 'positioning'
export type PillarParameterKey = 'mode' | 'length' | 'offsetX' | 'offsetY'

export type PillarParameters =
  | {
      mode: 'standard' | 'thin-shell'
      offsetX: number
      offsetY: number
    }
  | {
      mode: 'positioning'
      length: number
      offsetX: number
      offsetY: number
    }

export type PillarBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type PillarValidationIssue = {
  field: PillarParameterKey | 'parameters'
  message: string
}

export type PillarValidation =
  | { valid: true; value: PillarParameters }
  | { valid: false; issues: PillarValidationIssue[] }

export const PILLAR_CONFIGURATION = {
  defaultMode: 'standard',
  standardLength: 9,
  thinShellLength: 6,
  positioningDefaultLength: 5,
  positioningMinLength: 3,
  positioningMaxLength: 500,
  positioningLengthSliderMax: 200,
  offsetMin: -0.5,
  offsetMax: 0.5,
  offsetStep: 0.05,
  bodyDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftDiameter,
  positioningBodyDiameter: 5,
  baseDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeDiameter,
  baseHeight: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
  upperChamfer: 0.5,
  positioningLowerChamfer: 1,
  positioningUpperChamfer: 0.5,
  defaultParameters: {
    mode: 'standard',
    offsetX: 0,
    offsetY: 0,
  } satisfies PillarParameters,
} as const

const FIXED_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = [
  'mode',
  'offsetX',
  'offsetY',
]
const POSITIONING_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = [
  'mode',
  'length',
  'offsetX',
  'offsetY',
]

const OFFSET_STEP_TOLERANCE = 1e-9

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  )
}

export function validatePillarParameters(value: unknown): PillarValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', message: '需要提供圓柱支柱參數。' }],
    }
  }

  const issues: PillarValidationIssue[] = []
  const mode = value.mode
  const isPositioningMode = mode === 'positioning'
  const expectedKeys = isPositioningMode
    ? POSITIONING_PILLAR_PARAMETER_KEYS
    : FIXED_PILLAR_PARAMETER_KEYS
  if (!hasExactKeys(value, expectedKeys)) {
    issues.push({
      field: 'parameters',
      message: isPositioningMode
        ? '物件定位用支柱只接受 mode、length、offsetX、offsetY。'
        : '固定版支柱只接受 mode、offsetX、offsetY。',
    })
  }

  if (mode !== 'standard' && mode !== 'thin-shell' && !isPositioningMode) {
    issues.push({
      field: 'mode',
      message: '模式必須是 standard、thin-shell 或 positioning。',
    })
  }

  const length = value.length
  if (isPositioningMode) {
    if (typeof length !== 'number' || !Number.isFinite(length)) {
      issues.push({
        field: 'length',
        message: '物件定位用支柱長度必須是有限的整數 mm。',
      })
    } else if (!Number.isSafeInteger(length)) {
      issues.push({
        field: 'length',
        message: '物件定位用支柱長度只接受整數 mm。',
      })
    } else if (
      length < PILLAR_CONFIGURATION.positioningMinLength ||
      length > PILLAR_CONFIGURATION.positioningMaxLength
    ) {
      issues.push({
        field: 'length',
        message: `物件定位用支柱長度必須介於 ${PILLAR_CONFIGURATION.positioningMinLength}–${PILLAR_CONFIGURATION.positioningMaxLength} mm。`,
      })
    }
  }

  for (const field of ['offsetX', 'offsetY'] as const) {
    const offset = value[field]
    if (typeof offset !== 'number' || !Number.isFinite(offset)) {
      issues.push({
        field,
        message: `${field} 必須是有限的小數 mm。`,
      })
      continue
    }
    if (
      offset < PILLAR_CONFIGURATION.offsetMin ||
      offset > PILLAR_CONFIGURATION.offsetMax
    ) {
      issues.push({
        field,
        message: `${field} 必須介於 ${PILLAR_CONFIGURATION.offsetMin}–${PILLAR_CONFIGURATION.offsetMax} mm。`,
      })
      continue
    }
    const nearestStep = Math.round(offset / PILLAR_CONFIGURATION.offsetStep)
    if (
      Math.abs(offset - nearestStep * PILLAR_CONFIGURATION.offsetStep) >
      OFFSET_STEP_TOLERANCE
    ) {
      issues.push({
        field,
        message: `${field} 必須以 ${PILLAR_CONFIGURATION.offsetStep} mm 為步進。`,
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  if (isPositioningMode) {
    return {
      valid: true,
      value: {
        mode: 'positioning',
        length: length as number,
        offsetX: value.offsetX as number,
        offsetY: value.offsetY as number,
      },
    }
  }

  return {
    valid: true,
    value: {
      mode: mode as 'standard' | 'thin-shell',
      offsetX: value.offsetX as number,
      offsetY: value.offsetY as number,
    },
  }
}

export function isPillarParameters(value: unknown): value is PillarParameters {
  return validatePillarParameters(value).valid
}

export function normalizePillarParameters(value: unknown): PillarParameters {
  const validation = validatePillarParameters(value)
  if (validation.valid) return validation.value

  if (isRecord(value)) {
    const mode = value.mode
    const hasOnlyMode = Object.keys(value).length === 1
    if (hasOnlyMode && (mode === 'standard' || mode === 'thin-shell')) {
      return { mode, offsetX: 0, offsetY: 0 }
    }

    const legacyPositioningLength = value.length
    if (
      mode === 'positioning' &&
      Object.keys(value).length === 2 &&
      typeof legacyPositioningLength === 'number' &&
      Number.isSafeInteger(legacyPositioningLength) &&
      legacyPositioningLength >= PILLAR_CONFIGURATION.positioningMinLength &&
      legacyPositioningLength <= PILLAR_CONFIGURATION.positioningMaxLength
    ) {
      return {
        mode: 'positioning',
        length: legacyPositioningLength,
        offsetX: 0,
        offsetY: 0,
      }
    }

    const legacyLength = value.length
    const legacyBaseConnection = value.baseConnection
    const isLegacyLength =
      typeof legacyLength === 'number' &&
      Number.isSafeInteger(legacyLength) &&
      legacyLength >= PILLAR_CONFIGURATION.positioningMinLength &&
      legacyLength <= PILLAR_CONFIGURATION.positioningMaxLength
    if (isLegacyLength && legacyBaseConnection === false) {
      return {
        mode: 'positioning',
        length: legacyLength,
        offsetX: 0,
        offsetY: 0,
      }
    }
  }

  return { ...PILLAR_CONFIGURATION.defaultParameters }
}

export function pillarLengthForMode(mode: PillarMode): number {
  if (mode === 'thin-shell') return PILLAR_CONFIGURATION.thinShellLength
  if (mode === 'standard') return PILLAR_CONFIGURATION.standardLength
  throw new Error('PILLAR_POSITIONING_LENGTH_REQUIRES_PARAMETERS')
}

export function pillarLengthForParameters(
  parameters: PillarParameters,
): number {
  if (parameters.mode === 'positioning') return parameters.length
  return pillarLengthForMode(parameters.mode)
}

export function boundsForPillar(parameters: PillarParameters): PillarBounds {
  const radius =
    parameters.mode === 'positioning'
      ? PILLAR_CONFIGURATION.positioningBodyDiameter / 2
      : PILLAR_CONFIGURATION.baseDiameter / 2
  return {
    min: [parameters.offsetX - radius, parameters.offsetY - radius, 0],
    max: [
      parameters.offsetX + radius,
      parameters.offsetY + radius,
      pillarLengthForParameters(parameters),
    ],
  }
}

function formatPillarOffset(value: number): string {
  return Object.is(value, -0) || value === 0 ? '0' : String(value)
}

function pillarExportStem(parameters: PillarParameters): string {
  const length = pillarLengthForParameters(parameters)
  const mode =
    parameters.mode === 'positioning' ? 'positioning' : parameters.mode
  const stem = `pillar-${length}-${mode}`
  if (parameters.offsetX === 0 && parameters.offsetY === 0) return stem
  return `${stem}-x${formatPillarOffset(parameters.offsetX)}-y${formatPillarOffset(parameters.offsetY)}`
}

export function pillarFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.step`
}

export function pillarStlFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.stl`
}

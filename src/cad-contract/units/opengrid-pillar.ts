import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from './opengrid-locating-assembly'

export type PillarMode = 'standard' | 'thin-shell' | 'positioning'
export type PillarParameterKey = 'mode' | 'length'

export type PillarParameters =
  { mode: 'standard' | 'thin-shell' } | { mode: 'positioning'; length: number }

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
  standardLength: 8,
  thinShellLength: 5,
  positioningDefaultLength: 5,
  positioningMinLength: 3,
  positioningMaxLength: 500,
  positioningLengthSliderMax: 200,
  bodyDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftDiameter,
  positioningBodyDiameter: 5,
  baseDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeDiameter,
  baseHeight: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
  upperChamfer: 0.5,
  positioningLowerChamfer: 1,
  positioningUpperChamfer: 0.5,
  defaultParameters: {
    mode: 'standard',
  } satisfies PillarParameters,
} as const

const FIXED_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = ['mode']
const POSITIONING_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = [
  'mode',
  'length',
]

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
        ? '物件定位用支柱只接受 mode、length。'
        : '固定版支柱只接受 mode。',
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

  if (issues.length > 0) return { valid: false, issues }

  if (isPositioningMode) {
    return {
      valid: true,
      value: { mode: 'positioning', length: length as number },
    }
  }

  return {
    valid: true,
    value: { mode: mode as 'standard' | 'thin-shell' },
  }
}

export function isPillarParameters(value: unknown): value is PillarParameters {
  return validatePillarParameters(value).valid
}

export function normalizePillarParameters(value: unknown): PillarParameters {
  const validation = validatePillarParameters(value)
  if (validation.valid) return validation.value

  if (isRecord(value)) {
    const legacyLength = value.length
    const legacyBaseConnection = value.baseConnection
    const isLegacyLength =
      typeof legacyLength === 'number' &&
      Number.isSafeInteger(legacyLength) &&
      legacyLength >= PILLAR_CONFIGURATION.positioningMinLength &&
      legacyLength <= PILLAR_CONFIGURATION.positioningMaxLength
    if (isLegacyLength && legacyBaseConnection === false) {
      return { mode: 'positioning', length: legacyLength }
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
    min: [-radius, -radius, 0],
    max: [radius, radius, pillarLengthForParameters(parameters)],
  }
}

function pillarExportStem(parameters: PillarParameters): string {
  const length = pillarLengthForParameters(parameters)
  const mode =
    parameters.mode === 'positioning' ? 'positioning' : parameters.mode
  return `pillar-${length}-${mode}`
}

export function pillarFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.step`
}

export function pillarStlFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.stl`
}

import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
} from './opengrid-locating-assembly'

export type PillarMode =
  'standard' | 'thin-shell' | 'positioning' | 'detachable-corner-seat'
export type PillarParameterKey = 'mode' | 'length' | 'offset'

export type PillarParameters =
  | {
      mode: 'standard' | 'thin-shell'
      offset: number
    }
  | {
      mode: 'positioning'
      length: number
      offset: number
    }
  | {
      mode: 'detachable-corner-seat'
    }

export type PillarBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type PillarValidationIssue = {
  field: string
  messageId: string
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
    offset: 0,
  } satisfies PillarParameters,
} as const

const FIXED_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = [
  'mode',
  'offset',
]
const POSITIONING_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = [
  'mode',
  'length',
  'offset',
]
const DETACHABLE_PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = ['mode']

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

function mismatchedParameterField(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): string {
  const unexpectedField = Object.keys(value).find(
    (field) => !expectedKeys.includes(field),
  )
  if (unexpectedField) return unexpectedField
  const missingField = expectedKeys.find(
    (field) => !Object.prototype.hasOwnProperty.call(value, field),
  )
  return missingField ?? 'parameters'
}

function isValidOffset(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (
    value < PILLAR_CONFIGURATION.offsetMin ||
    value > PILLAR_CONFIGURATION.offsetMax
  ) {
    return false
  }
  const nearestStep = Math.round(value / PILLAR_CONFIGURATION.offsetStep)
  return (
    Math.abs(value - nearestStep * PILLAR_CONFIGURATION.offsetStep) <=
    OFFSET_STEP_TOLERANCE
  )
}

export function validatePillarParameters(value: unknown): PillarValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const issues: PillarValidationIssue[] = []
  const mode = value.mode
  const isPositioningMode = mode === 'positioning'
  const isDetachableMode = mode === 'detachable-corner-seat'
  let expectedKeys = FIXED_PILLAR_PARAMETER_KEYS
  if (isPositioningMode) expectedKeys = POSITIONING_PILLAR_PARAMETER_KEYS
  if (isDetachableMode) expectedKeys = DETACHABLE_PILLAR_PARAMETER_KEYS
  if (!hasExactKeys(value, expectedKeys)) {
    issues.push({
      field: mismatchedParameterField(value, expectedKeys),
      messageId: 'validation.invalid',
    })
  }

  if (
    mode !== 'standard' &&
    mode !== 'thin-shell' &&
    !isPositioningMode &&
    !isDetachableMode
  ) {
    issues.push({
      field: 'mode',
      messageId: 'validation.invalid',
    })
  }

  if (isDetachableMode) {
    if (issues.length > 0) return { valid: false, issues }
    return { valid: true, value: { mode: 'detachable-corner-seat' } }
  }

  const length = value.length
  if (isPositioningMode) {
    if (typeof length !== 'number' || !Number.isFinite(length)) {
      issues.push({
        field: 'length',
        messageId: 'validation.invalid',
      })
    } else if (!Number.isSafeInteger(length)) {
      issues.push({
        field: 'length',
        messageId: 'validation.invalid',
      })
    } else if (
      length < PILLAR_CONFIGURATION.positioningMinLength ||
      length > PILLAR_CONFIGURATION.positioningMaxLength
    ) {
      issues.push({
        field: 'length',
        messageId: 'validation.invalid',
      })
    }
  }

  const offset = value.offset
  if (typeof offset !== 'number' || !Number.isFinite(offset)) {
    issues.push({
      field: 'offset',
      messageId: 'validation.invalid',
    })
  } else if (
    offset < PILLAR_CONFIGURATION.offsetMin ||
    offset > PILLAR_CONFIGURATION.offsetMax
  ) {
    issues.push({
      field: 'offset',
      messageId: 'validation.invalid',
    })
  } else if (!isValidOffset(offset)) {
    issues.push({
      field: 'offset',
      messageId: 'validation.invalid',
    })
  }

  if (issues.length > 0) return { valid: false, issues }

  if (isPositioningMode) {
    return {
      valid: true,
      value: {
        mode: 'positioning',
        length: length as number,
        offset: offset as number,
      },
    }
  }

  return {
    valid: true,
    value: {
      mode: mode as 'standard' | 'thin-shell',
      offset: offset as number,
    },
  }
}

export function isPillarParameters(value: unknown): value is PillarParameters {
  return validatePillarParameters(value).valid
}

function legacyOffsetFor(value: Record<string, unknown>): number | undefined {
  const hasLegacyX = Object.prototype.hasOwnProperty.call(value, 'offsetX')
  const hasLegacyY = Object.prototype.hasOwnProperty.call(value, 'offsetY')
  if (!hasLegacyX || !hasLegacyY) return undefined

  const offsetX = value.offsetX
  const offsetY = value.offsetY
  if (!isValidOffset(offsetX) || !isValidOffset(offsetY)) return 0
  return offsetX === offsetY ? offsetX : 0
}

function isValidPositioningLength(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= PILLAR_CONFIGURATION.positioningMinLength &&
    value <= PILLAR_CONFIGURATION.positioningMaxLength
  )
}

export function normalizePillarParameters(value: unknown): PillarParameters {
  const validation = validatePillarParameters(value)
  if (validation.valid) return validation.value

  if (isRecord(value)) {
    const mode = value.mode
    const legacyOffset = legacyOffsetFor(value)

    if (mode === 'standard' || mode === 'thin-shell') {
      if (Object.keys(value).length === 1 || legacyOffset !== undefined) {
        return { mode, offset: legacyOffset ?? 0 }
      }
    }

    const legacyLength = value.length
    if (isValidPositioningLength(legacyLength)) {
      if (
        mode === 'positioning' &&
        (Object.keys(value).length === 2 || legacyOffset !== undefined)
      ) {
        return {
          mode: 'positioning',
          length: legacyLength,
          offset: legacyOffset ?? 0,
        }
      }

      if (value.baseConnection === false) {
        return {
          mode: 'positioning',
          length: legacyLength,
          offset: 0,
        }
      }
    }
  }

  return { ...PILLAR_CONFIGURATION.defaultParameters }
}

export function pillarLengthForMode(mode: PillarMode): number {
  if (mode === 'thin-shell') return PILLAR_CONFIGURATION.thinShellLength
  if (mode === 'standard') return PILLAR_CONFIGURATION.standardLength
  if (mode === 'detachable-corner-seat') {
    return OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.totalHeight
  }
  throw new Error('PILLAR_POSITIONING_LENGTH_REQUIRES_PARAMETERS')
}

export function pillarLengthForParameters(
  parameters: PillarParameters,
): number {
  if (parameters.mode === 'positioning') return parameters.length
  return pillarLengthForMode(parameters.mode)
}

export function pillarBodyDiameterForParameters(
  parameters: PillarParameters,
): number {
  if (parameters.mode === 'detachable-corner-seat') {
    return OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.bodyDiameter
  }
  const nominalDiameter =
    parameters.mode === 'positioning'
      ? PILLAR_CONFIGURATION.positioningBodyDiameter
      : PILLAR_CONFIGURATION.bodyDiameter
  return nominalDiameter + parameters.offset
}

export function pillarFlangeDiameterForParameters(
  parameters: PillarParameters,
): number {
  if (parameters.mode === 'detachable-corner-seat') {
    throw new Error('PILLAR_DETACHABLE_CORNER_SEAT_HAS_NO_FLANGE')
  }
  return PILLAR_CONFIGURATION.baseDiameter + parameters.offset
}

export function boundsForPillar(parameters: PillarParameters): PillarBounds {
  if (parameters.mode === 'detachable-corner-seat') {
    const bounds = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.male.bounds
    return {
      min: [...bounds.min],
      max: [...bounds.max],
    }
  }
  const diameter =
    parameters.mode === 'positioning'
      ? pillarBodyDiameterForParameters(parameters)
      : pillarFlangeDiameterForParameters(parameters)
  const radius = diameter / 2
  return {
    min: [-radius, -radius, 0],
    max: [radius, radius, pillarLengthForParameters(parameters)],
  }
}

function formatPillarOffset(value: number): string {
  return Object.is(value, -0) || value === 0 ? '0' : String(value)
}

function pillarExportStem(parameters: PillarParameters): string {
  if (parameters.mode === 'detachable-corner-seat') {
    return 'pillar-4.5-detachable-corner-seat'
  }
  const length = pillarLengthForParameters(parameters)
  const mode =
    parameters.mode === 'positioning' ? 'positioning' : parameters.mode
  const stem = `pillar-${length}-${mode}`
  if (parameters.offset === 0) return stem
  return `${stem}-xy${formatPillarOffset(parameters.offset)}`
}

export function pillarFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.step`
}

export function pillarStlFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.stl`
}

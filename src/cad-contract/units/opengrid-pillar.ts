export type PillarParameterKey = 'length' | 'baseConnection'

export type PillarParameters = {
  length: number
  baseConnection: boolean
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
  defaultLength: 5,
  minLength: 3,
  maxLength: 500,
  lengthSliderMax: 200,
  bodyDiameter: 5,
  baseDiameter: 7,
  baseHeight: 0.8,
  lowerChamfer: 1,
  upperChamfer: 0.5,
  defaultBaseConnection: false,
  defaultParameters: {
    length: 5,
    baseConnection: false,
  } satisfies PillarParameters,
} as const

const PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = [
  'length',
  'baseConnection',
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
  if (!hasExactKeys(value, PILLAR_PARAMETER_KEYS)) {
    issues.push({
      field: 'parameters',
      message: '圓柱支柱只接受 length、baseConnection。',
    })
  }

  const length = value.length
  if (typeof length !== 'number' || !Number.isFinite(length)) {
    issues.push({ field: 'length', message: '總長度必須是有限的整數 mm。' })
  } else if (!Number.isSafeInteger(length)) {
    issues.push({ field: 'length', message: '總長度只接受整數 mm。' })
  } else if (
    length < PILLAR_CONFIGURATION.minLength ||
    length > PILLAR_CONFIGURATION.maxLength
  ) {
    issues.push({
      field: 'length',
      message: `總長度必須介於 ${PILLAR_CONFIGURATION.minLength}–${PILLAR_CONFIGURATION.maxLength} mm。`,
    })
  }

  const baseConnection = value.baseConnection
  if (typeof baseConnection !== 'boolean') {
    issues.push({ field: 'baseConnection', message: '必須是 true 或 false。' })
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      length: length as number,
      baseConnection: baseConnection as boolean,
    },
  }
}

export function isPillarParameters(value: unknown): value is PillarParameters {
  return validatePillarParameters(value).valid
}

export function boundsForPillar(
  parameters: Pick<PillarParameters, 'length' | 'baseConnection'>,
): PillarBounds {
  const radius =
    (parameters.baseConnection
      ? PILLAR_CONFIGURATION.baseDiameter
      : PILLAR_CONFIGURATION.bodyDiameter) / 2
  return {
    min: [-radius, -radius, 0],
    max: [radius, radius, parameters.length],
  }
}

function pillarExportStem(parameters: PillarParameters): string {
  const mode = parameters.baseConnection ? 'base' : 'plain'
  return `pillar-${parameters.length}-${mode}`
}

export function pillarFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.step`
}

export function pillarStlFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.stl`
}

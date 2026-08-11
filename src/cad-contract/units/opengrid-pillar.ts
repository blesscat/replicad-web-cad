import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from './opengrid-locating-assembly'

export type PillarMode = 'standard' | 'thin-shell'
export type PillarParameterKey = 'mode'

export type PillarParameters = {
  mode: PillarMode
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
  thinShellLength: 5,
  bodyDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftDiameter,
  baseDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeDiameter,
  baseHeight: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
  upperChamfer: 0.5,
  defaultParameters: {
    mode: 'standard',
  } satisfies PillarParameters,
} as const

const PILLAR_PARAMETER_KEYS: readonly PillarParameterKey[] = ['mode']

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
      message: '圓柱支柱只接受 mode。',
    })
  }

  const mode = value.mode
  if (mode !== 'standard' && mode !== 'thin-shell') {
    issues.push({
      field: 'mode',
      message: '模式必須是 standard 或 thin-shell。',
    })
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: { mode: mode as PillarMode },
  }
}

export function isPillarParameters(value: unknown): value is PillarParameters {
  return validatePillarParameters(value).valid
}

export function normalizePillarParameters(value: unknown): PillarParameters {
  const validation = validatePillarParameters(value)
  if (validation.valid) return validation.value
  return { ...PILLAR_CONFIGURATION.defaultParameters }
}

export function pillarLengthForMode(mode: PillarMode): number {
  if (mode === 'thin-shell') return PILLAR_CONFIGURATION.thinShellLength
  return PILLAR_CONFIGURATION.standardLength
}

export function boundsForPillar(parameters: PillarParameters): PillarBounds {
  const radius = PILLAR_CONFIGURATION.baseDiameter / 2
  return {
    min: [-radius, -radius, 0],
    max: [radius, radius, pillarLengthForMode(parameters.mode)],
  }
}

function pillarExportStem(parameters: PillarParameters): string {
  const length = pillarLengthForMode(parameters.mode)
  return `pillar-${length}-${parameters.mode}`
}

export function pillarFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.step`
}

export function pillarStlFileName(parameters: PillarParameters): string {
  return `${pillarExportStem(parameters)}.stl`
}

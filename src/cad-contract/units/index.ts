export const PROTOTYPE_CONFIGURATION = {
  defaultDimensions: { width: 20, depth: 30, height: 40 },
  minDimension: 1,
  maxDimension: 500,
  inputStep: 1,
  inputDebounceMs: 150,
  boundsTolerance: 0.01,
  engineInitializationTimeoutMs: 60_000,
  operationTimeoutMs: 30_000,
  recoveryRetries: 1,
  pendingCandidateLimit: 2,
  candidateTtlMs: 30_000,
  stepExtension: '.step',
  stepMime: 'model/step',
} as const

export type DimensionKey = 'width' | 'depth' | 'height'

export type BoxParameters = Record<DimensionKey, number>

export type BoxBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type ValidationIssue = {
  field: DimensionKey | 'parameters'
  message: string
}

export type BoxValidation =
  | { valid: true; value: BoxParameters }
  | { valid: false; issues: ValidationIssue[] }

const DIMENSIONS: DimensionKey[] = ['width', 'depth', 'height']

export function parseDimensionInput(raw: string): number | null {
  const value = raw.trim()
  if (!/^-?\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export function validateBoxParameters(value: unknown): BoxValidation {
  if (!value || typeof value !== 'object') {
    return {
      valid: false,
      issues: [{ field: 'parameters', message: '需要提供方塊尺寸。' }],
    }
  }

  const candidate = value as Partial<Record<DimensionKey, unknown>>
  const issues: ValidationIssue[] = []

  for (const field of DIMENSIONS) {
    const dimension = candidate[field]
    if (typeof dimension !== 'number' || !Number.isFinite(dimension)) {
      issues.push({ field, message: '必須是有限的整數。' })
      continue
    }
    if (!Number.isInteger(dimension)) {
      issues.push({ field, message: '只接受整數 mm，不會自動四捨五入。' })
      continue
    }
    if (
      dimension < PROTOTYPE_CONFIGURATION.minDimension ||
      dimension > PROTOTYPE_CONFIGURATION.maxDimension
    ) {
      issues.push({
        field,
        message: `必須介於 ${PROTOTYPE_CONFIGURATION.minDimension}–${PROTOTYPE_CONFIGURATION.maxDimension} mm。`,
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      width: candidate.width as number,
      depth: candidate.depth as number,
      height: candidate.height as number,
    },
  }
}

export function boundsForBox(parameters: BoxParameters): BoxBounds {
  return {
    min: [-parameters.width / 2, -parameters.depth / 2, 0],
    max: [parameters.width / 2, parameters.depth / 2, parameters.height],
  }
}

export function boxFileName(parameters: BoxParameters): string {
  return `box-${parameters.width}x${parameters.depth}x${parameters.height}${PROTOTYPE_CONFIGURATION.stepExtension}`
}

export function isBoxParameters(value: unknown): value is BoxParameters {
  return validateBoxParameters(value).valid
}

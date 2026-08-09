export type OpenGridSnapVariant = 'Full' | 'Lite'

export type OpenGridSnapParameterKey = 'variant' | 'offset'

export type OpenGridSnapParameters = {
  variant: OpenGridSnapVariant
  /** Total X and Y envelope increment in millimetres, applied symmetrically. */
  offset: number
}

export type OpenGridSnapBounds = {
  min: [number, number, number]
  max: [number, number, number]
}

export type OpenGridSnapValidationIssue = {
  field: OpenGridSnapParameterKey | 'parameters'
  message: string
}

export type OpenGridSnapValidation =
  | { valid: true; value: OpenGridSnapParameters }
  | { valid: false; issues: OpenGridSnapValidationIssue[] }

export const OPENGRID_SNAP_CONFIGURATION = {
  nominalWidth: 25.6,
  nominalDepth: 25.6,
  fixedCoreWidth: 24.8,
  fixedCoreDepth: 24.8,
  minOffset: 0,
  maxOffset: 1,
  offsetStep: 0.05,
  boundsTolerance: 0.05,
  variantHeights: {
    Full: 6.8,
    Lite: 3.4,
  } satisfies Record<OpenGridSnapVariant, number>,
  referenceFileNames: {
    Full: 'openGrid hole Snap.step',
    Lite: 'openGrid Bare Lite Snap hold.step',
  } satisfies Record<OpenGridSnapVariant, string>,
  defaultParameters: {
    variant: 'Full' as OpenGridSnapVariant,
    offset: 0,
  } satisfies OpenGridSnapParameters,
} as const

const PARAMETER_KEYS: readonly OpenGridSnapParameterKey[] = [
  'variant',
  'offset',
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

function isOpenGridSnapVariant(value: unknown): value is OpenGridSnapVariant {
  return value === 'Full' || value === 'Lite'
}

function formatNumber(value: number): string {
  return String(Object.is(value, -0) ? 0 : value)
}

export function parseOpenGridSnapDecimalInput(raw: string): number | null {
  const value = raw.trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null

  const parsed = Number(value)
  return Number.isFinite(parsed) && Number.isSafeInteger(Math.trunc(parsed))
    ? parsed
    : null
}

export function validateOpenGridSnapParameters(
  value: unknown,
): OpenGridSnapValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        { field: 'parameters', message: '需要提供 OpenGrid Snap 參數。' },
      ],
    }
  }

  const issues: OpenGridSnapValidationIssue[] = []
  if (!hasExactKeys(value, PARAMETER_KEYS)) {
    issues.push({
      field: 'parameters',
      message: 'OpenGrid Snap 只接受 variant、offset。',
    })
  }

  if (!isOpenGridSnapVariant(value.variant)) {
    issues.push({ field: 'variant', message: '型號必須是 Full 或 Lite。' })
  }

  const offset = value.offset
  if (typeof offset !== 'number' || !Number.isFinite(offset)) {
    issues.push({ field: 'offset', message: '外框增量必須是有限數值。' })
  } else {
    if (
      offset < OPENGRID_SNAP_CONFIGURATION.minOffset ||
      offset > OPENGRID_SNAP_CONFIGURATION.maxOffset
    ) {
      issues.push({
        field: 'offset',
        message: `外框增量必須介於 ${OPENGRID_SNAP_CONFIGURATION.minOffset}–${OPENGRID_SNAP_CONFIGURATION.maxOffset} mm。`,
      })
    }

    const stepIndex = Math.round(
      (offset - OPENGRID_SNAP_CONFIGURATION.minOffset) /
        OPENGRID_SNAP_CONFIGURATION.offsetStep,
    )
    const snappedOffset =
      OPENGRID_SNAP_CONFIGURATION.minOffset +
      stepIndex * OPENGRID_SNAP_CONFIGURATION.offsetStep
    if (Math.abs(offset - snappedOffset) > 1e-9) {
      issues.push({
        field: 'offset',
        message: `外框增量必須以 ${OPENGRID_SNAP_CONFIGURATION.offsetStep} mm 為步進。`,
      })
    }

    if (
      OPENGRID_SNAP_CONFIGURATION.nominalWidth + offset <=
        OPENGRID_SNAP_CONFIGURATION.fixedCoreWidth ||
      OPENGRID_SNAP_CONFIGURATION.nominalDepth + offset <=
        OPENGRID_SNAP_CONFIGURATION.fixedCoreDepth
    ) {
      issues.push({
        field: 'offset',
        message: '外框增量會侵入中央 Snap 固定區域。',
      })
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      variant: value.variant as OpenGridSnapVariant,
      offset: value.offset as number,
    },
  }
}

export function isOpenGridSnapParameters(
  value: unknown,
): value is OpenGridSnapParameters {
  return validateOpenGridSnapParameters(value).valid
}

export function boundsForOpenGridSnap(
  parameters: Pick<OpenGridSnapParameters, 'variant' | 'offset'>,
): OpenGridSnapBounds {
  const width = OPENGRID_SNAP_CONFIGURATION.nominalWidth + parameters.offset
  const depth = OPENGRID_SNAP_CONFIGURATION.nominalDepth + parameters.offset
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [
      width / 2,
      depth / 2,
      OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant],
    ],
  }
}

export function openGridSnapFileName(
  parameters: OpenGridSnapParameters,
): string {
  return `opengrid-snap-${parameters.variant.toLowerCase()}-offset${formatNumber(parameters.offset)}.step`
}

export function openGridSnapStlFileName(
  parameters: OpenGridSnapParameters,
): string {
  return `opengrid-snap-${parameters.variant.toLowerCase()}-offset${formatNumber(parameters.offset)}.stl`
}

export function openGridSnapHeightFor(variant: OpenGridSnapVariant): number {
  return OPENGRID_SNAP_CONFIGURATION.variantHeights[variant]
}

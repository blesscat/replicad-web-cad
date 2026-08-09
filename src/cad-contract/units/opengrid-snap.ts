import {
  HALF_CELL_CONFIGURATION,
  halfCellHostPitch,
  isHalfCellX,
  isHalfCellY,
  snapFixedCoreAxisSize,
  snapNominalAxisSize,
  type HalfCellX,
  type HalfCellY,
} from './half-cell'

export type OpenGridSnapVariant = 'Full' | 'Lite'

export type OpenGridSnapParameterKey =
  'variant' | 'offset' | 'halfCellX' | 'halfCellY'

export type OpenGridSnapParameters = {
  variant: OpenGridSnapVariant
  /** Total X and Y envelope increment in millimetres, applied symmetrically. */
  offset: number
  halfCellX: HalfCellX
  halfCellY: HalfCellY
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
  nominalWidth: HALF_CELL_CONFIGURATION.fullSnapNominalSize,
  nominalDepth: HALF_CELL_CONFIGURATION.fullSnapNominalSize,
  fixedCoreWidth: HALF_CELL_CONFIGURATION.fullSnapFixedCoreSize,
  fixedCoreDepth: HALF_CELL_CONFIGURATION.fullSnapFixedCoreSize,
  halfNominalWidth: HALF_CELL_CONFIGURATION.halfSnapNominalSize,
  halfNominalDepth: HALF_CELL_CONFIGURATION.halfSnapNominalSize,
  halfFixedCoreWidth: HALF_CELL_CONFIGURATION.halfSnapFixedCoreSize,
  halfFixedCoreDepth: HALF_CELL_CONFIGURATION.halfSnapFixedCoreSize,
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
    halfCellX: 'none' as HalfCellX,
    halfCellY: 'none' as HalfCellY,
  } satisfies OpenGridSnapParameters,
} as const

const PARAMETER_KEYS: readonly OpenGridSnapParameterKey[] = [
  'variant',
  'offset',
  'halfCellX',
  'halfCellY',
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
      message: 'OpenGrid Snap 只接受 variant、offset、halfCellX、halfCellY。',
    })
  }

  if (!isOpenGridSnapVariant(value.variant)) {
    issues.push({ field: 'variant', message: '型號必須是 Full 或 Lite。' })
  }

  if (!isHalfCellX(value.halfCellX)) {
    issues.push({
      field: 'halfCellX',
      message: 'X 半格方向必須是 none、left 或 right。',
    })
  }
  if (!isHalfCellY(value.halfCellY)) {
    issues.push({
      field: 'halfCellY',
      message: 'Y 半格方向必須是 none、top 或 bottom。',
    })
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

    if (isHalfCellX(value.halfCellX) && isHalfCellY(value.halfCellY)) {
      const nominalWidth = snapNominalAxisSize(value.halfCellX)
      const nominalDepth = snapNominalAxisSize(value.halfCellY)
      const fixedCoreWidth = snapFixedCoreAxisSize(value.halfCellX)
      const fixedCoreDepth = snapFixedCoreAxisSize(value.halfCellY)
      if (
        nominalWidth + offset <= fixedCoreWidth ||
        nominalDepth + offset <= fixedCoreDepth
      ) {
        issues.push({
          field: 'offset',
          message: '外框增量會侵入中央 Snap 固定區域。',
        })
      }
      if (
        nominalWidth + offset > halfCellHostPitch(value.halfCellX) ||
        nominalDepth + offset > halfCellHostPitch(value.halfCellY)
      ) {
        issues.push({
          field: 'offset',
          message: '外框增量會超過所選半格的宿主格距。',
        })
      }
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      variant: value.variant as OpenGridSnapVariant,
      offset: value.offset as number,
      halfCellX: value.halfCellX as HalfCellX,
      halfCellY: value.halfCellY as HalfCellY,
    },
  }
}

export function isOpenGridSnapParameters(
  value: unknown,
): value is OpenGridSnapParameters {
  return validateOpenGridSnapParameters(value).valid
}

export function boundsForOpenGridSnap(
  parameters: Pick<
    OpenGridSnapParameters,
    'variant' | 'offset' | 'halfCellX' | 'halfCellY'
  >,
): OpenGridSnapBounds {
  const width = snapNominalAxisSize(parameters.halfCellX) + parameters.offset
  const depth = snapNominalAxisSize(parameters.halfCellY) + parameters.offset
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
  return `opengrid-snap-${parameters.variant.toLowerCase()}-offset${formatNumber(parameters.offset)}-x${parameters.halfCellX}-y${parameters.halfCellY}.step`
}

export function openGridSnapStlFileName(
  parameters: OpenGridSnapParameters,
): string {
  return `opengrid-snap-${parameters.variant.toLowerCase()}-offset${formatNumber(parameters.offset)}-x${parameters.halfCellX}-y${parameters.halfCellY}.stl`
}

export function openGridSnapHeightFor(variant: OpenGridSnapVariant): number {
  return OPENGRID_SNAP_CONFIGURATION.variantHeights[variant]
}

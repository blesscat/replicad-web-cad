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
export type OpenGridSnapProfile = 'Standard' | 'Directional'
export type OpenGridSnapFootprint = 'full' | 'half' | 'quarter'

export type OpenGridSnapParameterKey =
  | 'variant'
  | 'profile'
  | 'offset'
  | 'footprint'
  | 'fourCornerLocatingHoles'
  | 'centerRemoverHole'

export type OpenGridSnapParameters = {
  variant: OpenGridSnapVariant
  profile: OpenGridSnapProfile
  /** Total X and Y envelope increment in millimetres, applied symmetrically. */
  offset: number
  footprint: OpenGridSnapFootprint
  fourCornerLocatingHoles: boolean
  centerRemoverHole: boolean
}

export type OpenGridSnapCanonicalAxes = {
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
  officialHost: {
    boardWidth: 70,
    boardDepth: 70,
    boardHeight: 4,
    halfCenter: [-28, 7] as [number, number],
    quarterCenter: [-28, 28] as [number, number],
    interferenceTolerance: 0.1,
    clearanceTolerance: 0.05,
  },
  variantHeights: {
    Full: 6.8,
    Lite: 3.4,
  } satisfies Record<OpenGridSnapVariant, number>,
  referenceFileNames: {
    Standard: {
      Full: 'openGrid Bare Snap.step',
      Lite: 'openGrid Bare Lite Snap.step',
    },
    Directional: {
      Full: 'openGrid Bare Directional Snap v2.1.step',
      Lite: 'openGrid Bare Directional Lite Snap v2.step',
    },
  } satisfies Record<OpenGridSnapProfile, Record<OpenGridSnapVariant, string>>,
  defaultParameters: {
    variant: 'Full' as OpenGridSnapVariant,
    profile: 'Standard' as OpenGridSnapProfile,
    offset: 0,
    footprint: 'full' as OpenGridSnapFootprint,
    fourCornerLocatingHoles: false,
    centerRemoverHole: false,
  } satisfies OpenGridSnapParameters,
} as const

const PARAMETER_KEYS: readonly OpenGridSnapParameterKey[] = [
  'variant',
  'profile',
  'offset',
  'footprint',
  'fourCornerLocatingHoles',
  'centerRemoverHole',
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

function isOpenGridSnapProfile(value: unknown): value is OpenGridSnapProfile {
  return value === 'Standard' || value === 'Directional'
}

export function isOpenGridSnapFootprint(
  value: unknown,
): value is OpenGridSnapFootprint {
  return value === 'full' || value === 'half' || value === 'quarter'
}

function formatNumber(value: number): string {
  return String(Object.is(value, -0) ? 0 : value)
}

function halfEnvelopeNominalSize(
  profile: OpenGridSnapProfile,
  axis: 'X' | 'Y',
  direction: HalfCellX | HalfCellY,
): number {
  if (profile !== 'Directional' || direction === 'none') {
    return snapNominalAxisSize(direction)
  }
  if (axis === 'Y' && direction === 'top') return 13.201
  if (axis === 'Y' && direction === 'bottom') return 12.801
  return 12.801
}

export function openGridSnapCanonicalAxesFor(
  footprint: OpenGridSnapFootprint,
): OpenGridSnapCanonicalAxes {
  if (footprint === 'half') {
    return { halfCellX: 'left', halfCellY: 'none' }
  }
  if (footprint === 'quarter') {
    return { halfCellX: 'left', halfCellY: 'top' }
  }
  return { halfCellX: 'none', halfCellY: 'none' }
}

export function openGridSnapFootprintForLegacyAxes(
  halfCellX: unknown,
  halfCellY: unknown,
): OpenGridSnapFootprint | null {
  if (!isHalfCellX(halfCellX) || !isHalfCellY(halfCellY)) return null
  if (halfCellX === 'none' && halfCellY === 'none') return 'full'
  if (halfCellX === 'none' || halfCellY === 'none') return 'half'
  return 'quarter'
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
      message:
        'OpenGrid Snap 只接受 variant、profile、offset、footprint、fourCornerLocatingHoles、centerRemoverHole。',
    })
  }

  if (!isOpenGridSnapVariant(value.variant)) {
    issues.push({ field: 'variant', message: '型號必須是 Full 或 Lite。' })
  }
  if (!isOpenGridSnapProfile(value.profile)) {
    issues.push({
      field: 'profile',
      message: '幾何 profile 必須是 Standard 或 Directional。',
    })
  }
  if (!isOpenGridSnapFootprint(value.footprint)) {
    issues.push({
      field: 'footprint',
      message: '格型必須是 full、half 或 quarter。',
    })
  }
  if (typeof value.fourCornerLocatingHoles !== 'boolean') {
    issues.push({
      field: 'fourCornerLocatingHoles',
      message: '四周定位孔選項必須是 boolean。',
    })
  }
  if (typeof value.centerRemoverHole !== 'boolean') {
    issues.push({
      field: 'centerRemoverHole',
      message: '中心 remover 孔選項必須是 boolean。',
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

    if (isOpenGridSnapFootprint(value.footprint)) {
      const axes = openGridSnapCanonicalAxesFor(value.footprint)
      let intrudesIntoFixedCore = false
      let exceedsHostPitch = false
      if (axes.halfCellX !== 'none') {
        const nominalWidth = halfEnvelopeNominalSize(
          value.profile as OpenGridSnapProfile,
          'X',
          axes.halfCellX,
        )
        intrudesIntoFixedCore ||=
          nominalWidth + offset <= snapFixedCoreAxisSize(axes.halfCellX)
        exceedsHostPitch ||=
          nominalWidth + offset > halfCellHostPitch(axes.halfCellX)
      }
      if (axes.halfCellY !== 'none') {
        const nominalDepth = halfEnvelopeNominalSize(
          value.profile as OpenGridSnapProfile,
          'Y',
          axes.halfCellY,
        )
        intrudesIntoFixedCore ||=
          nominalDepth + offset <= snapFixedCoreAxisSize(axes.halfCellY)
        exceedsHostPitch ||=
          nominalDepth + offset > halfCellHostPitch(axes.halfCellY)
      }
      if (intrudesIntoFixedCore) {
        issues.push({
          field: 'offset',
          message: '外框增量會侵入中央 Snap 固定區域。',
        })
      }
      if (exceedsHostPitch) {
        issues.push({
          field: 'offset',
          message: '外框增量會超過所選格型的宿主格距。',
        })
      }
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  return {
    valid: true,
    value: {
      variant: value.variant as OpenGridSnapVariant,
      profile: value.profile as OpenGridSnapProfile,
      offset: value.offset as number,
      footprint: value.footprint as OpenGridSnapFootprint,
      fourCornerLocatingHoles: value.fourCornerLocatingHoles as boolean,
      centerRemoverHole: value.centerRemoverHole as boolean,
    },
  }
}

export function normalizeOpenGridSnapParameters(value: unknown): unknown {
  if (!isRecord(value)) return value

  const normalized = { ...value }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'profile')) {
    normalized.profile = 'Standard'
  }
  if (
    !Object.prototype.hasOwnProperty.call(normalized, 'fourCornerLocatingHoles')
  ) {
    normalized.fourCornerLocatingHoles = false
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'centerRemoverHole')) {
    normalized.centerRemoverHole = false
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'footprint')) {
    return normalized
  }

  const hasHalfCellX = Object.prototype.hasOwnProperty.call(
    normalized,
    'halfCellX',
  )
  const hasHalfCellY = Object.prototype.hasOwnProperty.call(
    normalized,
    'halfCellY',
  )
  const legacyFootprint = openGridSnapFootprintForLegacyAxes(
    hasHalfCellX ? normalized.halfCellX : 'none',
    hasHalfCellY ? normalized.halfCellY : 'none',
  )
  if (legacyFootprint === null) return normalized

  const {
    halfCellX: _halfCellX,
    halfCellY: _halfCellY,
    ...withoutLegacyAxes
  } = normalized
  return { ...withoutLegacyAxes, footprint: legacyFootprint }
}

export function isOpenGridSnapParameters(
  value: unknown,
): value is OpenGridSnapParameters {
  return validateOpenGridSnapParameters(value).valid
}

function snapNominalSizeForFootprint(
  profile: OpenGridSnapProfile,
  axis: 'X' | 'Y',
  footprint: OpenGridSnapFootprint,
): number {
  const axes = openGridSnapCanonicalAxesFor(footprint)
  const direction = axis === 'X' ? axes.halfCellX : axes.halfCellY
  return halfEnvelopeNominalSize(profile, axis, direction)
}

export function boundsForOpenGridSnap(
  parameters: Pick<
    OpenGridSnapParameters,
    'variant' | 'profile' | 'offset' | 'footprint'
  >,
): OpenGridSnapBounds {
  if (parameters.profile === 'Directional') {
    return directionalBoundsFor(parameters)
  }

  const width =
    snapNominalSizeForFootprint('Standard', 'X', parameters.footprint) +
    parameters.offset
  const depth =
    snapNominalSizeForFootprint('Standard', 'Y', parameters.footprint) +
    parameters.offset
  return {
    min: [-width / 2, -depth / 2, 0],
    max: [
      width / 2,
      depth / 2,
      OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant],
    ],
  }
}

function directionalBoundsFor(
  parameters: Pick<OpenGridSnapParameters, 'variant' | 'offset' | 'footprint'>,
): OpenGridSnapBounds {
  const axes = openGridSnapCanonicalAxesFor(parameters.footprint)
  const baseMinY = -12.801
  const baseMaxY = 13.201
  const baseCenterY = (baseMinY + baseMaxY) / 2
  const fullWidth = 25.602 + parameters.offset
  const fullDepth = baseMaxY - baseMinY + parameters.offset

  let width = fullWidth
  let depth = fullDepth
  let centerY = baseCenterY
  if (axes.halfCellX !== 'none') {
    width = 12.801 + parameters.offset
  }
  if (axes.halfCellY !== 'none') {
    if (axes.halfCellY === 'top') {
      depth = 13.201 + parameters.offset
    } else {
      depth = 12.801 + parameters.offset
    }
    centerY = 0
  }

  return {
    min: [-width / 2, centerY - depth / 2, -0.001],
    max: [
      width / 2,
      centerY + depth / 2,
      openGridSnapHeightFor(parameters.variant) + 0.001,
    ],
  }
}

export function openGridSnapFileName(
  parameters: OpenGridSnapParameters,
): string {
  if (parameters.footprint === 'half') return 'Half.step'
  if (parameters.footprint === 'quarter') return 'Quarter.step'
  return `opengrid-snap-${parameters.profile.toLowerCase()}-${parameters.variant.toLowerCase()}-offset${formatNumber(parameters.offset)}-${parameters.footprint}-corners${parameters.fourCornerLocatingHoles ? 1 : 0}-center${parameters.centerRemoverHole ? 1 : 0}.step`
}

export function openGridSnapStlFileName(
  parameters: OpenGridSnapParameters,
): string {
  return `opengrid-snap-${parameters.profile.toLowerCase()}-${parameters.variant.toLowerCase()}-offset${formatNumber(parameters.offset)}-${parameters.footprint}-corners${parameters.fourCornerLocatingHoles ? 1 : 0}-center${parameters.centerRemoverHole ? 1 : 0}.stl`
}

export function openGridSnapHeightFor(variant: OpenGridSnapVariant): number {
  return OPENGRID_SNAP_CONFIGURATION.variantHeights[variant]
}

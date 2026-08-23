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
export type OpenGridSnapMagnetHoleShape = 'none' | 'square' | 'round'

export type OpenGridSnapParameterKey =
  | 'variant'
  | 'profile'
  | 'offset'
  | 'footprint'
  | 'fourCornerLocatingHoles'
  | 'centerRemoverHole'
  | 'openConnect'
  | 'magnetHoleShape'
  | 'magnetHoleLength'
  | 'magnetHoleWidth'
  | 'magnetHoleDiameter'
  | 'magnetHoleThickness'

export type OpenGridSnapParameters = {
  variant: OpenGridSnapVariant
  profile: OpenGridSnapProfile
  /** Total X and Y envelope increment in millimetres, applied symmetrically. */
  offset: number
  footprint: OpenGridSnapFootprint
  fourCornerLocatingHoles: boolean
  centerRemoverHole: boolean
  openConnect: boolean
  magnetHoleShape: OpenGridSnapMagnetHoleShape
  magnetHoleLength: number
  magnetHoleWidth: number
  magnetHoleDiameter: number
  magnetHoleThickness: number
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
  messageId: string
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
  magnetHole: {
    minPlanDimension: 1,
    defaultPlanDimension: 5,
    minThickness: 1,
    defaultThickness: 2,
    maxPlanDimension: 15,
    dimensionStep: 0.05,
    openingWidth: 2,
    maxThickness: {
      Full: 6,
      Lite: 3.2,
    } satisfies Record<OpenGridSnapVariant, number>,
  },
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
    openConnect: true,
    magnetHoleShape: 'none' as OpenGridSnapMagnetHoleShape,
    magnetHoleLength: 0,
    magnetHoleWidth: 0,
    magnetHoleDiameter: 0,
    magnetHoleThickness: 0,
  } satisfies OpenGridSnapParameters,
} as const

const PARAMETER_KEYS: readonly OpenGridSnapParameterKey[] = [
  'variant',
  'profile',
  'offset',
  'footprint',
  'fourCornerLocatingHoles',
  'centerRemoverHole',
  'openConnect',
  'magnetHoleShape',
  'magnetHoleLength',
  'magnetHoleWidth',
  'magnetHoleDiameter',
  'magnetHoleThickness',
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

export function isOpenGridSnapMagnetHoleShape(
  value: unknown,
): value is OpenGridSnapMagnetHoleShape {
  return value === 'none' || value === 'square' || value === 'round'
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
      issues: [{ field: 'parameters', messageId: 'validation.invalid' }],
    }
  }

  const issues: OpenGridSnapValidationIssue[] = []
  if (!hasExactKeys(value, PARAMETER_KEYS)) {
    issues.push({
      field: 'parameters',
      messageId: 'validation.invalid',
    })
  }

  if (!isOpenGridSnapVariant(value.variant)) {
    issues.push({ field: 'variant', messageId: 'validation.invalid' })
  }
  if (!isOpenGridSnapProfile(value.profile)) {
    issues.push({
      field: 'profile',
      messageId: 'validation.invalid',
    })
  }
  if (!isOpenGridSnapFootprint(value.footprint)) {
    issues.push({
      field: 'footprint',
      messageId: 'validation.invalid',
    })
  }
  if (typeof value.fourCornerLocatingHoles !== 'boolean') {
    issues.push({
      field: 'fourCornerLocatingHoles',
      messageId: 'validation.invalid',
    })
  }
  if (typeof value.centerRemoverHole !== 'boolean') {
    issues.push({
      field: 'centerRemoverHole',
      messageId: 'validation.invalid',
    })
  }
  if (typeof value.openConnect !== 'boolean') {
    issues.push({
      field: 'openConnect',
      messageId: 'validation.invalid',
    })
  }
  if (
    value.openConnect === true &&
    isOpenGridSnapFootprint(value.footprint) &&
    value.footprint !== 'full'
  ) {
    issues.push({
      field: 'openConnect',
      messageId: 'validation.invalid',
    })
  }

  if (!isOpenGridSnapMagnetHoleShape(value.magnetHoleShape)) {
    issues.push({
      field: 'magnetHoleShape',
      messageId: 'validation.invalid',
    })
  }

  const magnetDimensionKeys = [
    'magnetHoleLength',
    'magnetHoleWidth',
    'magnetHoleDiameter',
    'magnetHoleThickness',
  ] as const
  const magnetDimensions = magnetDimensionKeys.map((key) => ({
    key,
    value: value[key],
  }))
  const magnetDimensionsAreNumbers = magnetDimensions.every(
    ({ key, value: dimension }) => {
      if (typeof dimension === 'number' && Number.isFinite(dimension)) {
        return true
      }
      issues.push({ field: key, messageId: 'validation.invalid' })
      return false
    },
  )

  const offset = value.offset
  if (typeof offset !== 'number' || !Number.isFinite(offset)) {
    issues.push({ field: 'offset', messageId: 'validation.invalid' })
  } else {
    if (
      offset < OPENGRID_SNAP_CONFIGURATION.minOffset ||
      offset > OPENGRID_SNAP_CONFIGURATION.maxOffset
    ) {
      issues.push({
        field: 'offset',
        messageId: 'validation.invalid',
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
        messageId: 'validation.invalid',
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
          messageId: 'validation.invalid',
        })
      }
      if (exceedsHostPitch) {
        issues.push({
          field: 'offset',
          messageId: 'validation.invalid',
        })
      }
    }
  }

  if (
    isOpenGridSnapMagnetHoleShape(value.magnetHoleShape) &&
    magnetDimensionsAreNumbers
  ) {
    const length = value.magnetHoleLength as number
    const width = value.magnetHoleWidth as number
    const diameter = value.magnetHoleDiameter as number
    const thickness = value.magnetHoleThickness as number
    const addDimensionIssue = (
      key: (typeof magnetDimensionKeys)[number],
    ): void => {
      issues.push({ field: key, messageId: 'validation.invalid' })
    }

    if (value.magnetHoleShape === 'none') {
      for (const { key, value: dimension } of magnetDimensions) {
        if (dimension !== 0) addDimensionIssue(key)
      }
    } else {
      if (value.footprint !== 'full') {
        issues.push({
          field: 'magnetHoleShape',
          messageId: 'validation.invalid',
        })
      }
      if (value.fourCornerLocatingHoles === true) {
        issues.push({
          field: 'fourCornerLocatingHoles',
          messageId: 'validation.invalid',
        })
      }
      if (value.centerRemoverHole === true) {
        issues.push({
          field: 'centerRemoverHole',
          messageId: 'validation.invalid',
        })
      }

      const minPlanDimension =
        OPENGRID_SNAP_CONFIGURATION.magnetHole.minPlanDimension
      const minThickness = OPENGRID_SNAP_CONFIGURATION.magnetHole.minThickness
      const maxPlanDimension =
        OPENGRID_SNAP_CONFIGURATION.magnetHole.maxPlanDimension
      const maxThickness = isOpenGridSnapVariant(value.variant)
        ? OPENGRID_SNAP_CONFIGURATION.magnetHole.maxThickness[value.variant]
        : Number.POSITIVE_INFINITY
      const validatePositiveDimension = (
        key: (typeof magnetDimensionKeys)[number],
        dimension: number,
        maximum: number,
        minimum: number = minPlanDimension,
      ): void => {
        if (
          !Number.isFinite(dimension) ||
          dimension < minimum ||
          dimension > maximum
        ) {
          addDimensionIssue(key)
        }
      }

      if (value.magnetHoleShape === 'square') {
        validatePositiveDimension('magnetHoleLength', length, maxPlanDimension)
        validatePositiveDimension('magnetHoleWidth', width, maxPlanDimension)
        validatePositiveDimension(
          'magnetHoleThickness',
          thickness,
          maxThickness,
          minThickness,
        )
        if (diameter !== 0) addDimensionIssue('magnetHoleDiameter')
      } else {
        validatePositiveDimension(
          'magnetHoleDiameter',
          diameter,
          maxPlanDimension,
        )
        validatePositiveDimension(
          'magnetHoleThickness',
          thickness,
          maxThickness,
          minThickness,
        )
        if (length !== 0) addDimensionIssue('magnetHoleLength')
        if (width !== 0) addDimensionIssue('magnetHoleWidth')
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
      openConnect: value.openConnect as boolean,
      magnetHoleShape: value.magnetHoleShape as OpenGridSnapMagnetHoleShape,
      magnetHoleLength: value.magnetHoleLength as number,
      magnetHoleWidth: value.magnetHoleWidth as number,
      magnetHoleDiameter: value.magnetHoleDiameter as number,
      magnetHoleThickness: value.magnetHoleThickness as number,
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
  if (!Object.prototype.hasOwnProperty.call(normalized, 'openConnect')) {
    normalized.openConnect = true
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'magnetHoleShape')) {
    normalized.magnetHoleShape = 'none'
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'magnetHoleLength')) {
    normalized.magnetHoleLength = 0
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'magnetHoleWidth')) {
    normalized.magnetHoleWidth = 0
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'magnetHoleDiameter')) {
    normalized.magnetHoleDiameter = 0
  }
  if (
    !Object.prototype.hasOwnProperty.call(normalized, 'magnetHoleThickness')
  ) {
    normalized.magnetHoleThickness = 0
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'footprint')) {
    if (typeof normalized.openConnect === 'boolean') {
      normalized.openConnect = normalized.footprint === 'full'
    }
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
  const openConnect =
    typeof normalized.openConnect === 'boolean'
      ? legacyFootprint === 'full'
      : normalized.openConnect
  return {
    ...withoutLegacyAxes,
    footprint: legacyFootprint,
    openConnect,
  }
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
  return `opengrid-snap-${parameters.profile.toLowerCase()}-${parameters.variant.toLowerCase()}-offset${formatNumber(parameters.offset)}-${parameters.footprint}-corners${parameters.fourCornerLocatingHoles ? 1 : 0}-center${parameters.centerRemoverHole ? 1 : 0}${openGridSnapOpenConnectFileNameSuffix(parameters)}${openGridSnapMagnetFileNameSuffix(parameters)}.step`
}

export function openGridSnapStlFileName(
  parameters: OpenGridSnapParameters,
): string {
  return `opengrid-snap-${parameters.profile.toLowerCase()}-${parameters.variant.toLowerCase()}-offset${formatNumber(parameters.offset)}-${parameters.footprint}-corners${parameters.fourCornerLocatingHoles ? 1 : 0}-center${parameters.centerRemoverHole ? 1 : 0}${openGridSnapOpenConnectFileNameSuffix(parameters)}${openGridSnapMagnetFileNameSuffix(parameters)}.stl`
}

function openGridSnapOpenConnectFileNameSuffix(
  parameters: OpenGridSnapParameters,
): string {
  return parameters.footprint === 'full' || parameters.openConnect
    ? '-openconnect'
    : ''
}

function openGridSnapMagnetFileNameSuffix(
  parameters: OpenGridSnapParameters,
): string {
  if (parameters.magnetHoleShape === 'none') return ''
  if (parameters.magnetHoleShape === 'square') {
    return `-magnet-square-l${formatNumber(parameters.magnetHoleLength)}-w${formatNumber(parameters.magnetHoleWidth)}-t${formatNumber(parameters.magnetHoleThickness)}`
  }
  return `-magnet-round-d${formatNumber(parameters.magnetHoleDiameter)}-t${formatNumber(parameters.magnetHoleThickness)}`
}

export function openGridSnapHeightFor(variant: OpenGridSnapVariant): number {
  return OPENGRID_SNAP_CONFIGURATION.variantHeights[variant]
}

export type OpenGridStackableCylinderParameterKey =
  | 'diameter'
  | 'height'
  | 'thinBottomMode'
  | 'bottomPlateMode'
  | 'bottomHolesEnabled'

export type OpenGridStackableCylinderProfile =
  'default' | 'thin' | 'bottom-plate'

export type OpenGridStackableCylinderParameters = {
  diameter: number
  height: number
  thinBottomMode: boolean
  bottomPlateMode: boolean
  bottomHolesEnabled: boolean
}

export type OpenGridStackableCylinderPoint2D = [number, number]

export type OpenGridStackableCylinderValidationIssue = {
  field: OpenGridStackableCylinderParameterKey | 'parameters'
  message: string
}

export type OpenGridStackableCylinderValidation =
  | { valid: true; value: OpenGridStackableCylinderParameters }
  | { valid: false; issues: OpenGridStackableCylinderValidationIssue[] }

export const OPENGRID_STACKABLE_CYLINDER_CONFIGURATION = {
  defaultDiameter: 56,
  minDiameter: 20,
  maxDiameter: 300,
  defaultHeight: 30,
  minHeight: 10,
  maxHeight: 500,
  inputStep: 1,
  wallThickness: 2,
  defaultFloorThickness: 5,
  thinFloorThickness: 3,
  floorThickness: 3,
  bottomHoleDiameter: 5.05,
  innerHoleDiameter: 7.05,
  defaultBottomHoleSectionDepth: 4,
  thinBottomHoleSectionDepth: 2,
  bottomHoleSectionDepth: 2,
  innerHoleSectionDepth: 1,
  innerFloorFilletRadius: 0.6,
  holeGridPitch: 14,
  outerEdgeClearance: 2,
  flatFloorClearance: 2,
  stackGrooveDepth: 0.8,
  stackFitClearance: 0.2,
  bottomProtrusionInset: 2,
  bottomFootBevel: 0.8,
  bottomVerticalHeight: 2.6,
  topInnerChamfer: 2,
  topInnerChamferLand: 0,
  bottomOuterChamfer: 2,
} as const

export const OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS = {
  diameter: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultDiameter,
  height: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultHeight,
  thinBottomMode: false,
  bottomPlateMode: false,
  bottomHolesEnabled: true,
} as const satisfies OpenGridStackableCylinderParameters

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

function validateIntegerField(
  value: unknown,
  field: OpenGridStackableCylinderParameterKey,
  min: number,
  max: number,
  issues: OpenGridStackableCylinderValidationIssue[],
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ field, message: '必須是有限的整數。' })
    return
  }
  if (!Number.isSafeInteger(value)) {
    issues.push({ field, message: '只接受安全範圍內的整數 mm。' })
    return
  }
  if (value < min || value > max) {
    issues.push({ field, message: `必須介於 ${min}–${max} mm。` })
  }
}

function validateBooleanField(
  value: unknown,
  field: 'thinBottomMode' | 'bottomPlateMode' | 'bottomHolesEnabled',
  issues: OpenGridStackableCylinderValidationIssue[],
): void {
  if (typeof value !== 'boolean') {
    issues.push({ field, message: '必須是布林值。' })
  }
}

export function validateOpenGridStackableCylinderParameters(
  value: unknown,
): OpenGridStackableCylinderValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        {
          field: 'parameters',
          message: '需要提供 OpenGrid 可堆疊圓柱參數。',
        },
      ],
    }
  }

  const issues: OpenGridStackableCylinderValidationIssue[] = []
  const isLegacyParameters = hasExactKeys(value, ['diameter', 'height'])
  const hasLegacyModeParameters = hasExactKeys(value, [
    'diameter',
    'height',
    'thinBottomMode',
    'bottomHolesEnabled',
  ])
  const hasCurrentParameters = hasExactKeys(value, [
    'diameter',
    'height',
    'thinBottomMode',
    'bottomPlateMode',
    'bottomHolesEnabled',
  ])
  if (
    !isLegacyParameters &&
    !hasLegacyModeParameters &&
    !hasCurrentParameters
  ) {
    issues.push({ field: 'parameters', message: '包含不支援的參數欄位。' })
  }

  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  validateIntegerField(
    value.diameter,
    'diameter',
    configuration.minDiameter,
    configuration.maxDiameter,
    issues,
  )
  validateIntegerField(
    value.height,
    'height',
    configuration.minHeight,
    configuration.maxHeight,
    issues,
  )

  if (hasLegacyModeParameters || hasCurrentParameters) {
    validateBooleanField(value.thinBottomMode, 'thinBottomMode', issues)
    if (hasCurrentParameters) {
      validateBooleanField(value.bottomPlateMode, 'bottomPlateMode', issues)
    }
    validateBooleanField(value.bottomHolesEnabled, 'bottomHolesEnabled', issues)
  }
  if (
    hasCurrentParameters &&
    value.thinBottomMode === true &&
    value.bottomPlateMode === true
  ) {
    issues.push({
      field: 'parameters',
      message: '薄底模式與底板模式不可同時開啟。',
    })
  }

  if (issues.length > 0) return { valid: false, issues }
  return {
    valid: true,
    value: {
      diameter: value.diameter as number,
      height: value.height as number,
      thinBottomMode:
        hasLegacyModeParameters || hasCurrentParameters
          ? (value.thinBottomMode as boolean)
          : false,
      bottomPlateMode: hasCurrentParameters
        ? (value.bottomPlateMode as boolean)
        : false,
      bottomHolesEnabled:
        hasLegacyModeParameters || hasCurrentParameters
          ? (value.bottomHolesEnabled as boolean)
          : true,
    },
  }
}

export function isOpenGridStackableCylinderParameters(
  value: unknown,
): value is OpenGridStackableCylinderParameters {
  return validateOpenGridStackableCylinderParameters(value).valid
}

export function boundsForOpenGridStackableCylinder(
  parameters: OpenGridStackableCylinderParameters,
) {
  const radius = parameters.diameter / 2
  return {
    min: [-radius, -radius, 0] as [number, number, number],
    max: [radius, radius, parameters.height] as [number, number, number],
  }
}

export type OpenGridStackableCylinderDerivedGeometry = {
  profile: OpenGridStackableCylinderProfile
  floorThickness: number
  bottomHoleSectionDepth: number
  innerFloorFilletRadius: number
  radius: number
  innerRadius: number
  matingProtrusionRadius: number
  lowerFootRadius: number
  outerTransitionStartRadius: number
  outerTransitionStartZ: number
  outerTransitionEndRadius: number
  outerTransitionEndZ: number
  flatFloorRadius: number
  flatFloorZ: number
  innerRampEndRadius: number
  innerRampEndZ: number
}

function profileForParameters(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderProfile {
  if (parameters.bottomPlateMode === true) return 'bottom-plate'
  if (parameters.thinBottomMode === true) return 'thin'
  return 'default'
}

export function openGridStackableCylinderDerivedGeometryFor(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderDerivedGeometry {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const profile = profileForParameters(parameters)
  const radius = parameters.diameter / 2
  const innerRadius = radius - configuration.wallThickness
  const matingProtrusionRadius = innerRadius - configuration.stackFitClearance
  const isBottomPlate = profile === 'bottom-plate'
  const outerTransitionStartRadius = isBottomPlate
    ? matingProtrusionRadius
    : radius - configuration.wallThickness
  const outerTransitionStartZ = isBottomPlate
    ? 0
    : configuration.bottomVerticalHeight
  const outerTransitionEndRadius = radius
  const outerTransitionEndZ =
    outerTransitionStartZ +
    (outerTransitionEndRadius - outerTransitionStartRadius)
  const floorThickness =
    profile === 'default'
      ? configuration.defaultFloorThickness
      : configuration.thinFloorThickness
  const bottomHoleSectionDepth =
    profile === 'default'
      ? configuration.defaultBottomHoleSectionDepth
      : configuration.thinBottomHoleSectionDepth
  const innerFloorFilletRadius =
    profile === 'thin' ? 0 : configuration.innerFloorFilletRadius
  const innerRampEndRadius = innerRadius
  const innerRampEndZ =
    profile === 'thin'
      ? configuration.bottomVerticalHeight +
        configuration.wallThickness * Math.SQRT2
      : floorThickness + innerFloorFilletRadius
  const flatFloorZ = floorThickness
  const flatFloorRadius =
    profile === 'thin'
      ? innerRampEndRadius - (innerRampEndZ - flatFloorZ)
      : innerRampEndRadius - innerFloorFilletRadius
  const lowerFootRadius = isBottomPlate
    ? matingProtrusionRadius
    : matingProtrusionRadius - configuration.bottomFootBevel

  return {
    profile,
    floorThickness,
    bottomHoleSectionDepth,
    innerFloorFilletRadius,
    radius,
    innerRadius,
    matingProtrusionRadius,
    lowerFootRadius,
    outerTransitionStartRadius,
    outerTransitionStartZ,
    outerTransitionEndRadius,
    outerTransitionEndZ,
    flatFloorRadius,
    flatFloorZ,
    innerRampEndRadius,
    innerRampEndZ,
  }
}

export function openGridStackableCylinderOuterHoleIndexFor(
  parameters: OpenGridStackableCylinderParameters,
): number {
  if (parameters.bottomHolesEnabled === false) return 0
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const largestHoleRadius =
    Math.max(
      configuration.bottomHoleDiameter,
      configuration.innerHoleDiameter,
    ) / 2
  const outerAvailableRadius =
    derived.radius - configuration.outerEdgeClearance - largestHoleRadius
  const flatFloorAvailableRadius =
    derived.flatFloorRadius -
    configuration.flatFloorClearance -
    largestHoleRadius
  const availableRadius =
    derived.profile === 'thin'
      ? Math.min(outerAvailableRadius, flatFloorAvailableRadius)
      : outerAvailableRadius
  return Math.max(0, Math.floor(availableRadius / configuration.holeGridPitch))
}

export function openGridStackableCylinderHoleCentersFor(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderPoint2D[] {
  if (parameters.bottomHolesEnabled === false) return []
  const centers: OpenGridStackableCylinderPoint2D[] = [[0, 0]]
  const index = openGridStackableCylinderOuterHoleIndexFor(parameters)
  if (index < 1) return centers

  const offset = index * OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.holeGridPitch
  centers.push([offset, 0], [-offset, 0], [0, offset], [0, -offset])
  return centers
}

function modeSuffixFor(
  parameters: OpenGridStackableCylinderParameters,
): string {
  if (parameters.bottomPlateMode === true) return '-bottom-plate'
  if (parameters.thinBottomMode === true) return '-thin'
  return ''
}

export function openGridStackableCylinderFileName(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const holesSuffix = parameters.bottomHolesEnabled === false ? '-no-holes' : ''
  return `opengrid-stackable-cylinder-d${parameters.diameter}-h${parameters.height}${modeSuffix}${holesSuffix}.step`
}

export function openGridStackableCylinderStlFileName(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const holesSuffix = parameters.bottomHolesEnabled === false ? '-no-holes' : ''
  return `opengrid-stackable-cylinder-d${parameters.diameter}-h${parameters.height}${modeSuffix}${holesSuffix}.stl`
}

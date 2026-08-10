export type OpenGridStackableCylinderParameterKey =
  | 'diameter'
  | 'height'
  | 'thinBottomMode'
  | 'bottomPlateMode'
  | 'bottomHolesEnabled'
  | 'openingPlusXDepth'
  | 'openingPlusXBottomLength'
  | 'openingPlusXAngle'
  | 'openingMinusXDepth'
  | 'openingMinusXBottomLength'
  | 'openingMinusXAngle'
  | 'openingPlusYDepth'
  | 'openingPlusYBottomLength'
  | 'openingPlusYAngle'
  | 'openingMinusYDepth'
  | 'openingMinusYBottomLength'
  | 'openingMinusYAngle'

export type OpenGridStackableCylinderOpeningDirection =
  '+X' | '-X' | '+Y' | '-Y'

export type OpenGridStackableCylinderProfile =
  'default' | 'thin' | 'bottom-plate'

export type OpenGridStackableCylinderParameters = {
  diameter: number
  height: number
  thinBottomMode: boolean
  bottomPlateMode: boolean
  bottomHolesEnabled: boolean
} & Record<OpenGridStackableCylinderOpeningParameterKey, number>

export type OpenGridStackableCylinderOpeningParameterKey =
  | 'openingPlusXDepth'
  | 'openingPlusXBottomLength'
  | 'openingPlusXAngle'
  | 'openingMinusXDepth'
  | 'openingMinusXBottomLength'
  | 'openingMinusXAngle'
  | 'openingPlusYDepth'
  | 'openingPlusYBottomLength'
  | 'openingPlusYAngle'
  | 'openingMinusYDepth'
  | 'openingMinusYBottomLength'
  | 'openingMinusYAngle'

export const OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS = [
  'openingPlusXDepth',
  'openingPlusXBottomLength',
  'openingPlusXAngle',
  'openingMinusXDepth',
  'openingMinusXBottomLength',
  'openingMinusXAngle',
  'openingPlusYDepth',
  'openingPlusYBottomLength',
  'openingPlusYAngle',
  'openingMinusYDepth',
  'openingMinusYBottomLength',
  'openingMinusYAngle',
] as const satisfies readonly OpenGridStackableCylinderOpeningParameterKey[]

export type OpenGridStackableCylinderPoint2D = [number, number]

export type OpenGridStackableCylinderDerivedOpening = {
  direction: OpenGridStackableCylinderOpeningDirection
  enabled: boolean
  depth: number
  bottomLength: number
  angle: number
  bottomZ: number
  arcRadius: number
  cornerRun: number
  cornerRise: number
  horizontalRun: number
  verticalSideHeight: number
  straightSideRun: number
  upperWidth: number
  angularHalfWidth: number
}

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
  openingDepthMin: 0,
  openingDepthMax: 500,
  openingBottomLengthMin: 1,
  openingBottomLengthMax: 300,
  openingAngleMin: 1,
  openingAngleMax: 90,
  openingCornerRadius: 2.5,
  defaultOpeningDepth: 0,
  defaultOpeningBottomLength: 1,
  defaultOpeningAngle: 90,
  openingLengthStep: 1,
  openingAngleStep: 1,
} as const

export const OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS = {
  diameter: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultDiameter,
  height: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultHeight,
  thinBottomMode: false,
  bottomPlateMode: false,
  bottomHolesEnabled: true,
  openingPlusXDepth:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
  openingPlusXBottomLength:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
  openingPlusXAngle:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
  openingMinusXDepth:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
  openingMinusXBottomLength:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
  openingMinusXAngle:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
  openingPlusYDepth:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
  openingPlusYBottomLength:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
  openingPlusYAngle:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
  openingMinusYDepth:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningDepth,
  openingMinusYBottomLength:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningBottomLength,
  openingMinusYAngle:
    OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultOpeningAngle,
} as const satisfies OpenGridStackableCylinderParameters

type OpenGridStackableCylinderOpeningValues = Pick<
  OpenGridStackableCylinderParameters,
  OpenGridStackableCylinderOpeningParameterKey
>

function defaultOpeningValues(): OpenGridStackableCylinderOpeningValues {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  return {
    openingPlusXDepth: configuration.defaultOpeningDepth,
    openingPlusXBottomLength: configuration.defaultOpeningBottomLength,
    openingPlusXAngle: configuration.defaultOpeningAngle,
    openingMinusXDepth: configuration.defaultOpeningDepth,
    openingMinusXBottomLength: configuration.defaultOpeningBottomLength,
    openingMinusXAngle: configuration.defaultOpeningAngle,
    openingPlusYDepth: configuration.defaultOpeningDepth,
    openingPlusYBottomLength: configuration.defaultOpeningBottomLength,
    openingPlusYAngle: configuration.defaultOpeningAngle,
    openingMinusYDepth: configuration.defaultOpeningDepth,
    openingMinusYBottomLength: configuration.defaultOpeningBottomLength,
    openingMinusYAngle: configuration.defaultOpeningAngle,
  }
}

function openingValuesFor(
  value: Record<string, unknown>,
  hasCurrentParameters: boolean,
): OpenGridStackableCylinderOpeningValues {
  if (!hasCurrentParameters) return defaultOpeningValues()
  return {
    openingPlusXDepth: value.openingPlusXDepth as number,
    openingPlusXBottomLength: value.openingPlusXBottomLength as number,
    openingPlusXAngle: value.openingPlusXAngle as number,
    openingMinusXDepth: value.openingMinusXDepth as number,
    openingMinusXBottomLength: value.openingMinusXBottomLength as number,
    openingMinusXAngle: value.openingMinusXAngle as number,
    openingPlusYDepth: value.openingPlusYDepth as number,
    openingPlusYBottomLength: value.openingPlusYBottomLength as number,
    openingPlusYAngle: value.openingPlusYAngle as number,
    openingMinusYDepth: value.openingMinusYDepth as number,
    openingMinusYBottomLength: value.openingMinusYBottomLength as number,
    openingMinusYAngle: value.openingMinusYAngle as number,
  }
}

function openingFieldRangeFor(
  key: OpenGridStackableCylinderOpeningParameterKey,
): { min: number; max: number; unit: 'mm' | '°' } {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  if (key.endsWith('Angle')) {
    return {
      min: configuration.openingAngleMin,
      max: configuration.openingAngleMax,
      unit: '°',
    }
  }
  if (key.endsWith('BottomLength')) {
    return {
      min: configuration.openingBottomLengthMin,
      max: configuration.openingBottomLengthMax,
      unit: 'mm',
    }
  }
  return {
    min: configuration.openingDepthMin,
    max: configuration.openingDepthMax,
    unit: 'mm',
  }
}

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
  unit = 'mm',
): void {
  const unitSuffix = unit === '°' ? ' °' : ''
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ field, message: `必須是有限的整數${unitSuffix}。` })
    return
  }
  if (!Number.isSafeInteger(value)) {
    issues.push({ field, message: `只接受安全範圍內的整數${unitSuffix}。` })
    return
  }
  if (value < min || value > max) {
    issues.push({ field, message: `必須介於 ${min}–${max}${unitSuffix}。` })
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

function openingValidationIssuesFor(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderValidationIssue[] {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const issues: OpenGridStackableCylinderValidationIssue[] = []

  for (const direction of OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS) {
    const opening = derived.openings[direction]
    if (!opening.enabled) continue
    const keys = OPENING_KEYS_BY_DIRECTION[direction]
    if (opening.bottomLength < configuration.openingBottomLengthMin) {
      issues.push({
        field: keys.bottomLength,
        message: '啟用開口時，平底長度至少需要 1 mm。',
      })
    }
    if (opening.verticalSideHeight <= 1e-9) {
      issues.push({
        field: keys.depth,
        message: `固定 ${configuration.openingCornerRadius} mm 圓角之間需要保留直壁，目前下切深度不足。`,
      })
    }
    if (opening.bottomZ < derived.floorThickness) {
      issues.push({
        field: keys.depth,
        message: '開口底部不可切入目前底板。',
      })
    }
    if (
      opening.upperWidth >= parameters.diameter ||
      opening.angularHalfWidth >= Math.PI / 2
    ) {
      issues.push({
        field: keys.bottomLength,
        message: '開口寬度超過圓柱可用範圍。',
      })
    }
  }

  for (const [firstDirection, secondDirection] of ADJACENT_OPENING_DIRECTIONS) {
    const first = derived.openings[firstDirection]
    const second = derived.openings[secondDirection]
    if (!first.enabled || !second.enabled) continue
    if (first.angularHalfWidth + second.angularHalfWidth >= Math.PI / 2) {
      issues.push({
        field: OPENING_KEYS_BY_DIRECTION[secondDirection].depth,
        message: '相鄰開口重疊，必須保留外壁結構間隔。',
      })
    }
  }

  return issues
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
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const isLegacyParameters = hasExactKeys(value, ['diameter', 'height'])
  const hasLegacyModeParameters = hasExactKeys(value, [
    'diameter',
    'height',
    'thinBottomMode',
    'bottomHolesEnabled',
  ])
  const hasLegacyProfileParameters = hasExactKeys(value, [
    'diameter',
    'height',
    'thinBottomMode',
    'bottomPlateMode',
    'bottomHolesEnabled',
  ])
  const hasCurrentParameters = hasExactKeys(value, [
    'diameter',
    'height',
    'thinBottomMode',
    'bottomPlateMode',
    'bottomHolesEnabled',
    ...OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS,
  ])
  if (
    !isLegacyParameters &&
    !hasLegacyModeParameters &&
    !hasLegacyProfileParameters &&
    !hasCurrentParameters
  ) {
    issues.push({ field: 'parameters', message: '包含不支援的參數欄位。' })
  }

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

  const hasModeParameters =
    hasLegacyModeParameters ||
    hasLegacyProfileParameters ||
    hasCurrentParameters
  if (hasModeParameters) {
    validateBooleanField(value.thinBottomMode, 'thinBottomMode', issues)
    if (hasLegacyProfileParameters || hasCurrentParameters) {
      validateBooleanField(value.bottomPlateMode, 'bottomPlateMode', issues)
    }
    validateBooleanField(value.bottomHolesEnabled, 'bottomHolesEnabled', issues)
    if (hasCurrentParameters) {
      for (const key of OPENGRID_STACKABLE_CYLINDER_OPENING_PARAMETER_KEYS) {
        const range = openingFieldRangeFor(key)
        const maximum =
          key.endsWith('Depth') &&
          typeof value.height === 'number' &&
          Number.isFinite(value.height)
            ? Math.min(range.max, value.height)
            : range.max
        const minimum = key.endsWith('BottomLength') ? 0 : range.min
        validateIntegerField(
          value[key],
          key,
          minimum,
          maximum,
          issues,
          range.unit,
        )
      }
    }
  }
  if (
    (hasLegacyProfileParameters || hasCurrentParameters) &&
    value.thinBottomMode === true &&
    value.bottomPlateMode === true
  ) {
    issues.push({
      field: 'parameters',
      message: '薄底模式與底板模式不可同時開啟。',
    })
  }

  const openingValues = openingValuesFor(value, hasCurrentParameters)
  const normalizedValue = {
    diameter: value.diameter as number,
    height: value.height as number,
    thinBottomMode: hasModeParameters
      ? (value.thinBottomMode as boolean)
      : false,
    bottomPlateMode:
      hasLegacyProfileParameters || hasCurrentParameters
        ? (value.bottomPlateMode as boolean)
        : false,
    bottomHolesEnabled: hasModeParameters
      ? (value.bottomHolesEnabled as boolean)
      : true,
    ...openingValues,
  }
  if (issues.length === 0 && hasCurrentParameters) {
    issues.push(...openingValidationIssuesFor(normalizedValue))
  }
  if (issues.length > 0) return { valid: false, issues }
  return {
    valid: true,
    value: normalizedValue,
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
  openings: Record<
    OpenGridStackableCylinderOpeningDirection,
    OpenGridStackableCylinderDerivedOpening
  >
}

type OpenGridStackableCylinderOpeningKeys = {
  depth:
    | 'openingPlusXDepth'
    | 'openingMinusXDepth'
    | 'openingPlusYDepth'
    | 'openingMinusYDepth'
  bottomLength:
    | 'openingPlusXBottomLength'
    | 'openingMinusXBottomLength'
    | 'openingPlusYBottomLength'
    | 'openingMinusYBottomLength'
  angle:
    | 'openingPlusXAngle'
    | 'openingMinusXAngle'
    | 'openingPlusYAngle'
    | 'openingMinusYAngle'
}

const OPENING_KEYS_BY_DIRECTION: Record<
  OpenGridStackableCylinderOpeningDirection,
  OpenGridStackableCylinderOpeningKeys
> = {
  '+X': {
    depth: 'openingPlusXDepth',
    bottomLength: 'openingPlusXBottomLength',
    angle: 'openingPlusXAngle',
  },
  '-X': {
    depth: 'openingMinusXDepth',
    bottomLength: 'openingMinusXBottomLength',
    angle: 'openingMinusXAngle',
  },
  '+Y': {
    depth: 'openingPlusYDepth',
    bottomLength: 'openingPlusYBottomLength',
    angle: 'openingPlusYAngle',
  },
  '-Y': {
    depth: 'openingMinusYDepth',
    bottomLength: 'openingMinusYBottomLength',
    angle: 'openingMinusYAngle',
  },
}

export const OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS = [
  '+X',
  '-X',
  '+Y',
  '-Y',
] as const satisfies readonly OpenGridStackableCylinderOpeningDirection[]

const ADJACENT_OPENING_DIRECTIONS: ReadonlyArray<
  readonly [
    OpenGridStackableCylinderOpeningDirection,
    OpenGridStackableCylinderOpeningDirection,
  ]
> = [
  ['+X', '+Y'],
  ['+Y', '-X'],
  ['-X', '-Y'],
  ['-Y', '+X'],
]

function profileForParameters(
  parameters: OpenGridStackableCylinderParameters,
): OpenGridStackableCylinderProfile {
  if (parameters.bottomPlateMode === true) return 'bottom-plate'
  if (parameters.thinBottomMode === true) return 'thin'
  return 'default'
}

function openingGeometryForDirection(
  parameters: OpenGridStackableCylinderParameters,
  direction: OpenGridStackableCylinderOpeningDirection,
): OpenGridStackableCylinderDerivedOpening {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const keys = OPENING_KEYS_BY_DIRECTION[direction]
  const depth = parameters[keys.depth]
  const bottomLength = parameters[keys.bottomLength]
  const angle = parameters[keys.angle]
  const enabled = depth > configuration.openingDepthMin
  const bottomZ = parameters.height - depth
  if (!enabled) {
    return {
      direction,
      enabled: false,
      depth,
      bottomLength,
      angle,
      bottomZ: parameters.height,
      arcRadius: 0,
      cornerRun: 0,
      cornerRise: 0,
      horizontalRun: 0,
      verticalSideHeight: 0,
      straightSideRun: 0,
      upperWidth: 0,
      angularHalfWidth: 0,
    }
  }

  const angleRadians = (angle * Math.PI) / 180
  const arcRadius = configuration.openingCornerRadius
  const cornerRun = arcRadius * Math.sin(angleRadians)
  const cornerRise = arcRadius * (1 - Math.cos(angleRadians))
  const verticalSideHeight = depth - cornerRise * 2
  const straightSideRun =
    Math.abs(Math.cos(angleRadians)) < 1e-9
      ? 0
      : verticalSideHeight / Math.tan(angleRadians)
  const horizontalRun = cornerRun * 2 + straightSideRun
  const upperWidth = bottomLength + horizontalRun * 2
  const radius = parameters.diameter / 2
  const halfWidthRatio = upperWidth / 2 / radius
  const angularHalfWidth =
    halfWidthRatio < 1 ? Math.asin(halfWidthRatio) : Math.PI / 2

  return {
    direction,
    enabled,
    depth,
    bottomLength,
    angle,
    bottomZ,
    arcRadius,
    cornerRun,
    cornerRise,
    horizontalRun,
    verticalSideHeight,
    straightSideRun,
    upperWidth,
    angularHalfWidth,
  }
}

function openingGeometryFor(
  parameters: OpenGridStackableCylinderParameters,
  floorThickness: number,
): Record<
  OpenGridStackableCylinderOpeningDirection,
  OpenGridStackableCylinderDerivedOpening
> {
  const openings = {} as Record<
    OpenGridStackableCylinderOpeningDirection,
    OpenGridStackableCylinderDerivedOpening
  >
  for (const direction of OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS) {
    openings[direction] = openingGeometryForDirection(parameters, direction)
  }
  return openings
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
  const outerTransitionStartRadius = matingProtrusionRadius
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
  const innerRampStartRadius =
    outerTransitionStartRadius - configuration.wallThickness * Math.SQRT2
  const innerRampEndZ =
    profile === 'thin'
      ? outerTransitionStartZ + (innerRadius - innerRampStartRadius)
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
    openings: openingGeometryFor(parameters, floorThickness),
  }
}

function largestIntegerStrictlyBelow(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.ceil(value) - 1
}

export function openGridStackableCylinderOpeningBottomLengthMaximumFor(
  parameters: OpenGridStackableCylinderParameters,
  direction: OpenGridStackableCylinderOpeningDirection,
): number {
  const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const opening = derived.openings[direction]
  if (!opening.enabled) return configuration.openingBottomLengthMax
  if (opening.verticalSideHeight <= 1e-9) {
    return configuration.openingBottomLengthMin
  }

  let maximum = Math.min(
    configuration.openingBottomLengthMax,
    largestIntegerStrictlyBelow(
      parameters.diameter - opening.horizontalRun * 2,
    ),
  )

  for (const [firstDirection, secondDirection] of ADJACENT_OPENING_DIRECTIONS) {
    let neighborDirection: OpenGridStackableCylinderOpeningDirection | null =
      null
    if (firstDirection === direction) neighborDirection = secondDirection
    if (secondDirection === direction) neighborDirection = firstDirection
    if (!neighborDirection) continue

    const neighbor = derived.openings[neighborDirection]
    if (!neighbor.enabled) continue
    const remainingAngle = Math.PI / 2 - neighbor.angularHalfWidth
    if (remainingAngle <= 0) return configuration.openingBottomLengthMin

    const upperWidthLimit = parameters.diameter * Math.sin(remainingAngle)
    const neighboringMaximum = largestIntegerStrictlyBelow(
      upperWidthLimit - opening.horizontalRun * 2,
    )
    maximum = Math.min(maximum, neighboringMaximum)
  }

  return Math.max(configuration.openingBottomLengthMin, maximum)
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

function openingFingerprintFor(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
  const openingValues = OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS.map(
    (direction) => {
      const keys = OPENING_KEYS_BY_DIRECTION[direction]
      return [
        parameters[keys.depth],
        parameters[keys.bottomLength],
        parameters[keys.angle],
      ].join('-')
    },
  )
  const hasEnabledOpening = OPENGRID_STACKABLE_CYLINDER_OPENING_DIRECTIONS.some(
    (direction) => derived.openings[direction].enabled,
  )
  return hasEnabledOpening ? `-open-${openingValues.join('_')}` : ''
}

export function openGridStackableCylinderFileName(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const holesSuffix = parameters.bottomHolesEnabled === false ? '-no-holes' : ''
  const openingSuffix = openingFingerprintFor(parameters)
  return `opengrid-stackable-cylinder-d${parameters.diameter}-h${parameters.height}${modeSuffix}${holesSuffix}${openingSuffix}.step`
}

export function openGridStackableCylinderStlFileName(
  parameters: OpenGridStackableCylinderParameters,
): string {
  const modeSuffix = modeSuffixFor(parameters)
  const holesSuffix = parameters.bottomHolesEnabled === false ? '-no-holes' : ''
  const openingSuffix = openingFingerprintFor(parameters)
  return `opengrid-stackable-cylinder-d${parameters.diameter}-h${parameters.height}${modeSuffix}${holesSuffix}${openingSuffix}.stl`
}

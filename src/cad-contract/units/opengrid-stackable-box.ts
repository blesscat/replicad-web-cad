export type OpenGridStackableBoxParameterKey =
  | 'x'
  | 'y'
  | 'height'
  | 'cornerBottomHoles'
  | 'fullBottomHoleGrid'
  | 'basePlateMode'
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

export type OpenGridStackableBoxOpeningDirection = '+X' | '-X' | '+Y' | '-Y'

export type OpenGridStackableBoxOpeningParameterKey =
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

export const OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS = [
  '+X',
  '-X',
  '+Y',
  '-Y',
] as const satisfies readonly OpenGridStackableBoxOpeningDirection[]

export const OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS = [
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
] as const satisfies readonly OpenGridStackableBoxOpeningParameterKey[]

export type OpenGridStackableBoxParameters = {
  x: number
  y: number
  height: number
  cornerBottomHoles: boolean
  fullBottomHoleGrid: boolean
  basePlateMode: boolean
} & Record<OpenGridStackableBoxOpeningParameterKey, number>

export type OpenGridStackableBoxDerivedOpening = {
  direction: OpenGridStackableBoxOpeningDirection
  normalAxis: 'x' | 'y'
  tangentAxis: 'x' | 'y'
  normalSign: -1 | 1
  enabled: boolean
  depth: number
  bottomLength: number
  angle: number
  bottomZ: number
  tangentSpan: number
  straightRun: number
  horizontalRun: number
  upperWidth: number
  bridgeWidth: number
}

export type OpenGridStackableBoxDerivedGeometry = {
  activeFloorTopZ: number
  activeUpperInnerRimZ: number
  openings: Record<
    OpenGridStackableBoxOpeningDirection,
    OpenGridStackableBoxDerivedOpening
  >
}

export type OpenGridStackableBoxValidationIssue = {
  field: OpenGridStackableBoxParameterKey | 'parameters'
  message: string
}

export type OpenGridStackableBoxValidation =
  | { valid: true; value: OpenGridStackableBoxParameters }
  | { valid: false; issues: OpenGridStackableBoxValidationIssue[] }

export type OpenGridStackableBoxPoint2D = [number, number]

export const OPENGRID_STACKABLE_BOX_CONFIGURATION = {
  gridPitch: 28,
  gridStep: 0.5,
  workspaceMaxDimension: 500,
  defaultX: 2,
  defaultY: 2,
  defaultHeight: 10,
  defaultCornerBottomHoles: true,
  defaultFullBottomHoleGrid: false,
  defaultBasePlateMode: false,
  minX: 0.5,
  maxX: 17.5,
  minY: 0.5,
  maxY: 17.5,
  minHeight: 10,
  maxHeight: 500,
  heightSliderMax: 200,
  clearanceTotal: 0.15,
  wallThickness: 1.2,
  floorThickness: 1.2,
  bottomAssemblyHeight: 5,
  outerCornerRadius: 3.75,
  topRailOuterInset: 0.1,
  topRailHeight: 7.55,
  topRailWidth: 2,
  topRailInnerChamfer: 1.75,
  topRailInnerVerticalHeight: 1.2,
  topRailMiddleChamfer: 0.8,
  topRailOuterVerticalHeight: 1.8,
  topRailOuterChamfer: 2,
  stackingLeadIn: 1.75,
  bottomStackingLeadIn: 1.2,
  bottomFootChamferHeight: 0.8,
  bottomSupportBandHeight: 1.8,
  stackingClearance: 0.25,
  stackingBearingLand: 0.8,
  bottomGrooveDepth: 1.2,
  bottomGridSeamOpeningWidth: 1.6,
  bottomGridSeamBedOpeningWidth: 5.6,
  bottomGridSeamSupportOpeningWidth: 4,
  basePlateThickness: 3,
  basePlateCutoffHeight: 2,
  baseHoleDiameter: 5,
  baseHoleClearance: 0.25,
  baseHoleOffset: 7,
  baseHoleBottomOpeningDiameter: 5.05,
  baseHoleTopOpeningDiameter: 7.05,
  baseHoleStepHeight: 3,
  basePlateHoleBottomDepth: 2,
  basePlateHoleTopDepth: 1,
  bottomHoleGridPitch: 14,
  bottomHoleGridEdgeOffset: 7,
  bottomGridHoleDiameter: 5.05,
  baseFlangeDiameter: 5.8,
  baseFlangeThickness: 0.5,
  baseShaftExposure: 3,
  socketDeduplicationDistance: 5,
  openingDepthMin: 0,
  openingDepthMax: 500,
  openingBottomLengthMin: 1,
  openingBottomLengthMax: 300,
  openingAngleMin: 1,
  openingAngleMax: 90,
  openingDepthStep: 1,
  openingBottomLengthStep: 1,
  openingAngleStep: 1,
  defaultOpeningDepth: 0,
  defaultOpeningBottomLength: 1,
  defaultOpeningAngle: 90,
  openingCornerBridge: 2,
} as const

export const OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS = {
  x: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultX,
  y: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultY,
  height: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHeight,
  cornerBottomHoles:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultCornerBottomHoles,
  fullBottomHoleGrid:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultFullBottomHoleGrid,
  basePlateMode: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultBasePlateMode,
  openingPlusXDepth: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningDepth,
  openingPlusXBottomLength:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningBottomLength,
  openingPlusXAngle: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningAngle,
  openingMinusXDepth: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningDepth,
  openingMinusXBottomLength:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningBottomLength,
  openingMinusXAngle: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningAngle,
  openingPlusYDepth: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningDepth,
  openingPlusYBottomLength:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningBottomLength,
  openingPlusYAngle: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningAngle,
  openingMinusYDepth: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningDepth,
  openingMinusYBottomLength:
    OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningBottomLength,
  openingMinusYAngle: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultOpeningAngle,
} as const satisfies OpenGridStackableBoxParameters

type OpenGridStackableBoxOpeningKeys = {
  depth: OpenGridStackableBoxOpeningParameterKey & `${string}Depth`
  bottomLength: OpenGridStackableBoxOpeningParameterKey &
    `${string}BottomLength`
  angle: OpenGridStackableBoxOpeningParameterKey & `${string}Angle`
}

const OPENING_KEYS_BY_DIRECTION: Record<
  OpenGridStackableBoxOpeningDirection,
  OpenGridStackableBoxOpeningKeys
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

const LEGACY_PARAMETER_KEYS = [
  'x',
  'y',
  'height',
  'cornerBottomHoles',
  'fullBottomHoleGrid',
  'basePlateMode',
] as const

function defaultOpeningValues(): Pick<
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxOpeningParameterKey
> {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
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
): Pick<
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxOpeningParameterKey
> {
  if (!hasCurrentParameters) return defaultOpeningValues()

  const defaults = defaultOpeningValues()
  const values = {} as Pick<
    OpenGridStackableBoxParameters,
    OpenGridStackableBoxOpeningParameterKey
  >
  for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
    values[key] =
      typeof value[key] === 'number' ? (value[key] as number) : defaults[key]
  }
  return values
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

function isHalfStep(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isSafeInteger(value * 2) &&
    Number.isInteger(value * 2)
  )
}

function validateGridAxis(
  value: unknown,
  field: 'x' | 'y',
  min: number,
  max: number,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (!isHalfStep(value)) {
    issues.push({ field, message: '格數必須是 0.5 的倍數。' })
    return
  }

  if (value < min || value > max) {
    issues.push({ field, message: `格數必須介於 ${min}–${max}。` })
  }
}

function validateHeight(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ field: 'height', message: '高度必須是有限的整數 mm。' })
    return
  }
  if (!Number.isSafeInteger(value)) {
    issues.push({ field: 'height', message: '高度必須是安全範圍內的整數 mm。' })
    return
  }
  if (
    value < OPENGRID_STACKABLE_BOX_CONFIGURATION.minHeight ||
    value > OPENGRID_STACKABLE_BOX_CONFIGURATION.maxHeight
  ) {
    issues.push({
      field: 'height',
      message: `高度必須介於 ${OPENGRID_STACKABLE_BOX_CONFIGURATION.minHeight}–${OPENGRID_STACKABLE_BOX_CONFIGURATION.maxHeight} mm。`,
    })
  }
}

function validateCornerBottomHoles(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (typeof value !== 'boolean') {
    issues.push({
      field: 'cornerBottomHoles',
      message: '底部四角孔必須是布林值。',
    })
  }
}

function validateFullBottomHoleGrid(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (typeof value !== 'boolean') {
    issues.push({
      field: 'fullBottomHoleGrid',
      message: '底部全孔模式必須是布林值。',
    })
  }
}

function validateBasePlateMode(
  value: unknown,
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  if (typeof value !== 'boolean') {
    issues.push({
      field: 'basePlateMode',
      message: '底版模式必須是布林值。',
    })
  }
}

export function nominalOpenGridStackableBoxFootprintFor(
  parameters: OpenGridStackableBoxParameters,
): [number, number] {
  return [
    parameters.x * OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch -
      OPENGRID_STACKABLE_BOX_CONFIGURATION.clearanceTotal,
    parameters.y * OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch -
      OPENGRID_STACKABLE_BOX_CONFIGURATION.clearanceTotal,
  ]
}

export function openGridStackableBoxUpperInnerRimZFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  return (
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight +
    parameters.height
  )
}

export function externalOpenGridStackableBoxHeightFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  const basePlateCutoff = parameters.basePlateMode
    ? OPENGRID_STACKABLE_BOX_CONFIGURATION.basePlateCutoffHeight
    : 0
  return (
    openGridStackableBoxUpperInnerRimZFor(parameters) +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight -
    basePlateCutoff
  )
}

export function openGridStackableBoxActiveFloorTopZFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  if (parameters.basePlateMode) {
    return OPENGRID_STACKABLE_BOX_CONFIGURATION.basePlateThickness
  }
  return OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight
}

export function openGridStackableBoxActiveUpperInnerRimZFor(
  parameters: OpenGridStackableBoxParameters,
): number {
  return openGridStackableBoxActiveFloorTopZFor(parameters) + parameters.height
}

function tangentSpanFor(
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
): number {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  if (direction === '+X' || direction === '-X') return depth
  return width
}

function openingBridgeWidth(): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return Math.max(
    configuration.openingCornerBridge,
    configuration.wallThickness + configuration.stackingClearance,
  )
}

function openingValuesFromParameters(
  parameters: OpenGridStackableBoxParameters,
): Pick<
  OpenGridStackableBoxParameters,
  OpenGridStackableBoxOpeningParameterKey
> {
  return openingValuesFor(
    parameters as unknown as Record<string, unknown>,
    true,
  )
}

export function openGridStackableBoxDerivedGeometryFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxDerivedGeometry {
  const activeFloorTopZ = openGridStackableBoxActiveFloorTopZFor(parameters)
  const activeUpperInnerRimZ =
    openGridStackableBoxActiveUpperInnerRimZFor(parameters)
  const values = openingValuesFromParameters(parameters)
  const bridgeWidth = openingBridgeWidth()
  const openings = {} as Record<
    OpenGridStackableBoxOpeningDirection,
    OpenGridStackableBoxDerivedOpening
  >

  for (const direction of OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS) {
    const keys = OPENING_KEYS_BY_DIRECTION[direction]
    const depth = values[keys.depth]
    const bottomLength = values[keys.bottomLength]
    const angle = values[keys.angle]
    const tangentSpan = tangentSpanFor(parameters, direction)
    const straightRun = Math.max(
      0,
      tangentSpan - 2 * OPENGRID_STACKABLE_BOX_CONFIGURATION.outerCornerRadius,
    )
    const angleRadians = (angle * Math.PI) / 180
    const horizontalRun = depth > 0 ? depth / Math.tan(angleRadians) : 0
    const usesXNormal = direction === '+X' || direction === '-X'
    openings[direction] = {
      direction,
      normalAxis: usesXNormal ? 'x' : 'y',
      tangentAxis: usesXNormal ? 'y' : 'x',
      normalSign: direction === '+X' || direction === '+Y' ? 1 : -1,
      enabled: depth > 0,
      depth,
      bottomLength,
      angle,
      bottomZ: activeUpperInnerRimZ - depth,
      tangentSpan,
      straightRun,
      horizontalRun,
      upperWidth: bottomLength + 2 * horizontalRun,
      bridgeWidth,
    }
  }

  return { activeFloorTopZ, activeUpperInnerRimZ, openings }
}

export function openGridStackableBoxOpeningBottomLengthMaximumFor(
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
): number {
  const opening =
    openGridStackableBoxDerivedGeometryFor(parameters).openings[direction]
  const availableWidth = opening.straightRun - 2 * opening.bridgeWidth
  const maximum = Math.floor(availableWidth - 2 * opening.horizontalRun)
  return Math.max(
    0,
    Math.min(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.openingBottomLengthMax,
      maximum,
    ),
  )
}

function validateOpeningIntegerField(
  value: unknown,
  field: OpenGridStackableBoxOpeningParameterKey,
  min: number,
  max: number,
  unit: 'mm' | '°',
  issues: OpenGridStackableBoxValidationIssue[],
): void {
  const unitSuffix = unit === '°' ? ' °' : ' mm'
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push({ field, message: `必須是有限的整數${unitSuffix}。` })
    return
  }
  if (!Number.isSafeInteger(value)) {
    issues.push({ field, message: `只接受安全範圍內的整數${unitSuffix}。` })
    return
  }
  if (value < min || value > max) {
    issues.push({
      field,
      message: `必須介於 ${min}–${max}${unitSuffix}。`,
    })
  }
}

function openingValidationBoundsFor(
  key: OpenGridStackableBoxOpeningParameterKey,
  height: unknown,
): { minimum: number; maximum: number; unit: 'mm' | '°' } {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (key.endsWith('Depth')) {
    const heightMaximum =
      typeof height === 'number' && Number.isFinite(height)
        ? height
        : configuration.openingDepthMax
    return {
      minimum: configuration.openingDepthMin,
      maximum: Math.min(configuration.openingDepthMax, heightMaximum),
      unit: 'mm',
    }
  }
  if (key.endsWith('BottomLength')) {
    return {
      minimum: 0,
      maximum: configuration.openingBottomLengthMax,
      unit: 'mm',
    }
  }
  return {
    minimum: configuration.openingAngleMin,
    maximum: configuration.openingAngleMax,
    unit: '°',
  }
}

function openingValidationIssuesFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxValidationIssue[] {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const issues: OpenGridStackableBoxValidationIssue[] = []

  for (const direction of OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS) {
    const opening = derived.openings[direction]
    if (!opening.enabled) continue
    const keys = OPENING_KEYS_BY_DIRECTION[direction]
    if (opening.bottomLength < configuration.openingBottomLengthMin) {
      issues.push({
        field: keys.bottomLength,
        message: '啟用開口時，平底長度至少需要 1 mm。',
      })
    }
    if (opening.bottomZ < derived.activeFloorTopZ - 0.0001) {
      issues.push({ field: keys.depth, message: '開口底部不可切入目前底板。' })
    }
    const maximum = openGridStackableBoxOpeningBottomLengthMaximumFor(
      parameters,
      direction,
    )
    if (opening.bottomLength > maximum) {
      issues.push({
        field: keys.bottomLength,
        message: '開口寬度超過盒體直線側壁可用範圍。',
      })
    }
    if (opening.straightRun <= 2 * opening.bridgeWidth) {
      issues.push({
        field: keys.bottomLength,
        message: '盒體側壁沒有足夠的直線段保留開口結構。',
      })
    }
  }

  return issues
}

export function validateOpenGridStackableBoxParameters(
  value: unknown,
): OpenGridStackableBoxValidation {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [
        {
          field: 'parameters',
          message: '需要提供 OpenGrid 堆疊盒參數。',
        },
      ],
    }
  }

  const issues: OpenGridStackableBoxValidationIssue[] = []
  const hasLegacyParameters = hasExactKeys(value, LEGACY_PARAMETER_KEYS)
  const hasCurrentParameters = hasExactKeys(value, [
    ...LEGACY_PARAMETER_KEYS,
    ...OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS,
  ])
  if (!hasLegacyParameters && !hasCurrentParameters) {
    issues.push({ field: 'parameters', message: '包含不支援的參數欄位。' })
  }

  validateGridAxis(
    value.x,
    'x',
    OPENGRID_STACKABLE_BOX_CONFIGURATION.minX,
    OPENGRID_STACKABLE_BOX_CONFIGURATION.maxX,
    issues,
  )
  validateGridAxis(
    value.y,
    'y',
    OPENGRID_STACKABLE_BOX_CONFIGURATION.minY,
    OPENGRID_STACKABLE_BOX_CONFIGURATION.maxY,
    issues,
  )
  validateHeight(value.height, issues)
  validateCornerBottomHoles(value.cornerBottomHoles, issues)
  validateFullBottomHoleGrid(value.fullBottomHoleGrid, issues)
  validateBasePlateMode(value.basePlateMode, issues)

  if (hasCurrentParameters) {
    for (const key of OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS) {
      const bounds = openingValidationBoundsFor(key, value.height)
      validateOpeningIntegerField(
        value[key],
        key,
        bounds.minimum,
        bounds.maximum,
        bounds.unit,
        issues,
      )
    }
  }

  if (issues.length > 0) return { valid: false, issues }

  const parameters = {
    x: value.x as number,
    y: value.y as number,
    height: value.height as number,
    cornerBottomHoles: value.cornerBottomHoles as boolean,
    fullBottomHoleGrid: value.fullBottomHoleGrid as boolean,
    basePlateMode: value.basePlateMode as boolean,
    ...openingValuesFor(value, hasCurrentParameters),
  }
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  if (width > OPENGRID_STACKABLE_BOX_CONFIGURATION.workspaceMaxDimension) {
    issues.push({
      field: 'x',
      message: `X 方向寬度不得超過 ${OPENGRID_STACKABLE_BOX_CONFIGURATION.workspaceMaxDimension} mm。`,
    })
  }
  if (depth > OPENGRID_STACKABLE_BOX_CONFIGURATION.workspaceMaxDimension) {
    issues.push({
      field: 'y',
      message: `Y 方向深度不得超過 ${OPENGRID_STACKABLE_BOX_CONFIGURATION.workspaceMaxDimension} mm。`,
    })
  }

  if (issues.length > 0) return { valid: false, issues }
  if (hasCurrentParameters) {
    const openingIssues = openingValidationIssuesFor(parameters)
    if (openingIssues.length > 0) {
      return { valid: false, issues: openingIssues }
    }
  }
  return { valid: true, value: parameters }
}

export function isOpenGridStackableBoxParameters(
  value: unknown,
): value is OpenGridStackableBoxParameters {
  return validateOpenGridStackableBoxParameters(value).valid
}

function uniqueSocketAxisPositions(halfExtent: number): number[] {
  const offset = OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleOffset
  const candidates = [-halfExtent + offset, halfExtent - offset]
  const first = candidates[0]
  const second = candidates[1]
  if (first === undefined || second === undefined) return []
  if (
    Math.abs(second - first) <
    OPENGRID_STACKABLE_BOX_CONFIGURATION.socketDeduplicationDistance
  ) {
    return [(first + second) / 2]
  }
  return candidates
}

function uniqueGridEndpointPositions(positions: number[]): number[] {
  const first = positions[0]
  const last = positions[positions.length - 1]
  if (first === undefined || last === undefined) return []
  if (
    Math.abs(last - first) <
    OPENGRID_STACKABLE_BOX_CONFIGURATION.socketDeduplicationDistance
  ) {
    return [(first + last) / 2]
  }
  return [first, last]
}

export function nominalOpenGridStackableBoxBottomGridAxisPositionsFor(
  axisCount: number,
): number[] {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const halfCellCount = Math.round(axisCount / configuration.gridStep)
  const positionCount = Math.max(1, halfCellCount)
  const nominalAxisLength = axisCount * configuration.gridPitch
  const firstPosition =
    -nominalAxisLength / 2 + configuration.bottomHoleGridEdgeOffset

  return Array.from(
    { length: positionCount },
    (_, index) => firstPosition + index * configuration.bottomHoleGridPitch,
  )
}

export function nominalOpenGridStackableBoxBottomGridCentersFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxPoint2D[] {
  const xPositions = nominalOpenGridStackableBoxBottomGridAxisPositionsFor(
    parameters.x,
  )
  const yPositions = nominalOpenGridStackableBoxBottomGridAxisPositionsFor(
    parameters.y,
  )
  const centers: OpenGridStackableBoxPoint2D[] = []

  for (const x of xPositions) {
    for (const y of yPositions) centers.push([x, y])
  }

  return centers
}

export function openGridStackableBoxOrdinaryBottomHoleCentersFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxPoint2D[] {
  if (!parameters.fullBottomHoleGrid) return []

  const specialCenters = parameters.cornerBottomHoles
    ? openGridStackableBoxSocketCentersFor(parameters)
    : []
  const gridCenters =
    nominalOpenGridStackableBoxBottomGridCentersFor(parameters)
  const pitchTolerance = 0.001

  return gridCenters.filter(
    ([x, y]) =>
      !specialCenters.some(
        ([specialX, specialY]) =>
          Math.abs(x - specialX) <= pitchTolerance &&
          Math.abs(y - specialY) <= pitchTolerance,
      ),
  )
}

export function openGridStackableBoxSocketCentersFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxPoint2D[] {
  if (!parameters.cornerBottomHoles) return []

  if (parameters.fullBottomHoleGrid) {
    const xPositions = uniqueGridEndpointPositions(
      nominalOpenGridStackableBoxBottomGridAxisPositionsFor(parameters.x),
    )
    const yPositions = uniqueGridEndpointPositions(
      nominalOpenGridStackableBoxBottomGridAxisPositionsFor(parameters.y),
    )
    const centers: OpenGridStackableBoxPoint2D[] = []

    for (const x of xPositions) {
      for (const y of yPositions) centers.push([x, y])
    }

    return centers
  }

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const nominalWidth = parameters.x * configuration.gridPitch
  const nominalDepth = parameters.y * configuration.gridPitch
  const xPositions = uniqueSocketAxisPositions(nominalWidth / 2)
  const yPositions = uniqueSocketAxisPositions(nominalDepth / 2)
  const centers: OpenGridStackableBoxPoint2D[] = []
  for (const x of xPositions) {
    for (const y of yPositions) centers.push([x, y])
  }
  return centers
}

export function boundsForOpenGridStackableBox(
  parameters: OpenGridStackableBoxParameters,
) {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  return {
    min: [-width / 2, -depth / 2, 0] as [number, number, number],
    max: [
      width / 2,
      depth / 2,
      externalOpenGridStackableBoxHeightFor(parameters),
    ] as [number, number, number],
  }
}

function openingFileSuffixFor(
  parameters: OpenGridStackableBoxParameters,
): string {
  const values = openingValuesFromParameters(parameters)
  const hasEnabledOpening = OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS.some(
    (direction) => {
      const depthKey = OPENING_KEYS_BY_DIRECTION[direction].depth
      return values[depthKey] > 0
    },
  )
  if (!hasEnabledOpening) return ''

  const fingerprint = OPENGRID_STACKABLE_BOX_OPENING_PARAMETER_KEYS.map((key) =>
    String(values[key]),
  ).join('-')
  return `-open-${fingerprint}`
}

export function openGridStackableBoxFileName(
  parameters: OpenGridStackableBoxParameters,
): string {
  const modeSuffix = parameters.basePlateMode ? '-base-plate' : ''
  return `opengrid-stackable-box-${parameters.x}x${parameters.y}-h${parameters.height}${openingFileSuffixFor(parameters)}${modeSuffix}.step`
}

export function openGridStackableBoxStlFileName(
  parameters: OpenGridStackableBoxParameters,
): string {
  const modeSuffix = parameters.basePlateMode ? '-base-plate' : ''
  return `opengrid-stackable-box-${parameters.x}x${parameters.y}-h${parameters.height}${openingFileSuffixFor(parameters)}${modeSuffix}.stl`
}

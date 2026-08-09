export type OpenGridStackableBoxParameterKey =
  'x' | 'y' | 'height' | 'fullBottomHoleGrid'

export type OpenGridStackableBoxParameters = {
  x: number
  y: number
  height: number
  fullBottomHoleGrid: boolean
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
  defaultFullBottomHoleGrid: false,
  minX: 0.5,
  maxX: 17.5,
  minY: 0.5,
  maxY: 17.5,
  minHeight: 10,
  maxHeight: 500,
  clearanceTotal: 0.15,
  wallThickness: 1,
  floorThickness: 1,
  outerCornerRadius: 1,
  topRailHeight: 1,
  topRailWidth: 1.4,
  topRailBottomChamfer: 0.5,
  stackingLeadIn: 0.6,
  bottomGrooveDepth: 0.8,
  bottomGrooveWidth: 1.8,
  baseHoleDiameter: 5,
  baseHoleClearance: 0.25,
  baseHoleOffset: 7,
  baseHoleBottomOpeningDiameter: 5.05,
  baseHoleTopOpeningDiameter: 6.05,
  baseHoleChamferDepth: 0.5,
  bottomHoleGridPitch: 14,
  bottomHoleGridEdgeOffset: 7,
  bottomGridHoleDiameter: 5.05,
  baseFlangeDiameter: 5.8,
  baseFlangeThickness: 0.5,
  baseShaftExposure: 3,
  socketDeduplicationDistance: 5,
} as const

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
  if (!hasExactKeys(value, ['x', 'y', 'height', 'fullBottomHoleGrid'])) {
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
  validateFullBottomHoleGrid(value.fullBottomHoleGrid, issues)

  if (issues.length > 0) return { valid: false, issues }

  const parameters = {
    x: value.x as number,
    y: value.y as number,
    height: value.height as number,
    fullBottomHoleGrid: value.fullBottomHoleGrid as boolean,
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

  const specialCenters = openGridStackableBoxSocketCentersFor(parameters)
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

  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const xPositions = uniqueSocketAxisPositions(width / 2)
  const yPositions = uniqueSocketAxisPositions(depth / 2)
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
    max: [width / 2, depth / 2, parameters.height] as [number, number, number],
  }
}

export function openGridStackableBoxFileName(
  parameters: OpenGridStackableBoxParameters,
): string {
  return `opengrid-stackable-box-${parameters.x}x${parameters.y}-h${parameters.height}.step`
}

export function openGridStackableBoxStlFileName(
  parameters: OpenGridStackableBoxParameters,
): string {
  return `opengrid-stackable-box-${parameters.x}x${parameters.y}-h${parameters.height}.stl`
}

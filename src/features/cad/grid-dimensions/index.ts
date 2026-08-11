import {
  HSW_CELL_CONFIGURATION,
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  PROTOTYPE_CONFIGURATION,
  boundsForHswCell,
  boundsForModularGridBase,
  boundsForOpenGrid,
  boundsForOpenGridStackableBox,
  type HalfCellX,
  type HalfCellY,
  type HswCellParameters,
  type ModularGridBaseParameters,
} from '../../../cad-contract/units'

const COMPARISON_TOLERANCE = 0.000001

export type GridDimensionInput = {
  x: string
  y: string
  halfCellX?: HalfCellX
  halfCellY?: HalfCellY
}

export type GridDimensionErrors = Partial<Record<'x' | 'y', string>>

export type GridDimensionSuccess = {
  valid: true
  parameters: {
    rows: number
    columns: number
    halfCellX?: HalfCellX
    halfCellY?: HalfCellY
  }
  actualDimensions: {
    x: number
    y: number
  }
}

export type GridDimensionFailure = {
  valid: false
  errors: GridDimensionErrors
}

export type GridDimensionResult = GridDimensionSuccess | GridDimensionFailure

export type OpenGridPrintPlanInput = {
  targetX: string
  targetY: string
  printerX: string
  printerY: string
}

export type OpenGridPrintPlanErrors = Partial<
  Record<'targetX' | 'targetY' | 'printerX' | 'printerY', string>
>

export type OpenGridPrintPieceRole = 'primary' | 'edge' | 'corner'

export type OpenGridPrintPieceGroup = {
  role: OpenGridPrintPieceRole
  columns: number
  rows: number
  width: number
  depth: number
  quantity: number
}

export type OpenGridPrintPlanSuccess = {
  valid: true
  target: {
    columns: number
    rows: number
    width: number
    depth: number
  }
  printer: {
    columns: number
    rows: number
    width: number
    depth: number
  }
  primary: {
    columns: number
    rows: number
    width: number
    depth: number
  }
  pieceGroups: OpenGridPrintPieceGroup[]
  totalPieces: number
}

export type OpenGridPrintPlanFailure = {
  valid: false
  errors: OpenGridPrintPlanErrors
}

export type OpenGridPrintPlanResult =
  OpenGridPrintPlanSuccess | OpenGridPrintPlanFailure

type ParsedTargets =
  | { valid: true; x: number; y: number }
  | { valid: false; errors: GridDimensionErrors }

type BoundsSize = {
  x: number
  y: number
}

function sizeFromBounds(bounds: {
  min: [number, number, number]
  max: [number, number, number]
}): BoundsSize {
  return {
    x: bounds.max[0] - bounds.min[0],
    y: bounds.max[1] - bounds.min[1],
  }
}

function parseTarget(rawValue: string, label: string): number | string {
  const trimmedValue = rawValue.trim()
  if (!trimmedValue) return `${label} 尺寸不可空白。`

  const value = Number(trimmedValue)
  if (!Number.isFinite(value)) return `${label} 尺寸必須是有限數字。`
  if (value <= 0) return `${label} 尺寸必須大於 0 mm。`
  return value
}

function parseTargets(input: GridDimensionInput): ParsedTargets {
  const x = parseTarget(input.x, 'X')
  const y = parseTarget(input.y, 'Y')
  const errors: GridDimensionErrors = {}

  if (typeof x === 'string') errors.x = x
  if (typeof y === 'string') errors.y = y
  if (typeof x !== 'number' || typeof y !== 'number') {
    return { valid: false, errors }
  }

  return { valid: true, x, y }
}

type ParsedPrintPlanAxis = {
  targetCells: number
  printerCells: number
}

type PrintPlanAxisSegment = {
  size: number
  quantity: number
  isRemainder: boolean
}

type PrintPlanAxis = {
  targetCells: number
  printerCells: number
  mainSpan: number
  segments: PrintPlanAxisSegment[]
}

function parsePositivePrintPlanDimension(
  rawValue: string,
  label: string,
): number | string {
  const trimmedValue = rawValue.trim()
  if (!trimmedValue) return `${label} 尺寸不可空白。`

  const value = Number(trimmedValue)
  if (!Number.isFinite(value)) return `${label} 尺寸必須是有限數字。`
  if (value <= 0) return `${label} 尺寸必須大於 0 mm。`
  if (value < OPENGRID_CONFIGURATION.gridPitch) {
    return `${label} 尺寸至少需要 ${OPENGRID_CONFIGURATION.gridPitch} mm 才能放入 1 格。`
  }
  return value
}

function parsePrintPlanAxis(
  targetValue: string,
  printerValue: string,
  targetKey: 'targetX' | 'targetY',
  printerKey: 'printerX' | 'printerY',
  targetLabel: string,
  printerLabel: string,
  errors: OpenGridPrintPlanErrors,
): ParsedPrintPlanAxis | null {
  const target = parsePositivePrintPlanDimension(targetValue, targetLabel)
  const printer = parsePositivePrintPlanDimension(printerValue, printerLabel)

  if (typeof target === 'string') {
    errors[targetKey] = target
  }
  if (typeof printer === 'string') {
    errors[printerKey] = printer
  }
  if (typeof target !== 'number' || typeof printer !== 'number') return null

  const targetCells = Math.floor(target / OPENGRID_CONFIGURATION.gridPitch)
  const printerCells = Math.min(
    Math.floor(printer / OPENGRID_CONFIGURATION.gridPitch),
    OPENGRID_CONFIGURATION.maxGridCount,
  )
  return { targetCells, printerCells }
}

function practicalSpanFloor(targetCells: number, printerCells: number): number {
  const largestPossibleSpan = Math.min(targetCells, printerCells)
  return Math.max(1, Math.ceil(largestPossibleSpan / 2))
}

function choosePracticalMainSpan(
  targetCells: number,
  printerCells: number,
): number {
  const largestPossibleSpan = Math.min(targetCells, printerCells)
  const minimumPracticalSpan = practicalSpanFloor(targetCells, printerCells)

  for (
    let span = largestPossibleSpan;
    span >= minimumPracticalSpan;
    span -= 1
  ) {
    if (targetCells % span === 0) return span
  }

  let selectedSpan = minimumPracticalSpan
  let selectedRemainder = targetCells % selectedSpan
  for (
    let span = minimumPracticalSpan + 1;
    span <= largestPossibleSpan;
    span += 1
  ) {
    const remainder = targetCells % span
    const isBetterRemainder = remainder < selectedRemainder
    const isSameRemainderButLarger =
      remainder === selectedRemainder && span > selectedSpan
    if (isBetterRemainder || isSameRemainderButLarger) {
      selectedSpan = span
      selectedRemainder = remainder
    }
  }
  return selectedSpan
}

function printPlanAxisFor(
  targetCells: number,
  printerCells: number,
): PrintPlanAxis {
  const mainSpan = choosePracticalMainSpan(targetCells, printerCells)
  const fullPieceQuantity = Math.floor(targetCells / mainSpan)
  const remainder = targetCells % mainSpan
  const segments: PrintPlanAxisSegment[] = [
    {
      size: mainSpan,
      quantity: fullPieceQuantity,
      isRemainder: false,
    },
  ]

  if (remainder > 0) {
    segments.push({ size: remainder, quantity: 1, isRemainder: true })
  }

  return { targetCells, printerCells, mainSpan, segments }
}

function printPieceRoleFor(
  xSegment: PrintPlanAxisSegment,
  ySegment: PrintPlanAxisSegment,
): OpenGridPrintPieceRole {
  if (!xSegment.isRemainder && !ySegment.isRemainder) return 'primary'
  if (xSegment.isRemainder && ySegment.isRemainder) return 'corner'
  return 'edge'
}

function addPrintPieceGroup(
  groups: OpenGridPrintPieceGroup[],
  xSegment: PrintPlanAxisSegment,
  ySegment: PrintPlanAxisSegment,
): void {
  const columns = xSegment.size
  const rows = ySegment.size
  const quantity = xSegment.quantity * ySegment.quantity
  const existing = groups.find(
    (group) => group.columns === columns && group.rows === rows,
  )
  if (existing) {
    existing.quantity += quantity
    return
  }

  groups.push({
    role: printPieceRoleFor(xSegment, ySegment),
    columns,
    rows,
    width: columns * OPENGRID_CONFIGURATION.gridPitch,
    depth: rows * OPENGRID_CONFIGURATION.gridPitch,
    quantity,
  })
}

function printPieceGroupsFor(
  xAxis: PrintPlanAxis,
  yAxis: PrintPlanAxis,
): OpenGridPrintPieceGroup[] {
  const groups: OpenGridPrintPieceGroup[] = []
  for (const xSegment of xAxis.segments) {
    for (const ySegment of yAxis.segments) {
      addPrintPieceGroup(groups, xSegment, ySegment)
    }
  }
  return groups
}

function printPlanErrorsFor(input: OpenGridPrintPlanInput): {
  errors: OpenGridPrintPlanErrors
  xAxis: ParsedPrintPlanAxis | null
  yAxis: ParsedPrintPlanAxis | null
} {
  const errors: OpenGridPrintPlanErrors = {}
  const xAxis = parsePrintPlanAxis(
    input.targetX,
    input.printerX,
    'targetX',
    'printerX',
    '目標 X',
    '列印機 X',
    errors,
  )
  const yAxis = parsePrintPlanAxis(
    input.targetY,
    input.printerY,
    'targetY',
    'printerY',
    '目標 Y',
    '列印機 Y',
    errors,
  )
  return { errors, xAxis, yAxis }
}

function maxCountThatFits(
  maxCount: number,
  target: number,
  dimensionForCount: (count: number) => number,
): number {
  let countThatFits = 0

  for (let count = 1; count <= maxCount; count += 1) {
    if (dimensionForCount(count) > target + COMPARISON_TOLERANCE) break
    countThatFits = count
  }

  return countThatFits
}

function invalidMinimumDimension(
  axis: 'X' | 'Y',
  minimum: number,
  unitDescription: string,
): GridDimensionFailure {
  return {
    valid: false,
    errors: {
      [axis.toLowerCase()]: `${axis} 目標至少需要 ${minimum} mm 才能放入 ${unitDescription}。`,
    },
  }
}

function invalidMaximumDimension(
  axis: 'X' | 'Y',
  maximum: number,
  unitDescription: string,
): GridDimensionFailure {
  return {
    valid: false,
    errors: {
      [axis.toLowerCase()]: `${axis} 目標不可超過 ${maximum} mm 的 ${unitDescription}。`,
    },
  }
}

function minCountThatReachesByStep(
  minCount: number,
  maxCount: number,
  step: number,
  target: number,
  dimensionForCount: (count: number) => number,
): number {
  const candidateCountLimit = Math.floor((maxCount - minCount) / step)

  for (let index = 0; index <= candidateCountLimit; index += 1) {
    const count = minCount + index * step
    if (dimensionForCount(count) + COMPARISON_TOLERANCE >= target) {
      return count
    }
  }

  return 0
}

function openGridBoundsSize(
  rows: number,
  columns: number,
  halfCellX: HalfCellX = 'none',
  halfCellY: HalfCellY = 'none',
): BoundsSize {
  const bounds = boundsForOpenGrid({
    variant: OPENGRID_CONFIGURATION.defaultParameters.variant,
    rows,
    columns,
    halfCellX,
    halfCellY,
  })
  return sizeFromBounds(bounds)
}

export function calculateModularGridCounts(
  input: GridDimensionInput,
): GridDimensionResult {
  const targets = parseTargets(input)
  if (!targets.valid) return targets

  const modularGrid = PROTOTYPE_CONFIGURATION.modularGridBase
  const columns = maxCountThatFits(
    modularGrid.maxGridCount,
    targets.x,
    (count) =>
      sizeFromBounds(boundsForModularGridBase({ rows: 1, columns: count })).x,
  )
  const rows = maxCountThatFits(
    modularGrid.maxGridCount,
    targets.y,
    (count) =>
      sizeFromBounds(boundsForModularGridBase({ rows: count, columns: 1 })).y,
  )

  if (columns === 0) {
    return invalidMinimumDimension('X', modularGrid.cellWidth, '1 格')
  }
  if (rows === 0) {
    return invalidMinimumDimension('Y', modularGrid.cellDepth, '1 格')
  }

  const parameters: ModularGridBaseParameters = { rows, columns }
  const actualDimensions = sizeFromBounds(boundsForModularGridBase(parameters))
  return { valid: true, parameters, actualDimensions }
}

export function calculateOpenGridCounts(
  input: GridDimensionInput,
): GridDimensionResult {
  const targets = parseTargets(input)
  if (!targets.valid) return targets

  const halfCellX = input.halfCellX ?? 'none'
  const halfCellY = input.halfCellY ?? 'none'
  const minimumX = openGridBoundsSize(1, 1, halfCellX, 'none').x
  const minimumY = openGridBoundsSize(1, 1, 'none', halfCellY).y

  const columns = maxCountThatFits(
    OPENGRID_CONFIGURATION.maxGridCount,
    targets.x,
    (count) => openGridBoundsSize(1, count, halfCellX, 'none').x,
  )
  const rows = maxCountThatFits(
    OPENGRID_CONFIGURATION.maxGridCount,
    targets.y,
    (count) => openGridBoundsSize(count, 1, 'none', halfCellY).y,
  )

  if (columns === 0) {
    return invalidMinimumDimension('X', minimumX, '1 個 OpenGrid 格與半格')
  }
  if (rows === 0) {
    return invalidMinimumDimension('Y', minimumY, '1 個 OpenGrid 格與半格')
  }

  const parameters =
    input.halfCellX !== undefined || input.halfCellY !== undefined
      ? { rows, columns, halfCellX, halfCellY }
      : { rows, columns }
  const actualDimensions = openGridBoundsSize(
    rows,
    columns,
    halfCellX,
    halfCellY,
  )
  return { valid: true, parameters, actualDimensions }
}

export function calculateOpenGridPrintPlan(
  input: OpenGridPrintPlanInput,
): OpenGridPrintPlanResult {
  const parsed = printPlanErrorsFor(input)
  if (parsed.xAxis === null || parsed.yAxis === null) {
    return { valid: false, errors: parsed.errors }
  }

  const xAxis = printPlanAxisFor(
    parsed.xAxis.targetCells,
    parsed.xAxis.printerCells,
  )
  const yAxis = printPlanAxisFor(
    parsed.yAxis.targetCells,
    parsed.yAxis.printerCells,
  )
  const pieceGroups = printPieceGroupsFor(xAxis, yAxis)
  const primary = pieceGroups.find((group) => group.role === 'primary')
  if (!primary) {
    return {
      valid: false,
      errors: {
        targetX: '無法建立可列印的 OpenGrid 分片方案。',
      },
    }
  }

  return {
    valid: true,
    target: {
      columns: xAxis.targetCells,
      rows: yAxis.targetCells,
      width: xAxis.targetCells * OPENGRID_CONFIGURATION.gridPitch,
      depth: yAxis.targetCells * OPENGRID_CONFIGURATION.gridPitch,
    },
    printer: {
      columns: xAxis.printerCells,
      rows: yAxis.printerCells,
      width: xAxis.printerCells * OPENGRID_CONFIGURATION.gridPitch,
      depth: yAxis.printerCells * OPENGRID_CONFIGURATION.gridPitch,
    },
    primary: {
      columns: primary.columns,
      rows: primary.rows,
      width: primary.width,
      depth: primary.depth,
    },
    pieceGroups,
    totalPieces: pieceGroups.reduce(
      (total, group) => total + group.quantity,
      0,
    ),
  }
}

function openGridStackableBoxBoundsSize(x: number, y: number): BoundsSize {
  return sizeFromBounds(
    boundsForOpenGridStackableBox({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x,
      y,
    }),
  )
}

export function calculateOpenGridStackableBoxCounts(
  input: GridDimensionInput,
): GridDimensionResult {
  const targets = parseTargets(input)
  if (!targets.valid) return targets

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const minimumWidth = openGridStackableBoxBoundsSize(
    configuration.minX,
    configuration.minY,
  ).x
  const maximumWidth = openGridStackableBoxBoundsSize(
    configuration.maxX,
    configuration.minY,
  ).x
  if (targets.x > maximumWidth + COMPARISON_TOLERANCE) {
    return invalidMaximumDimension('X', maximumWidth, 'OpenGrid 堆疊盒最大格數')
  }

  const columns = minCountThatReachesByStep(
    configuration.minX,
    configuration.maxX,
    configuration.gridStep,
    targets.x,
    (count) => openGridStackableBoxBoundsSize(count, configuration.minY).x,
  )
  const maximumDepth = openGridStackableBoxBoundsSize(
    configuration.minX,
    configuration.maxY,
  ).y
  const minimumDepth = openGridStackableBoxBoundsSize(
    configuration.minX,
    configuration.minY,
  ).y
  if (targets.y > maximumDepth + COMPARISON_TOLERANCE) {
    return invalidMaximumDimension('Y', maximumDepth, 'OpenGrid 堆疊盒最大格數')
  }

  const rows = minCountThatReachesByStep(
    configuration.minY,
    configuration.maxY,
    configuration.gridStep,
    targets.y,
    (count) => openGridStackableBoxBoundsSize(configuration.minX, count).y,
  )

  if (columns === 0) {
    return invalidMinimumDimension('X', minimumWidth, '1 個 OpenGrid 堆疊盒')
  }

  if (rows === 0) {
    return invalidMinimumDimension('Y', minimumDepth, '1 個 OpenGrid 堆疊盒')
  }

  const parameters = { rows, columns }
  const actualDimensions = openGridStackableBoxBoundsSize(columns, rows)
  return { valid: true, parameters, actualDimensions }
}

function hswBoundsSize(rows: number, columns: number): BoundsSize {
  const parameters: HswCellParameters = { rows, columns }
  return sizeFromBounds(boundsForHswCell(parameters))
}

export function calculateHswCellCounts(
  input: GridDimensionInput,
): GridDimensionResult {
  const targets = parseTargets(input)
  if (!targets.valid) return targets

  const maxColumnsByWidth = maxCountThatFits(
    HSW_CELL_CONFIGURATION.maxGridCount,
    targets.x,
    (count) => hswBoundsSize(1, count).x,
  )
  if (maxColumnsByWidth === 0) {
    return invalidMinimumDimension(
      'X',
      HSW_CELL_CONFIGURATION.outerWidth,
      '1 個 HSW 六角單元',
    )
  }

  let columns = 0
  for (let candidate = maxColumnsByWidth; candidate >= 1; candidate -= 1) {
    if (hswBoundsSize(1, candidate).y <= targets.y + COMPARISON_TOLERANCE) {
      columns = candidate
      break
    }
  }

  if (columns === 0) {
    const minimumDepth = HSW_CELL_CONFIGURATION.outerDepth
    return invalidMinimumDimension('Y', minimumDepth, '1 個 HSW 六角單元')
  }

  const rows = maxCountThatFits(
    HSW_CELL_CONFIGURATION.maxGridCount,
    targets.y,
    (count) => hswBoundsSize(count, columns).y,
  )
  if (rows === 0) {
    return invalidMinimumDimension(
      'Y',
      HSW_CELL_CONFIGURATION.outerDepth,
      '1 個 HSW 六角單元',
    )
  }

  const actualDimensions = hswBoundsSize(rows, columns)
  return {
    valid: true,
    parameters: { rows, columns },
    actualDimensions,
  }
}

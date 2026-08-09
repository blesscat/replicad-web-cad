import {
  HSW_CELL_CONFIGURATION,
  OPENGRID_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
  boundsForHswCell,
  boundsForModularGridBase,
  boundsForOpenGrid,
  type HswCellParameters,
  type ModularGridBaseParameters,
} from '../../../cad-contract/units'

const COMPARISON_TOLERANCE = 0.000001

export type GridDimensionInput = {
  x: string
  y: string
}

export type GridDimensionErrors = Partial<Record<'x' | 'y', string>>

export type GridDimensionSuccess = {
  valid: true
  parameters: {
    rows: number
    columns: number
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

function openGridBoundsSize(rows: number, columns: number): BoundsSize {
  const bounds = boundsForOpenGrid({
    variant: OPENGRID_CONFIGURATION.defaultParameters.variant,
    rows,
    columns,
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

  const columns = maxCountThatFits(
    OPENGRID_CONFIGURATION.maxGridCount,
    targets.x,
    (count) => openGridBoundsSize(1, count).x,
  )
  const rows = maxCountThatFits(
    OPENGRID_CONFIGURATION.maxGridCount,
    targets.y,
    (count) => openGridBoundsSize(count, 1).y,
  )

  if (columns === 0) {
    return invalidMinimumDimension(
      'X',
      OPENGRID_CONFIGURATION.gridPitch,
      '1 個 OpenGrid 格',
    )
  }
  if (rows === 0) {
    return invalidMinimumDimension(
      'Y',
      OPENGRID_CONFIGURATION.gridPitch,
      '1 個 OpenGrid 格',
    )
  }

  const parameters = { rows, columns }
  const actualDimensions = openGridBoundsSize(rows, columns)
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

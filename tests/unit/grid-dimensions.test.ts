import { describe, expect, it } from 'vitest'
import {
  HSW_CELL_CONFIGURATION,
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
  boundsForOpenGrid,
  boundsForOpenGridStackableBox,
  boundsForHswCell,
} from '../../src/cad-contract/units'
import {
  calculateHswCellCounts,
  calculateModularGridCounts,
  calculateOpenGridCounts,
  calculateOpenGridStackableBoxCounts,
} from '../../src/features/cad/grid-dimensions'

function sizeOf(bounds: {
  min: [number, number, number]
  max: [number, number, number]
}) {
  return {
    x: bounds.max[0] - bounds.min[0],
    y: bounds.max[1] - bounds.min[1],
  }
}

describe('modular grid dimension calculation', () => {
  it('rounds each target down to the largest fitting count', () => {
    const result = calculateModularGridCounts({ x: '59', y: '41' })

    expect(result).toEqual({
      valid: true,
      parameters: { columns: 2, rows: 2 },
      actualDimensions: { x: 40, y: 40 },
    })
  })

  it('keeps an exact boundary and rounds down just below it', () => {
    const cell = PROTOTYPE_CONFIGURATION.modularGridBase
    const exact = calculateModularGridCounts({
      x: String(cell.cellWidth * 3),
      y: String(cell.cellDepth * 2),
    })
    const below = calculateModularGridCounts({
      x: String(cell.cellWidth * 3 - 0.01),
      y: String(cell.cellDepth * 2 - 0.01),
    })

    expect(exact.valid && exact.parameters).toEqual({ columns: 3, rows: 2 })
    expect(below.valid && below.parameters).toEqual({ columns: 2, rows: 1 })
  })

  it('caps counts at the existing maximum', () => {
    const result = calculateModularGridCounts({ x: '10000', y: '10000' })

    expect(result.valid && result.parameters).toEqual({ columns: 20, rows: 20 })
  })

  it('rejects targets smaller than one cell', () => {
    const result = calculateModularGridCounts({ x: '19.99', y: '20' })

    expect(result).toMatchObject({
      valid: false,
      errors: { x: expect.stringContaining('20 mm') },
    })
  })
})

describe('HSW dimension calculation', () => {
  it('handles the one-column to staggered-column depth transition', () => {
    const oneColumn = sizeOf(boundsForHswCell({ rows: 1, columns: 1 }))
    const twoColumns = sizeOf(boundsForHswCell({ rows: 1, columns: 2 }))

    const oneColumnResult = calculateHswCellCounts({
      x: String(oneColumn.x + 0.01),
      y: String(oneColumn.y + 0.01),
    })
    const twoColumnResult = calculateHswCellCounts({
      x: String(twoColumns.x + 0.01),
      y: String(twoColumns.y + 0.01),
    })

    expect(oneColumnResult.valid && oneColumnResult.parameters).toEqual({
      columns: 1,
      rows: 1,
    })
    expect(twoColumnResult.valid && twoColumnResult.parameters).toEqual({
      columns: 2,
      rows: 1,
    })
  })

  it('rounds down at exact and just-below HSW bounds', () => {
    const twoByTwo = sizeOf(boundsForHswCell({ rows: 2, columns: 2 }))
    const exact = calculateHswCellCounts({
      x: String(twoByTwo.x),
      y: String(twoByTwo.y),
    })
    const below = calculateHswCellCounts({
      x: String(twoByTwo.x - 0.01),
      y: String(twoByTwo.y - 0.01),
    })

    expect(exact.valid && exact.parameters).toEqual({ columns: 2, rows: 2 })
    expect(below.valid && below.parameters).toEqual({ columns: 1, rows: 2 })
  })

  it('caps counts at the existing maximum while keeping bounds within targets', () => {
    const result = calculateHswCellCounts({ x: '10000', y: '10000' })

    expect(result.valid && result.parameters).toEqual({ columns: 20, rows: 20 })
    if (result.valid) {
      expect(result.actualDimensions.x).toBeLessThanOrEqual(10000)
      expect(result.actualDimensions.y).toBeLessThanOrEqual(10000)
    }
  })

  it('rejects malformed and too-small targets', () => {
    const malformed = calculateHswCellCounts({ x: 'not-a-number', y: '1' })
    const tooSmall = calculateHswCellCounts({
      x: String(HSW_CELL_CONFIGURATION.outerWidth - 0.1),
      y: String(HSW_CELL_CONFIGURATION.outerDepth),
    })

    expect(malformed).toMatchObject({ valid: false })
    expect(tooSmall).toMatchObject({
      valid: false,
      errors: { x: expect.stringContaining('HSW') },
    })
  })
})

describe('OpenGrid dimension calculation', () => {
  it('rounds each target down to the largest fitting count', () => {
    const result = calculateOpenGridCounts({ x: '83.99', y: '55.99' })

    expect(result).toEqual({
      valid: true,
      parameters: { columns: 2, rows: 1 },
      actualDimensions: { x: 56, y: 28 },
    })
  })

  it('keeps an exact boundary and rounds down just below it', () => {
    const exact = calculateOpenGridCounts({ x: '84', y: '56' })
    const below = calculateOpenGridCounts({ x: '83.99', y: '55.99' })

    expect(exact.valid && exact.parameters).toEqual({ columns: 3, rows: 2 })
    expect(below.valid && below.parameters).toEqual({ columns: 2, rows: 1 })
  })

  it('caps counts at the existing maximum', () => {
    const result = calculateOpenGridCounts({ x: '10000', y: '10000' })

    expect(result.valid && result.parameters).toEqual({
      columns: OPENGRID_CONFIGURATION.maxGridCount,
      rows: OPENGRID_CONFIGURATION.maxGridCount,
    })
    if (result.valid) {
      const bounds = boundsForOpenGrid({
        variant: 'Lite',
        ...result.parameters,
      })
      expect(bounds.max[0] - bounds.min[0]).toBeLessThanOrEqual(10000)
      expect(bounds.max[1] - bounds.min[1]).toBeLessThanOrEqual(10000)
    }
  })

  it('rejects a target smaller than one OpenGrid cell', () => {
    const result = calculateOpenGridCounts({ x: '27.99', y: '28' })

    expect(result).toMatchObject({
      valid: false,
      errors: { x: expect.stringContaining('28 mm') },
    })
  })

  it('adds the selected half-cell extension on each calculated axis', () => {
    const xOnly = calculateOpenGridCounts({
      x: '98',
      y: '56',
      halfCellX: 'right',
      halfCellY: 'none',
    })
    const dual = calculateOpenGridCounts({
      x: '98',
      y: '98',
      halfCellX: 'left',
      halfCellY: 'top',
    })

    expect(xOnly).toEqual({
      valid: true,
      parameters: {
        columns: 3,
        rows: 2,
        halfCellX: 'right',
        halfCellY: 'none',
      },
      actualDimensions: { x: 98, y: 56 },
    })
    expect(dual).toMatchObject({
      valid: true,
      parameters: {
        columns: 3,
        rows: 3,
        halfCellX: 'left',
        halfCellY: 'top',
      },
      actualDimensions: { x: 98, y: 98 },
    })
  })

  it('keeps selected directions and reports an axis-specific minimum error', () => {
    const result = calculateOpenGridCounts({
      x: '41.99',
      y: '28',
      halfCellX: 'left',
      halfCellY: 'none',
    })

    expect(result).toEqual({
      valid: false,
      errors: { x: expect.stringContaining('42 mm') },
    })
  })
})

describe('OpenGrid stackable-box dimension calculation', () => {
  it('rounds each target up to the nearest half-cell that contains it', () => {
    const oneCell = sizeOf(
      boundsForOpenGridStackableBox({
        x: 1,
        y: 1,
        height: 10,
        cornerBottomHoles: true,
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    )
    const result = calculateOpenGridStackableBoxCounts({
      x: String(oneCell.x + 0.01),
      y: String(oneCell.y),
    })

    expect(result.valid && result.parameters).toEqual({ columns: 1.5, rows: 1 })
    if (result.valid) {
      expect(result.actualDimensions.x).toBeGreaterThanOrEqual(oneCell.x + 0.01)
      expect(result.actualDimensions.y).toBeGreaterThanOrEqual(oneCell.y)
    }
  })

  it('keeps a 100 mm target at the smallest containing half-cell', () => {
    const result = calculateOpenGridStackableBoxCounts({
      x: '100',
      y: '100',
    })

    expect(result.valid && result.parameters).toEqual({
      columns: 4,
      rows: 4,
    })
    if (result.valid) {
      expect(result.actualDimensions.x).toBeGreaterThanOrEqual(100)
      expect(result.actualDimensions.y).toBeGreaterThanOrEqual(100)
    }
  })

  it('keeps exact half-cell boundaries and preserves the requested precision', () => {
    const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
    const halfCell = sizeOf(
      boundsForOpenGridStackableBox({
        x: configuration.gridStep,
        y: configuration.gridStep,
        height: configuration.defaultHeight,
        cornerBottomHoles: true,
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    )
    const result = calculateOpenGridStackableBoxCounts({
      x: String(halfCell.x),
      y: String(halfCell.y),
    })

    expect(result.valid && result.parameters).toEqual({
      columns: configuration.gridStep,
      rows: configuration.gridStep,
    })
  })

  it('rejects dimensions beyond the maximum stackable-box footprint', () => {
    const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
    const maximumWidth = sizeOf(
      boundsForOpenGridStackableBox({
        x: configuration.maxX,
        y: configuration.minY,
        height: configuration.defaultHeight,
        cornerBottomHoles: true,
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    ).x
    const result = calculateOpenGridStackableBoxCounts({
      x: String(maximumWidth + 1),
      y: String(maximumWidth),
    })

    expect(result).toMatchObject({
      valid: false,
      errors: { x: expect.stringContaining('最大格數') },
    })
  })
})

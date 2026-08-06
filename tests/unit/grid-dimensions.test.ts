import { describe, expect, it } from 'vitest'
import {
  HSW_CELL_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
  boundsForHswCell,
} from '../../src/cad-contract/units'
import {
  calculateHswCellCounts,
  calculateModularGridCounts,
} from '../../src/features/cad/grid-dimensions'

function sizeOf(bounds: ReturnType<typeof boundsForHswCell>) {
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

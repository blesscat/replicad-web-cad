import { describe, expect, it } from 'vitest'
import {
  cellOffsetsForGrid,
  externalCornerCoordinates,
} from '../../src/cad-kernel/components/modular-grid-base/builder'

describe('modular-grid-base placement helpers', () => {
  it('centers one template at every requested cell position', () => {
    expect(cellOffsetsForGrid({ rows: 1, columns: 1 })).toEqual([[0, 0]])
    expect(cellOffsetsForGrid({ rows: 2, columns: 2 })).toEqual([
      [-10, -10],
      [10, -10],
      [-10, 10],
      [10, 10],
    ])
  })

  it('identifies the four external corners of the overall plate envelope', () => {
    expect(externalCornerCoordinates({ rows: 2, columns: 3 })).toEqual([
      [-30, -20],
      [30, -20],
      [-30, 20],
      [30, 20],
    ])
  })
})

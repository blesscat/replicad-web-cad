import { describe, expect, it } from 'vitest'
import {
  HSW_CELL_CONFIGURATION,
  boundsForHswCell,
  boundsForModel,
  hswCellFileName,
  hswCellOffsetFor,
  hswCellOffsetsForGrid,
  hswCellStlFileName,
  modelFileName,
  modelStlFileName,
  validateHswCellParameters,
  validateModelParameters,
} from '../../src/cad-contract/units'

describe('hsw-cell contract and layout', () => {
  it.each([
    { rows: 1, columns: 1 },
    { rows: 1, columns: 2 },
    { rows: 2, columns: 1 },
    { rows: 2, columns: 2 },
    { rows: 2, columns: 3 },
  ])('creates every requested offset for %#', (parameters) => {
    expect(hswCellOffsetsForGrid(parameters)).toHaveLength(
      parameters.rows * parameters.columns,
    )
    const bounds = boundsForHswCell(parameters)
    expect(bounds.min[0]).toBeCloseTo(-(bounds.max[0] - bounds.min[0]) / 2, 10)
    expect(bounds.min[1]).toBeCloseTo(-(bounds.max[1] - bounds.min[1]) / 2, 10)
    expect(bounds.min[2]).toBe(0)
  })

  it('accepts a 1x1 HSW cell and derives its centered bounds', () => {
    const parameters = { rows: 1, columns: 1 }

    expect(validateHswCellParameters(parameters)).toEqual({
      valid: true,
      value: parameters,
    })
    expect(boundsForHswCell(parameters)).toEqual({
      min: [
        -HSW_CELL_CONFIGURATION.outerWidth / 2,
        -HSW_CELL_CONFIGURATION.outerDepth / 2,
        0,
      ],
      max: [
        HSW_CELL_CONFIGURATION.outerWidth / 2,
        HSW_CELL_CONFIGURATION.outerDepth / 2,
        HSW_CELL_CONFIGURATION.outerHeight,
      ],
    })
  })

  it('places a 3x3 grid with the middle column staggered upward', () => {
    const parameters = { rows: 3, columns: 3 }
    const leftColumn = [
      hswCellOffsetFor(parameters, 0, 0),
      hswCellOffsetFor(parameters, 1, 0),
      hswCellOffsetFor(parameters, 2, 0),
    ]
    const middleColumn = [
      hswCellOffsetFor(parameters, 0, 1),
      hswCellOffsetFor(parameters, 1, 1),
      hswCellOffsetFor(parameters, 2, 1),
    ]

    expect(leftColumn.map(([x]) => x)).toEqual([
      -HSW_CELL_CONFIGURATION.columnPitch,
      -HSW_CELL_CONFIGURATION.columnPitch,
      -HSW_CELL_CONFIGURATION.columnPitch,
    ])
    expect(leftColumn[0]?.[1]).toBeCloseTo(-29.50000062252905, 8)
    expect(leftColumn[1]?.[1]).toBeCloseTo(-5.90000012450581, 8)
    expect(leftColumn[2]?.[1]).toBeCloseTo(17.70000037351743, 8)
    expect(middleColumn.map(([x]) => x)).toEqual([0, 0, 0])
    expect(middleColumn[0]?.[1]).toBeCloseTo(-17.70000037351743, 8)
    expect(middleColumn[1]?.[1]).toBeCloseTo(5.90000012450581, 8)
    expect(middleColumn[2]?.[1]).toBeCloseTo(29.50000062252905, 8)
    expect(hswCellOffsetFor(parameters, 0, 2)[0]).toBeCloseTo(
      HSW_CELL_CONFIGURATION.columnPitch,
      10,
    )
    expect(hswCellOffsetFor(parameters, 0, 2)[1]).toBeCloseTo(
      leftColumn[0][1],
      10,
    )
  })

  it('derives the 2x2 and maximum legal envelopes', () => {
    const twoByTwo = boundsForHswCell({ rows: 2, columns: 2 })
    expect(twoByTwo.max[0] - twoByTwo.min[0]).toBeCloseTo(47.6891331872865, 8)
    expect(twoByTwo.max[1] - twoByTwo.min[1]).toBeCloseTo(59.0000012450581, 8)
    expect(twoByTwo.min).toEqual([expect.any(Number), expect.any(Number), 0])

    const maximum = validateHswCellParameters({ rows: 20, columns: 20 })
    expect(maximum.valid).toBe(true)
    if (maximum.valid) {
      const bounds = boundsForHswCell(maximum.value)
      expect(bounds.max[0] - bounds.min[0]).toBeLessThanOrEqual(500)
      expect(bounds.max[1] - bounds.min[1]).toBeLessThanOrEqual(500)
    }
  })

  it('rejects malformed counts and extra parameters', () => {
    expect(validateHswCellParameters({ rows: 0, columns: 1 }).valid).toBe(false)
    expect(validateHswCellParameters({ rows: 1.5, columns: 1 }).valid).toBe(
      false,
    )
    expect(validateHswCellParameters({ rows: 1, columns: 21 }).valid).toBe(
      false,
    )
    expect(
      validateHswCellParameters({ rows: 1, columns: 1, width: 20 }).valid,
    ).toBe(false)
  })

  it('uses explicit HSW dispatch for bounds and export filenames', () => {
    const model = {
      modelId: 'hsw-cell' as const,
      parameters: { rows: 2, columns: 3 },
    }
    const validation = validateModelParameters(model.modelId, model.parameters)

    expect(validation).toEqual({ valid: true, value: model })
    expect(boundsForModel(model)).toEqual(boundsForHswCell(model.parameters))
    expect(hswCellFileName(model.parameters)).toBe('hsw-cell-3x2.step')
    expect(hswCellStlFileName(model.parameters)).toBe('hsw-cell-3x2.stl')
    expect(modelFileName(model)).toBe('hsw-cell-3x2.step')
    expect(modelStlFileName(model)).toBe('hsw-cell-3x2.stl')
  })
})

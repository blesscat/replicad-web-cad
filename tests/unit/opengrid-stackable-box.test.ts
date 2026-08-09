import { describe, expect, it } from 'vitest'
import {
  boundsForModel,
  boundsForOpenGridStackableBox,
  isOpenGridStackableBoxParameters,
  modelFileName,
  modelStlFileName,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  validateModelParameters,
  validateOpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'

describe('OpenGrid stackable-box contract', () => {
  it('derives centered 28 mm footprints with total 0.15 mm clearance', () => {
    const parameters = { x: 1, y: 4, height: 25 }

    expect(nominalOpenGridStackableBoxFootprintFor(parameters)).toEqual([
      27.85, 111.85,
    ])
    expect(boundsForOpenGridStackableBox(parameters)).toEqual({
      min: [-13.925, -55.925, 0],
      max: [13.925, 55.925, 25],
    })
    expect(
      boundsForModel({ modelId: 'opengrid-stackable-box', parameters }),
    ).toEqual(boundsForOpenGridStackableBox(parameters))
  })

  it('accepts half-cell values without rounding and isolates model validation', () => {
    const value = { x: 0.5, y: 1.5, height: 10 }

    expect(validateOpenGridStackableBoxParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(validateModelParameters('opengrid-stackable-box', value)).toEqual({
      valid: true,
      value: { modelId: 'opengrid-stackable-box', parameters: value },
    })
    expect(isOpenGridStackableBoxParameters(value)).toBe(true)
    expect(
      isOpenGridStackableBoxParameters({ x: 1, y: 1, height: 10, rows: 1 }),
    ).toBe(false)
  })

  it.each([
    [{ x: 0.25, y: 1, height: 10 }, 'x'],
    [{ x: 1, y: 0, height: 10 }, 'y'],
    [{ x: 1, y: 1, height: 9 }, 'height'],
    [{ x: 18, y: 1, height: 10 }, 'x'],
    [{ x: 1, y: 1, height: 501 }, 'height'],
  ])(
    'rejects invalid %s values with a field-specific issue',
    (value, field) => {
      const validation = validateOpenGridStackableBoxParameters(value)

      expect(validation.valid).toBe(false)
      if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
    },
  )

  it('de-duplicates overlapping corner sockets only on half-cell axes', () => {
    expect(
      openGridStackableBoxSocketCentersFor({ x: 1, y: 1, height: 10 }),
    ).toHaveLength(4)
    expect(
      openGridStackableBoxSocketCentersFor({ x: 0.5, y: 1, height: 10 }),
    ).toEqual([
      [0, expect.closeTo(-6.925, 5)],
      [0, expect.closeTo(6.925, 5)],
    ])
    expect(
      openGridStackableBoxSocketCentersFor({ x: 0.5, y: 0.5, height: 10 }),
    ).toEqual([[0, 0]])
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch).toBe(28)
  })

  it('keeps stackable-box export names separate from official OpenGrid names', () => {
    const model = {
      modelId: 'opengrid-stackable-box' as const,
      parameters: { x: 1.5, y: 2, height: 30 },
    }

    expect(modelFileName(model)).toBe('opengrid-stackable-box-1.5x2-h30.step')
    expect(modelStlFileName(model)).toBe('opengrid-stackable-box-1.5x2-h30.stl')
  })
})

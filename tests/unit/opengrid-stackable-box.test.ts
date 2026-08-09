import { describe, expect, it } from 'vitest'
import {
  boundsForModel,
  boundsForOpenGridStackableBox,
  isOpenGridStackableBoxParameters,
  modelFileName,
  modelStlFileName,
  nominalOpenGridStackableBoxBottomGridAxisPositionsFor,
  nominalOpenGridStackableBoxBottomGridCentersFor,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  validateModelParameters,
  validateOpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<Parameters<typeof boundsForOpenGridStackableBox>[0]> = {},
) {
  return {
    x: 1,
    y: 1,
    height: 10,
    fullBottomHoleGrid: false,
    ...overrides,
  }
}

describe('OpenGrid stackable-box contract', () => {
  it('derives centered 28 mm footprints with total 0.15 mm clearance', () => {
    const value = parameters({ x: 1, y: 4, height: 25 })

    expect(nominalOpenGridStackableBoxFootprintFor(value)).toEqual([
      27.85, 111.85,
    ])
    expect(boundsForOpenGridStackableBox(value)).toEqual({
      min: [-13.925, -55.925, 0],
      max: [13.925, 55.925, 25],
    })
    expect(
      boundsForModel({ modelId: 'opengrid-stackable-box', parameters: value }),
    ).toEqual(boundsForOpenGridStackableBox(value))
  })

  it('accepts half-cell values and an explicit boolean without rounding', () => {
    const value = parameters({
      x: 0.5,
      y: 1.5,
      height: 10,
      fullBottomHoleGrid: true,
    })

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
      isOpenGridStackableBoxParameters({
        x: 1,
        y: 1,
        height: 10,
        fullBottomHoleGrid: false,
        rows: 1,
      }),
    ).toBe(false)
  })

  it.each([
    [parameters({ x: 0.25 }), 'x'],
    [parameters({ y: 0 }), 'y'],
    [parameters({ height: 9 }), 'height'],
    [parameters({ x: 18 }), 'x'],
    [parameters({ height: 501 }), 'height'],
    [parameters({ fullBottomHoleGrid: 'true' as never }), 'fullBottomHoleGrid'],
  ])(
    'rejects invalid %s values with a field-specific issue',
    (value, field) => {
      const validation = validateOpenGridStackableBoxParameters(value)

      expect(validation.valid).toBe(false)
      if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
    },
  )

  it('de-duplicates existing corner sockets only on half-cell axes', () => {
    expect(openGridStackableBoxSocketCentersFor(parameters())).toHaveLength(4)
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 1 })),
    ).toEqual([
      [0, expect.closeTo(-6.925, 5)],
      [0, expect.closeTo(6.925, 5)],
    ])
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 0.5 })),
    ).toEqual([[0, 0]])
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch).toBe(28)
  })

  it('builds full-hole coordinates from the nominal footprint before clearance', () => {
    const pitch = OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch
    const full = parameters({ fullBottomHoleGrid: true })

    expect(pitch).toBe(14)
    expect(nominalOpenGridStackableBoxBottomGridAxisPositionsFor(0.5)).toEqual([
      0,
    ])
    expect(nominalOpenGridStackableBoxBottomGridAxisPositionsFor(1)).toEqual([
      -pitch / 2,
      pitch / 2,
    ])
    expect(nominalOpenGridStackableBoxBottomGridAxisPositionsFor(1.5)).toEqual([
      -pitch,
      0,
      pitch,
    ])
    expect(nominalOpenGridStackableBoxBottomGridCentersFor(full)).toHaveLength(
      4,
    )
    expect(openGridStackableBoxSocketCentersFor(full)).toEqual([
      [-pitch / 2, -pitch / 2],
      [-pitch / 2, pitch / 2],
      [pitch / 2, -pitch / 2],
      [pitch / 2, pitch / 2],
    ])
    expect(openGridStackableBoxOrdinaryBottomHoleCentersFor(full)).toHaveLength(
      0,
    )
  })

  it('keeps the nominal full-hole grid at 14 mm for half-cell axes', () => {
    const full = parameters({ x: 0.5, y: 1.5, fullBottomHoleGrid: true })

    expect(nominalOpenGridStackableBoxBottomGridCentersFor(full)).toEqual([
      [0, -OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch],
      [0, 0],
      [0, OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch],
    ])
    expect(openGridStackableBoxSocketCentersFor(full)).toEqual([
      [0, -OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch],
      [0, OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch],
    ])
    expect(openGridStackableBoxOrdinaryBottomHoleCentersFor(full)).toHaveLength(
      1,
    )
  })

  it('keeps stackable-box export names separate from official OpenGrid names', () => {
    const model = {
      modelId: 'opengrid-stackable-box' as const,
      parameters: parameters({
        x: 1.5,
        y: 2,
        height: 30,
        fullBottomHoleGrid: true,
      }),
    }

    expect(modelFileName(model)).toBe('opengrid-stackable-box-1.5x2-h30.step')
    expect(modelStlFileName(model)).toBe('opengrid-stackable-box-1.5x2-h30.stl')
  })
})

import { describe, expect, it } from 'vitest'
import {
  boundsForModel,
  boundsForOpenGridOpenConnectShelf,
  modelFileName,
  modelStlFileName,
  openGridOpenConnectShelfFrontHeightFor,
  openGridOpenConnectShelfInstalledBoundsFor,
  openGridOpenConnectShelfMaximumAngleForRows,
  openGridOpenConnectShelfSlotOriginsFor,
  OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  validateModelParameters,
  validateOpenGridOpenConnectShelfParameters,
  type OpenGridOpenConnectShelfParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<OpenGridOpenConnectShelfParameters> = {},
): OpenGridOpenConnectShelfParameters {
  return {
    ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

describe('OpenGrid OpenConnect shelf contract', () => {
  it('accepts only the three typed default controls', () => {
    const value = parameters()

    expect(value).toEqual({ columns: 3, rows: 3, angle: 14 })
    expect(validateOpenGridOpenConnectShelfParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(
      validateModelParameters('opengrid-openconnect-shelf', value),
    ).toEqual({
      valid: true,
      value: { modelId: 'opengrid-openconnect-shelf', parameters: value },
    })
  })

  it('derives and enforces the depth-dependent angle ceiling', () => {
    expect(openGridOpenConnectShelfMaximumAngleForRows(2)).toBe(20)
    expect(openGridOpenConnectShelfMaximumAngleForRows(3)).toBe(14)
    expect(openGridOpenConnectShelfMaximumAngleForRows(4)).toBe(10)

    expect(
      validateOpenGridOpenConnectShelfParameters(
        parameters({ rows: 4, angle: 10 }),
      ).valid,
    ).toBe(true)
    expect(
      validateOpenGridOpenConnectShelfParameters(
        parameters({ rows: 4, angle: 14 }),
      ),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'angle' })],
    })
  })

  it.each([
    null,
    {},
    { columns: 3, rows: 3 },
    { columns: 3, rows: 3, angle: 14, extra: true },
    { columns: 1.5, rows: 3, angle: 14 },
    { columns: 3, rows: Number.NaN, angle: 14 },
    { columns: 3, rows: 3, angle: 14.5 },
    { columns: 0, rows: 3, angle: 14 },
    { columns: 3, rows: 11, angle: 1 },
    { columns: 3, rows: 3, angle: 0 },
  ])('rejects malformed or out-of-range snapshot %#', (value) => {
    expect(validateOpenGridOpenConnectShelfParameters(value).valid).toBe(false)
  })

  it('derives the installed envelope and grid-aligned locked-slot origins', () => {
    const value = parameters()
    const { gridPitch, rearHeight, rearThickness } =
      OPENGRID_OPENCONNECT_SHELF_CONFIGURATION

    expect(openGridOpenConnectShelfInstalledBoundsFor(value)).toEqual({
      min: [-(value.columns * gridPitch) / 2, -value.rows * gridPitch, 0],
      max: [(value.columns * gridPitch) / 2, rearThickness, rearHeight],
    })
    expect(openGridOpenConnectShelfSlotOriginsFor(value)).toEqual([
      [-gridPitch, rearThickness, rearHeight / 2],
      [0, rearThickness, rearHeight / 2],
      [gridPitch, rearThickness, rearHeight / 2],
    ])
    expect(openGridOpenConnectShelfFrontHeightFor(value)).toBeCloseTo(
      rearHeight -
        value.rows * gridPitch * Math.tan((value.angle * Math.PI) / 180),
    )
  })

  it('reports tight print-oriented bounds with the sloped underside on Z=0', () => {
    const value = parameters()
    const { gridPitch, rearHeight, rearThickness } =
      OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    const width = value.columns * gridPitch
    const depth = value.rows * gridPitch
    const radians = (value.angle * Math.PI) / 180
    const expected = {
      min: [
        -width / 2,
        -(depth * Math.cos(radians) + rearHeight * Math.sin(radians)),
        0,
      ] as [number, number, number],
      max: [
        width / 2,
        rearThickness * Math.cos(radians),
        rearHeight * Math.cos(radians) + rearThickness * Math.sin(radians),
      ] as [number, number, number],
    }

    const bounds = boundsForOpenGridOpenConnectShelf(value)
    expect(bounds.min[0]).toBeCloseTo(expected.min[0])
    expect(bounds.min[1]).toBeCloseTo(expected.min[1])
    expect(bounds.min[2]).toBeCloseTo(expected.min[2])
    expect(bounds.max[0]).toBeCloseTo(expected.max[0])
    expect(bounds.max[1]).toBeCloseTo(expected.max[1])
    expect(bounds.max[2]).toBeCloseTo(expected.max[2])
    expect(
      boundsForModel({
        modelId: 'opengrid-openconnect-shelf',
        parameters: value,
      }),
    ).toEqual(bounds)
  })

  it('uses deterministic model-specific STEP and STL names', () => {
    const model = {
      modelId: 'opengrid-openconnect-shelf' as const,
      parameters: parameters(),
    }

    expect(modelFileName(model)).toBe(
      'opengrid-openconnect-shelf-c3-r3-a14.step',
    )
    expect(modelStlFileName(model)).toBe(
      'opengrid-openconnect-shelf-c3-r3-a14.stl',
    )
  })
})

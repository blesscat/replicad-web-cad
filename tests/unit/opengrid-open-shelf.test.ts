import { describe, expect, it } from 'vitest'
import {
  boundsForModel,
  boundsForOpenGridOpenShelf,
  modelFileName,
  modelStlFileName,
  openGridOpenShelfCellSpaceFor,
  openGridOpenShelfClearCellHeightsFor,
  openGridOpenShelfFootprintFor,
  openGridOpenShelfFrontToRearElevationFor,
  openGridOpenShelfPegCentersFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  validateModelParameters,
  validateOpenGridOpenShelfParameters,
  type OpenGridOpenShelfParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<OpenGridOpenShelfParameters> = {},
): OpenGridOpenShelfParameters {
  return { ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS, ...overrides }
}

describe('OpenGrid open-shelf contract', () => {
  it('accepts the requested defaults and derives the cleared footprint', () => {
    const value = parameters()

    expect(validateOpenGridOpenShelfParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(boundsForOpenGridOpenShelf(value)).toEqual({
      min: [-55.925, -41.925, -3.8],
      max: [55.925, 41.925, 50],
    })
    expect(
      boundsForModel({ modelId: 'opengrid-open-shelf', parameters: value }),
    ).toEqual(boundsForOpenGridOpenShelf(value))
  })

  it('uses four plain locating peg centers from the OpenGrid corner offset', () => {
    expect(OPENGRID_OPEN_SHELF_CONFIGURATION.pegDiameter).toBe(
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter,
    )
    expect(OPENGRID_OPEN_SHELF_CONFIGURATION.pegHeight).toBe(
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight,
    )
    expect(openGridOpenShelfPegCentersFor(parameters())).toEqual([
      [-49, -35],
      [-49, 35],
      [49, -35],
      [49, 35],
    ])
  })

  it('keeps upper cell planes parallel and isolates the bottom wedge', () => {
    const value = parameters({ cellZ: 4 })
    const heights = openGridOpenShelfClearCellHeightsFor(value)
    const elevation = openGridOpenShelfFrontToRearElevationFor(value)

    expect(heights.wedge.front).toBeCloseTo(elevation)
    expect(heights.wedge.rear).toBe(0)
    expect(heights.regular.front).toBeCloseTo(heights.regular.rear)

    const [firstShelfFront, firstShelfRear] =
      openGridOpenShelfShelfLowerSurfaceZFor(value, 1)
    expect(firstShelfRear).toBeCloseTo(
      OPENGRID_OPEN_SHELF_CONFIGURATION.bottomThickness,
    )
    expect(firstShelfFront - firstShelfRear).toBeCloseTo(elevation)

    const [secondShelfFront, secondShelfRear] =
      openGridOpenShelfShelfLowerSurfaceZFor(value, 2)
    expect(secondShelfFront - firstShelfFront).toBeCloseTo(
      heights.regular.front +
        OPENGRID_OPEN_SHELF_CONFIGURATION.innerPlateThickness *
          Math.cos((value.angle * Math.PI) / 180),
    )

    const flatValue = parameters({ cellZ: 2, angle: 0 })
    const flatHeights = openGridOpenShelfClearCellHeightsFor(flatValue)
    expect(flatHeights.wedge).toEqual({ front: 0, rear: 0 })
    const [flatShelfFront] = openGridOpenShelfShelfLowerSurfaceZFor(
      flatValue,
      1,
    )
    expect(flatShelfFront).toBeCloseTo(
      OPENGRID_OPEN_SHELF_CONFIGURATION.bottomThickness +
        flatHeights.regular.front,
    )

    const space = openGridOpenShelfCellSpaceFor(value)
    const [outerWidth, outerDepth] = openGridOpenShelfFootprintFor(value)
    expect(space.width).toBeCloseTo(
      (outerWidth -
        2 * OPENGRID_OPEN_SHELF_CONFIGURATION.outerWallThickness -
        (value.cellX - 1) *
          OPENGRID_OPEN_SHELF_CONFIGURATION.innerPlateThickness) /
        value.cellX,
    )
    expect(space.depth).toBeCloseTo(
      outerDepth - OPENGRID_OPEN_SHELF_CONFIGURATION.backboardThickness,
    )
  })

  it('rejects an impossible rear cell and unknown fields', () => {
    expect(
      validateOpenGridOpenShelfParameters(
        parameters({ height: 10, cellZ: 1, angle: 75 }),
      ).valid,
    ).toBe(false)
    expect(
      validateOpenGridOpenShelfParameters({
        ...parameters(),
        extra: true,
      }).valid,
    ).toBe(false)
  })

  it('hydrates legacy snapshots with honeycomb disabled and accepts the new mode', () => {
    const legacy = {
      x: 4,
      y: 3,
      height: 50,
      cellX: 1,
      cellZ: 2,
      angle: 15,
    }
    expect(validateOpenGridOpenShelfParameters(legacy)).toEqual({
      valid: true,
      value: { ...legacy, honeycombMode: false },
    })
    expect(
      validateOpenGridOpenShelfParameters({
        ...legacy,
        honeycombMode: true,
      }),
    ).toEqual({
      valid: true,
      value: { ...legacy, honeycombMode: true },
    })
    expect(
      validateOpenGridOpenShelfParameters({
        ...legacy,
        honeycombMode: 'true',
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'honeycombMode' })],
    })
  })

  it('registers deterministic STEP and STL names for typed parameters', () => {
    const model = {
      modelId: 'opengrid-open-shelf' as const,
      parameters: parameters(),
    }

    expect(modelFileName(model)).toBe(
      'opengrid-open-shelf-4x3-h50-cx1-cz2-a15.step',
    )
    expect(modelStlFileName(model)).toBe(
      'opengrid-open-shelf-4x3-h50-cx1-cz2-a15.stl',
    )

    const honeycombModel = {
      modelId: 'opengrid-open-shelf' as const,
      parameters: { ...parameters(), honeycombMode: true },
    }
    expect(modelFileName(honeycombModel)).toBe(
      'opengrid-open-shelf-4x3-h50-cx1-cz2-a15-honeycomb.step',
    )
    expect(modelStlFileName(honeycombModel)).toBe(
      'opengrid-open-shelf-4x3-h50-cx1-cz2-a15-honeycomb.stl',
    )
  })
})

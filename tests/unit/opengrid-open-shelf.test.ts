import { describe, expect, it } from 'vitest'
import {
  boundsForModel,
  boundsForOpenGridOpenShelf,
  modelFileName,
  modelStlFileName,
  openGridOpenShelfPegCentersFor,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
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
      min: [-55.925, -41.925, -3],
      max: [55.925, 41.925, 50],
    })
    expect(
      boundsForModel({ modelId: 'opengrid-open-shelf', parameters: value }),
    ).toEqual(boundsForOpenGridOpenShelf(value))
  })

  it('uses four plain locating peg centers from the OpenGrid corner offset', () => {
    expect(openGridOpenShelfPegCentersFor(parameters())).toEqual([
      [-49, -35],
      [-49, 35],
      [49, -35],
      [49, 35],
    ])
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
  })
})

import { describe, expect, it } from 'vitest'
import {
  boundsForBox,
  boundsForBoxNormal,
  boxFileName,
  boxNormalFileName,
  boxNormalPostCentersFor,
  boxNormalStlFileName,
  boxStlFileName,
  BOX_NORMAL_CONFIGURATION,
  parseDimensionInput,
  validateBoxNormalParameters,
  validateBoxParameters,
} from '../../src/cad-contract/units'

describe('box units and validation', () => {
  it('accepts the prototype fixture and places its base on Z=0', () => {
    const parameters = { width: 20, depth: 30, height: 40 }
    const result = validateBoxParameters(parameters)
    expect(result).toEqual({ valid: true, value: parameters })
    expect(boundsForBox(parameters)).toEqual({
      min: [-10, -15, 0],
      max: [10, 15, 40],
    })
    expect(boxFileName(parameters)).toBe('box-20x30x40.step')
    expect(boxStlFileName(parameters)).toBe('box-20x30x40.stl')
  })

  it('rejects decimals, empty values and out-of-range dimensions', () => {
    expect(parseDimensionInput('20.5')).toBeNull()
    expect(parseDimensionInput('')).toBeNull()
    expect(
      validateBoxParameters({ width: 0, depth: 30, height: 40 }).valid,
    ).toBe(false)
    expect(
      validateBoxParameters({ width: 501, depth: 30, height: 40 }).valid,
    ).toBe(false)
    expect(
      validateBoxParameters({ width: 500, depth: 500, height: 500 }).valid,
    ).toBe(true)
    expect(
      validateBoxParameters({ width: 20.5, depth: 30, height: 40 }).valid,
    ).toBe(false)
    expect(
      validateBoxParameters({
        width: 20,
        depth: 30,
        height: 40,
        rows: 1,
      }).valid,
    ).toBe(false)
  })
})

describe('box-normal units and validation', () => {
  it('uses the confirmed defaults, clearance, bounds, and filenames', () => {
    const parameters = { x: 2, y: 2, height: 10, cornerPosts: true }

    expect(BOX_NORMAL_CONFIGURATION).toMatchObject({
      gridX: 10.219,
      gridY: 11.8,
      defaultX: 2,
      defaultY: 2,
      defaultHeight: 10,
      minX: 2,
      maxX: 40,
      minY: 2,
      maxY: 35,
      minHeight: 10,
      maxHeight: 500,
      heightSliderMax: 200,
      clearanceTotal: 0.15,
      cornerPostHeight: 7,
      cornerPostCrossSectionRotationDegrees: 0,
      cornerPostAttachmentTransitionLength: 0,
    })
    expect(validateBoxNormalParameters(parameters)).toEqual({
      valid: true,
      value: parameters,
    })
    const bounds = boundsForBoxNormal(parameters)
    expect(bounds.min[0]).toBeCloseTo(-10.144, 10)
    expect(bounds.min[1]).toBeCloseTo(-11.725, 10)
    expect(bounds.min[2]).toBe(0)
    expect(bounds.max[0]).toBeCloseTo(10.144, 10)
    expect(bounds.max[1]).toBeCloseTo(11.725, 10)
    expect(bounds.max[2]).toBe(17)
    expect(boxNormalPostCentersFor(parameters)).toEqual([
      [-5.1095, -5.9],
      [-5.1095, 5.9],
      [5.1095, -5.9],
      [5.1095, 5.9],
    ])
    expect(boxNormalFileName(parameters)).toBe('box-normal-2x2-h10-posts.step')
    expect(boxNormalStlFileName(parameters)).toBe(
      'box-normal-2x2-h10-posts.stl',
    )
  })

  it('keeps maximum dimensions centered and excludes posts from plain bounds', () => {
    const parameters = { x: 40, y: 35, height: 500, cornerPosts: false }
    const bounds = boundsForBoxNormal(parameters)

    expect(bounds.min).toEqual([-204.305, -206.425, 0])
    expect(bounds.max).toEqual([204.305, 206.425, 500])
    const centers = boxNormalPostCentersFor({
      ...parameters,
      cornerPosts: true,
    })
    expect(centers).toHaveLength(4)
    expect(centers.flat()).toEqual(
      expect.arrayContaining([
        expect.closeTo(-199.2705, 10),
        expect.closeTo(199.2705, 10),
        expect.closeTo(-200.6, 10),
        expect.closeTo(200.6, 10),
      ]),
    )
  })

  it('accepts the manual height maximum and rejects values above it', () => {
    const base = { x: 2, y: 2, cornerPosts: true }

    expect(validateBoxNormalParameters({ ...base, height: 500 }).valid).toBe(
      true,
    )
    expect(validateBoxNormalParameters({ ...base, height: 501 }).valid).toBe(
      false,
    )
  })

  it('rejects incomplete, fractional, out-of-range, and non-boolean snapshots', () => {
    for (const parameters of [
      { x: 1, y: 2, height: 10, cornerPosts: true },
      { x: 2, y: 36, height: 10, cornerPosts: true },
      { x: 2.5, y: 2, height: 10, cornerPosts: true },
      { x: 2, y: 2, height: 9, cornerPosts: true },
      { x: 2, y: 2, height: 10, cornerPosts: 'true' },
      { x: 2, y: 2, height: 10 },
    ]) {
      expect(validateBoxNormalParameters(parameters).valid).toBe(false)
    }
  })
})

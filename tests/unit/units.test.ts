import { describe, expect, it } from 'vitest'
import {
  boundsForBox,
  boxFileName,
  boxStlFileName,
  parseDimensionInput,
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

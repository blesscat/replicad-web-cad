import { describe, expect, it } from 'vitest'
import {
  boundsForPillar,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  validatePillarParameters,
} from '../../src/cad-contract/units'

describe('pillar contract', () => {
  it('uses the agreed defaults and fixed geometry dimensions', () => {
    expect(PILLAR_CONFIGURATION).toMatchObject({
      defaultLength: 5,
      minLength: 3,
      maxLength: 500,
      bodyDiameter: 5,
      baseDiameter: 7,
      baseHeight: 0.8,
      chamfer: 1,
      defaultBaseConnection: false,
    })
    expect(
      validatePillarParameters({ length: 5, baseConnection: false }),
    ).toEqual({
      valid: true,
      value: { length: 5, baseConnection: false },
    })
  })

  it('accepts the integer length boundaries and both modes', () => {
    expect(
      validatePillarParameters({ length: 3, baseConnection: true }),
    ).toEqual({
      valid: true,
      value: { length: 3, baseConnection: true },
    })
    expect(
      validatePillarParameters({ length: 500, baseConnection: false }),
    ).toEqual({
      valid: true,
      value: { length: 500, baseConnection: false },
    })
  })

  it('rejects fractional, out-of-range, non-boolean, and unsupported snapshots', () => {
    for (const value of [
      { length: 2, baseConnection: false },
      { length: 501, baseConnection: false },
      { length: 5.5, baseConnection: false },
      { length: 5, baseConnection: 'true' },
      { length: 5 },
      { length: 5, baseConnection: false, height: 10 },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('returns centered bounds for both end modes', () => {
    expect(boundsForPillar({ length: 5, baseConnection: false })).toEqual({
      min: [-2.5, -2.5, 0],
      max: [2.5, 2.5, 5],
    })
    expect(boundsForPillar({ length: 5, baseConnection: true })).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 5],
    })
  })

  it('uses deterministic mode-specific export filenames', () => {
    expect(pillarFileName({ length: 5, baseConnection: false })).toBe(
      'pillar-5-plain.step',
    )
    expect(pillarFileName({ length: 5, baseConnection: true })).toBe(
      'pillar-5-base.step',
    )
    expect(pillarStlFileName({ length: 5, baseConnection: false })).toBe(
      'pillar-5-plain.stl',
    )
    expect(pillarStlFileName({ length: 5, baseConnection: true })).toBe(
      'pillar-5-base.stl',
    )
  })
})

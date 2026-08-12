import { describe, expect, it } from 'vitest'
import {
  boundsForPillar,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  validatePillarParameters,
} from '../../src/cad-contract/units'

describe('pillar contract', () => {
  it('uses the shared shaft, flange, and fixed mode dimensions', () => {
    expect(PILLAR_CONFIGURATION).toMatchObject({
      standardLength: 8,
      thinShellLength: 5,
      bodyDiameter: 4.5,
      baseDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeDiameter,
      baseHeight: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
      upperChamfer: 0.5,
      defaultParameters: { mode: 'standard' },
    })
    expect(PILLAR_CONFIGURATION.bodyDiameter).toBe(
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftDiameter,
    )
  })

  it('accepts exactly the standard and thin-shell modes', () => {
    expect(validatePillarParameters({ mode: 'standard' })).toEqual({
      valid: true,
      value: { mode: 'standard' },
    })
    expect(validatePillarParameters({ mode: 'thin-shell' })).toEqual({
      valid: true,
      value: { mode: 'thin-shell' },
    })
  })

  it('accepts a custom-length positioning mode with the legacy Ø5 mm profile', () => {
    expect(
      validatePillarParameters({ mode: 'positioning', length: 25 }),
    ).toEqual({
      valid: true,
      value: { mode: 'positioning', length: 25 },
    })
    expect(PILLAR_CONFIGURATION).toMatchObject({
      positioningDefaultLength: 5,
      positioningMinLength: 3,
      positioningMaxLength: 500,
      positioningBodyDiameter: 5,
      positioningLowerChamfer: 1,
      positioningUpperChamfer: 0.5,
    })
  })

  it('keeps fixed modes free of a manual length parameter', () => {
    expect(
      validatePillarParameters({ mode: 'standard', length: 8 }).valid,
    ).toBe(false)
    expect(
      validatePillarParameters({ mode: 'thin-shell', length: 5 }).valid,
    ).toBe(false)
    expect(validatePillarParameters({ mode: 'positioning' }).valid).toBe(false)
  })

  it('rejects missing, unsupported, and legacy parameter shapes', () => {
    for (const value of [
      {},
      { mode: 'legacy' },
      { mode: true },
      { mode: 'standard', length: 8 },
      { length: 8, baseConnection: true },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('returns centered fixed bounds for both modes', () => {
    expect(boundsForPillar({ mode: 'standard' })).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 8],
    })
    expect(boundsForPillar({ mode: 'thin-shell' })).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 5],
    })
    expect(boundsForPillar({ mode: 'positioning', length: 25 })).toEqual({
      min: [-2.5, -2.5, 0],
      max: [2.5, 2.5, 25],
    })
  })

  it('uses deterministic mode-specific export filenames', () => {
    expect(pillarFileName({ mode: 'standard' })).toBe('pillar-8-standard.step')
    expect(pillarFileName({ mode: 'thin-shell' })).toBe(
      'pillar-5-thin-shell.step',
    )
    expect(pillarStlFileName({ mode: 'standard' })).toBe(
      'pillar-8-standard.stl',
    )
    expect(pillarStlFileName({ mode: 'thin-shell' })).toBe(
      'pillar-5-thin-shell.stl',
    )
    expect(pillarFileName({ mode: 'positioning', length: 25 })).toBe(
      'pillar-25-positioning.step',
    )
    expect(pillarStlFileName({ mode: 'positioning', length: 25 })).toBe(
      'pillar-25-positioning.stl',
    )
  })
})

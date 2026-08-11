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
      standardLength: 9,
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

  it('rejects missing, unsupported, and legacy parameter shapes', () => {
    for (const value of [
      {},
      { mode: 'legacy' },
      { mode: true },
      { mode: 'standard', length: 9 },
      { length: 9, baseConnection: true },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('returns centered fixed bounds for both modes', () => {
    expect(boundsForPillar({ mode: 'standard' })).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 9],
    })
    expect(boundsForPillar({ mode: 'thin-shell' })).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 5],
    })
  })

  it('uses deterministic mode-specific export filenames', () => {
    expect(pillarFileName({ mode: 'standard' })).toBe('pillar-9-standard.step')
    expect(pillarFileName({ mode: 'thin-shell' })).toBe(
      'pillar-5-thin-shell.step',
    )
    expect(pillarStlFileName({ mode: 'standard' })).toBe(
      'pillar-9-standard.stl',
    )
    expect(pillarStlFileName({ mode: 'thin-shell' })).toBe(
      'pillar-5-thin-shell.stl',
    )
  })
})

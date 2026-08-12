import { describe, expect, it } from 'vitest'
import {
  boundsForPillar,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  normalizePillarParameters,
  validatePillarParameters,
} from '../../src/cad-contract/units'

describe('pillar contract', () => {
  it('uses the shared shaft, flange, and fixed mode dimensions', () => {
    expect(PILLAR_CONFIGURATION).toMatchObject({
      standardLength: 9,
      thinShellLength: 6,
      bodyDiameter: 5,
      baseDiameter: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeDiameter,
      baseHeight: OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
      upperChamfer: 0.5,
      offsetMin: -0.5,
      offsetMax: 0.5,
      offsetStep: 0.05,
      defaultParameters: { mode: 'standard', offsetX: 0, offsetY: 0 },
    })
    expect(PILLAR_CONFIGURATION.bodyDiameter).toBe(
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftDiameter,
    )
  })

  it('accepts exactly the standard and thin-shell modes with offsets', () => {
    expect(
      validatePillarParameters({ mode: 'standard', offsetX: 0, offsetY: 0 }),
    ).toEqual({
      valid: true,
      value: { mode: 'standard', offsetX: 0, offsetY: 0 },
    })
    expect(
      validatePillarParameters({
        mode: 'thin-shell',
        offsetX: 0.15,
        offsetY: -0.1,
      }),
    ).toEqual({
      valid: true,
      value: { mode: 'thin-shell', offsetX: 0.15, offsetY: -0.1 },
    })
  })

  it('accepts a custom-length positioning mode with the legacy Ø5 mm profile', () => {
    expect(
      validatePillarParameters({
        mode: 'positioning',
        length: 25,
        offsetX: 0,
        offsetY: 0,
      }),
    ).toEqual({
      valid: true,
      value: { mode: 'positioning', length: 25, offsetX: 0, offsetY: 0 },
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
      validatePillarParameters({
        mode: 'standard',
        length: 9,
        offsetX: 0,
        offsetY: 0,
      }).valid,
    ).toBe(false)
    expect(
      validatePillarParameters({
        mode: 'thin-shell',
        length: 6,
        offsetX: 0,
        offsetY: 0,
      }).valid,
    ).toBe(false)
    expect(
      validatePillarParameters({ mode: 'positioning', offsetX: 0, offsetY: 0 })
        .valid,
    ).toBe(false)
  })

  it('validates both offset range and 0.05 mm steps', () => {
    expect(
      validatePillarParameters({
        mode: 'standard',
        offsetX: 0.1,
        offsetY: -0.5,
      }).valid,
    ).toBe(true)
    expect(
      validatePillarParameters({
        mode: 'standard',
        offsetX: 0.12,
        offsetY: 0,
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offsetX' })],
    })
    expect(
      validatePillarParameters({
        mode: 'standard',
        offsetX: 0.55,
        offsetY: 0,
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offsetX' })],
    })
  })

  it('rejects missing, unsupported, and legacy parameter shapes', () => {
    for (const value of [
      {},
      { mode: 'legacy' },
      { mode: true },
      { mode: 'standard', length: 9, offsetX: 0, offsetY: 0 },
      { length: 8, baseConnection: true },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('returns fixed bounds and applies typed XY offsets', () => {
    expect(
      boundsForPillar({ mode: 'standard', offsetX: 0, offsetY: 0 }),
    ).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 9],
    })
    expect(
      boundsForPillar({ mode: 'thin-shell', offsetX: 0, offsetY: 0 }),
    ).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 6],
    })
    expect(
      boundsForPillar({
        mode: 'positioning',
        length: 25,
        offsetX: 0.25,
        offsetY: -0.15,
      }),
    ).toEqual({
      min: [-2.25, -2.65, 0],
      max: [2.75, 2.35, 25],
    })
  })

  it('migrates old snapshots to zero-offset typed snapshots', () => {
    expect(normalizePillarParameters({ mode: 'standard' })).toEqual({
      mode: 'standard',
      offsetX: 0,
      offsetY: 0,
    })
    expect(
      normalizePillarParameters({ mode: 'positioning', length: 25 }),
    ).toEqual({
      mode: 'positioning',
      length: 25,
      offsetX: 0,
      offsetY: 0,
    })
    expect(
      normalizePillarParameters({ length: 25, baseConnection: false }),
    ).toEqual({
      mode: 'positioning',
      length: 25,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('uses deterministic mode-specific export filenames', () => {
    expect(pillarFileName({ mode: 'standard', offsetX: 0, offsetY: 0 })).toBe(
      'pillar-9-standard.step',
    )
    expect(pillarFileName({ mode: 'thin-shell', offsetX: 0, offsetY: 0 })).toBe(
      'pillar-6-thin-shell.step',
    )
    expect(
      pillarStlFileName({ mode: 'standard', offsetX: 0, offsetY: 0 }),
    ).toBe('pillar-9-standard.stl')
    expect(
      pillarStlFileName({ mode: 'thin-shell', offsetX: 0, offsetY: 0 }),
    ).toBe('pillar-6-thin-shell.stl')
    expect(
      pillarFileName({
        mode: 'positioning',
        length: 25,
        offsetX: 0,
        offsetY: 0,
      }),
    ).toBe('pillar-25-positioning.step')
    expect(
      pillarStlFileName({
        mode: 'positioning',
        length: 25,
        offsetX: 0.25,
        offsetY: -0.15,
      }),
    ).toBe('pillar-25-positioning-x0.25-y-0.15.stl')
    expect(
      pillarStlFileName({
        mode: 'positioning',
        length: 25,
        offsetX: 0,
        offsetY: 0,
      }),
    ).toBe('pillar-25-positioning.stl')

    for (const parameters of [
      { mode: 'standard', offsetX: 0.25, offsetY: -0.15 },
      { mode: 'thin-shell', offsetX: 0.25, offsetY: -0.15 },
    ] as const) {
      expect(pillarFileName(parameters)).toBe(
        `pillar-${parameters.mode === 'standard' ? 9 : 6}-${parameters.mode}-x0.25-y-0.15.step`,
      )
      expect(pillarStlFileName(parameters)).toBe(
        `pillar-${parameters.mode === 'standard' ? 9 : 6}-${parameters.mode}-x0.25-y-0.15.stl`,
      )
    }
  })
})

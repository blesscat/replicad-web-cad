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
      defaultParameters: { mode: 'standard', offset: 0 },
    })
    expect(PILLAR_CONFIGURATION.bodyDiameter).toBe(
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftDiameter,
    )
  })

  it('accepts exactly the fixed modes with one shared XY offset', () => {
    expect(validatePillarParameters({ mode: 'standard', offset: 0 })).toEqual({
      valid: true,
      value: { mode: 'standard', offset: 0 },
    })
    expect(
      validatePillarParameters({ mode: 'thin-shell', offset: 0.15 }),
    ).toEqual({
      valid: true,
      value: { mode: 'thin-shell', offset: 0.15 },
    })
  })

  it('accepts a custom-length positioning mode with the legacy Ø5 mm profile', () => {
    expect(
      validatePillarParameters({
        mode: 'positioning',
        length: 25,
        offset: 0,
      }),
    ).toEqual({
      valid: true,
      value: { mode: 'positioning', length: 25, offset: 0 },
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

  it('accepts only the fixed shared detachable corner-seat snapshot', () => {
    const parameters = { mode: 'detachable-corner-seat' } as const

    expect(validatePillarParameters(parameters)).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        offset: 0,
      }),
    ).toMatchObject({ valid: false })
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 4.5,
      }),
    ).toMatchObject({ valid: false })
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        clearance: 0.1,
      }),
    ).toEqual({
      valid: false,
      issues: [{ field: 'clearance', messageId: 'validation.invalid' }],
    })
  })

  it('keeps fixed modes free of a manual length parameter', () => {
    expect(
      validatePillarParameters({
        mode: 'standard',
        length: 9,
        offset: 0,
      }).valid,
    ).toBe(false)
    expect(
      validatePillarParameters({
        mode: 'thin-shell',
        length: 6,
        offset: 0,
      }).valid,
    ).toBe(false)
    expect(
      validatePillarParameters({ mode: 'positioning', offset: 0 }).valid,
    ).toBe(false)
  })

  it('validates the shared offset range and 0.05 mm steps', () => {
    expect(
      validatePillarParameters({ mode: 'standard', offset: 0.1 }).valid,
    ).toBe(true)
    expect(
      validatePillarParameters({ mode: 'standard', offset: 0.12 }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offset' })],
    })
    expect(
      validatePillarParameters({ mode: 'standard', offset: 0.55 }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offset' })],
    })
  })

  it('rejects missing, unsupported, and removed two-offset parameter shapes', () => {
    for (const value of [
      {},
      { mode: 'legacy' },
      { mode: true },
      { mode: 'standard', offsetX: 0, offsetY: 0 },
      { mode: 'standard', length: 9, offset: 0 },
      { length: 8, baseConnection: true },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('uses the shared offset as an XY diameter increment without moving the center', () => {
    expect(boundsForPillar({ mode: 'standard', offset: 0 })).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 9],
    })
    expect(boundsForPillar({ mode: 'thin-shell', offset: 0 })).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 6],
    })
    expect(
      boundsForPillar({ mode: 'positioning', length: 25, offset: 0.25 }),
    ).toEqual({
      min: [-2.625, -2.625, 0],
      max: [2.625, 2.625, 25],
    })
    expect(boundsForPillar({ mode: 'standard', offset: 0.5 })).toEqual({
      min: [-3.75, -3.75, 0],
      max: [3.75, 3.75, 9],
    })
    expect(boundsForPillar({ mode: 'detachable-corner-seat' })).toEqual({
      min: [-2.5, -2.5, 0],
      max: [2.5, 2.5, 5.3],
    })
  })

  it('migrates legacy snapshots to the shared offset contract', () => {
    expect(normalizePillarParameters({ mode: 'standard' })).toEqual({
      mode: 'standard',
      offset: 0,
    })
    expect(
      normalizePillarParameters({
        mode: 'thin-shell',
        offsetX: 0.25,
        offsetY: 0.25,
      }),
    ).toEqual({ mode: 'thin-shell', offset: 0.25 })
    expect(
      normalizePillarParameters({
        mode: 'positioning',
        length: 25,
        offsetX: 0.25,
        offsetY: -0.15,
      }),
    ).toEqual({ mode: 'positioning', length: 25, offset: 0 })
    expect(
      normalizePillarParameters({ mode: 'positioning', length: 25 }),
    ).toEqual({ mode: 'positioning', length: 25, offset: 0 })
    expect(
      normalizePillarParameters({ length: 25, baseConnection: false }),
    ).toEqual({ mode: 'positioning', length: 25, offset: 0 })
    expect(normalizePillarParameters({ mode: 'positioning' })).toEqual({
      mode: 'standard',
      offset: 0,
    })
    expect(
      normalizePillarParameters({ mode: 'detachable-corner-seat' }),
    ).toEqual({ mode: 'detachable-corner-seat' })
  })

  it('uses deterministic mode-specific export filenames', () => {
    expect(pillarFileName({ mode: 'standard', offset: 0 })).toBe(
      'pillar-9-standard.step',
    )
    expect(pillarFileName({ mode: 'thin-shell', offset: 0 })).toBe(
      'pillar-6-thin-shell.step',
    )
    expect(pillarStlFileName({ mode: 'standard', offset: 0 })).toBe(
      'pillar-9-standard.stl',
    )
    expect(pillarStlFileName({ mode: 'thin-shell', offset: 0 })).toBe(
      'pillar-6-thin-shell.stl',
    )
    expect(pillarFileName({ mode: 'positioning', length: 25, offset: 0 })).toBe(
      'pillar-25-positioning.step',
    )
    expect(
      pillarStlFileName({ mode: 'positioning', length: 25, offset: 0.25 }),
    ).toBe('pillar-25-positioning-xy0.25.stl')
    expect(
      pillarStlFileName({ mode: 'positioning', length: 25, offset: 0 }),
    ).toBe('pillar-25-positioning.stl')
    expect(pillarFileName({ mode: 'detachable-corner-seat' })).toBe(
      'pillar-5.3-detachable-corner-seat.step',
    )
    expect(pillarStlFileName({ mode: 'detachable-corner-seat' })).toBe(
      'pillar-5.3-detachable-corner-seat.stl',
    )

    for (const parameters of [
      { mode: 'standard', offset: 0.25 },
      { mode: 'thin-shell', offset: 0.25 },
    ] as const) {
      expect(pillarFileName(parameters)).toBe(
        `pillar-${parameters.mode === 'standard' ? 9 : 6}-${parameters.mode}-xy0.25.step`,
      )
      expect(pillarStlFileName(parameters)).toBe(
        `pillar-${parameters.mode === 'standard' ? 9 : 6}-${parameters.mode}-xy0.25.stl`,
      )
    }
  })
})

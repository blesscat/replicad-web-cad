import { describe, expect, it } from 'vitest'
import {
  boundsForPillar,
  pillarFileName,
  pillarStlFileName,
  PILLAR_CONFIGURATION,
  normalizePillarParameters,
  validatePillarParameters,
} from '../../src/cad-contract/units'

describe('pillar contract', () => {
  it('uses the locking corner seat as the default and the positioning geometry contract', () => {
    expect(PILLAR_CONFIGURATION).toMatchObject({
      bodyDiameter: 5,
      positioningDefaultLength: 10,
      positioningMinLength: 3,
      positioningMaxLength: 500,
      positioningBodyDiameter: 5,
      positioningLowerChamfer: 0.2,
      positioningUpperChamfer: 0.2,
      seatDefaultLength: 3.8,
      seatMinLength: 3,
      seatMaxLength: 100,
      seatLengthStep: 0.1,
      offsetMin: -0.5,
      offsetMax: 0.5,
      offsetStep: 0.05,
      defaultParameters: {
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      },
    })
    expect(PILLAR_CONFIGURATION).not.toHaveProperty('standardLength')
    expect(PILLAR_CONFIGURATION).not.toHaveProperty('thinShellLength')
  })

  it('accepts only the locking corner seat and positioning modes', () => {
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      }),
    ).toEqual({
      valid: true,
      value: { mode: 'detachable-corner-seat', length: 3.8, offset: 0 },
    })
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 4.2,
        offset: 0.15,
      }),
    ).toEqual({
      valid: true,
      value: { mode: 'detachable-corner-seat', length: 4.2, offset: 0.15 },
    })
    expect(
      validatePillarParameters({ mode: 'positioning', length: 25, offset: 0 }),
    ).toEqual({
      valid: true,
      value: { mode: 'positioning', length: 25, offset: 0 },
    })
    expect(
      validatePillarParameters({ mode: 'standard', offset: 0 }),
    ).toMatchObject({ valid: false })
    expect(
      validatePillarParameters({ mode: 'thin-shell', offset: 0 }),
    ).toMatchObject({ valid: false })
  })

  it('rejects mode-inappropriate and unsupported seat fields', () => {
    for (const value of [
      { mode: 'detachable-corner-seat' },
      { mode: 'detachable-corner-seat', length: 3.8 },
      { mode: 'detachable-corner-seat', offset: 0 },
      { mode: 'detachable-corner-seat', clearance: 0.1 },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('validates the seat locating length and shared XY increment', () => {
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 3,
        offset: 0,
      }).valid,
    ).toBe(true)
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 100,
        offset: -0.5,
      }).valid,
    ).toBe(true)
    for (const length of [2.9, 100.1, 3.85, 3.888, Number.NaN]) {
      expect(
        validatePillarParameters({
          mode: 'detachable-corner-seat',
          length,
          offset: 0,
        }),
      ).toMatchObject({
        valid: false,
        issues: [expect.objectContaining({ field: 'length' })],
      })
    }
    expect(
      validatePillarParameters({
        mode: 'detachable-corner-seat',
        length: 4.2,
        offset: 0.12,
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offset' })],
    })
  })

  it('validates positioning length and shared XY increment', () => {
    expect(
      validatePillarParameters({ mode: 'positioning', length: 10, offset: 0.1 })
        .valid,
    ).toBe(true)
    expect(
      validatePillarParameters({
        mode: 'positioning',
        length: 10,
        offset: 0.12,
      }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'offset' })],
    })
    expect(
      validatePillarParameters({ mode: 'positioning', length: 2, offset: 0 }),
    ).toMatchObject({
      valid: false,
      issues: [expect.objectContaining({ field: 'length' })],
    })
  })

  it('rejects missing, unsupported, and removed parameter shapes', () => {
    for (const value of [
      {},
      { mode: 'legacy' },
      { mode: true },
      { mode: 'standard', offsetX: 0, offsetY: 0 },
      { mode: 'thin-shell', offset: 0 },
      { mode: 'positioning', offset: 0 },
    ]) {
      expect(validatePillarParameters(value).valid).toBe(false)
    }
  })

  it('uses the shared positioning offset without moving the center', () => {
    expect(
      boundsForPillar({ mode: 'positioning', length: 25, offset: 0.25 }),
    ).toEqual({
      min: [-2.625, -2.625, 0],
      max: [2.625, 2.625, 25],
    })
    expect(
      boundsForPillar({ mode: 'positioning', length: 25, offset: 0.5 }),
    ).toEqual({
      min: [-2.75, -2.75, 0],
      max: [2.75, 2.75, 25],
    })
    expect(
      boundsForPillar({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      }),
    ).toEqual({
      min: [-3.321716, -2.5, 0],
      max: [3.321716, 2.5, 5.3],
    })
    expect(
      boundsForPillar({
        mode: 'detachable-corner-seat',
        length: 5,
        offset: 0.3,
      }),
    ).toEqual({
      min: [-3.321716, -2.65, 0],
      max: [3.321716, 2.65, 6.5],
    })
    expect(
      boundsForPillar({
        mode: 'detachable-corner-seat',
        length: 3,
        offset: -0.5,
      }),
    ).toEqual({
      min: [-3.321716, -2.25, 0],
      max: [3.321716, 2.25, 4.5],
    })
  })

  it('migrates legacy snapshots to the remaining modes', () => {
    expect(normalizePillarParameters({ mode: 'standard' })).toEqual({
      mode: 'detachable-corner-seat',
      length: 3.8,
      offset: 0,
    })
    expect(
      normalizePillarParameters({
        mode: 'thin-shell',
        offsetX: 0.25,
        offsetY: 0.25,
      }),
    ).toEqual({ mode: 'detachable-corner-seat', length: 3.8, offset: 0 })
    expect(
      normalizePillarParameters({ mode: 'detachable-corner-seat' }),
    ).toEqual({ mode: 'detachable-corner-seat', length: 3.8, offset: 0 })
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
      mode: 'detachable-corner-seat',
      length: 3.8,
      offset: 0,
    })
  })

  it('uses deterministic export filenames for the remaining modes', () => {
    expect(pillarFileName({ mode: 'positioning', length: 10, offset: 0 })).toBe(
      'pillar-10-positioning.step',
    )
    expect(
      pillarStlFileName({ mode: 'positioning', length: 25, offset: 0.25 }),
    ).toBe('pillar-25-positioning-xy0.25.stl')
    expect(
      pillarFileName({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      }),
    ).toBe('pillar-5.3-detachable-corner-seat.step')
    expect(
      pillarStlFileName({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: 0,
      }),
    ).toBe('pillar-5.3-detachable-corner-seat.stl')
    expect(
      pillarFileName({
        mode: 'detachable-corner-seat',
        length: 5,
        offset: 0.1,
      }),
    ).toBe('pillar-6.5-detachable-corner-seat-z5-xy0.1.step')
    expect(
      pillarStlFileName({
        mode: 'detachable-corner-seat',
        length: 3.8,
        offset: -0.25,
      }),
    ).toBe('pillar-5.3-detachable-corner-seat-xy-0.25.stl')
    expect(
      pillarFileName({
        mode: 'detachable-corner-seat',
        length: 4.2,
        offset: 0,
      }),
    ).toBe('pillar-5.7-detachable-corner-seat-z4.2.step')
  })
})

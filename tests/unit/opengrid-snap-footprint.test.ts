import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridSnap,
  normalizeOpenGridSnapParameters,
  openGridSnapCanonicalAxesFor,
  openGridSnapFootprintForLegacyAxes,
  openGridSnapFileName,
  openGridSnapStlFileName,
  validateOpenGridSnapParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<{
    variant: 'Full' | 'Lite'
    profile: 'Standard' | 'Directional'
    offset: number
    footprint: 'full' | 'half' | 'quarter'
    fourCornerLocatingHoles: boolean
    centerRemoverHole: boolean
  }> = {},
) {
  return {
    variant: 'Full' as const,
    profile: 'Standard' as const,
    offset: 0,
    footprint: 'full' as const,
    fourCornerLocatingHoles: false,
    centerRemoverHole: false,
    magnetHoleShape: 'none' as const,
    magnetHoleLength: 0,
    magnetHoleWidth: 0,
    magnetHoleDiameter: 0,
    magnetHoleThickness: 0,
    ...overrides,
  }
}

describe('OpenGrid Snap footprint contract', () => {
  it('maps footprints to one deterministic canonical board orientation', () => {
    expect(openGridSnapCanonicalAxesFor('full')).toEqual({
      halfCellX: 'none',
      halfCellY: 'none',
    })
    expect(openGridSnapCanonicalAxesFor('half')).toEqual({
      halfCellX: 'left',
      halfCellY: 'none',
    })
    expect(openGridSnapCanonicalAxesFor('quarter')).toEqual({
      halfCellX: 'left',
      halfCellY: 'top',
    })
    expect(openGridSnapFootprintForLegacyAxes('none', 'none')).toBe('full')
    expect(openGridSnapFootprintForLegacyAxes('right', 'none')).toBe('half')
    expect(openGridSnapFootprintForLegacyAxes('right', 'bottom')).toBe(
      'quarter',
    )
    expect(openGridSnapFootprintForLegacyAxes('diagonal', 'none')).toBeNull()
  })

  it('accepts only full, half, and quarter footprints', () => {
    for (const footprint of ['full', 'half', 'quarter'] as const) {
      const input = parameters({ footprint })
      expect(validateOpenGridSnapParameters(input)).toEqual({
        valid: true,
        value: input,
      })
    }

    expect(
      validateOpenGridSnapParameters({ ...parameters(), halfCellX: 'left' }),
    ).toMatchObject({ valid: false })
  })

  it('maps footprint sizes to canonical centered bounds', () => {
    expect(boundsForOpenGridSnap(parameters({ footprint: 'full' }))).toEqual({
      min: [-12.8, -12.8, 0],
      max: [12.8, 12.8, 6.8],
    })
    expect(boundsForOpenGridSnap(parameters({ footprint: 'half' }))).toEqual({
      min: [-6.4, -12.8, 0],
      max: [6.4, 12.8, 6.8],
    })
    expect(
      boundsForOpenGridSnap(
        parameters({ profile: 'Directional', footprint: 'quarter' }),
      ),
    ).toEqual({
      min: [-6.4005, -6.6005, -0.001],
      max: [6.4005, 6.6005, 6.801],
    })
  })

  it('normalizes legacy axis snapshots into a canonical footprint', () => {
    expect(
      normalizeOpenGridSnapParameters({
        variant: 'Lite',
        offset: 0.2,
        halfCellX: 'none',
        halfCellY: 'none',
      }),
    ).toEqual({
      variant: 'Lite',
      profile: 'Standard',
      offset: 0.2,
      footprint: 'full',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    })
    expect(
      normalizeOpenGridSnapParameters({
        variant: 'Lite',
        offset: 0,
        halfCellX: 'right',
        halfCellY: 'none',
      }),
    ).toMatchObject({ footprint: 'half' })
    expect(
      normalizeOpenGridSnapParameters({
        variant: 'Lite',
        offset: 0,
        halfCellX: 'right',
        halfCellY: 'bottom',
      }),
    ).toMatchObject({ footprint: 'quarter' })
  })

  it('uses footprint metadata in deterministic exports', () => {
    const input = parameters({
      variant: 'Lite',
      profile: 'Directional',
      offset: 0.15,
      footprint: 'quarter',
      fourCornerLocatingHoles: true,
      centerRemoverHole: true,
    })

    expect(openGridSnapFileName(input)).toBe('Quarter.step')
    expect(openGridSnapStlFileName(input)).toBe(
      'opengrid-snap-directional-lite-offset0.15-quarter-corners1-center1.stl',
    )
  })
})

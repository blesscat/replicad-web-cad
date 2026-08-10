import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  openGridSnapFileName,
  openGridSnapStlFileName,
  OPENGRID_SNAP_CONFIGURATION,
  validateOpenGridSnapParameters,
} from '../../src/cad-contract/units'

describe('OpenGrid Snap contract', () => {
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
      ...overrides,
    }
  }

  it('configures the shared offset as a 0-to-1 mm slider in 0.05 mm steps', () => {
    expect(OPENGRID_SNAP_CONFIGURATION.minOffset).toBe(0)
    expect(OPENGRID_SNAP_CONFIGURATION.maxOffset).toBe(1)
    expect(OPENGRID_SNAP_CONFIGURATION.offsetStep).toBe(0.05)
  })

  it('accepts only the typed footprint contract and preserves defaults', () => {
    const full = parameters({ variant: 'Full', offset: 0.2 })
    const lite = parameters({ variant: 'Lite', offset: 0.4 })

    expect(validateOpenGridSnapParameters(full)).toEqual({
      valid: true,
      value: full,
    })
    expect(validateOpenGridSnapParameters(lite)).toEqual({
      valid: true,
      value: lite,
    })
    expect(isOpenGridSnapParameters(full)).toBe(true)
    expect(OPENGRID_SNAP_CONFIGURATION.defaultParameters).toEqual(parameters())
    expect(
      validateOpenGridSnapParameters({ ...full, halfCellX: 'left' }),
    ).toMatchObject({ valid: false })
  })

  it('treats offset as a centered total envelope delta', () => {
    const input = parameters({ variant: 'Full', offset: 0.2 })
    const width = OPENGRID_SNAP_CONFIGURATION.nominalWidth + input.offset
    const depth = OPENGRID_SNAP_CONFIGURATION.nominalDepth + input.offset

    expect(boundsForOpenGridSnap(input)).toEqual({
      min: [-width / 2, -depth / 2, 0],
      max: [
        width / 2,
        depth / 2,
        OPENGRID_SNAP_CONFIGURATION.variantHeights.Full,
      ],
    })
  })

  it('maps canonical footprint sizes without changing the hole contract', () => {
    const half = parameters({ footprint: 'half' })
    const quarter = parameters({ footprint: 'quarter' })

    expect(boundsForOpenGridSnap(half)).toEqual({
      min: [-6.4, -12.8, 0],
      max: [6.4, 12.8, 6.8],
    })
    expect(boundsForOpenGridSnap(quarter)).toEqual({
      min: [-6.4, -6.4, 0],
      max: [6.4, 6.4, 6.8],
    })
    expect(
      validateOpenGridSnapParameters({
        ...quarter,
        footprint: 'quarter',
        fourCornerLocatingHoles: true,
        centerRemoverHole: true,
      }),
    ).toMatchObject({ valid: true })
  })

  it('keeps Directional asymmetry for the canonical quarter footprint', () => {
    const full = boundsForOpenGridSnap(parameters({ profile: 'Directional' }))
    const quarter = boundsForOpenGridSnap(
      parameters({ profile: 'Directional', footprint: 'quarter' }),
    )

    expect(full.min).toEqual([
      expect.closeTo(-12.801, 10),
      expect.closeTo(-12.801, 10),
      expect.closeTo(-0.001, 10),
    ])
    expect(full.max).toEqual([
      expect.closeTo(12.801, 10),
      expect.closeTo(13.201, 10),
      expect.closeTo(6.801, 10),
    ])
    expect(quarter.min).toEqual([
      expect.closeTo(-6.4005, 10),
      expect.closeTo(-6.6005, 10),
      expect.closeTo(-0.001, 10),
    ])
    expect(quarter.max).toEqual([
      expect.closeTo(6.4005, 10),
      expect.closeTo(6.6005, 10),
      expect.closeTo(6.801, 10),
    ])
    expect(
      validateOpenGridSnapParameters(
        parameters({
          profile: 'Directional',
          footprint: 'quarter',
          offset: 1,
        }),
      ).valid,
    ).toBe(false)
  })

  it('keeps deterministic footprint-aware export filenames', () => {
    const input = parameters({
      variant: 'Lite',
      profile: 'Directional',
      offset: 0.15,
      footprint: 'quarter',
      fourCornerLocatingHoles: true,
      centerRemoverHole: true,
    })

    expect(openGridSnapFileName(input)).toBe(
      'opengrid-snap-directional-lite-offset0.15-quarter-corners1-center1.step',
    )
    expect(openGridSnapStlFileName(input)).toBe(
      'opengrid-snap-directional-lite-offset0.15-quarter-corners1-center1.stl',
    )
  })

  it('rejects board-only fields, arbitrary axes, and invalid offsets', () => {
    const defaults = parameters()

    expect(
      validateOpenGridSnapParameters({ ...defaults, rows: 2 }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({ ...defaults, halfCellX: 'left' }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({ ...defaults, offset: Number.NaN }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({
        ...defaults,
        offset: OPENGRID_SNAP_CONFIGURATION.maxOffset + 0.1,
      }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({ ...defaults, offset: 0.03 }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({ ...defaults, allowHalfCell: true }),
    ).toMatchObject({ valid: false })
  })
})

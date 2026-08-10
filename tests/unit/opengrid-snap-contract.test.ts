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
      halfCellX: 'none' | 'left' | 'right'
      halfCellY: 'none' | 'top' | 'bottom'
      fourCornerLocatingHoles: boolean
      centerRemoverHole: boolean
    }> = {},
  ) {
    return {
      variant: 'Full' as const,
      profile: 'Standard' as const,
      offset: 0,
      halfCellX: 'none' as const,
      halfCellY: 'none' as const,
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

  it('accepts one shared total envelope offset for both axes', () => {
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
    expect(OPENGRID_SNAP_CONFIGURATION.defaultParameters).toEqual({
      variant: 'Full',
      profile: 'Standard',
      offset: 0,
      halfCellX: 'none',
      halfCellY: 'none',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
    })
  })

  it('treats the shared offset as a centered total envelope delta', () => {
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

  it('keeps deterministic variant-aware export filenames', () => {
    const input = parameters({
      variant: 'Lite',
      profile: 'Directional',
      offset: 0.15,
      fourCornerLocatingHoles: true,
      centerRemoverHole: true,
    })

    expect(openGridSnapFileName(input)).toBe(
      'opengrid-snap-directional-lite-offset0.15-xnone-ynone-corners1-center1.step',
    )
    expect(openGridSnapStlFileName(input)).toBe(
      'opengrid-snap-directional-lite-offset0.15-xnone-ynone-corners1-center1.stl',
    )
  })

  it('rejects board-only fields, separate axes, and invalid offsets', () => {
    const defaults = parameters()

    expect(
      validateOpenGridSnapParameters({ ...defaults, rows: 2 }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({
        variant: 'Full',
        offsetX: 0.2,
        offsetY: 0.2,
      }),
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
      validateOpenGridSnapParameters({
        ...defaults,
        offset: OPENGRID_SNAP_CONFIGURATION.minOffset - 0.1,
      }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({ ...defaults, offset: 0.03 }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({ ...defaults, allowHalfCell: true }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({ ...defaults, diagonal: 'left-top' }),
    ).toMatchObject({ valid: false })
  })

  it('supports single and dual half-cell envelopes', () => {
    const single = parameters({ halfCellX: 'left' })
    const dual = parameters({ halfCellX: 'right', halfCellY: 'top' })

    expect(validateOpenGridSnapParameters(single)).toEqual({
      valid: true,
      value: single,
    })
    expect(boundsForOpenGridSnap(single)).toEqual({
      min: [-6.4, -12.8, 0],
      max: [6.4, 12.8, 6.8],
    })
    expect(boundsForOpenGridSnap(dual)).toEqual({
      min: [-6.4, -6.4, 0],
      max: [6.4, 6.4, 6.8],
    })
  })

  it('keeps Directional asymmetry when selecting a footprint', () => {
    const full = parameters({ profile: 'Directional' })
    const left = parameters({ profile: 'Directional', halfCellX: 'left' })
    const top = parameters({ profile: 'Directional', halfCellY: 'top' })
    const bottom = parameters({
      profile: 'Directional',
      halfCellY: 'bottom',
    })

    const expectedDirectionalBounds = [
      [
        boundsForOpenGridSnap(full),
        [-12.801, -12.801, -0.001],
        [12.801, 13.201, 6.801],
      ],
      [
        boundsForOpenGridSnap(left),
        [-6.4005, -12.801, -0.001],
        [6.4005, 13.201, 6.801],
      ],
      [
        boundsForOpenGridSnap(top),
        [-12.801, -6.6005, -0.001],
        [12.801, 6.6005, 6.801],
      ],
      [
        boundsForOpenGridSnap(bottom),
        [-12.801, -6.4005, -0.001],
        [12.801, 6.4005, 6.801],
      ],
    ] as const
    for (const [
      bounds,
      expectedMin,
      expectedMax,
    ] of expectedDirectionalBounds) {
      expect(bounds.min[0]).toBeCloseTo(expectedMin[0], 10)
      expect(bounds.min[1]).toBeCloseTo(expectedMin[1], 10)
      expect(bounds.min[2]).toBeCloseTo(expectedMin[2], 10)
      expect(bounds.max[0]).toBeCloseTo(expectedMax[0], 10)
      expect(bounds.max[1]).toBeCloseTo(expectedMax[1], 10)
      expect(bounds.max[2]).toBeCloseTo(expectedMax[2], 10)
    }
    expect(
      validateOpenGridSnapParameters(
        parameters({
          profile: 'Directional',
          halfCellY: 'top',
          offset: 1,
        }),
      ).valid,
    ).toBe(false)
  })

  it('keeps every axis direction mutually exclusive and host-compatible', () => {
    for (const halfCellX of ['none', 'left', 'right'] as const) {
      expect(validateOpenGridSnapParameters(parameters({ halfCellX }))).toEqual(
        { valid: true, value: parameters({ halfCellX }) },
      )
    }
    for (const halfCellY of ['none', 'top', 'bottom'] as const) {
      expect(validateOpenGridSnapParameters(parameters({ halfCellY }))).toEqual(
        { valid: true, value: parameters({ halfCellY }) },
      )
    }
    expect(
      validateOpenGridSnapParameters(
        parameters({ halfCellX: 'right', halfCellY: 'bottom', offset: 1 }),
      ).valid,
    ).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  openGridSnapFileName,
  openGridSnapStlFileName,
  openGridSnapThreeMfFileName,
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
      openConnect: boolean
      topText: 'none' | 'SNAP'
      magnetHoleShape: 'none' | 'square' | 'round'
      magnetHoleLength: number
      magnetHoleWidth: number
      magnetHoleDiameter: number
      magnetHoleThickness: number
    }> = {},
  ) {
    return {
      variant: 'Full' as const,
      profile: 'Standard' as const,
      offset: 0,
      footprint: 'full' as const,
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      openConnect: false,
      topText: 'none' as const,
      magnetHoleShape: 'none' as const,
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
      ...overrides,
    }
  }

  it('configures the shared offset as a 0-to-1 mm slider in 0.05 mm steps', () => {
    expect(OPENGRID_SNAP_CONFIGURATION.minOffset).toBe(0)
    expect(OPENGRID_SNAP_CONFIGURATION.maxOffset).toBe(1)
    expect(OPENGRID_SNAP_CONFIGURATION.offsetStep).toBe(0.05)
    expect(
      validateOpenGridSnapParameters(
        parameters({ offset: OPENGRID_SNAP_CONFIGURATION.maxOffset }),
      ).valid,
    ).toBe(true)
  })

  it('configures magnet dimensions for the requested slider ranges', () => {
    expect(OPENGRID_SNAP_CONFIGURATION.magnetHole).toMatchObject({
      minPlanDimension: 1,
      defaultPlanDimension: 5,
      maxPlanDimension: 15,
      minThickness: 1,
      defaultThickness: 2,
      dimensionStep: 0.05,
    })
    expect(OPENGRID_SNAP_CONFIGURATION.magnetHole.maxThickness.Full).toBe(6)
    expect(
      validateOpenGridSnapParameters(
        parameters({
          magnetHoleShape: 'square',
          magnetHoleLength: 1,
          magnetHoleWidth: 15,
          magnetHoleThickness: 6,
        }),
      ).valid,
    ).toBe(true)
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
    expect(OPENGRID_SNAP_CONFIGURATION.defaultParameters).toEqual(
      parameters({ variant: 'Lite' }),
    )
    expect(
      validateOpenGridSnapParameters({ ...full, halfCellX: 'left' }),
    ).toMatchObject({ valid: false })
  })

  it('accepts OpenConnect for every profile and variant combination', () => {
    for (const profile of ['Standard', 'Directional'] as const) {
      for (const variant of ['Lite', 'Full'] as const) {
        const input = parameters({ profile, variant, openConnect: true })
        expect(validateOpenGridSnapParameters(input)).toEqual({
          valid: true,
          value: input,
        })
      }
    }
  })

  it('rejects OpenConnect for fixed partial footprints', () => {
    expect(
      validateOpenGridSnapParameters(
        parameters({ footprint: 'half', openConnect: true }),
      ),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters(
        parameters({ footprint: 'quarter', openConnect: true }),
      ),
    ).toMatchObject({ valid: false })
  })

  it('normalizes legacy snapshots with OpenConnect disabled', async () => {
    const { normalizeOpenGridSnapParameters } =
      await import('../../src/cad-contract/units')
    const legacy = parameters()
    delete (legacy as Partial<typeof legacy>).openConnect

    expect(normalizeOpenGridSnapParameters(legacy)).toMatchObject({
      openConnect: false,
    })
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

    expect(openGridSnapFileName(input)).toBe('Quarter.step')
    expect(openGridSnapStlFileName(input)).toBe(
      'opengrid-snap-directional-lite-offset0.15-quarter-corners1-center1.stl',
    )
  })

  it('distinguishes enabled magnet dimensions in Full export filenames', () => {
    const square = parameters({
      magnetHoleShape: 'square',
      magnetHoleLength: 6,
      magnetHoleWidth: 4,
      magnetHoleThickness: 2,
    })
    const round = parameters({
      magnetHoleShape: 'round',
      magnetHoleDiameter: 8,
      magnetHoleThickness: 2,
    })

    expect(openGridSnapFileName(square)).toContain(
      '-magnet-square-l6-w4-t2.step',
    )
    expect(openGridSnapStlFileName(round)).toContain('-magnet-round-d8-t2.stl')
  })

  it('distinguishes OpenConnect-enabled Full exports', () => {
    const input = parameters({ openConnect: true })

    expect(openGridSnapFileName(input)).toContain('-openconnect')
    expect(openGridSnapStlFileName(input)).toContain('-openconnect')
  })

  it('accepts only the fixed flat SNAP text combination', () => {
    const text = parameters({ variant: 'Lite', topText: 'SNAP' })
    expect(validateOpenGridSnapParameters(text)).toEqual({
      valid: true,
      value: text,
    })
    expect(openGridSnapThreeMfFileName(text)).toBe(
      'opengrid-snap-standard-lite-text-snap.3mf',
    )
    expect(openGridSnapFileName(text)).toContain('-text-snap.step')
    expect(openGridSnapStlFileName(text)).toContain('-text-snap.stl')

    for (const overrides of [
      { variant: 'Full' as const },
      { profile: 'Directional' as const },
      { offset: 0.05 },
      { footprint: 'half' as const },
      { openConnect: true },
      { fourCornerLocatingHoles: true },
      { centerRemoverHole: true },
      { magnetHoleShape: 'round' as const },
    ]) {
      expect(
        validateOpenGridSnapParameters({ ...text, ...overrides }),
      ).toMatchObject({ valid: false })
    }
  })

  it('uses fixed STEP filenames for half and quarter downloads', () => {
    expect(
      openGridSnapFileName(
        parameters({
          profile: 'Directional',
          variant: 'Lite',
          offset: 0.35,
          footprint: 'half',
          fourCornerLocatingHoles: true,
          centerRemoverHole: true,
        }),
      ),
    ).toBe('Half.step')
    expect(openGridSnapFileName(parameters({ footprint: 'quarter' }))).toBe(
      'Quarter.step',
    )
    expect(
      openGridSnapStlFileName(
        parameters({
          footprint: 'half',
          offset: 0.35,
        }),
      ),
    ).toContain('offset0.35-half')
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

  it('accepts square and round magnet contracts only with shape-specific fields', () => {
    const square = parameters({
      magnetHoleShape: 'square',
      magnetHoleLength: 6,
      magnetHoleWidth: 4,
      magnetHoleThickness: 2,
    })
    const round = parameters({
      magnetHoleShape: 'round',
      magnetHoleDiameter: 8,
      magnetHoleThickness: 2.5,
    })

    expect(validateOpenGridSnapParameters(square)).toEqual({
      valid: true,
      value: square,
    })
    expect(validateOpenGridSnapParameters(round)).toEqual({
      valid: true,
      value: round,
    })
  })

  it('rejects conflicting holes and non-zero inactive magnet dimensions', () => {
    const defaults = parameters()

    expect(
      validateOpenGridSnapParameters({
        ...defaults,
        magnetHoleShape: 'square',
        magnetHoleLength: 6,
        magnetHoleWidth: 4,
        magnetHoleThickness: 2,
        fourCornerLocatingHoles: true,
      }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({
        ...defaults,
        magnetHoleDiameter: 8,
      }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridSnapParameters({
        ...defaults,
        footprint: 'half',
        magnetHoleShape: 'round',
        magnetHoleDiameter: 8,
        magnetHoleThickness: 2,
      }),
    ).toMatchObject({ valid: false })
  })

  it('normalizes legacy Snap snapshots to an inactive magnet', async () => {
    const { normalizeOpenGridSnapParameters } =
      await import('../../src/cad-contract/units')

    expect(
      normalizeOpenGridSnapParameters({
        variant: 'Lite',
        offset: 0.2,
        halfCellX: 'none',
        halfCellY: 'none',
      }),
    ).toEqual({
      variant: 'Lite',
      offset: 0.2,
      profile: 'Standard',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      openConnect: false,
      topText: 'none',
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
      footprint: 'full',
    })
  })
})

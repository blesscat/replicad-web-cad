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
  it('configures the shared offset as a 0-to-1 mm slider in 0.05 mm steps', () => {
    expect(OPENGRID_SNAP_CONFIGURATION.minOffset).toBe(0)
    expect(OPENGRID_SNAP_CONFIGURATION.maxOffset).toBe(1)
    expect(OPENGRID_SNAP_CONFIGURATION.offsetStep).toBe(0.05)
  })

  it('accepts one shared total envelope offset for both axes', () => {
    const full = { variant: 'Full' as const, offset: 0.2 }
    const lite = { variant: 'Lite' as const, offset: 0.4 }

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
      offset: 0,
    })
  })

  it('treats the shared offset as a centered total envelope delta', () => {
    const parameters = { variant: 'Full' as const, offset: 0.2 }
    const width = OPENGRID_SNAP_CONFIGURATION.nominalWidth + parameters.offset
    const depth = OPENGRID_SNAP_CONFIGURATION.nominalDepth + parameters.offset

    expect(boundsForOpenGridSnap(parameters)).toEqual({
      min: [-width / 2, -depth / 2, 0],
      max: [
        width / 2,
        depth / 2,
        OPENGRID_SNAP_CONFIGURATION.variantHeights.Full,
      ],
    })
  })

  it('keeps deterministic variant-aware export filenames', () => {
    const parameters = { variant: 'Lite' as const, offset: 0.15 }

    expect(openGridSnapFileName(parameters)).toBe(
      'opengrid-snap-lite-offset0.15.step',
    )
    expect(openGridSnapStlFileName(parameters)).toBe(
      'opengrid-snap-lite-offset0.15.stl',
    )
  })

  it('rejects board-only fields, separate axes, and invalid offsets', () => {
    const defaults = { variant: 'Full' as const, offset: 0 }

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
  })
})

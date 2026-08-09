import { describe, expect, it } from 'vitest'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  boundsForOpenGridDivider,
  classifyOpenGridDividerShape,
  isOpenGridDividerParameters,
  normalizeOpenGridDividerParameters,
  openGridDividerAxisFor,
  openGridDividerFileName,
  openGridDividerPegCentersFor,
  openGridDividerPlanDimensionsFor,
  openGridDividerStlFileName,
  validateOpenGridDividerParameters,
} from '../../src/cad-contract/units'

describe('OpenGrid divider contract', () => {
  it('accepts the default horizontal two-grid divider', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
    })

    expect(parameters).toEqual({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
    })
    expect(classifyOpenGridDividerShape(parameters)).toBe('straight')
    expect(openGridDividerAxisFor(parameters)).toBe('horizontal')
    expect(isOpenGridDividerParameters(parameters)).toBe(true)
  })

  it('derives L, T, cross, and vertical straight shapes from active arms', () => {
    expect(
      classifyOpenGridDividerShape({
        left: 1,
        right: 0,
        up: 2,
        down: 0,
      }),
    ).toBe('L')
    expect(
      classifyOpenGridDividerShape({
        left: 1,
        right: 1,
        up: 2,
        down: 0,
      }),
    ).toBe('T')
    expect(
      classifyOpenGridDividerShape({
        left: 1,
        right: 1,
        up: 1,
        down: 1,
      }),
    ).toBe('cross')
    expect(
      openGridDividerAxisFor({
        left: 0,
        right: 0,
        up: 1,
        down: 1,
      }),
    ).toBe('vertical')
  })

  it('rejects incomplete, off-step, negative, and oversized snapshots', () => {
    expect(
      validateOpenGridDividerParameters({
        left: 1,
        right: 0,
        up: 0,
        down: 0,
        height: 20,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: 1.25,
        right: 1,
        up: 0,
        down: 0,
        height: 20,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: -1,
        right: 1,
        up: 0,
        down: 0,
        height: 20,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
        right: 0,
        up: 0.5,
        down: 0,
        height: 20,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        left: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
        right: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
        up: 0,
        down: 0,
        height: 20,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: 18,
        right: 18,
        up: 0,
        down: 0,
        height: 20,
      }).valid,
    ).toBe(false)
  })

  it('uses 14 mm full-grid lengths and sparse deterministic peg centers', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1.5,
      right: 2.5,
      up: 4.5,
      down: 0,
      height: 20,
    })

    expect(openGridDividerPlanDimensionsFor(parameters)).toMatchObject({
      width: 56,
      depth: 65.5,
      wallHeight: 20,
      totalHeight: 23,
    })
    const centers = openGridDividerPegCentersFor(parameters)
    const { pegCenterSpacing } = OPENGRID_DIVIDER_CONFIGURATION
    expect(centers).toEqual([
      [0, 0],
      [pegCenterSpacing, 0],
      [0, pegCenterSpacing],
      [0, pegCenterSpacing * 2],
    ])
    expect(new Set(centers.map(([x, y]) => `${x},${y}`)).size).toBe(
      centers.length,
    )
  })

  it('keeps a 3x3 cross to the central peg only', () => {
    expect(
      openGridDividerPegCentersFor({
        left: 1,
        right: 1,
        up: 1,
        down: 1,
      }),
    ).toEqual([[0, 0]])
  })

  it('returns centered bounds including the three millimetre peg extension', () => {
    const bounds = boundsForOpenGridDivider({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
    })

    expect(bounds).toEqual({
      min: [-14, -2.5, -3],
      max: [14, 2.5, 20],
    })
  })

  it('creates deterministic STEP and STL names', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1,
      right: 2,
      up: 3,
      down: 4,
      height: 20,
    })

    expect(openGridDividerFileName(parameters)).toBe(
      'opengrid-divider-l1-r2-u3-d4-h20.step',
    )
    expect(openGridDividerStlFileName(parameters)).toBe(
      'opengrid-divider-l1-r2-u3-d4-h20.stl',
    )
  })
})

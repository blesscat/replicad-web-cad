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
  openGridDividerTransitionHeightFor,
  validateOpenGridDividerParameters,
} from '../../src/cad-contract/units'

describe('OpenGrid divider contract', () => {
  it('keeps manual height at 500 mm while limiting the slider to 200 mm', () => {
    expect(OPENGRID_DIVIDER_CONFIGURATION.heightSliderMax).toBe(200)
    expect(
      validateOpenGridDividerParameters({
        left: 1,
        right: 1,
        up: 0,
        down: 0,
        height: 500,
        wallThickness: 2,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        left: 1,
        right: 1,
        up: 0,
        down: 0,
        height: 501,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
  })

  it('accepts selectable wall thickness and exposes profile dimensions', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })

    expect(parameters).toEqual({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })
    expect(openGridDividerPlanDimensionsFor(parameters)).toMatchObject({
      wallThickness: 2,
      baseWallWidth: OPENGRID_DIVIDER_CONFIGURATION.wallWidth,
    })
  })

  it('rejects fractional and out-of-range wall thickness', () => {
    const base = {
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
    }

    expect(
      validateOpenGridDividerParameters({ ...base, wallThickness: 1.5 }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridDividerParameters({ ...base, wallThickness: 0 }),
    ).toMatchObject({ valid: false })
    expect(
      validateOpenGridDividerParameters({ ...base, wallThickness: 6 }),
    ).toMatchObject({ valid: false })
    for (const wallThickness of [1, 2, 3, 4, 5]) {
      expect(
        validateOpenGridDividerParameters({ ...base, wallThickness }).valid,
      ).toBe(true)
    }
  })

  it('accepts the default horizontal two-grid divider', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness:
        OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
    })

    expect(parameters).toEqual({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness:
        OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
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
    expect(OPENGRID_DIVIDER_CONFIGURATION.maxArmCount).toBe(17.5)
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
        wallThickness: 2,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        left: 17.5,
        right: 0,
        up: 0.5,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(true)
    expect(
      validateOpenGridDividerParameters({
        left: 18,
        right: 0,
        up: 0.5,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
        right: OPENGRID_DIVIDER_CONFIGURATION.maxArmCount,
        up: 0,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
    expect(
      validateOpenGridDividerParameters({
        left: 18,
        right: 18,
        up: 0,
        down: 0,
        height: 20,
        wallThickness: 2,
      }).valid,
    ).toBe(false)
  })

  it('uses official 28 mm full-grid lengths and sparse deterministic peg centers', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1.5,
      right: 2.5,
      up: 4.5,
      down: 0,
      height: 20,
      wallThickness: 2,
    })

    expect(openGridDividerPlanDimensionsFor(parameters)).toMatchObject({
      width: 112,
      depth: 128.5,
      wallHeight: 20,
      totalHeight: 23,
    })
    const centers = openGridDividerPegCentersFor(parameters)
    const { pegCenterSpacing } = OPENGRID_DIVIDER_CONFIGURATION
    expect(centers).toEqual([
      [0, 0],
      [-pegCenterSpacing, 0],
      [pegCenterSpacing, 0],
      [pegCenterSpacing * 2, 0],
      [0, pegCenterSpacing],
      [0, pegCenterSpacing * 2],
      [0, pegCenterSpacing * 3],
      [0, pegCenterSpacing * 4],
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
      wallThickness: 2,
    })

    expect(bounds).toEqual({
      min: [-28, -2.5, -3],
      max: [28, 2.5, 20],
    })
  })

  it('creates deterministic STEP and STL names', () => {
    const parameters = normalizeOpenGridDividerParameters({
      left: 1,
      right: 2,
      up: 3,
      down: 4,
      height: 20,
      wallThickness: 2,
    })

    expect(openGridDividerFileName(parameters)).toBe(
      'opengrid-divider-l1-r2-u3-d4-t2-h20.step',
    )
    expect(openGridDividerStlFileName(parameters)).toBe(
      'opengrid-divider-l1-r2-u3-d4-t2-h20.stl',
    )
    expect(
      openGridDividerFileName({ ...parameters, wallThickness: 1 }),
    ).not.toBe(openGridDividerFileName(parameters))
    expect(
      openGridDividerStlFileName({ ...parameters, wallThickness: 5 }),
    ).not.toBe(openGridDividerStlFileName(parameters))
  })

  it('uses a 45-degree transition height when the profile has room', () => {
    expect(
      openGridDividerTransitionHeightFor({ wallThickness: 1, height: 20 }),
    ).toBe(2)
    expect(
      openGridDividerTransitionHeightFor({ wallThickness: 4, height: 20 }),
    ).toBe(0.5)
    expect(
      openGridDividerTransitionHeightFor({ wallThickness: 5, height: 20 }),
    ).toBe(0)
    expect(
      openGridDividerTransitionHeightFor({ wallThickness: 1, height: 2 }),
    ).toBeCloseTo(1.8, 10)
  })
})

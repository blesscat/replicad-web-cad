import { describe, expect, it } from 'vitest'
import {
  boundsForHexagonalColumn,
  hexagonalColumnFileName,
  hexagonalColumnStlFileName,
  HEXAGONAL_COLUMN_CONFIGURATION,
  validateHexagonalColumnParameters,
} from '../../src/cad-contract/units'

describe('hexagonal-column contract', () => {
  it('uses the documented defaults and accepts integer parameters', () => {
    expect(HEXAGONAL_COLUMN_CONFIGURATION).toMatchObject({
      defaultHeight: 8,
      defaultCount: 1,
      defaultGap: 1,
      maxHeight: 999,
      heightSliderMax: 200,
      maxGap: 99,
      gapSliderMax: 10,
      maxCount: 20,
      defaultOrientation: 'lying',
    })
    expect(
      validateHexagonalColumnParameters({ height: 50, count: 3, gap: 1 }),
    ).toEqual({
      valid: true,
      value: { height: 50, count: 3, gap: 1, orientation: 'lying' },
    })
  })

  it('accepts both orientations and rejects unknown orientation values', () => {
    expect(
      validateHexagonalColumnParameters({
        height: 50,
        count: 1,
        gap: 1,
        orientation: 'standing',
      }),
    ).toEqual({
      valid: true,
      value: { height: 50, count: 1, gap: 1, orientation: 'standing' },
    })
    expect(
      validateHexagonalColumnParameters({
        height: 50,
        count: 1,
        gap: 1,
        orientation: 'diagonal',
      }).valid,
    ).toBe(false)
  })

  it('rejects non-integers, non-positive values, and unsupported keys', () => {
    for (const parameters of [
      { height: 1.5, count: 1, gap: 1 },
      { height: 0, count: 1, gap: 1 },
      { height: 8, count: 0, gap: 1 },
      { height: 8, count: 21, gap: 1 },
      { height: 8, count: 1, gap: 0 },
      { height: 1000, count: 1, gap: 1 },
      { height: 8, count: 1, gap: 100 },
      { height: 8, count: 1, gap: 1.5 },
      { height: 8, count: 1, gap: 1, rows: 1 },
    ]) {
      expect(validateHexagonalColumnParameters(parameters).valid).toBe(false)
    }

    expect(
      validateHexagonalColumnParameters({ height: 999, count: 1, gap: 99 }),
    ).toEqual({
      valid: true,
      value: { height: 999, count: 1, gap: 99, orientation: 'lying' },
    })
  })

  it('centers a one-row envelope and serializes all parameters', () => {
    const parameters = {
      height: 50,
      count: 3,
      gap: 1,
      orientation: 'lying' as const,
    }
    const bounds = boundsForHexagonalColumn(parameters)
    const crossSectionExtent =
      HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY
    const expectedExtent = crossSectionExtent * 3 + 1 * 2

    expect(bounds.min).toEqual([-25, -expectedExtent / 2, 0])
    expect(bounds.max).toEqual([
      25,
      expectedExtent / 2,
      HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX,
    ])
    expect(hexagonalColumnFileName(parameters)).toBe(
      'hexagonal-column-50x3-g1-lying.step',
    )
    expect(hexagonalColumnStlFileName(parameters)).toBe(
      'hexagonal-column-50x3-g1-lying.stl',
    )

    const standingBounds = boundsForHexagonalColumn({
      ...parameters,
      orientation: 'standing',
    })
    const expectedStandingMinX =
      -HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2
    expect(standingBounds.min).toEqual([
      expectedStandingMinX,
      -expectedExtent / 2,
      0,
    ])
    expect(standingBounds.max).toEqual([
      -expectedStandingMinX,
      expectedExtent / 2,
      50,
    ])
  })

  it('rejects a row that exceeds the workspace envelope before building', () => {
    const parameters = {
      height: 50,
      count: HEXAGONAL_COLUMN_CONFIGURATION.maxCount,
      gap: HEXAGONAL_COLUMN_CONFIGURATION.maxGap,
      orientation: 'lying',
    }
    expect(validateHexagonalColumnParameters(parameters).valid).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import {
  HALF_CELL_CONFIGURATION,
  halfCellHostPitch,
  OPENGRID_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_GRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
} from '../../src/cad-contract/units'

describe('OpenGrid grid contract', () => {
  it('publishes the official full and half pitches', () => {
    expect(OPENGRID_GRID_CONFIGURATION).toEqual({
      fullPitch: 28,
      halfPitch: 14,
    })
    expect(OPENGRID_GRID_CONFIGURATION.fullPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.halfPitch * 2,
    )
  })

  it('routes every grid consumer through the official pitch', () => {
    expect(HALF_CELL_CONFIGURATION.fullPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.fullPitch,
    )
    expect(HALF_CELL_CONFIGURATION.halfPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.halfPitch,
    )
    expect(OPENGRID_CONFIGURATION.gridPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.fullPitch,
    )
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.fullPitch,
    )
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.halfPitch,
    )
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.holeGridPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.halfPitch,
    )
    expect(OPENGRID_DIVIDER_CONFIGURATION.gridPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.fullPitch,
    )
    expect(OPENGRID_DIVIDER_CONFIGURATION.halfGridPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.halfPitch,
    )
    expect(OPENGRID_DIVIDER_CONFIGURATION.pegCenterSpacing).toBe(
      OPENGRID_GRID_CONFIGURATION.fullPitch,
    )
    expect(halfCellHostPitch('none')).toBe(
      OPENGRID_GRID_CONFIGURATION.fullPitch,
    )
    expect(halfCellHostPitch('right')).toBe(
      OPENGRID_GRID_CONFIGURATION.halfPitch,
    )
  })
})

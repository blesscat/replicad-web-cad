import { describe, expect, it } from 'vitest'
import {
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  PILLAR_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
} from '../../src/cad-contract/units'
import { openGridSnapProfileFor } from '../../src/cad-kernel/components/opengrid-snap/profile'

describe('OpenGrid locating and assembly interface contract', () => {
  it('publishes the confirmed dimensions and derived openings', () => {
    const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION

    expect(configuration.nominalDiameter).toBe(5)
    expect(configuration.assemblyIncrement).toBe(0.05)
    expect(configuration.assemblyOpeningDiameter).toBe(
      configuration.nominalDiameter + configuration.assemblyIncrement,
    )
    expect(configuration.testShaftDiameter).toBe(4)
    expect(configuration.shaftOpeningDiameter).toBe(
      configuration.testShaftDiameter + configuration.assemblyIncrement,
    )
    expect(configuration.testFlangeDiameter).toBe(7)
    expect(configuration.retainingOpeningDiameter).toBe(
      configuration.testFlangeDiameter + configuration.assemblyIncrement,
    )
    expect(configuration.testFlangeHeight).toBe(0.8)
  })

  it('routes nominal locating consumers through the shared diameter', () => {
    const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION

    expect(openGridSnapProfileFor('Standard', 'Lite').locatingHoleRadius).toBe(
      configuration.nominalDiameter / 2,
    )
    expect(OPENGRID_DIVIDER_CONFIGURATION.pegDiameter).toBe(
      configuration.nominalDiameter,
    )
    expect(PILLAR_CONFIGURATION.bodyDiameter).toBe(
      configuration.nominalDiameter,
    )
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter).toBe(
      configuration.nominalDiameter,
    )
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.socketDeduplicationDistance,
    ).toBe(configuration.nominalDiameter)
  })

  it('routes assembly consumers through the shared openings', () => {
    const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION

    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleBottomOpeningDiameter,
    ).toBe(configuration.shaftOpeningDiameter)
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter,
    ).toBe(configuration.retainingOpeningDiameter)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridHoleDiameter).toBe(
      configuration.assemblyOpeningDiameter,
    )
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.bottomHoleDiameter).toBe(
      configuration.shaftOpeningDiameter,
    )
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.innerHoleDiameter).toBe(
      configuration.retainingOpeningDiameter,
    )
  })

  it('publishes the floor-relative compatibility fixture dimensions', () => {
    const configuration = OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION

    expect(configuration.testShaftExposure).toBe(1)
    expect(configuration.testShaftLengthForFloor(3)).toBe(4)
    expect(configuration.testShaftLengthForFloor(5)).toBe(6)
  })
})

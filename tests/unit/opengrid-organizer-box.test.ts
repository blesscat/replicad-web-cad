import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridOrganizerBox,
  openGridOrganizerBoxCavityEnvelopeFor,
  openGridOrganizerBoxLayoutFor,
  openGridOrganizerBoxDetachableSocketPosesFor,
  openGridOrganizerBoxDetachableIndicatorPlacementFor,
  openGridOrganizerBoxFileName,
  openGridOrganizerBoxStlFileName,
  normalizeOpenGridOrganizerBoxParameters,
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  validateOpenGridOrganizerBoxParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<typeof OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS> = {},
) {
  return {
    ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

function interfaceTopFor(
  boxMode: 'normal' | 'stackable',
  cornerSeatMode: 'none' | 'detachable-corner-seat' | 'integrated',
): number {
  if (cornerSeatMode === 'integrated') {
    return OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ
  }
  if (boxMode === 'normal' && cornerSeatMode === 'detachable-corner-seat') {
    return OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth
  }
  if (boxMode === 'normal') return 0
  return (
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomFootChamferHeight +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomSupportBandHeight +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridSeamOpeningWidth / 2
  )
}

function legacyParameters(
  bottomInterfaceMode: 'corner-seat' | 'detachable-corner-seat' | 'stackable',
) {
  const {
    cornerSeatMode: _cornerSeatMode,
    boxMode: _boxMode,
    stackingClearanceHeight: _stackingClearanceHeight,
    ...legacy
  } = OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS
  return { ...legacy, bottomInterfaceMode }
}

describe('OpenGrid organizer-box contract', () => {
  it('accepts the default typed snapshot', () => {
    const value = parameters()

    expect(validateOpenGridOrganizerBoxParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(value.holeSpacingMode).toBe('linked')
    expect(value.holeSpacingX).toBe(value.holeSpacingY)
    expect(value.bottomThickness).toBe(1)
    expect(value.cornerSeatMode).toBe('detachable-corner-seat')
    expect(value.boxMode).toBe('normal')
    expect(value.stackingClearanceHeight).toBe(3.5)
  })

  it.each([
    ['corner-seat', 'integrated', 'normal'],
    ['detachable-corner-seat', 'detachable-corner-seat', 'normal'],
    ['stackable', 'none', 'stackable'],
  ] as const)(
    'migrates legacy %s parameters to seat %s and body %s',
    (bottomInterfaceMode, cornerSeatMode, boxMode) => {
      const legacy = legacyParameters(bottomInterfaceMode)
      const normalized = normalizeOpenGridOrganizerBoxParameters(legacy)

      expect(normalized).toEqual({
        ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
        cornerSeatMode,
        boxMode,
        stackingClearanceHeight: 3.5,
      })
      expect(validateOpenGridOrganizerBoxParameters(legacy).valid).toBe(false)
      expect(validateOpenGridOrganizerBoxParameters(normalized).valid).toBe(
        true,
      )
    },
  )

  it('enforces the stackable Z minimum and half-millimetre grid', () => {
    for (const stackingClearanceHeight of [3, 3.2, 3.6]) {
      const validation = validateOpenGridOrganizerBoxParameters(
        parameters({ stackingClearanceHeight }),
      )
      expect(validation.valid).toBe(false)
      if (!validation.valid) {
        expect(validation.issues.map(({ field }) => field)).toContain(
          'stackingClearanceHeight',
        )
      }
    }

    for (const stackingClearanceHeight of [3.5, 4, 12.5]) {
      expect(
        validateOpenGridOrganizerBoxParameters(
          parameters({ stackingClearanceHeight }),
        ).valid,
      ).toBe(true)
    }
  })

  it('derives centered cavities from outer-to-outer spacing', () => {
    const value = parameters({
      holeCountX: 3,
      holeCountY: 2,
      holeSpacingX: 2,
      holeSpacingY: 4,
      holeSpacingMode: 'independent',
      holeDiameter: 10,
    })

    const layout = openGridOrganizerBoxLayoutFor(value)

    expect(layout.cavityCenters).toEqual([
      [-12, -7],
      [-12, 7],
      [0, -7],
      [0, 7],
      [12, -7],
      [12, 7],
    ])
    expect(layout.requiredSpan).toEqual({ x: 34, y: 24 })
    expect(layout.gridCountX).toBeGreaterThanOrEqual(1)
    expect(layout.gridCountY).toBeGreaterThanOrEqual(1)
    expect(layout.footprint[0]).toBeGreaterThan(layout.requiredSpan.x)
    expect(layout.footprint[1]).toBeGreaterThan(layout.requiredSpan.y)
  })

  it('uses the fixed orientation and inscribed diameter for polygons', () => {
    const square = openGridOrganizerBoxCavityEnvelopeFor({
      shape: 'square',
      diameter: 10,
    })
    const hexagon = openGridOrganizerBoxCavityEnvelopeFor({
      shape: 'hexagon',
      diameter: 10,
    })

    expect(square.x).toBeCloseTo(10, 8)
    expect(square.y).toBeCloseTo(10, 8)
    expect(hexagon.x).toBeGreaterThan(10)
    expect(hexagon.y).toBeCloseTo(10, 8)
  })

  it('rejects unequal linked spacing and unsupported shapes', () => {
    expect(
      validateOpenGridOrganizerBoxParameters(
        parameters({ holeSpacingX: 2, holeSpacingY: 3 }),
      ),
    ).toMatchObject({ valid: false })

    expect(
      validateOpenGridOrganizerBoxParameters(
        parameters({ holeShape: 'octagon' as never }),
      ),
    ).toMatchObject({ valid: false })
  })

  it('rejects a cavity layout above the workspace limit', () => {
    const validation = validateOpenGridOrganizerBoxParameters(
      parameters({
        holeCountX: 20,
        holeCountY: 20,
        holeSpacingX: 300,
        holeSpacingY: 300,
        holeSpacingMode: 'independent',
        holeDiameter: 300,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues.map((issue) => issue.field)).toContain(
        'parameters',
      )
    }
  })

  it('derives bounds and export names from the full snapshot', () => {
    const value = parameters({
      holeShape: 'hexagon',
      holeDiameter: 12,
      holeDepth: 18,
      bottomThickness: 3,
      cornerSeatMode: 'none',
      boxMode: 'stackable',
      stackingClearanceHeight: 4,
    })

    const bounds = boundsForOpenGridOrganizerBox(value)
    const layout = openGridOrganizerBoxLayoutFor(value)
    expect(bounds.max[0]).toBe(-bounds.min[0])
    expect(bounds.max[1]).toBe(-bounds.min[1])
    expect(bounds.min[2]).toBe(0)
    expect(layout.stacking).not.toBeNull()
    expect(layout.stacking?.riserHeight).toBeCloseTo(0.8, 8)
    expect(layout.stacking?.seatDatumZ).toBeCloseTo(
      layout.bodyHeight + value.stackingClearanceHeight,
      8,
    )
    expect(bounds.max[2]).toBeCloseTo(
      layout.bodyHeight +
        value.stackingClearanceHeight +
        (OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight - 3.2),
      8,
    )

    const step = openGridOrganizerBoxFileName(value)
    const stl = openGridOrganizerBoxStlFileName(value)
    expect(step).toContain('opengrid-organizer-box')
    expect(step).toContain('hexagon')
    expect(step).toContain('sm-linked')
    expect(step).toContain('seats-none')
    expect(step).toContain('body-stackable')
    expect(step).toContain('z4')
    expect(step.endsWith('.step')).toBe(true)
    expect(stl.endsWith('.stl')).toBe(true)
    expect(
      boundsForOpenGridOrganizerBox({
        ...value,
        cornerSeatMode: 'integrated',
        boxMode: 'normal',
      }).min[2],
    ).toBe(OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ)
    expect(
      openGridOrganizerBoxFileName({
        ...value,
        holeSpacingMode: 'independent',
      }),
    ).not.toBe(step)

    const normalAtDifferentZ = openGridOrganizerBoxFileName({
      ...value,
      boxMode: 'normal',
    })
    expect(
      openGridOrganizerBoxFileName({
        ...value,
        boxMode: 'normal',
        stackingClearanceHeight: 12,
      }),
    ).toBe(normalAtDifferentZ)
  })

  it('grows half-grid stackable locking-seat footprints to protect the indicators', () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDiameter: 20,
      boxMode: 'stackable',
      cornerSeatMode: 'detachable-corner-seat',
    })

    expect(validateOpenGridOrganizerBoxParameters(value).valid).toBe(true)
    expect(openGridOrganizerBoxLayoutFor(value)).toMatchObject({
      gridCountX: 2,
      gridCountY: 2,
    })
  })

  it('accepts the detachable interface with B-oriented four-corner sockets', () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      cornerSeatMode: 'detachable-corner-seat',
    })

    expect(validateOpenGridOrganizerBoxParameters(value)).toEqual({
      valid: true,
      value,
    })
    const poses = openGridOrganizerBoxDetachableSocketPosesFor(value)
    expect(poses).toHaveLength(4)
    expect(
      poses.map(({ corner, rotationDegrees }) => ({
        corner,
        rotationDegrees,
      })),
    ).toEqual([
      { corner: 'upper-left', rotationDegrees: 0 },
      { corner: 'upper-right', rotationDegrees: 90 },
      { corner: 'lower-right', rotationDegrees: 180 },
      { corner: 'lower-left', rotationDegrees: 270 },
    ])
    expect(boundsForOpenGridOrganizerBox(value).min[2]).toBe(0)
    expect(openGridOrganizerBoxFileName(value)).toContain(
      'seats-detachable-corner-seat',
    )
  })

  it('places lock indicators on the reference-arrow sides', () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      cornerSeatMode: 'detachable-corner-seat',
    })
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const poses = openGridOrganizerBoxDetachableSocketPosesFor(value)
    const placements = poses.map(
      openGridOrganizerBoxDetachableIndicatorPlacementFor,
    )
    const offset =
      configuration.female.outerDiameter / 2 +
      configuration.indicator.socketBoundaryClearance +
      configuration.indicator.radialLength / 2

    expect(placements.map(({ rotationDegrees }) => rotationDegrees)).toEqual([
      90, 0, 270, 180,
    ])
    expect(placements[0]?.center[0]).toBe(poses[0]?.center[0])
    expect(placements[0]?.center[1]).toBeCloseTo(
      (poses[0]?.center[1] ?? 0) - offset,
      8,
    )
    expect(placements[1]?.center[0]).toBeCloseTo(
      (poses[1]?.center[0] ?? 0) - offset,
      8,
    )
    expect(placements[1]?.center[1]).toBe(poses[1]?.center[1])
    expect(placements[2]?.center[0]).toBe(poses[2]?.center[0])
    expect(placements[2]?.center[1]).toBeCloseTo(
      (poses[2]?.center[1] ?? 0) + offset,
      8,
    )
    expect(placements[3]?.center[0]).toBeCloseTo(
      (poses[3]?.center[0] ?? 0) + offset,
      8,
    )
    expect(placements[3]?.center[1]).toBe(poses[3]?.center[1])
    expect(
      Math.abs((placements[0]?.center[1] ?? 0) - (poses[0]?.center[1] ?? 0)) -
        configuration.indicator.radialLength / 2,
    ).toBeCloseTo(
      configuration.female.outerDiameter / 2 +
        configuration.indicator.socketBoundaryClearance,
      8,
    )
  })

  it('measures detachable bottom thickness above the holder top', () => {
    const value = parameters({
      holeDepth: 30,
      bottomThickness: 2,
      cornerSeatMode: 'detachable-corner-seat',
      boxMode: 'normal',
    })

    const layout = openGridOrganizerBoxLayoutFor(value)
    const cavityFloor = layout.bodyHeight - value.holeDepth
    const holderTop = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth

    expect(cavityFloor - holderTop).toBeCloseTo(value.bottomThickness, 8)
  })

  it.each([
    ['normal', 'none'],
    ['normal', 'detachable-corner-seat'],
    ['normal', 'integrated'],
    ['stackable', 'none'],
    ['stackable', 'detachable-corner-seat'],
    ['stackable', 'integrated'],
  ] as const)(
    'keeps the %s/%s interfaces below the cavity floor',
    (boxMode, cornerSeatMode) => {
      const value = parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 10,
        holeDepth: 1,
        bottomThickness: 1,
        boxMode,
        cornerSeatMode,
      })
      const layout = openGridOrganizerBoxLayoutFor(value)
      const cavityFloor = layout.bodyHeight - value.holeDepth
      const interfaceTop = interfaceTopFor(boxMode, cornerSeatMode)

      expect(cavityFloor).toBeGreaterThan(interfaceTop)
      expect(layout.minimumFootprintSpan.x).toBeGreaterThan(
        layout.requiredSpan.x,
      )
      expect(layout.minimumFootprintSpan.y).toBeGreaterThan(
        layout.requiredSpan.y,
      )
    },
  )

  it('uses body mode first when deriving the active cavity-floor datum', () => {
    const normalDetachable = openGridOrganizerBoxLayoutFor(
      parameters({
        boxMode: 'normal',
        cornerSeatMode: 'detachable-corner-seat',
      }),
    )
    const normalNone = openGridOrganizerBoxLayoutFor(
      parameters({ boxMode: 'normal', cornerSeatMode: 'none' }),
    )
    const stackableDetachable = openGridOrganizerBoxLayoutFor(
      parameters({
        boxMode: 'stackable',
        cornerSeatMode: 'detachable-corner-seat',
      }),
    )

    expect(normalDetachable.interfaceFloorDatum).toBe(
      OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.depth,
    )
    expect(normalNone.interfaceFloorDatum).toBe(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight,
    )
    expect(stackableDetachable.interfaceFloorDatum).toBe(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight,
    )
  })
})

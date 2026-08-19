import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridOrganizerBox,
  openGridOrganizerBoxCavityEnvelopeFor,
  openGridOrganizerBoxLayoutFor,
  openGridOrganizerBoxFileName,
  openGridOrganizerBoxStlFileName,
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

describe('OpenGrid organizer-box contract', () => {
  it('accepts the default typed snapshot', () => {
    const value = parameters()

    expect(validateOpenGridOrganizerBoxParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(value.holeSpacingMode).toBe('linked')
    expect(value.holeSpacingX).toBe(value.holeSpacingY)
    expect(value.bottomThickness).toBe(2)
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
      bottomInterfaceMode: 'stackable',
    })

    const bounds = boundsForOpenGridOrganizerBox(value)
    expect(bounds.max[0]).toBe(-bounds.min[0])
    expect(bounds.max[1]).toBe(-bounds.min[1])
    expect(bounds.min[2]).toBe(0)
    expect(bounds.max[2]).toBeGreaterThan(value.holeDepth)

    const step = openGridOrganizerBoxFileName(value)
    const stl = openGridOrganizerBoxStlFileName(value)
    expect(step).toContain('opengrid-organizer-box')
    expect(step).toContain('hexagon')
    expect(step).toContain('sm-linked')
    expect(step.endsWith('.step')).toBe(true)
    expect(stl.endsWith('.stl')).toBe(true)
    expect(
      openGridOrganizerBoxFileName({
        ...value,
        holeSpacingMode: 'independent',
      }),
    ).not.toBe(step)
  })

  it.each(['corner-seat', 'stackable'] as const)(
    'keeps the %s bottom interface below the cavity floor',
    (bottomInterfaceMode) => {
      const value = parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 10,
        holeDepth: 1,
        bottomThickness: 1,
        bottomInterfaceMode,
      })
      const layout = openGridOrganizerBoxLayoutFor(value)
      const cavityFloor = layout.bodyHeight - value.holeDepth
      const interfaceTop =
        bottomInterfaceMode === 'corner-seat'
          ? OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight + 0.02
          : OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomFootChamferHeight +
            OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomSupportBandHeight +
            OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn +
            OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridSeamOpeningWidth / 2

      expect(cavityFloor).toBeGreaterThan(interfaceTop)
      expect(layout.minimumFootprintSpan.x).toBeGreaterThan(
        layout.requiredSpan.x,
      )
      expect(layout.minimumFootprintSpan.y).toBeGreaterThan(
        layout.requiredSpan.y,
      )
    },
  )
})

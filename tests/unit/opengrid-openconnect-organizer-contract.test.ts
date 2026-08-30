import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridOpenConnectOrganizer,
  installedBoundsForOpenGridOpenConnectOrganizer,
  openGridOpenConnectOrganizerCavityEnvelopeFor,
  openGridOpenConnectOrganizerFileName,
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerSlotOriginsFor,
  openGridOpenConnectOrganizerStlFileName,
  openGridOpenConnectOrganizerTiltAxisFor,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  validateOpenGridOpenConnectOrganizerParameters,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../src/cad-contract/units/opengrid-openconnect-organizer'

function parameters(
  overrides: Partial<OpenGridOpenConnectOrganizerParameters> = {},
): OpenGridOpenConnectOrganizerParameters {
  return {
    ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

describe('OpenGrid OpenConnect organizer contract', () => {
  it('accepts the exact typed defaults', () => {
    const value = parameters()

    expect(value).toEqual({
      holeCountX: 2,
      holeCountY: 2,
      holeSpacingMode: 'linked',
      holeSpacingX: 2,
      holeSpacingY: 2,
      holeShape: 'circle',
      holeDiameter: 20,
      holeDepth: 20,
      bottomThickness: 2,
      tiltAngle: 15,
    })
    expect(validateOpenGridOpenConnectOrganizerParameters(value)).toEqual({
      valid: true,
      value,
    })
  })

  it.each(['circle', 'triangle', 'square', 'pentagon', 'hexagon'] as const)(
    'accepts the %s cavity shape',
    (holeShape) => {
      expect(
        validateOpenGridOpenConnectOrganizerParameters(
          parameters({ holeShape }),
        ).valid,
      ).toBe(true)
    },
  )

  it('uses an inscribed diameter and fixed polygon orientation', () => {
    const square = openGridOpenConnectOrganizerCavityEnvelopeFor({
      shape: 'square',
      diameter: 10,
    })
    const hexagon = openGridOpenConnectOrganizerCavityEnvelopeFor({
      shape: 'hexagon',
      diameter: 10,
    })

    expect(square.x).toBeCloseTo(10, 8)
    expect(square.y).toBeCloseTo(10, 8)
    expect(hexagon.x).toBeGreaterThan(10)
    expect(hexagon.y).toBeCloseTo(10, 8)
  })

  it('centers cavities using outer-envelope spacing', () => {
    const layout = openGridOpenConnectOrganizerLayoutFor(
      parameters({
        holeCountX: 3,
        holeCountY: 2,
        holeSpacingMode: 'independent',
        holeSpacingX: 2,
        holeSpacingY: 4,
        holeDiameter: 10,
      }),
    )

    expect(layout.cavityCenters).toEqual([
      [-12, -7],
      [-12, 7],
      [0, -7],
      [0, 7],
      [12, -7],
      [12, 7],
    ])
    expect(layout.requiredSpan).toEqual({ x: 34, y: 24 })
    expect(layout.bodyDepth).toBe(30)
  })

  it('derives a direct 2-by-1 locked interface for the default body', () => {
    const value = parameters()
    const layout = openGridOpenConnectOrganizerLayoutFor(value)
    const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION

    expect(layout.bodyThickness).toBe(22)
    expect(layout.connectorColumns).toBe(2)
    expect(layout.connectorRows).toBe(1)
    expect(layout.rearInterfaceWidth).toBe(2 * configuration.gridPitch)
    expect(layout.rearInterfaceHeight).toBe(configuration.gridPitch)
    expect(openGridOpenConnectOrganizerSlotOriginsFor(value)).toEqual([
      [-configuration.gridPitch / 2, configuration.rearThickness, 14],
      [configuration.gridPitch / 2, configuration.rearThickness, 14],
    ])
  })

  it('grows the smallest 28 mm interface around larger layouts', () => {
    const shallow = openGridOpenConnectOrganizerLayoutFor(
      parameters({ holeCountX: 1, holeCountY: 1, holeDiameter: 10 }),
    )
    const wide = openGridOpenConnectOrganizerLayoutFor(
      parameters({ holeCountX: 4, holeCountY: 1, holeDiameter: 20 }),
    )
    const deep = openGridOpenConnectOrganizerLayoutFor(
      parameters({ holeCountX: 1, holeCountY: 1, holeDepth: 60 }),
    )

    expect(shallow.connectorColumns).toBe(1)
    expect(wide.connectorColumns).toBe(4)
    expect(deep.connectorRows).toBe(3)
  })

  it('tilts every floor-to-opening axis toward the user', () => {
    expect(openGridOpenConnectOrganizerTiltAxisFor(0)).toEqual([0, -0, 1])

    const axis = openGridOpenConnectOrganizerTiltAxisFor(30)
    expect(axis[0]).toBe(0)
    expect(axis[1]).toBeCloseTo(-0.5, 10)
    expect(axis[2]).toBeCloseTo(Math.sqrt(3) / 2, 10)
    expect(Math.hypot(...axis)).toBeCloseTo(1, 10)
  })

  it('enforces linked spacing, exact keys, ranges, and half-degree tilt', () => {
    const invalid = [
      parameters({ holeSpacingY: 3 }),
      parameters({ holeShape: 'octagon' as never }),
      parameters({ holeCountX: 1.5 }),
      parameters({ holeDiameter: Number.NaN }),
      parameters({ holeDepth: 0 }),
      parameters({ bottomThickness: 0 }),
      parameters({ tiltAngle: 45.5 }),
      parameters({ tiltAngle: 13.25 }),
      { ...parameters(), extra: true },
    ]

    for (const value of invalid) {
      expect(validateOpenGridOpenConnectOrganizerParameters(value).valid).toBe(
        false,
      )
    }
    expect(
      validateOpenGridOpenConnectOrganizerParameters(
        parameters({ tiltAngle: 13.5 }),
      ).valid,
    ).toBe(true)
  })

  it('rejects layouts outside the 500 mm workspace', () => {
    const validation = validateOpenGridOpenConnectOrganizerParameters(
      parameters({
        holeCountX: 20,
        holeCountY: 20,
        holeSpacingMode: 'independent',
        holeSpacingX: 300,
        holeSpacingY: 300,
        holeDiameter: 300,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues.map(({ field }) => field)).toContain(
        'parameters',
      )
    }
  })

  it('rejects an installed wall interface above the 500 mm workspace limit', () => {
    const validation = validateOpenGridOpenConnectOrganizerParameters(
      parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeDiameter: 1,
        holeDepth: 470,
        bottomThickness: 1,
        tiltAngle: 45,
      }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid) {
      expect(validation.issues).toContainEqual(
        expect.objectContaining({ field: 'parameters' }),
      )
    }
  })

  it('reports deterministic print bounds and geometry-complete filenames', () => {
    const value = parameters({
      holeSpacingMode: 'independent',
      holeSpacingX: 2.5,
      holeSpacingY: 4,
      holeShape: 'pentagon',
      holeDiameter: 18,
      holeDepth: 30,
      bottomThickness: 3,
      tiltAngle: 22.5,
    })
    const bounds = boundsForOpenGridOpenConnectOrganizer(value)
    const installedBounds =
      installedBoundsForOpenGridOpenConnectOrganizer(value)
    const step = openGridOpenConnectOrganizerFileName(value)
    const stl = openGridOpenConnectOrganizerStlFileName(value)

    expect(bounds.min[0]).toBeCloseTo(-bounds.max[0], 8)
    expect(bounds.min[2]).toBeCloseTo(0, 8)
    expect(bounds.max[2]).toBeGreaterThan(value.holeDepth)
    expect(installedBounds.max[1]).toBeCloseTo(
      OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.rearThickness,
      8,
    )
    expect(installedBounds.max[2]).toBeGreaterThan(0)
    for (const token of [
      'opengrid-openconnect-organizer',
      'x2',
      'y2',
      'sm-independent',
      'sx2.5',
      'sy4',
      'pentagon',
      'd18',
      'h30',
      'b3',
      'a22.5',
    ]) {
      expect(step).toContain(token)
    }
    expect(step.endsWith('.step')).toBe(true)
    expect(stl).toBe(step.replace(/\.step$/, '.stl'))
  })
})

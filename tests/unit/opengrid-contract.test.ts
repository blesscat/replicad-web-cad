import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGrid,
  deterministicOpenGridCustomScrewPositions,
  isOpenGridGenerationSupported,
  openGridConnectorLocationsFor,
  openGridFileName,
  openGridScrewCentersFor,
  openGridScrewLatticeDimensions,
  openGridScrewPositionsFor,
  openGridStlFileName,
  OPENGRID_CONFIGURATION,
  validateOpenGridGenerationSupport,
  validateOpenGridParameters,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import {
  isWorkerCommand,
  PROTOCOL_VERSION,
} from '../../src/cad-contract/messages'

function parameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  }
}

describe('OpenGrid contract', () => {
  it('accepts official defaults and derives the legal centered envelope', () => {
    const defaults = parameters()
    expect(OPENGRID_CONFIGURATION.maxGridCount).toBe(17)
    expect(validateOpenGridParameters(defaults)).toEqual({
      valid: true,
      value: defaults,
    })
    expect(boundsForOpenGrid(defaults)).toEqual({
      min: [-28, -28, 0],
      max: [28, 28, 4],
    })
    expect(boundsForOpenGrid({ ...defaults, rows: 17, columns: 17 })).toEqual({
      min: [-238, -238, 0],
      max: [238, 238, 4],
    })
    expect(validateOpenGridParameters({ ...defaults, rows: 18 }).valid).toBe(
      false,
    )
  })

  it('keeps the pinned official profile and screw dimensions', () => {
    expect(
      Object.fromEntries(
        Object.entries(OPENGRID_CONFIGURATION.variants).map(([key, value]) => [
          key,
          value.thickness,
        ]),
      ),
    ).toEqual({ Full: 6.8, Lite: 4, Heavy: 13.8 })
    expect(OPENGRID_CONFIGURATION.gridPitch).toBe(28)
    expect(OPENGRID_CONFIGURATION.tileInnerSize).toBe(25)
    expect(OPENGRID_CONFIGURATION.outsideExtrusion).toBe(0.8)
    expect(OPENGRID_CONFIGURATION.connector).toEqual({
      primaryRadius: 2.6,
      dimpleRadius: 2.7,
      separation: 2.5,
      cutoutHeight: 2.4,
      liteCutoutDistanceFromTop: 1,
    })
    expect(OPENGRID_CONFIGURATION.defaultScrew).toEqual({
      diameter: 4.1,
      headDiameter: 7.2,
      headInset: 1,
      headIsCountersunk: true,
      headCountersunkDegree: 90,
    })
  })

  it('maps official screw modes to the internal intersection lattice', () => {
    const input = parameters({ rows: 5, columns: 5 })
    expect(openGridScrewLatticeDimensions(input)).toEqual({
      rows: 4,
      columns: 4,
    })
    expect(
      openGridScrewPositionsFor(parameters({ screwMode: 'none' })),
    ).toEqual([])
    expect(
      openGridScrewPositionsFor({ ...input, screwMode: 'everywhere' }),
    ).toHaveLength(16)
    expect(
      openGridScrewPositionsFor({
        ...input,
        screwMode: 'by-row-column',
        screwEveryRows: 2,
        screwEveryColumns: 2,
      }),
    ).toEqual([
      { row: 0, column: 0 },
      { row: 0, column: 2 },
      { row: 2, column: 0 },
      { row: 2, column: 2 },
    ])
    expect(
      openGridScrewPositionsFor({ ...input, screwMode: 'corners' }),
    ).toEqual([
      { row: 0, column: 0 },
      { row: 0, column: 3 },
      { row: 3, column: 0 },
      { row: 3, column: 3 },
    ])
    expect(
      openGridScrewCentersFor(
        parameters({ rows: 1, columns: 1, screwMode: 'corners' }),
      ),
    ).toEqual(
      expect.arrayContaining([
        [-14, -14],
        [-14, 14],
        [14, -14],
        [14, 14],
      ]),
    )
  })

  it('normalizes custom intersection positions and rejects duplicates or old fields', () => {
    const validation = validateOpenGridParameters(
      parameters({
        rows: 3,
        columns: 4,
        screwKind: 'custom',
        screwMode: 'custom',
        customScrewPositions: [
          { row: 1, column: 2 },
          { row: 0, column: 0 },
        ],
      }),
    )
    expect(validation.valid).toBe(true)
    if (validation.valid) {
      expect(validation.value.customScrewPositions).toEqual([
        { row: 0, column: 0 },
        { row: 1, column: 2 },
      ])
      expect(openGridScrewPositionsFor(validation.value)).toEqual(
        validation.value.customScrewPositions,
      )
    }
    expect(
      validateOpenGridParameters(
        parameters({
          rows: 3,
          columns: 4,
          screwKind: 'custom',
          screwMode: 'custom',
          customScrewPositions: [
            { row: 0, column: 0 },
            { row: 0, column: 0 },
          ],
        }),
      ).valid,
    ).toBe(false)
    expect(
      validateOpenGridParameters({
        ...parameters(),
        screwKind: 'legacy-m3',
      }).valid,
    ).toBe(false)
  })

  it('places connectors only on selected eligible seams', () => {
    const none = parameters({ connectorHoles: 'none' })
    expect(openGridConnectorLocationsFor(none)).toEqual([])
    const selected = parameters({
      rows: 3,
      columns: 4,
      connectorHoles: 'enabled',
      connectorSides: { top: true, right: false, bottom: true, left: false },
    })
    const locations = openGridConnectorLocationsFor(selected)
    expect(locations).toHaveLength(6)
    expect(
      locations.every(
        (location) => location.side === 'top' || location.side === 'bottom',
      ),
    ).toBe(true)
  })

  it('keeps the official deterministic custom fixture and removes the old block rule', () => {
    expect(deterministicOpenGridCustomScrewPositions(5, 5)).toHaveLength(4)
    expect(deterministicOpenGridCustomScrewPositions(17, 17)).toHaveLength(64)
    const legal = parameters({
      rows: 10,
      columns: 10,
      screwKind: 'custom',
      screwMode: 'everywhere',
      connectorHoles: 'enabled',
    })
    expect(validateOpenGridGenerationSupport(legal).valid).toBe(true)
    expect(isOpenGridGenerationSupported(legal)).toBe(true)
  })

  it('uses deterministic official filenames and separates invalidate from generate payloads', () => {
    const custom = parameters({
      variant: 'Full',
      rows: 5,
      columns: 5,
      screwKind: 'custom',
      screwMode: 'custom',
      customScrewPositions: deterministicOpenGridCustomScrewPositions(5, 5),
    })
    expect(openGridFileName(custom)).toMatch(
      /^opengrid-full-5x5-custom-custom-corners-enabled-[0-9a-f]{8}\.step$/,
    )
    expect(openGridStlFileName(custom)).toMatch(
      /^opengrid-full-5x5-custom-custom-corners-enabled-[0-9a-f]{8}\.stl$/,
    )

    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.invalidate',
        requestId: 'invalidate-1',
        operationId: 'operation-1',
        generation: 2,
        workerEpoch: 'epoch-1',
        reason: 'invalid-input',
      }),
    ).toBe(true)
    expect(
      isWorkerCommand({
        version: PROTOCOL_VERSION,
        kind: 'model.generate',
        requestId: 'generate-1',
        operationId: 'operation-2',
        generation: 2,
        modelId: 'opengrid',
        parameters: parameters(),
        previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
      }),
    ).toBe(true)
  })
})

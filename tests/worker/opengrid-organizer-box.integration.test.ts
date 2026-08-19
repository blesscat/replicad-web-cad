import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForOpenGridOrganizerBox,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  openGridOrganizerBoxLayoutFor,
  type OpenGridOrganizerBoxParameters,
} from '../../src/cad-contract/units'
import {
  buildModelBRep,
  type KernelBuildContext,
} from '../../src/cad-kernel/model'
import { buildOpenGridOrganizerBox } from '../../src/cad-kernel/components/opengrid-organizer-box/builder'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function parameters(
  overrides: Partial<OpenGridOrganizerBoxParameters> = {},
): OpenGridOrganizerBoxParameters {
  return { ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS, ...overrides }
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep cleanup failures from hiding the geometry assertion.
  }
}

function probeVolume(
  shape: Shape3D,
  bounds: [[number, number, number], [number, number, number]],
): number {
  const probe = makeBox(bounds[0], bounds[1])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    deleteShape(probe)
  }
}

describe('OpenGrid organizer-box B-Rep', () => {
  it('builds blind circular cavities with a solid top and four-corner mode', () => {
    const input = parameters({
      holeCountX: 2,
      holeCountY: 2,
      holeDiameter: 12,
      holeDepth: 18,
      bottomThickness: 3,
      bottomInterfaceMode: 'corner-seat',
    })
    const shape = buildOpenGridOrganizerBox(input)

    try {
      const expected = boundsForOpenGridOrganizerBox(input)
      const actual = shape.boundingBox
      try {
        expect(actual.bounds[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.min[0], 2),
            expect.closeTo(expected.min[1], 2),
            expect.closeTo(expected.min[2], 2),
          ]),
        )
        expect(actual.bounds[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.max[0], 2),
            expect.closeTo(expected.max[1], 2),
            expect.closeTo(expected.max[2], 2),
          ]),
        )
      } finally {
        actual.delete()
      }

      const layout = openGridOrganizerBoxLayoutFor(input)
      const halfWidth = layout.footprint[0] / 2
      const firstCavity = layout.cavityCenters[0] ?? [0, 0]
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(
        probeVolume(shape, [
          [
            firstCavity[0] - 0.2,
            firstCavity[1] - 0.2,
            layout.bodyHeight - input.holeDepth / 2,
          ],
          [
            firstCavity[0] + 0.2,
            firstCavity[1] + 0.2,
            layout.bodyHeight - input.holeDepth / 2 + 0.1,
          ],
        ]),
      ).toBe(0)
      expect(
        probeVolume(shape, [
          [
            firstCavity[0] - 0.2,
            firstCavity[1] - 0.2,
            layout.interfaceFloorDatum + input.bottomThickness / 2,
          ],
          [
            firstCavity[0] + 0.2,
            firstCavity[1] + 0.2,
            layout.interfaceFloorDatum + input.bottomThickness / 2 + 0.1,
          ],
        ]),
      ).toBeGreaterThan(0)
      expect(
        probeVolume(shape, [
          [halfWidth - 0.2, -0.2, layout.bodyHeight / 2],
          [halfWidth + 0.1, 0.2, layout.bodyHeight / 2 + 0.1],
        ]),
      ).toBeGreaterThan(0)

      const interfaceParameters = {
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: layout.gridCountX,
        y: layout.gridCountY,
        cornerSeatMode: 'integrated' as const,
        fullBottomHoleGrid: false,
        basePlateMode: false,
        thinShellMode: false,
        honeycombMode: false,
      }
      const footZ =
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ +
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatHeight / 2
      const footCenters =
        openGridStackableBoxSocketCentersFor(interfaceParameters)
      expect(footCenters).toHaveLength(4)
      for (const [x, y] of footCenters) {
        expect(
          probeVolume(shape, [
            [x - 0.2, y - 0.2, footZ - 0.05],
            [x + 0.2, y + 0.2, footZ + 0.05],
          ]),
        ).toBeGreaterThan(0)
      }
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('builds fixed-orientation hexagonal cavities with the stackable bottom', () => {
    const input = parameters({
      holeCountX: 3,
      holeCountY: 1,
      holeSpacingMode: 'independent',
      holeSpacingX: 2,
      holeSpacingY: 4,
      holeShape: 'hexagon',
      holeDiameter: 12,
      bottomInterfaceMode: 'stackable',
    })
    const shape = buildOpenGridOrganizerBox(input)

    try {
      const expected = boundsForOpenGridOrganizerBox(input)
      const actual = shape.boundingBox
      try {
        expect(actual.bounds[1][2]).toBeCloseTo(expected.max[2], 2)
        expect(actual.bounds[1][0]).toBeCloseTo(expected.max[0], 2)
        expect(actual.bounds[1][1]).toBeCloseTo(expected.max[1], 2)
      } finally {
        actual.delete()
      }

      const layout = openGridOrganizerBoxLayoutFor(input)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(
        probeVolume(shape, [
          [expected.max[0] - 0.1, -0.2, 0.05],
          [expected.max[0] + 0.2, 0.2, 0.15],
        ]),
      ).toBe(0)
      expect(layout.cavityCenters).toHaveLength(3)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each(['triangle', 'square', 'pentagon'] as const)(
    'builds fixed-orientation %s cavities',
    (holeShape) => {
      const input = parameters({
        holeCountX: 2,
        holeCountY: 1,
        holeShape,
        holeDiameter: 12,
        holeSpacingMode: 'independent',
        holeSpacingX: 3,
        holeSpacingY: 5,
        bottomThickness: 4,
      })
      const shape = buildOpenGridOrganizerBox(input)

      try {
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(openGridOrganizerBoxLayoutFor(input).cavityCenters).toHaveLength(
          2,
        )
      } finally {
        deleteShape(shape)
      }
    },
  )

  it('is available through the kernel registry without loading external assets', async () => {
    const input = parameters({ holeCountX: 1, holeCountY: 1 })
    const context: KernelBuildContext = {
      getModularGridBaseTemplate: async () => {
        throw new Error('UNEXPECTED_TEMPLATE_LOAD')
      },
      getHswCellTemplate: async () => {
        throw new Error('UNEXPECTED_TEMPLATE_LOAD')
      },
    }
    const shape = await buildModelBRep('opengrid-organizer-box', input, context)
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('rejects invalid organizer-box geometry before Worker construction', async () => {
    const input = parameters({ holeDepth: 0 })
    const context: KernelBuildContext = {
      getModularGridBaseTemplate: async () => {
        throw new Error('UNEXPECTED_TEMPLATE_LOAD')
      },
      getHswCellTemplate: async () => {
        throw new Error('UNEXPECTED_TEMPLATE_LOAD')
      },
    }
    await expect(
      buildModelBRep('opengrid-organizer-box', input, context),
    ).rejects.toThrow('MODEL_PARAMETERS_INVALID')
  })
})

import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  boundsForOpenGridOpenShelf,
  openGridOpenShelfDepthFor,
  openGridOpenShelfFrontToRearElevationFor,
  openGridOpenShelfPegCentersFor,
  openGridOpenShelfShelfLowerSurfaceZFor,
  OPENGRID_OPEN_SHELF_CONFIGURATION,
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  type OpenGridOpenShelfParameters,
} from '../../src/cad-contract/units'
import { buildOpenGridOpenShelf } from '../../src/cad-kernel/components/opengrid-open-shelf/builder'
import { inspectOpenGridOpenShelfShapeQuality } from '../../src/cad-kernel/components/opengrid-open-shelf/quality'
import { exportStepBytes, exportStlBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'

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

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not replace the primary geometry assertion.
  }
}

function expectBoundsClose(
  actual: number[][],
  expected: ReturnType<typeof boundsForOpenGridOpenShelf>,
): void {
  expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
  expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
  expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 2)
  expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
  expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
  expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 2)
}

describe('OpenGrid open-shelf CAD kernel integration', () => {
  it('builds the default front-open, full-depth, one-solid shelf', async () => {
    const parameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
    }
    const shape = await buildOpenGridOpenShelf(parameters)
    try {
      expect(shape.constructor.name).toBe('Solid')
      expect(measureVolume(shape)).toBeGreaterThan(0)
      const cylindricalFaceBounds = shape.faces.flatMap((face) => {
        const boundingBox = face.boundingBox
        try {
          if (face.surface.surfaceType !== 'CYLINDRE') return []
          const [min, max] = boundingBox.bounds as number[][]
          return [{ min, max }]
        } finally {
          boundingBox.delete()
          face.delete()
        }
      })
      const outerArcFaces = cylindricalFaceBounds.filter(
        ({ min, max }) => (min[2] ?? 0) >= -0.1 && (max[2] ?? 0) > 1,
      )
      expect(outerArcFaces).toHaveLength(4)
      for (const { min, max } of outerArcFaces) {
        expect(
          Math.max(
            (max[0] ?? 0) - (min[0] ?? 0),
            (max[1] ?? 0) - (min[1] ?? 0),
          ),
        ).toBeCloseTo(OPENGRID_OPEN_SHELF_CONFIGURATION.outerCornerRadius, 2)
      }
      expectBoundsClose(boundsOf(shape), boundsForOpenGridOpenShelf(parameters))
      const quality = inspectOpenGridOpenShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality).toMatchObject({ passed: true, failures: [] })

      for (const center of openGridOpenShelfPegCentersFor(parameters)) {
        const probe = makeCylinder(2.1, 0.2, [center[0], center[1], -2.95])
        try {
          expect(measureVolume(shape.intersect(probe))).toBeGreaterThan(0)
        } finally {
          probe.delete()
        }
      }

      const frontProbe = makeBox([-100, -42, 49.5], [100, -41, 50.1])
      const rearProbe = makeBox([-100, 41, 20], [100, 42, 30])
      const [firstShelfFrontZ] = openGridOpenShelfShelfLowerSurfaceZFor(
        parameters,
        1,
      )
      const openingProbe = makeBox(
        [-10, -41.4, 4],
        [10, -40.9, firstShelfFrontZ - 1],
      )
      let frontSection: Shape3D | null = null
      let rearSection: Shape3D | null = null
      let openingSection: Shape3D | null = null
      try {
        frontSection = shape.intersect(frontProbe)
        rearSection = shape.intersect(rearProbe)
        openingSection = shape.intersect(openingProbe)
        expect(boundsOf(frontSection)[1]?.[2]).toBeGreaterThan(
          boundsOf(rearSection)[1]?.[2] ?? 0,
        )
        expect(measureVolume(openingSection)).toBeCloseTo(0, 5)
      } finally {
        deleteShape(frontSection)
        deleteShape(rearSection)
        deleteShape(openingSection)
        frontProbe.delete()
        rearProbe.delete()
        openingProbe.delete()
      }
      expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
      expect(
        (
          await exportStlBytes(shape, {
            tolerance: 0.05,
            angularTolerance: 0.1,
          })
        ).byteLength,
      ).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('keeps multi-cell shelves at the rear and uses plain peg shafts', async () => {
    const parameters: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
      height: 80,
      cellX: 3,
      cellZ: 3,
      angle: 10,
    }
    const shape = await buildOpenGridOpenShelf(parameters)
    try {
      const quality = inspectOpenGridOpenShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
      )
      expect(quality).toMatchObject({ passed: true, failures: [] })

      const depth = openGridOpenShelfDepthFor(parameters)
      const yFront = -depth / 2
      const yRear = depth / 2
      const [shelfFrontZ, shelfRearZ] = openGridOpenShelfShelfLowerSurfaceZFor(
        parameters,
        1,
      )
      expect(shelfFrontZ - shelfRearZ).toBeCloseTo(
        openGridOpenShelfFrontToRearElevationFor(parameters),
      )
      const frontProbe = makeBox(
        [-50, yFront, shelfFrontZ - 0.3],
        [50, yFront + 0.5, shelfFrontZ + 0.4],
      )
      const rearProbe = makeBox(
        [-50, yRear - 0.5, shelfRearZ - 0.3],
        [50, yRear, shelfRearZ + 0.4],
      )
      let frontShelf: Shape3D | null = null
      let rearShelf: Shape3D | null = null
      try {
        frontShelf = shape.intersect(frontProbe)
        rearShelf = shape.intersect(rearProbe)
        expect(measureVolume(frontShelf)).toBeGreaterThan(0)
        expect(measureVolume(rearShelf)).toBeGreaterThan(0)
      } finally {
        deleteShape(frontShelf)
        deleteShape(rearShelf)
        frontProbe.delete()
        rearProbe.delete()
      }

      const center = openGridOpenShelfPegCentersFor(parameters)[0]
      if (!center) throw new Error('Expected a locating peg center')
      const outer = makeCylinder(3.6, 0.2, [center[0], center[1], -3])
      const inner = makeCylinder(2.3, 0.2, [center[0], center[1], -3])
      let annulus: Shape3D | null = null
      try {
        annulus = outer.cut(inner)
        expect(measureVolume(shape.intersect(annulus))).toBeCloseTo(0, 5)
      } finally {
        deleteShape(annulus)
        outer.delete()
        inner.delete()
      }
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
    'supports the default shelf geometry with cellZ=%i',
    async (cellZ) => {
      const parameters: OpenGridOpenShelfParameters = {
        ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
        cellZ,
      }
      const shape = await buildOpenGridOpenShelf(parameters)
      try {
        const quality = inspectOpenGridOpenShelfShapeQuality(
          shape,
          parameters,
          meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
        )
        expect(quality).toMatchObject({ passed: true, failures: [] })
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )
})

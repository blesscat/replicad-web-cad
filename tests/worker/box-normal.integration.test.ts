import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getOC, measureVolume, setOC, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boxNormalPostCentersFor,
  boundsForBoxNormal,
  BOX_NORMAL_CONFIGURATION,
} from '../../src/cad-contract/units'
import {
  buildBoxNormal,
  BOX_NORMAL_PROFILE_CHECKPOINTS,
  boxNormalReferenceUrl,
  importBoxNormalReference,
} from '../../src/cad-kernel/components/box-normal/builder'
import {
  buildHexagonalColumnPrototype,
  HEXAGONAL_COLUMN_PROFILES,
} from '../../src/cad-kernel/components/hexagonal-column/builder'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
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

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the primary geometry assertion.
  }
}

function shapeBounds(shape: Shape3D): number[][] {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as number[][]
  } finally {
    boundingBox.delete()
  }
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

function countDiagonalPlanarFaces(
  shape: Shape3D,
  expectedZ: [number, number],
): number {
  let count = 0
  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const normal = face.normalAt()
      const bounds = face.boundingBox
      try {
        const [min, max] = bounds.bounds as number[][]
        const hasExpectedZ =
          Math.abs((min?.[2] ?? 0) - expectedZ[0]) < 0.01 &&
          Math.abs((max?.[2] ?? 0) - expectedZ[1]) < 0.01
        const isFortyFiveDegreePlane =
          Math.abs(Math.abs(normal.z) - Math.SQRT1_2) < 0.01
        if (hasExpectedZ && isFortyFiveDegreePlane) count += 1
      } finally {
        bounds.delete()
        normal.delete()
      }
    } finally {
      face.delete()
    }
  }
  return count
}

function profilePointsAtZ(shape: Shape3D, z: number): number[][] {
  const points: number[][] = []
  for (const edge of shape.edges) {
    const start = edge.startPoint
    let end: typeof start | null = null
    try {
      end = edge.endPoint
      for (const point of [start, end]) {
        if (
          point.z !== undefined &&
          Math.abs(point.z - z) < 0.01 &&
          !points.some(
            ([x, y]) =>
              Math.abs(x - point.x) < 0.01 && Math.abs(y - point.y) < 0.01,
          )
        ) {
          points.push([point.x, point.y])
        }
      }
    } finally {
      start.delete()
      end?.delete()
      edge.delete()
    }
  }
  return points
}

let reference: Shape3D

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
  reference = await importBoxNormalReference(
    new Blob([readFileSync(fileURLToPath(boxNormalReferenceUrl))]),
  )
})

afterAll(() => {
  deleteShape(reference)
})

describe('box-normal B-Rep integration', () => {
  it('loads the component-local canonical asset as a nominal single solid', () => {
    expect(reference.constructor.name).toBe('Solid')
    expect(shapeBounds(reference)[0]?.[0]).toBeCloseTo(
      -BOX_NORMAL_CONFIGURATION.canonicalWidth / 2,
      2,
    )
    expect(shapeBounds(reference)[1]?.[1]).toBeCloseTo(
      BOX_NORMAL_CONFIGURATION.canonicalDepth / 2,
      2,
    )
    expect(shapeBounds(reference)[1]?.[2]).toBeCloseTo(
      BOX_NORMAL_CONFIGURATION.canonicalHeight,
      2,
    )
    expect(countSolids(reference)).toBe(1)
  })

  it('builds a centered clearanced open body without posts', async () => {
    const parameters = { x: 2, y: 2, height: 10, cornerPosts: false }
    const shape = await buildBoxNormal(parameters, reference)
    try {
      const bounds = shapeBounds(shape)
      const expected = boundsForBoxNormal(parameters)
      expect(bounds[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(bounds[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(bounds[0]?.[2]).toBeCloseTo(expected.min[2], 2)
      expect(bounds[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(bounds[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(bounds[1]?.[2]).toBeCloseTo(expected.max[2], 2)
      expect(countSolids(shape)).toBe(1)
      expect(measureVolume(shape)).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps the 0.5 mm bottom and 0.6 mm top-opening chamfers', async () => {
    const shape = await buildBoxNormal(
      { x: 2, y: 2, height: 10, cornerPosts: false },
      reference,
    )
    try {
      expect(BOX_NORMAL_PROFILE_CHECKPOINTS.bottomOuterChamfer).toBe(0.5)
      expect(BOX_NORMAL_PROFILE_CHECKPOINTS.topOpeningChamfer).toBe(0.6)
      expect(countDiagonalPlanarFaces(shape, [0, 0.5])).toBeGreaterThanOrEqual(
        4,
      )
      expect(countDiagonalPlanarFaces(shape, [9.4, 10])).toBeGreaterThanOrEqual(
        4,
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('uses a flat-top/bottom hex profile for the four post inserts', () => {
    const post = buildHexagonalColumnPrototype(7, 'standing', {
      crossSectionRotationDegrees: 0,
      endTransitionLength: 0,
    })
    try {
      const endPoints = profilePointsAtZ(post, 0)
      const attachmentPoints = profilePointsAtZ(post, 7)
      expect(endPoints).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.closeTo(-1.10953, 4),
            expect.closeTo(1.921762, 4),
          ]),
          expect.arrayContaining([
            expect.closeTo(1.10953, 4),
            expect.closeTo(1.921762, 4),
          ]),
          expect.arrayContaining([
            expect.closeTo(-1.10953, 4),
            expect.closeTo(-1.921762, 4),
          ]),
          expect.arrayContaining([
            expect.closeTo(1.10953, 4),
            expect.closeTo(-1.921762, 4),
          ]),
        ]),
      )
      expect(attachmentPoints).toHaveLength(12)
    } finally {
      deleteShape(post)
    }
  })

  it('fuses exactly four downward seven-millimetre posts into one solid', async () => {
    const operationCounts: unknown[] = []
    const parameters = { x: 2, y: 2, height: 10, cornerPosts: true }
    const shape = await buildBoxNormal(parameters, reference, {
      reportOperationCounts: (counts) => operationCounts.push(counts),
    })
    try {
      const bounds = shapeBounds(shape)
      const expected = boundsForBoxNormal(parameters)
      expect(bounds[0]?.[2]).toBeCloseTo(0, 2)
      expect(bounds[1]?.[2]).toBeCloseTo(17, 2)
      expect(bounds[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(bounds[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(countSolids(shape)).toBe(1)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      const bottomProfilePoints = profilePointsAtZ(shape, 0)
      const attachmentProfilePoints = profilePointsAtZ(shape, 7)
      const expectedAttachmentProfile = HEXAGONAL_COLUMN_PROFILES.body.map(
        ([y, z]) => [-z, y],
      )
      for (const [centerX, centerY] of boxNormalPostCentersFor(parameters)) {
        const postPoints = bottomProfilePoints.filter(
          ([x, y]) => Math.abs(x - centerX) < 3 && Math.abs(y - centerY) < 3,
        )
        expect(postPoints).toHaveLength(6)
        expect(
          postPoints.reduce((sum, [x]) => sum + x, 0) / postPoints.length,
        ).toBeCloseTo(centerX, 3)
        expect(
          postPoints.reduce((sum, [, y]) => sum + y, 0) / postPoints.length,
        ).toBeCloseTo(centerY, 3)

        const attachmentPoints = attachmentProfilePoints.filter(
          ([x, y]) => Math.abs(x - centerX) < 3 && Math.abs(y - centerY) < 3,
        )
        expect(attachmentPoints).toHaveLength(expectedAttachmentProfile.length)
        for (const [relativeX, relativeY] of expectedAttachmentProfile) {
          expect(attachmentPoints).toEqual(
            expect.arrayContaining([
              [
                expect.closeTo(centerX + relativeX, 4),
                expect.closeTo(centerY + relativeY, 4),
              ],
            ]),
          )
        }
      }
      expect(operationCounts).toEqual([
        {
          bodyPrototype: 1,
          postInstances: 4,
          placements: 4,
          assemblyFuses: 4,
          gridCellBuilds: 0,
        },
      ])
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { x: 3, y: 3, height: 10, cornerPosts: false },
    { x: 3, y: 3, height: 10, cornerPosts: true },
    { x: 40, y: 35, height: 10, cornerPosts: true },
  ])('keeps the %sx%s fixture valid with posts=%s', async (parameters) => {
    const shape = await buildBoxNormal(parameters, reference)
    try {
      const bounds = shapeBounds(shape)
      const expected = boundsForBoxNormal(parameters)
      expect(bounds[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(bounds[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(bounds[0]?.[2]).toBeCloseTo(expected.min[2], 2)
      expect(bounds[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(bounds[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(bounds[1]?.[2]).toBeCloseTo(expected.max[2], 2)
      expect(countSolids(shape)).toBe(1)
    } finally {
      deleteShape(shape)
    }
  })

  it('keeps maximum-grid generation independent of grid-cell count', async () => {
    const parameters = { x: 40, y: 35, height: 10, cornerPosts: false }
    const shape = await buildBoxNormal(parameters, reference)
    try {
      const bounds = shapeBounds(shape)
      const expected = boundsForBoxNormal(parameters)
      expect(bounds[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(bounds[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(bounds[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(bounds[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(countSolids(shape)).toBe(1)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('produces mesh, STEP, and STL output for the post fixture', async () => {
    const shape = await buildBoxNormal(
      { x: 2, y: 2, height: 10, cornerPosts: true },
      reference,
    )
    try {
      const mesh = meshBRep(shape, { tolerance: 0.01, angularTolerance: 0.1 })
      expect(mesh.triangleCount).toBeGreaterThan(0)
      expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
      expect((await exportStlBytes(shape)).byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('rejects an asset without the required millimetre STEP metadata', async () => {
    await expect(
      importBoxNormalReference(new Blob(['not a STEP file'])),
    ).rejects.toThrow('BOX_NORMAL_ASSET_INVALID_UNITS')
  })
})

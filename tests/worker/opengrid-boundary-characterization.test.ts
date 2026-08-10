import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  importSTEP,
  makeBox,
  measureVolume,
  measureDistanceBetween,
  setOC,
  type Shape3D,
} from 'replicad'
import opencascade from 'replicad-opencascadejs'
import {
  buildOpenGridSnap,
  importOpenGridSnapReference,
} from '../../src/cad-kernel/components/opengrid-snap/builder'
import {
  buildOpenGridSnapBoundaryObstacle,
  OPENGRID_SNAP_BOUNDARY_PROFILE,
} from '../../src/cad-kernel/components/opengrid-snap/boundary'
import { OPENGRID_SNAP_CONFIGURATION } from '../../src/cad-contract/units'

const require = createRequire(import.meta.url)
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')
const FIXTURE_PATH = resolve(
  'tests/fixtures/opengrid-snap/opengrid-lite-2x2-xleft-ytop-official-default-none-corners-none.step',
)

type Point = [number, number, number]
type Bounds = [Point, Point]
type PlaneFact = {
  min: Point
  max: Point
  normal: Point
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the characterization failure.
  }
}

function boundsOf(shape: Shape3D): Bounds {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as Bounds
  } finally {
    bounds.delete()
  }
}

function planeFacts(shape: Shape3D): PlaneFact[] {
  return shape.faces.flatMap((face) => {
    try {
      if (face.geomType !== 'PLANE') return []
      const bounds = face.boundingBox
      const normal = face.normalAt()
      try {
        const [min, max] = bounds.bounds as Bounds
        return [
          {
            min,
            max,
            normal: [normal.x, normal.y, normal.z],
          },
        ]
      } finally {
        bounds.delete()
        normal.delete()
      }
    } finally {
      face.delete()
    }
  })
}

function localPlaneFact(fact: PlaneFact, center: [number, number]): PlaneFact {
  return {
    min: [fact.min[0] - center[0], fact.min[1] - center[1], fact.min[2]],
    max: [fact.max[0] - center[0], fact.max[1] - center[1], fact.max[2]],
    normal: fact.normal,
  }
}

function diagonalCornerKey(fact: PlaneFact): string {
  const xSign = fact.min[0] + fact.max[0] >= 0 ? 1 : -1
  const ySign = fact.min[1] + fact.max[1] >= 0 ? 1 : -1
  return `${xSign}:${ySign}`
}

function diagonalLineConstant(fact: PlaneFact): number {
  const xSign = fact.min[0] + fact.max[0] >= 0 ? 1 : -1
  const ySign = fact.min[1] + fact.max[1] >= 0 ? 1 : -1
  const minU = xSign > 0 ? fact.min[0] : -fact.max[0]
  const maxU = xSign > 0 ? fact.max[0] : -fact.min[0]
  const minV = ySign > 0 ? fact.min[1] : -fact.max[1]
  const maxV = ySign > 0 ? fact.max[1] : -fact.min[1]
  return (minU + maxV + maxU + minV) / 2
}

function officialHostDiagonalFacts(
  board: Shape3D,
  footprint: 'half' | 'quarter',
): PlaneFact[] {
  const center =
    footprint === 'half'
      ? OPENGRID_SNAP_CONFIGURATION.officialHost.halfCenter
      : OPENGRID_SNAP_CONFIGURATION.officialHost.quarterCenter
  const hostWidth = 14
  const hostDepth = footprint === 'half' ? 28 : 14
  const byCorner = new Map<string, PlaneFact>()
  for (const fact of planeFacts(board)) {
    const local = localPlaneFact(fact, center)
    if (
      local.min[0] < -hostWidth / 2 - 0.05 ||
      local.max[0] > hostWidth / 2 + 0.05 ||
      local.min[1] < -hostDepth / 2 - 0.05 ||
      local.max[1] > hostDepth / 2 + 0.05 ||
      local.max[2] - local.min[2] <= 2.5 ||
      local.max[2] - local.min[2] >= 2.7 ||
      Math.abs(Math.abs(local.normal[0]) - Math.SQRT1_2) >= 0.02 ||
      Math.abs(Math.abs(local.normal[1]) - Math.SQRT1_2) >= 0.02 ||
      Math.abs(local.normal[2]) >= 0.02
    ) {
      continue
    }
    byCorner.set(diagonalCornerKey(local), local)
  }
  return [...byCorner.values()]
}

function probeVolume(board: Shape3D, min: Point, max: Point): number {
  const probe = makeBox(min, max)
  const intersection = board.intersect(probe)
  try {
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    deleteShape(probe)
  }
}

async function officialBoard(): Promise<Shape3D> {
  const imported = await importSTEP(new Blob([readFileSync(FIXTURE_PATH)]))
  return imported.asShape3D()
}

function snapAssetBlob(variant: 'Full' | 'Lite'): Blob {
  return new Blob([
    readFileSync(
      new URL(
        `../../src/cad-kernel/components/opengrid-snap/assets/opengrid-bare-standard-${variant.toLowerCase()}-snap.step`,
        import.meta.url,
      ),
    ),
  ])
}

function isNear(value: number, expected: number, tolerance = 0.02): boolean {
  return Math.abs(value - expected) <= tolerance
}

describe('official OpenGrid edge fixture', () => {
  beforeAll(async () => {
    const initializer = opencascade as unknown as (options?: {
      locateFile?: (fileName: string) => string
    }) => Promise<unknown>
    const oc = await initializer({ locateFile: () => WASM_PATH })
    setOC(oc as Parameters<typeof setOC>[0])
  })

  it('records the 70 mm rails, diagonal corner, and canonical host occupancy', async () => {
    const board = await officialBoard()
    try {
      const [min, max] = boundsOf(board)
      expect(min[0]).toBeCloseTo(-35, 5)
      expect(min[1]).toBeCloseTo(-35, 5)
      expect(min[2]).toBeCloseTo(0, 5)
      expect(max[0]).toBeCloseTo(35, 5)
      expect(max[1]).toBeCloseTo(35, 5)
      expect(max[2]).toBeCloseTo(
        OPENGRID_SNAP_CONFIGURATION.officialHost.boardHeight,
        5,
      )

      const inset = OPENGRID_SNAP_BOUNDARY_PROFILE.diagonalCornerInset
      const leftRail = planeFacts(board).find(
        ({ min: faceMin, max: faceMax, normal }) =>
          isNear(faceMin[0], -35) &&
          isNear(normal[0], -1) &&
          isNear(normal[1], 0) &&
          faceMax[1] - faceMin[1] > 60 &&
          faceMax[2] - faceMin[2] > 3,
      )
      expect(leftRail).toBeDefined()
      expect(leftRail?.min[1]).toBeCloseTo(-35 + inset, 2)
      expect(leftRail?.max[1]).toBeCloseTo(35 - inset, 2)

      const upperLeftDiagonal = planeFacts(board).find(
        ({ min: faceMin, max: faceMax, normal }) =>
          isNear(faceMin[0], -35) &&
          isNear(faceMax[1], 35) &&
          isNear(normal[0], -Math.SQRT1_2) &&
          isNear(normal[1], Math.SQRT1_2) &&
          Math.abs(normal[2]) < 0.02,
      )
      expect(upperLeftDiagonal).toBeDefined()
      expect(upperLeftDiagonal?.max[0]).toBeCloseTo(-35 + inset, 2)
      expect(upperLeftDiagonal?.min[1]).toBeCloseTo(35 - inset, 2)

      const halfCenter = OPENGRID_SNAP_CONFIGURATION.officialHost.halfCenter
      const quarterCenter =
        OPENGRID_SNAP_CONFIGURATION.officialHost.quarterCenter
      expect(probeVolume(board, [-35, -7, 0], [-21, 21, 4])).toBeGreaterThan(0)
      expect(probeVolume(board, [-35, 21, 0], [-21, 35, 4])).toBeGreaterThan(0)
      expect(halfCenter).toEqual([-28, 7])
      expect(quarterCenter).toEqual([-28, 28])
    } finally {
      deleteShape(board)
    }
  }, 60_000)

  it.each(['half', 'quarter'] as const)(
    'builds four full-height diagonal corner cutters for %s',
    async (footprint) => {
      const board = await officialBoard()
      const obstacle = buildOpenGridSnapBoundaryObstacle(footprint)
      expect(obstacle).not.toBeNull()
      try {
        const diagonalFaces = planeFacts(obstacle!).filter(
          ({ min, max, normal }) =>
            max[2] - min[2] >=
              OPENGRID_SNAP_CONFIGURATION.variantHeights.Full - 0.1 &&
            Math.abs(normal[2]) < 0.1 &&
            Math.abs(normal[0]) > 0.1 &&
            Math.abs(normal[1]) > 0.1,
        )
        const diagonalByCorner = new Map<string, PlaneFact>()
        for (const fact of diagonalFaces) {
          diagonalByCorner.set(diagonalCornerKey(fact), fact)
        }
        expect(diagonalByCorner.size).toBe(4)
        const officialDiagonalFacts = officialHostDiagonalFacts(
          board,
          footprint,
        )
        expect(new Set(officialDiagonalFacts.map(diagonalCornerKey)).size).toBe(
          4,
        )
        for (const [corner, fact] of diagonalByCorner) {
          const officialFact = officialDiagonalFacts.find(
            (candidate) =>
              diagonalCornerKey(candidate) === corner &&
              Math.abs(
                diagonalLineConstant(candidate) - diagonalLineConstant(fact),
              ) < 0.05,
          )
          expect(
            officialFact,
            `${footprint}/${corner} must match the fixture diagonal`,
          ).toBeDefined()
          expect(Math.abs(fact.normal[0])).toBeCloseTo(Math.SQRT1_2, 2)
          expect(Math.abs(fact.normal[1])).toBeCloseTo(Math.SQRT1_2, 2)
          expect(fact.min[2]).toBeCloseTo(0, 2)
          expect(fact.max[2]).toBeCloseTo(
            OPENGRID_SNAP_CONFIGURATION.variantHeights.Full,
            2,
          )
        }
      } finally {
        deleteShape(board)
        deleteShape(obstacle)
      }
    },
  )

  it.each([
    ['Full', 'half'],
    ['Full', 'quarter'],
    ['Lite', 'half'],
    ['Lite', 'quarter'],
  ] as const)(
    'fits the official %s %s host without interference and supports mating-z contact',
    async (variant, footprint) => {
      const board = await officialBoard()
      const reference = await importOpenGridSnapReference(
        snapAssetBlob(variant),
        variant,
        'Standard',
      )
      const snap = await buildOpenGridSnap(
        {
          variant,
          profile: 'Standard',
          offset: 0,
          footprint,
          fourCornerLocatingHoles: false,
          centerRemoverHole: false,
        },
        { getOpenGridSnapReference: async () => reference },
      )
      const center =
        footprint === 'half'
          ? OPENGRID_SNAP_CONFIGURATION.officialHost.halfCenter
          : OPENGRID_SNAP_CONFIGURATION.officialHost.quarterCenter
      const placed = snap.clone().translate(center[0], center[1], 0)
      const mating = snap.clone().translate(center[0], center[1], 4)
      const sameLevelIntersection = placed.intersect(board)
      const matingIntersection = mating.intersect(board)
      const obstacle = buildOpenGridSnapBoundaryObstacle(footprint)
      const obstacleInHost = obstacle
        ? obstacle.clone().translate(center[0], center[1], 0)
        : null
      const obstacleIntersection = obstacleInHost
        ? obstacleInHost.intersect(board)
        : null

      try {
        const interferenceTolerance =
          OPENGRID_SNAP_CONFIGURATION.officialHost.interferenceTolerance
        expect(measureVolume(sameLevelIntersection)).toBeLessThanOrEqual(
          interferenceTolerance,
        )
        expect(measureVolume(matingIntersection)).toBeLessThanOrEqual(
          interferenceTolerance,
        )
        expect(obstacleIntersection).not.toBeNull()
        expect(measureVolume(obstacleIntersection!)).toBeGreaterThan(
          OPENGRID_SNAP_CONFIGURATION.officialHost.clearanceTolerance,
        )
        expect(measureDistanceBetween(mating, board)).toBeLessThanOrEqual(
          OPENGRID_SNAP_CONFIGURATION.officialHost.clearanceTolerance,
        )

        const diagonalFacts = officialHostDiagonalFacts(board, footprint)
        expect(diagonalFacts).toHaveLength(4)
        const upperProbeZ = Math.min(
          2.5,
          OPENGRID_SNAP_CONFIGURATION.variantHeights[variant] - 0.2,
        )
        for (const fact of diagonalFacts) {
          const x = center[0] + (fact.min[0] + fact.max[0]) / 2
          const y = center[1] + (fact.min[1] + fact.max[1]) / 2
          expect(
            probeVolume(
              placed,
              [x - 0.12, y - 0.12, 0.4],
              [x + 0.12, y + 0.12, upperProbeZ],
            ),
            `${variant}/${footprint} diagonal locking probe`,
          ).toBeGreaterThan(0.001)
        }

        const [min, max] = boundsOf(placed)
        expect(min[0]).toBeGreaterThanOrEqual(-35.1)
        expect(min[1]).toBeGreaterThanOrEqual(-35.1)
        expect(max[0]).toBeLessThanOrEqual(35.1)
        expect(max[1]).toBeLessThanOrEqual(35.1)
      } finally {
        deleteShape(sameLevelIntersection)
        deleteShape(matingIntersection)
        deleteShape(obstacleIntersection)
        deleteShape(obstacleInHost)
        deleteShape(obstacle)
        deleteShape(placed)
        deleteShape(mating)
        deleteShape(snap)
        deleteShape(reference)
        deleteShape(board)
      }
    },
  )
})

import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  getOC,
  importSTEP,
  makeCompound,
  measureVolume,
  setOC,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForHexagonalColumn,
  HEXAGONAL_COLUMN_CONFIGURATION,
} from '../../src/cad-contract/units'
import {
  buildHexagonalColumn,
  HEXAGONAL_COLUMN_PROFILES,
  importHexagonalColumnReference,
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
const ASSET_PATH = new URL(
  '../../src/cad-kernel/components/hexagonal-column/hexagonal.step',
  import.meta.url,
)

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Keep cleanup failures from hiding the geometry assertion.
  }
}

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
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

function solidBounds(shape: Shape3D): number[][][] {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  const result: number[][][] = []
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        result.push(shapeBounds(solid))
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
    return result
  } finally {
    explorer.delete()
  }
}

function expectVerticalBounds(shape: Shape3D, height: number): void {
  const bounds = shapeBounds(shape)
  expect(bounds[0]?.[0]).toBeCloseTo(
    -HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
    2,
  )
  expect(bounds[0]?.[1]).toBeCloseTo(
    -HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY / 2,
    2,
  )
  expect(bounds[0]?.[2]).toBeCloseTo(0, 2)
  expect(bounds[1]?.[0]).toBeCloseTo(
    HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX / 2,
    2,
  )
  expect(bounds[1]?.[1]).toBeCloseTo(
    HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY / 2,
    2,
  )
  expect(bounds[1]?.[2]).toBeCloseTo(height, 2)
}

function hasProfileAtStation(
  shape: Shape3D,
  station: number,
  expected: readonly (readonly [number, number])[],
): boolean {
  const points: Array<readonly [number, number]> = []
  const angle =
    (HEXAGONAL_COLUMN_CONFIGURATION.crossSectionRotationDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  for (const edge of shape.edges) {
    const start = edge.startPoint
    let end: typeof start | null = null
    try {
      end = edge.endPoint
      for (const point of [start, end]) {
        if (!point || Math.abs(point.z - station) > 0.01) continue
        const baseX = point.x * cos + point.y * sin
        const baseY = -point.x * sin + point.y * cos
        const localY = baseY
        const localZ = -baseX
        if (
          !points.some(
            ([y, z]) =>
              Math.abs(y - localY) <= 0.01 && Math.abs(z - localZ) <= 0.01,
          )
        ) {
          points.push([localY, localZ])
        }
      }
    } finally {
      start.delete()
      end?.delete()
      edge.delete()
    }
  }

  return (
    points.length === expected.length &&
    expected.every(([y, z]) =>
      points.some(
        ([actualY, actualZ]) =>
          Math.abs(actualY - y) <= 0.01 && Math.abs(actualZ - z) <= 0.01,
      ),
    )
  )
}

function hasWorldPointAtStation(
  shape: Shape3D,
  station: number,
  x: number,
  y: number,
): boolean {
  for (const edge of shape.edges) {
    const start = edge.startPoint
    let end: typeof start | null = null
    try {
      end = edge.endPoint
      for (const point of [start, end]) {
        if (
          point &&
          Math.abs(point.z - station) <= 0.01 &&
          Math.abs(point.x - x) <= 0.01 &&
          Math.abs(point.y - y) <= 0.01
        ) {
          return true
        }
      }
    } finally {
      start.delete()
      end?.delete()
      edge.delete()
    }
  }

  return false
}

let reference: Shape3D

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
  reference = await importHexagonalColumnReference(
    new Blob([readFileSync(ASSET_PATH)]),
  )
})

afterAll(() => {
  deleteShape(reference)
})

describe('hexagonal-column B-Rep integration', () => {
  it('loads the local reference as a single sharp solid', () => {
    expect(reference.constructor.name).toBe('Solid')
    expect(shapeBounds(reference)[0]?.[0]).toBeCloseTo(0, 2)
    expect(shapeBounds(reference)[1]?.[0]).toBeCloseTo(20, 2)
    expect(
      reference.edges.every((edge) => {
        const type = edge.geomType
        edge.delete()
        return type === 'LINE'
      }),
    ).toBe(true)
  })

  it('builds one vertical compound member with fixed end transitions', async () => {
    const shape = await buildHexagonalColumn(
      { height: 50, count: 1, gap: 1, orientation: 'standing' },
      { reference },
    )
    try {
      expect(shape.constructor.name).toBe('Compound')
      expect(countSolids(shape)).toBe(1)
      expectVerticalBounds(shape, 50)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      const edgeTypes = shape.edges.map((edge) => {
        const type = edge.geomType
        edge.delete()
        return type
      })
      expect([...new Set(edgeTypes)]).toEqual(['LINE'])
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('builds the lying orientation along world X', async () => {
    const parameters = {
      height: 50,
      count: 1,
      gap: 1,
      orientation: 'lying' as const,
    }
    const shape = await buildHexagonalColumn(parameters, { reference })
    try {
      const bounds = shapeBounds(shape)
      expect(countSolids(shape)).toBe(1)
      expect(bounds[0]?.[0]).toBeCloseTo(-25, 2)
      expect(bounds[1]?.[0]).toBeCloseTo(25, 2)
      expect(bounds[0]?.[2]).toBeCloseTo(0, 2)
      expect(bounds[1]?.[2]).toBeCloseTo(
        HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentX,
        2,
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps the six-sided end profile, twelve-sided body profile, and fixed stations', async () => {
    const shape = await buildHexagonalColumn(
      { height: 50, count: 1, gap: 1, orientation: 'standing' },
      { reference },
    )
    try {
      const stationZs = new Set<number>()
      for (const edge of shape.edges) {
        const start = edge.startPoint
        const end = edge.endPoint
        try {
          if (Math.abs(start.z - end.z) < 0.001) {
            stationZs.add(Number(start.z.toFixed(3)))
          }
        } finally {
          start.delete()
          end.delete()
          edge.delete()
        }
      }
      expect(stationZs).toEqual(new Set([0, 0.2, 49.8, 50]))
      expect(
        hasProfileAtStation(shape, 0, HEXAGONAL_COLUMN_PROFILES.end) &&
          hasProfileAtStation(shape, 0.2, HEXAGONAL_COLUMN_PROFILES.body) &&
          hasProfileAtStation(shape, 49.8, HEXAGONAL_COLUMN_PROFILES.body) &&
          hasProfileAtStation(shape, 50, HEXAGONAL_COLUMN_PROFILES.end),
      ).toBe(true)
      expect(hasWorldPointAtStation(shape, 0, 0, 2.21906)).toBe(true)
      expect(hasWorldPointAtStation(shape, 0, 0, -2.21906)).toBe(true)
      expect(hasWorldPointAtStation(shape, 0.2, 0.173205, 2.35)).toBe(true)
      expect(hasWorldPointAtStation(shape, 0.2, -0.173205, 2.35)).toBe(true)
      const capEdgeCounts = shape.faces
        .map((face) => {
          const center = face.center
          const edgeCount = face.edges.length
          const isCap =
            Math.abs(center.z) < 0.001 || Math.abs(center.z - 50) < 0.001
          center.delete()
          for (const edge of face.edges) edge.delete()
          face.delete()
          return isCap ? edgeCount : null
        })
        .filter((count): count is number => count !== null)
      expect(capEdgeCounts).toEqual([6, 6])
      expect(
        shape.faces.every((face) => {
          const type = face.geomType
          face.delete()
          return type === 'PLANE'
        }),
      ).toBe(true)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('builds three independent members with the requested centered gap', async () => {
    const parameters = {
      height: 50,
      count: 3,
      gap: 1,
      orientation: 'standing' as const,
    }
    const shape = await buildHexagonalColumn(parameters, { reference })
    try {
      expect(shape.constructor.name).toBe('Compound')
      expect(countSolids(shape)).toBe(3)
      const members = solidBounds(shape).sort(
        (first, second) => (first[0]?.[1] ?? 0) - (second[0]?.[1] ?? 0),
      )
      expect(members).toHaveLength(3)
      expect(members[0]?.[0]?.[1]).toBeCloseTo(
        boundsForHexagonalColumn(parameters).min[1],
        2,
      )
      expect(members[2]?.[1]?.[1]).toBeCloseTo(
        boundsForHexagonalColumn(parameters).max[1],
        2,
      )
      expect(
        (members[1]?.[0]?.[1] ?? 0) - (members[0]?.[1]?.[1] ?? 0),
      ).toBeCloseTo(parameters.gap, 2)
      expect(
        (members[2]?.[0]?.[1] ?? 0) - (members[1]?.[1]?.[1] ?? 0),
      ).toBeCloseTo(parameters.gap, 2)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps the twenty-column envelope within the configured workspace', async () => {
    const parameters = {
      height: 50,
      count: 20,
      gap: 1,
      orientation: 'standing' as const,
    }
    const shape = await buildHexagonalColumn(parameters, { reference })
    try {
      expect(countSolids(shape)).toBe(20)
      const actual = shapeBounds(shape)
      const expected = boundsForHexagonalColumn(parameters)
      expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(actual[1]?.[2]).toBeCloseTo(50, 2)
      expect(HEXAGONAL_COLUMN_CONFIGURATION.endTransitionLength).toBe(0.2)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('round-trips three separate solids through STEP and produces disjoint STL mesh', async () => {
    const shape = await buildHexagonalColumn(
      { height: 50, count: 3, gap: 1, orientation: 'standing' },
      { reference },
    )
    let imported: Shape3D | null = null
    try {
      const stepBytes = await exportStepBytes(shape)
      imported = (await importSTEP(new Blob([stepBytes]))).asShape3D()
      expect(countSolids(imported)).toBe(3)

      const mesh = meshBRep(shape, { tolerance: 0.01, angularTolerance: 0.1 })
      expect(mesh.triangleCount).toBeGreaterThan(0)
      for (let index = 0; index < mesh.indices.length; index += 3) {
        const yCoordinates = [0, 1, 2].map((offset) => {
          const vertexIndex = mesh.indices[index + offset]
          return mesh.positions[vertexIndex * 3 + 1]
        })
        expect(
          Math.max(...yCoordinates) - Math.min(...yCoordinates),
        ).toBeLessThan(
          HEXAGONAL_COLUMN_CONFIGURATION.crossSectionExtentY + 0.02,
        )
      }

      const stlBytes = await exportStlBytes(shape)
      expect(stlBytes.byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(imported)
      deleteShape(shape)
    }
  }, 120_000)

  it('cleans a stale clone assembly and can build again in the same epoch', async () => {
    let current = true
    const stale = buildHexagonalColumn(
      { height: 50, count: 3, gap: 1, orientation: 'standing' },
      {
        reference,
        isGenerationCurrent: () => current,
        yieldToEventLoop: async () => {
          current = false
        },
      },
    )
    await expect(stale).rejects.toThrow('STALE_GENERATION')

    current = true
    const recovered = await buildHexagonalColumn(
      { height: 8, count: 1, gap: 1, orientation: 'standing' },
      { reference, isGenerationCurrent: () => current },
    )
    try {
      expect(countSolids(recovered)).toBe(1)
      expect(shapeBounds(recovered)[1]?.[2]).toBeCloseTo(8, 2)
    } finally {
      deleteShape(recovered)
    }
  }, 120_000)

  it('deletes consumed clone wrappers once after successful Compound transfer', async () => {
    const deleteSpies: ReturnType<typeof vi.spyOn>[] = []
    const shape = await buildHexagonalColumn(
      { height: 8, count: 3, gap: 1, orientation: 'standing' },
      {
        reference,
        compoundBuilder: (columns) => {
          for (const column of columns)
            deleteSpies.push(vi.spyOn(column, 'delete'))
          return makeCompound(columns).asShape3D()
        },
      },
    )

    try {
      expect(deleteSpies).toHaveLength(3)
      expect(deleteSpies.every((spy) => Boolean(spy))).toBe(true)
      expect(deleteSpies.every((spy) => spy.mock.calls.length === 1)).toBe(true)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('releases every untransferred clone once when Compound assembly fails', async () => {
    const deleteSpies: ReturnType<typeof vi.spyOn>[] = []
    await expect(
      buildHexagonalColumn(
        { height: 8, count: 3, gap: 1, orientation: 'standing' },
        {
          reference,
          compoundBuilder: (columns) => {
            for (const column of columns) {
              deleteSpies.push(vi.spyOn(column, 'delete'))
            }
            throw new Error('COMPOUND_TEST_FAILURE')
          },
        },
      ),
    ).rejects.toThrow('COMPOUND_TEST_FAILURE')

    expect(deleteSpies).toHaveLength(3)
    expect(deleteSpies.every((spy) => spy.mock.calls.length === 1)).toBe(true)
  }, 120_000)
})

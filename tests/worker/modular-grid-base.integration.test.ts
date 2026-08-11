import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  getOC,
  measureVolume,
  setOC,
  type Edge,
  type Shape3D,
  type Wire,
} from 'replicad'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { buildBoxBRep } from '../../src/cad-kernel/components/box/builder'
import {
  buildModularGridBase,
  buildModularGridBaseWithStrategy,
  importModularGridBaseTemplate,
} from '../../src/cad-kernel/components/modular-grid-base/builder'
import { meshBRep } from '../../src/cad-kernel/mesh'
import { createBooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import {
  boundsForBox,
  boundsForModularGridBase,
  PROTOTYPE_CONFIGURATION,
  type ModularGridBaseParameters,
} from '../../src/cad-contract/units'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const TEMPLATE_PATH = new URL(
  '../../src/cad-kernel/components/modular-grid-base/board-cell-template.step',
  import.meta.url,
)
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')
const TOLERANCE = 0.01

function closeTo(actual: number, expected: number): void {
  expect(actual).toBeCloseTo(expected, 2)
}

function closeToStepGeometry(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.03)
}

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function wireBounds(wire: Wire): number[][] {
  const bounds = wire.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function isClose(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= TOLERANCE
}

function readEdgePoints(edge: Edge): [number[], number[]] {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return [start.toTuple(), end.toTuple()]
  } finally {
    start.delete()
    end.delete()
  }
}

function isOuterCornerArc(
  edge: Edge,
  width: number,
  depth: number,
  z: number,
  radius: number,
): boolean {
  if (edge.geomType !== 'CIRCLE') return false
  const [start, end] = readEdgePoints(edge)
  return [start, end].every(([x, y, pointZ]) => {
    if (!isClose(pointZ, z)) return false
    return (
      (isClose(Math.abs(x), width / 2) &&
        isClose(Math.abs(y), depth / 2 - radius)) ||
      (isClose(Math.abs(x), width / 2 - radius) &&
        isClose(Math.abs(y), depth / 2))
    )
  })
}

function hasExternalVerticalCornerEdge(
  edge: Edge,
  width: number,
  depth: number,
  height: number,
): boolean {
  if (edge.geomType !== 'LINE') return false
  const [start, end] = readEdgePoints(edge)
  return (
    isClose(Math.abs(start[0]), width / 2) &&
    isClose(Math.abs(start[1]), depth / 2) &&
    isClose(start[0], end[0]) &&
    isClose(start[1], end[1]) &&
    isClose(Math.abs(start[2] - end[2]), height)
  )
}

function hasInternalSharpVerticalEdge(
  edge: Edge,
  width: number,
  depth: number,
  height: number,
): boolean {
  if (edge.geomType !== 'LINE') return false
  const [start, end] = readEdgePoints(edge)
  return (
    isClose(start[0], end[0]) &&
    isClose(start[1], end[1]) &&
    isClose(Math.abs(start[2] - end[2]), height) &&
    Math.abs(start[0]) < width / 2 - 2.5 &&
    Math.abs(start[1]) < depth / 2 - 2.5
  )
}

function topPlanarFaces(shape: Shape3D) {
  return shape.faces.filter((face) => {
    if (face.geomType !== 'PLANE') {
      deleteShape(face)
      return false
    }
    const center = face.center
    try {
      const isTopFace = isClose(center.z, 5)
      if (!isTopFace) deleteShape(face)
      return isTopFace
    } finally {
      center.delete()
    }
  })
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the primary assertion or geometry error.
  }
}

function deleteShapes(
  shapes: readonly ({ delete?: () => void } | null | undefined)[],
): void {
  for (const shape of shapes) deleteShape(shape)
}

function countTopHoles(shape: Shape3D): number {
  const topFaces = topPlanarFaces(shape)
  try {
    return topFaces.reduce((count, face) => {
      const wires = face.innerWires()
      try {
        return count + wires.length
      } finally {
        deleteShapes(wires)
      }
    }, 0)
  } finally {
    deleteShapes(topFaces)
  }
}

function runGeometryStage<T>(label: string, callback: () => T): T {
  try {
    return callback()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`GRID_GEOMETRY_STAGE:${label}:${message}`)
  }
}

function assertBinaryStl(bytes: ArrayBuffer): void {
  expect(bytes.byteLength).toBeGreaterThan(84)
  const triangleCount = new DataView(bytes).getUint32(80, true)
  expect(triangleCount).toBeGreaterThan(0)
  expect(bytes.byteLength).toBe(84 + triangleCount * 50)
}

function reportStlMeasurement(
  fixture: string,
  startedAt: number,
  bytes: ArrayBuffer,
): void {
  if (process.env.RUN_STL_MEASUREMENTS !== '1') return
  console.log(
    JSON.stringify({
      fixture,
      byteLength: bytes.byteLength,
      triangleCount: new DataView(bytes).getUint32(80, true),
      exportMs: Number((performance.now() - startedAt).toFixed(2)),
      tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
      angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
    }),
  )
}

type BRepCheckAnalyzer = {
  IsValid_2: () => boolean
  delete: () => void
}

function createBRepCheckAnalyzer(shape: Shape3D): BRepCheckAnalyzer {
  const Analyzer = getOC().BRepCheck_Analyzer as unknown as new (
    shape: Shape3D['wrapped'],
    geomControls: boolean,
    isParallel: boolean,
  ) => BRepCheckAnalyzer
  return new Analyzer(shape.wrapped, true, false)
}

async function loadTemplate(): Promise<Shape3D> {
  const bytes = readFileSync(TEMPLATE_PATH)
  return importModularGridBaseTemplate(new Blob([bytes]))
}

async function buildGrid(parameters: ModularGridBaseParameters): Promise<{
  shape: Shape3D
  template: Shape3D
}> {
  const template = await loadTemplate()
  try {
    return { shape: await buildModularGridBase(parameters, template), template }
  } catch (error) {
    template.delete()
    throw error
  }
}

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

describe('modular-grid-base CAD kernel integration', () => {
  it('exports a binary STL for the prototype box with millimetre bounds', async () => {
    const parameters = { width: 20, depth: 30, height: 40 }
    const shape = buildBoxBRep(parameters)
    try {
      const [[minX, minY, minZ], [maxX, maxY, maxZ]] = shapeBounds(shape)
      const expected = boundsForBox(parameters)
      closeTo(minX, expected.min[0])
      closeTo(minY, expected.min[1])
      closeTo(minZ, expected.min[2])
      closeTo(maxX, expected.max[0])
      closeTo(maxY, expected.max[1])
      closeTo(maxZ, expected.max[2])
      const exportStartedAt = performance.now()
      const bytes = await exportStlBytes(shape, {
        tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
        angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
      })
      assertBinaryStl(bytes)
      reportStlMeasurement('box-20x30x40', exportStartedAt, bytes)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('observes stale generation after yielding between native boundaries', async () => {
    const template = await loadTemplate()
    let current = true

    try {
      await expect(
        buildModularGridBase({ rows: 2, columns: 2 }, template, {
          isGenerationCurrent: () => current,
          yieldToEventLoop: async () => {
            current = false
            await new Promise<void>((resolve) => setTimeout(resolve, 0))
          },
        }),
      ).rejects.toThrow('STALE_GENERATION')
    } finally {
      template.delete()
    }
  })

  it('reports the balanced native multi-fuse boundary', async () => {
    const template = await loadTemplate()
    const progress: Array<{
      kind: string
      state: string
      completed?: number
      total?: number
    }> = []
    const reporter = createBooleanOperationReporter((update) =>
      progress.push(update),
    )

    try {
      const shape = await buildModularGridBaseWithStrategy(
        { rows: 2, columns: 2 },
        template,
        'balanced',
        { booleanOperations: reporter },
      )
      shape.delete()
    } finally {
      template.delete()
    }

    expect(
      progress.some(
        (update) =>
          update.kind === 'fuse' &&
          update.state === 'completed' &&
          update.completed === 1 &&
          update.total === 1,
      ),
    ).toBe(true)
  }, 180_000)

  it.each([
    { rows: 1, columns: 1 },
    { rows: 2, columns: 2 },
    { rows: 5, columns: 5 },
    { rows: 10, columns: 10 },
    { rows: 20, columns: 20 },
    { rows: 25, columns: 25 },
  ])(
    'preserves the geometry contract for $rows x $columns grids',
    async (parameters) => {
      const { shape, template } = await buildGrid(parameters)

      try {
        const [[minX, minY, minZ], [maxX, maxY, maxZ]] = runGeometryStage(
          'bounds',
          () => shapeBounds(shape),
        )
        const expected = boundsForModularGridBase(parameters)
        closeTo(minX, expected.min[0])
        closeTo(minY, expected.min[1])
        closeTo(minZ, expected.min[2])
        closeTo(maxX, expected.max[0])
        closeTo(maxY, expected.max[1])
        closeTo(maxZ, expected.max[2])
        expect(shape.constructor.name).toBe('Solid')
        runGeometryStage('validity', () => {
          const analyzer = createBRepCheckAnalyzer(shape)
          try {
            expect(analyzer.IsValid_2()).toBe(true)
          } finally {
            analyzer.delete()
          }
        })
        expect(
          runGeometryStage('volume', () => measureVolume(shape)),
        ).toBeGreaterThan(0)
        expect(runGeometryStage('holes', () => countTopHoles(shape))).toBe(
          parameters.rows * parameters.columns,
        )

        const edges = runGeometryStage('edges', () => shape.edges)
        try {
          const outerCornerArcs = runGeometryStage('external-fillets', () => ({
            bottom: edges.filter((edge) =>
              isOuterCornerArc(
                edge,
                expected.max[0] - expected.min[0],
                expected.max[1] - expected.min[1],
                0,
                2.5,
              ),
            ),
            top: edges.filter((edge) =>
              isOuterCornerArc(
                edge,
                expected.max[0] - expected.min[0],
                expected.max[1] - expected.min[1],
                5,
                2.5,
              ),
            ),
          }))
          expect(outerCornerArcs.bottom).toHaveLength(4)
          expect(outerCornerArcs.top).toHaveLength(4)
        } finally {
          deleteShapes(edges)
        }

        const mesh = runGeometryStage('mesh', () =>
          meshBRep(shape, {
            tolerance: TOLERANCE,
            angularTolerance: 0.1,
          }),
        )
        expect(mesh.triangleCount).toBeGreaterThan(0)
        expect(
          (await runGeometryStage('step', () => exportStepBytes(shape)))
            .byteLength,
        ).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
        deleteShape(template)
      }
    },
    180_000,
  )

  it('builds a centered 1x1 plate with a 17.5 mm through-cut and 5 mm height', async () => {
    const parameters = { rows: 1, columns: 1 }
    const { shape, template } = await buildGrid(parameters)

    try {
      const [[minX, minY, minZ], [maxX, maxY, maxZ]] = shapeBounds(shape)
      const expected = boundsForModularGridBase(parameters)
      closeTo(maxX - minX, expected.max[0] - expected.min[0])
      closeTo(maxY - minY, expected.max[1] - expected.min[1])
      closeTo(maxZ - minZ, expected.max[2] - expected.min[2])
      closeTo(minX, expected.min[0])
      closeTo(minY, expected.min[1])
      closeTo(minZ, expected.min[2])

      const mesh = meshBRep(shape, {
        tolerance: TOLERANCE,
        angularTolerance: 0.1,
      })
      expect(mesh.triangleCount).toBeGreaterThan(0)
      const faces = shape.faces
      try {
        expect(faces.length).toBeGreaterThan(0)
      } finally {
        deleteShapes(faces)
      }
      expect(shape.constructor.name).toBe('Solid')
      expect(measureVolume(shape)).toBeGreaterThan(0)
      const topFaces = topPlanarFaces(shape)
      const innerWires = topFaces.flatMap((face) => face.innerWires())
      try {
        expect(innerWires).toHaveLength(1)
        const [[holeMinX, holeMinY], [holeMaxX, holeMaxY]] = wireBounds(
          innerWires[0],
        )
        closeToStepGeometry(holeMaxX - holeMinX, 17.5)
        closeToStepGeometry(holeMaxY - holeMinY, 17.5)
        closeToStepGeometry(holeMinX - minX, 1.25)
        closeToStepGeometry(holeMaxX - maxX, -1.25)
        closeToStepGeometry(holeMinY - minY, 1.25)
        closeToStepGeometry(holeMaxY - maxY, -1.25)
      } finally {
        deleteShapes(innerWires)
        deleteShapes(topFaces)
      }

      const edges = shape.edges
      try {
        const outerCornerArcs = edges.filter((edge) =>
          isOuterCornerArc(edge, 20, 20, 0, 2.5),
        )
        outerCornerArcs.push(
          ...edges.filter((edge) => isOuterCornerArc(edge, 20, 20, 5, 2.5)),
        )
        expect(outerCornerArcs).toHaveLength(8)
        expect(
          edges.filter((edge) =>
            hasExternalVerticalCornerEdge(edge, 20, 20, 5),
          ),
        ).toHaveLength(0)
      } finally {
        deleteShapes(edges)
      }
    } finally {
      deleteShape(shape)
      deleteShape(template)
    }
  })

  it('builds a centered 2x2 plate with the derived 40 mm bounds and four cells', async () => {
    const parameters = { rows: 2, columns: 2 }
    const { shape, template } = await buildGrid(parameters)

    try {
      const [[minX, minY, minZ], [maxX, maxY, maxZ]] = shapeBounds(shape)
      const expected = boundsForModularGridBase(parameters)
      closeTo(maxX - minX, expected.max[0] - expected.min[0])
      closeTo(maxY - minY, expected.max[1] - expected.min[1])
      closeTo(maxZ - minZ, expected.max[2] - expected.min[2])
      closeTo((minX + maxX) / 2, 0)
      closeTo((minY + maxY) / 2, 0)
      closeTo(minZ, 0)
      expect(shape.constructor.name).toBe('Solid')
      expect(countTopHoles(shape)).toBe(4)

      const edges = shape.edges
      try {
        expect(
          edges.filter((edge) => isOuterCornerArc(edge, 40, 40, 0, 2.5)),
        ).toHaveLength(4)
        expect(
          edges.filter((edge) => isOuterCornerArc(edge, 40, 40, 5, 2.5)),
        ).toHaveLength(4)
        expect(
          edges.filter((edge) =>
            hasExternalVerticalCornerEdge(edge, 40, 40, 5),
          ),
        ).toHaveLength(0)
      } finally {
        deleteShapes(edges)
      }
    } finally {
      deleteShape(shape)
      deleteShape(template)
    }
  })

  it('preserves the internal junction while rounding only the 1x2 outer corners', async () => {
    const parameters = { rows: 1, columns: 2 }
    const { shape, template } = await buildGrid(parameters)

    try {
      const [[minX, minY, minZ], [maxX, maxY, maxZ]] = shapeBounds(shape)
      const expected = boundsForModularGridBase(parameters)
      closeTo(maxX - minX, expected.max[0] - expected.min[0])
      closeTo(maxY - minY, expected.max[1] - expected.min[1])
      closeTo(maxZ - minZ, expected.max[2] - expected.min[2])
      closeTo((minX + maxX) / 2, 0)
      closeTo((minY + maxY) / 2, 0)
      expect(shape.constructor.name).toBe('Solid')
      expect(countTopHoles(shape)).toBe(2)

      const edges = shape.edges
      try {
        expect(
          edges.filter((edge) => isOuterCornerArc(edge, 40, 20, 0, 2.5)),
        ).toHaveLength(4)
        expect(
          edges.filter((edge) => isOuterCornerArc(edge, 40, 20, 5, 2.5)),
        ).toHaveLength(4)
        expect(
          edges.filter((edge) =>
            hasExternalVerticalCornerEdge(edge, 40, 20, 5),
          ),
        ).toHaveLength(0)
        expect(
          edges.filter((edge) => hasInternalSharpVerticalEdge(edge, 40, 20, 5)),
        ).not.toHaveLength(0)
      } finally {
        deleteShapes(edges)
      }
    } finally {
      deleteShape(shape)
      deleteShape(template)
    }
  })

  it.each([
    { rows: 1, columns: 1 },
    { rows: 2, columns: 2 },
    { rows: 5, columns: 5 },
  ])(
    'exports a structurally valid binary STL for a $rows x $columns plate',
    async (parameters) => {
      const { shape, template } = await buildGrid(parameters)
      try {
        const [[minX, minY, minZ], [maxX, maxY, maxZ]] = shapeBounds(shape)
        const expected = boundsForModularGridBase(parameters)
        closeTo(minX, expected.min[0])
        closeTo(minY, expected.min[1])
        closeTo(minZ, expected.min[2])
        closeTo(maxX, expected.max[0])
        closeTo(maxY, expected.max[1])
        closeTo(maxZ, expected.max[2])
        const exportStartedAt = performance.now()
        const bytes = await exportStlBytes(shape, {
          tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
          angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
        })
        assertBinaryStl(bytes)
        reportStlMeasurement(
          `${parameters.rows}x${parameters.columns}`,
          exportStartedAt,
          bytes,
        )
      } finally {
        deleteShape(shape)
        deleteShape(template)
      }
    },
    180_000,
  )
})

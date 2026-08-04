import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  measureVolume,
  setOC,
  type Edge,
  type Shape3D,
  type Wire,
} from 'replicad'
import {
  buildModularGridBase,
  importModularGridBaseTemplate,
} from '../../src/cad-kernel/components/modular-grid-base/builder'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  boundsForModularGridBase,
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
  '../../src/cad-kernel/components/modular-grid-base/cell-template.step',
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

function topPlanarFaces(shape: Shape3D) {
  return shape.faces.filter((face) => {
    if (face.geomType !== 'PLANE') return false
    const center = face.center
    try {
      return isClose(center.z, 5)
    } finally {
      center.delete()
    }
  })
}

function deleteShape(shape: Shape3D | null): void {
  shape?.delete()
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
    return { shape: buildModularGridBase(parameters, template), template }
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
  it('builds a centered 1x1 plate with a 17 mm through-cut and 5 mm height', async () => {
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
      expect(shape.faces.length).toBeGreaterThan(0)
      expect(shape.constructor.name).toBe('Solid')
      expect(measureVolume(shape)).toBeGreaterThan(0)
      const topFaces = topPlanarFaces(shape)
      const innerWires = topFaces.flatMap((face) => face.innerWires())
      expect(innerWires).toHaveLength(1)
      const [[holeMinX, holeMinY], [holeMaxX, holeMaxY]] = wireBounds(
        innerWires[0],
      )
      closeToStepGeometry(holeMaxX - holeMinX, 17)
      closeToStepGeometry(holeMaxY - holeMinY, 17)
      closeToStepGeometry(holeMinX - minX, 1.5)
      closeToStepGeometry(holeMaxX - maxX, -1.5)
      closeToStepGeometry(holeMinY - minY, 1.5)
      closeToStepGeometry(holeMaxY - maxY, -1.5)

      const edges = shape.edges
      const outerCornerArcs = edges.filter((edge) =>
        isOuterCornerArc(edge, 20, 20, 0, 2.5),
      )
      outerCornerArcs.push(
        ...edges.filter((edge) => isOuterCornerArc(edge, 20, 20, 5, 2.5)),
      )
      expect(outerCornerArcs).toHaveLength(8)
      expect(
        edges.filter((edge) => hasExternalVerticalCornerEdge(edge, 20, 20, 5)),
      ).toHaveLength(0)
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
      const holeCount = topPlanarFaces(shape).reduce(
        (count, face) => count + face.innerWires().length,
        0,
      )
      expect(holeCount).toBe(4)

      const edges = shape.edges
      expect(
        edges.filter((edge) => isOuterCornerArc(edge, 40, 40, 0, 2.5)),
      ).toHaveLength(4)
      expect(
        edges.filter((edge) => isOuterCornerArc(edge, 40, 40, 5, 2.5)),
      ).toHaveLength(4)
      expect(
        edges.filter((edge) => hasExternalVerticalCornerEdge(edge, 40, 40, 5)),
      ).toHaveLength(0)
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
      const holeCount = topPlanarFaces(shape).reduce(
        (count, face) => count + face.innerWires().length,
        0,
      )
      expect(holeCount).toBe(2)

      const edges = shape.edges
      expect(
        edges.filter((edge) => isOuterCornerArc(edge, 40, 20, 0, 2.5)),
      ).toHaveLength(4)
      expect(
        edges.filter((edge) => isOuterCornerArc(edge, 40, 20, 5, 2.5)),
      ).toHaveLength(4)
      expect(
        edges.filter((edge) => hasExternalVerticalCornerEdge(edge, 40, 20, 5)),
      ).toHaveLength(0)
    } finally {
      deleteShape(shape)
      deleteShape(template)
    }
  })
})

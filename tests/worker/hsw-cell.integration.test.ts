import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForHswCell,
  HSW_CELL_CONFIGURATION,
  type HswCellParameters,
} from '../../src/cad-contract/units'
import {
  buildHswCell,
  buildHswCellWithStrategy,
  importHswCellTemplate,
} from '../../src/cad-kernel/components/hsw-cell/builder'
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
  '../../src/cad-kernel/components/hsw-cell/hsw-cell.step',
  import.meta.url,
)

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the primary assertion.
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

function countTopOpenings(shape: Shape3D): number {
  let count = 0
  for (const face of shape.faces) {
    const center = face.center
    const isTop = face.geomType === 'PLANE' && Math.abs(center.z - 8) < 0.01
    center.delete()
    if (!isTop) {
      deleteShape(face)
      continue
    }
    const wires = face.innerWires()
    count += wires.length
    for (const wire of wires) deleteShape(wire)
    deleteShape(face)
  }
  return count
}

function edgeGeometryTypes(shape: Shape3D): string[] {
  const types: string[] = []
  for (const edge of shape.edges) {
    types.push(edge.geomType)
    edge.delete()
  }
  return types
}

async function loadTemplate(): Promise<Shape3D> {
  const bytes = readFileSync(ASSET_PATH)
  return importHswCellTemplate(new Blob([bytes]))
}

let template: Shape3D

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
  template = await loadTemplate()
})

afterAll(() => {
  deleteShape(template)
})

describe('hsw-cell B-Rep integration', () => {
  it('loads the canonical asset as one solid with the expected bounds', () => {
    expect(template.constructor.name).toBe('Solid')
    expect(shapeBounds(template)).toEqual([
      [
        expect.closeTo(-HSW_CELL_CONFIGURATION.outerWidth / 2, 2),
        expect.closeTo(-HSW_CELL_CONFIGURATION.outerDepth / 2, 2),
        expect.closeTo(0, 2),
      ],
      [
        expect.closeTo(HSW_CELL_CONFIGURATION.outerWidth / 2, 2),
        expect.closeTo(HSW_CELL_CONFIGURATION.outerDepth / 2, 2),
        expect.closeTo(HSW_CELL_CONFIGURATION.outerHeight, 2),
      ],
    ])
    expect(countTopOpenings(template)).toBe(1)
  })

  it.each([
    { rows: 1, columns: 1 },
    { rows: 1, columns: 2 },
    { rows: 2, columns: 2 },
    { rows: 2, columns: 3 },
  ])(
    'builds a single solid with the expected envelope for %#',
    async (parameters) => {
      const shape = await buildHswCell(parameters, template)
      try {
        const actual = shapeBounds(shape)
        const expected = boundsForHswCell(parameters)
        expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
        expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
        expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 2)
        expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
        expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
        expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 2)
        expect(shape.constructor.name).toBe('Solid')
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(countTopOpenings(shape)).toBe(
          parameters.rows * parameters.columns,
        )
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )

  it('produces sharp geometry, a mesh, and non-empty STEP/STL exports', async () => {
    const parameters: HswCellParameters = { rows: 2, columns: 2 }
    const shape = await buildHswCell(parameters, template)
    try {
      const mesh = meshBRep(shape, { tolerance: 0.01, angularTolerance: 0.1 })
      expect(mesh.triangleCount).toBeGreaterThan(0)
      expect(countTopOpenings(shape)).toBe(parameters.rows * parameters.columns)
      expect(edgeGeometryTypes(shape).every((type) => type === 'LINE')).toBe(
        true,
      )
      const stepBytes = await exportStepBytes(shape)
      const stlBytes = await exportStlBytes(shape)
      expect(stepBytes.byteLength).toBeGreaterThan(0)
      expect(stlBytes.byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('builds a large HSW grid through the column strategy', async () => {
    const parameters: HswCellParameters = { rows: 10, columns: 10 }
    const progress: Array<{
      completed?: number
      total?: number
      unit?: string
    }> = []
    const shape = await buildHswCellWithStrategy(
      parameters,
      template,
      'column',
      {
        reportProgress: (event) => progress.push(event),
      },
    )
    try {
      const actual = shapeBounds(shape)
      const expected = boundsForHswCell(parameters)
      expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
      expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
      expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
      expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
      expect(shape.constructor.name).toBe('Solid')
      expect(countTopOpenings(shape)).toBe(100)
      expect(progress[0]).toMatchObject({
        completed: 0,
        total: 100,
        unit: 'cells',
      })
      expect(progress.at(-1)).toMatchObject({
        completed: 100,
        total: 100,
        unit: 'cells',
      })
    } finally {
      deleteShape(shape)
    }
  }, 300_000)
})

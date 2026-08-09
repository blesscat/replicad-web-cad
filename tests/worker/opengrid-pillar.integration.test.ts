import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeCylinder, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForPillar,
  PILLAR_CONFIGURATION,
  type PillarParameters,
} from '../../src/cad-contract/units'
import { buildPillar } from '../../src/cad-kernel/components/opengrid-pillar/builder'
import { assertPillarShapeQuality } from '../../src/cad-kernel/components/opengrid-pillar/quality'
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

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
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

function probeVolumeAt(shape: Shape3D, x: number, z: number): number {
  const probe = makeCylinder(0.05, 0.02, [x, 0, z])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    probe.delete()
  }
}

describe('OpenGrid pillar CAD kernel integration', () => {
  it.each([
    { length: 3, baseConnection: false },
    { length: 5, baseConnection: false },
    { length: 500, baseConnection: false },
    { length: 3, baseConnection: true },
    { length: 5, baseConnection: true },
    { length: 500, baseConnection: true },
  ] as PillarParameters[])(
    'builds a valid centered pillar for %#',
    async (parameters) => {
      const shape = await buildPillar(parameters)
      try {
        const actual = shapeBounds(shape)
        const expected = boundsForPillar(parameters)
        expect(actual[0]?.[0]).toBeCloseTo(expected.min[0], 2)
        expect(actual[0]?.[1]).toBeCloseTo(expected.min[1], 2)
        expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 2)
        expect(actual[1]?.[0]).toBeCloseTo(expected.max[0], 2)
        expect(actual[1]?.[1]).toBeCloseTo(expected.max[1], 2)
        expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 2)
        expect(measureVolume(shape)).toBeGreaterThan(0)

        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        expect(mesh.triangleCount).toBeGreaterThan(0)
        expect(
          [...new Float32Array(mesh.positions)].every(Number.isFinite),
        ).toBe(true)
        expect([...new Float32Array(mesh.normals)].every(Number.isFinite)).toBe(
          true,
        )
        expect(
          [...new Uint32Array(mesh.indices)].every(Number.isSafeInteger),
        ).toBe(true)
        const quality = assertPillarShapeQuality(shape, parameters, mesh)
        expect(quality.solidCount).toBe(1)
        expect(quality.passed).toBe(true)
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
    },
    180_000,
  )

  it('keeps both 1 mm chamfers in plain mode', async () => {
    const parameters = { length: 5, baseConnection: false }
    const shape = await buildPillar(parameters)
    try {
      expect(probeVolumeAt(shape, 1.4, 0.1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 1.7, 0.1)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.4, 1.1)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 1.4, 4.9)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 1.7, 4.9)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 2.4, 3.9)).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  })

  it('keeps a sharp Ø7 x 0.8 mm base flange in base-connection mode', async () => {
    const parameters = { length: 5, baseConnection: true }
    const shape = await buildPillar(parameters)
    try {
      expect(probeVolumeAt(shape, 3.4, 0.4)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 3.6, 0.4)).toBeLessThan(1e-8)
      const upperFlangeProbeZ = PILLAR_CONFIGURATION.baseHeight + 0.05
      expect(probeVolumeAt(shape, 2.4, upperFlangeProbeZ)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 2.6, upperFlangeProbeZ)).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, 1.4, 4.9)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, 1.7, 4.9)).toBeLessThan(1e-8)
    } finally {
      deleteShape(shape)
    }
  })
})

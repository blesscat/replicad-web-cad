import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import { OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION } from '../../src/cad-contract/units'
import { makeOpenGridIntegratedSeat } from '../../src/cad-kernel/components/opengrid-locating-assembly/integrated'

const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const wasmPath =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => wasmPath,
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

function surfaceTypesOf(shape: Shape3D): string[] {
  const faces = shape.faces
  try {
    return faces.map((face) => face.surface.surfaceType)
  } finally {
    faces.forEach((face) => face.delete())
  }
}

describe('OpenGrid integrated corner-seat geometry', () => {
  it('builds the shared chamfered seat envelope', () => {
    const seat = makeOpenGridIntegratedSeat([0, 0])

    try {
      const bounds = boundsOf(seat)
      expect(bounds[0]![0]).toBeCloseTo(
        -OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter / 2,
        5,
      )
      expect(bounds[0]![1]).toBeCloseTo(
        -OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatDiameter / 2,
        5,
      )
      expect(bounds[0]![2]).toBeCloseTo(
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ,
        5,
      )
      expect(bounds[1]![2]).toBeCloseTo(0, 6)
      expect(surfaceTypesOf(seat)).toContain('CONE')
      expect(surfaceTypesOf(seat)).not.toContain('TORUS')
    } finally {
      seat.delete()
    }
  })

  it('keeps optional host overlap above the exposed seat length', () => {
    const overlap = 0.02
    const seat = makeOpenGridIntegratedSeat([10, -20], overlap)

    try {
      const bounds = boundsOf(seat)
      expect(bounds[0]![2]).toBeCloseTo(
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.integratedSeatMinZ,
        6,
      )
      expect(bounds[1]![2]).toBeCloseTo(overlap, 6)
    } finally {
      seat.delete()
    }
  })
})

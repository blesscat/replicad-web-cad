import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForOpenGridOpenConnectShelf,
  openGridOpenConnectShelfSlotOriginsFor,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  type OpenGridOpenConnectShelfParameters,
} from '../../src/cad-contract/units'
import { buildOpenGridOpenConnectShelf } from '../../src/cad-kernel/components/opengrid-openconnect-shelf/builder'
import { inspectOpenGridOpenConnectShelfShapeQuality } from '../../src/cad-kernel/components/opengrid-openconnect-shelf/quality'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
  placeOpenGridOpenConnectShelfLockedSlot,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'
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
    // Cleanup must not replace the primary geometry assertion.
  }
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function expectBoundsClose(
  actual: number[][],
  expected: ReturnType<typeof boundsForOpenGridOpenConnectShelf>,
): void {
  for (let boundIndex = 0; boundIndex < 2; boundIndex += 1) {
    const expectedBound = boundIndex === 0 ? expected.min : expected.max
    for (let axis = 0; axis < 3; axis += 1) {
      expect(actual[boundIndex]?.[axis]).toBeCloseTo(expectedBound[axis]!, 2)
    }
  }
}

async function lockedSlotSource(): Promise<Shape3D> {
  return importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
}

function rotateForPrint(shape: Shape3D, angle: number): Shape3D {
  const rotated = shape.rotate(angle, [0, 0, 0], [1, 0, 0])
  if (rotated !== shape) deleteShape(shape)
  return rotated
}

describe('OpenGrid OpenConnect shelf CAD kernel integration', () => {
  it('imports the supplied locked negative as its authored valid solid', async () => {
    const source = await lockedSlotSource()
    try {
      const bounds = boundsOf(source)
      const expected = [
        [-13, -13.2, 0],
        [8.6, 9, 2.7],
      ]
      for (let boundIndex = 0; boundIndex < 2; boundIndex += 1) {
        for (let axis = 0; axis < 3; axis += 1) {
          expect(bounds[boundIndex]?.[axis]).toBeCloseTo(
            expected[boundIndex]![axis]!,
            5,
          )
        }
      }
      expect(measureVolume(source)).toBeCloseTo(1010.6805154, 4)
    } finally {
      source.delete()
    }
  })

  it('builds the default print-oriented one-solid shelf with every slot cut', async () => {
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expectBoundsClose(
        boundsOf(shape),
        boundsForOpenGridOpenConnectShelf(parameters),
      )
      const quality = inspectOpenGridOpenConnectShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
        source,
      )
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        slotCount: parameters.columns,
      })
      expect(quality.slotResidualVolumes).toHaveLength(parameters.columns)
      expect(quality.slotResidualVolumes.every((volume) => volume < 0.01)).toBe(
        true,
      )

      for (const origin of openGridOpenConnectShelfSlotOriginsFor(parameters)) {
        const installedCutter = placeOpenGridOpenConnectShelfLockedSlot(
          source,
          origin,
        )
        const printCutter = rotateForPrint(installedCutter, parameters.angle)
        let intersection: Shape3D | null = null
        try {
          intersection = shape.intersect(printCutter)
          expect(measureVolume(intersection)).toBeLessThan(0.01)
        } finally {
          deleteShape(intersection)
          printCutter.delete()
        }
      }
    } finally {
      shape.delete()
      source.delete()
    }
  }, 180_000)

  it('keeps the sloped build surface on Z=0 at the one-cell angle boundary', async () => {
    const parameters: OpenGridOpenConnectShelfParameters = {
      columns: 1,
      rows: 1,
      angle: 36,
    }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      const bounds = boundsOf(shape)
      expect(bounds[0]?.[2]).toBeCloseTo(0, 3)
      expectBoundsClose(bounds, boundsForOpenGridOpenConnectShelf(parameters))
      expect(
        inspectOpenGridOpenConnectShelfShapeQuality(
          shape,
          parameters,
          meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
          source,
        ).passed,
      ).toBe(true)
    } finally {
      shape.delete()
      source.delete()
    }
  }, 120_000)

  it('rejects a shelf when one expected locked socket is filled back in', async () => {
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    let installedFiller: Shape3D | null = null
    let printFiller: Shape3D | null = null
    let filled: Shape3D | null = null
    try {
      installedFiller = makeBox([-12, -3.1, 11], [12, -0.1, 17])
      printFiller = rotateForPrint(installedFiller, parameters.angle)
      installedFiller = null
      filled = shape.fuse(printFiller)

      const quality = inspectOpenGridOpenConnectShelfShapeQuality(
        filled,
        parameters,
        meshBRep(filled, { tolerance: 0.05, angularTolerance: 0.1 }),
        source,
      )
      expect(quality.validBRep).toBe(true)
      expect(quality.solidCount).toBe(1)
      expect(quality.failures).toContain('locked-slot-1')
      expect(quality.slotCount).toBe(2)
      expect(quality.slotResidualVolumes[1]).toBeGreaterThan(0.01)
    } finally {
      deleteShape(filled)
      deleteShape(printFiller)
      deleteShape(installedFiller)
      shape.delete()
      source.delete()
    }
  }, 180_000)

  it('builds ten native column sockets with valid upper-bound topology and bounds', async () => {
    const parameters: OpenGridOpenConnectShelfParameters = {
      columns: 10,
      rows: 1,
      angle: 36,
    }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      expectBoundsClose(
        boundsOf(shape),
        boundsForOpenGridOpenConnectShelf(parameters),
      )
      const quality = inspectOpenGridOpenConnectShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
        source,
      )
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        slotCount: 10,
      })
      expect(quality.slotResidualVolumes).toHaveLength(10)
      expect(quality.slotResidualVolumes.every((volume) => volume < 0.01)).toBe(
        true,
      )
    } finally {
      shape.delete()
      source.delete()
    }
  }, 240_000)

  it('keeps valid topology and analytic bounds at the ten-row depth limit', async () => {
    const parameters: OpenGridOpenConnectShelfParameters = {
      columns: 1,
      rows: 10,
      angle: 4,
    }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      expectBoundsClose(
        boundsOf(shape),
        boundsForOpenGridOpenConnectShelf(parameters),
      )
      expect(
        inspectOpenGridOpenConnectShelfShapeQuality(
          shape,
          parameters,
          meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
          source,
        ),
      ).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        slotCount: 1,
      })
    } finally {
      shape.delete()
      source.delete()
    }
  }, 240_000)
})

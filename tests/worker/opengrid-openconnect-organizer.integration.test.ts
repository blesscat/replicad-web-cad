import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForOpenGridOpenConnectOrganizer,
  openGridOpenConnectOrganizerTiltAxisFor,
  OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
  type OpenGridOpenConnectOrganizerParameters,
  type OpenGridOpenConnectOrganizerShape,
} from '../../src/cad-contract/units'
import { buildOpenGridOpenConnectOrganizer } from '../../src/cad-kernel/components/opengrid-openconnect-organizer/builder'
import { inspectOpenGridOpenConnectOrganizerShapeQuality } from '../../src/cad-kernel/components/opengrid-openconnect-organizer/quality'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
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

function parameters(
  overrides: Partial<OpenGridOpenConnectOrganizerParameters> = {},
): OpenGridOpenConnectOrganizerParameters {
  return {
    ...OPENGRID_OPENCONNECT_ORGANIZER_DEFAULT_PARAMETERS,
    ...overrides,
  }
}

function deleteShape(shape: { delete: () => void } | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not hide the primary geometry assertion.
  }
}

async function lockedSlotSource(): Promise<Shape3D> {
  return importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
}

async function buildAndInspect(value: OpenGridOpenConnectOrganizerParameters) {
  const slot = await lockedSlotSource()
  const shape = await buildOpenGridOpenConnectOrganizer(value, {
    getLockedSlot: async () => slot,
  })
  const mesh = meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 })
  const quality = await inspectOpenGridOpenConnectOrganizerShapeQuality(
    shape,
    value,
    mesh,
    slot,
  )
  return { shape, slot, mesh, quality }
}

const shapeCases: ReadonlyArray<[OpenGridOpenConnectOrganizerShape, number]> = [
  ['circle', 1],
  ['triangle', 3],
  ['square', 4],
  ['pentagon', 5],
  ['hexagon', 6],
]

describe('OpenGrid OpenConnect organizer CAD kernel integration', () => {
  it.each(shapeCases)(
    'builds one exact %s blind cavity with %i side surface(s)',
    async (holeShape, sideCount) => {
      const value = parameters({
        holeCountX: 1,
        holeCountY: 1,
        holeShape,
        holeDiameter: 14,
        holeDepth: 12,
        bottomThickness: 3,
        tiltAngle: 20,
      })
      const { shape, slot, quality } = await buildAndInspect(value)
      try {
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(quality).toMatchObject({
          passed: true,
          failures: [],
          validBRep: true,
          solidCount: 1,
          cavityCount: 1,
          cavitySideCounts: [sideCount],
          cavityFloorCount: 1,
          bottomThicknessValid: true,
        })
      } finally {
        deleteShape(shape)
        deleteShape(slot)
      }
    },
    180_000,
  )

  it('builds the default direct-mount body with two locked female sockets', async () => {
    const value = parameters()
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        cavityCount: 4,
        slotCount: 2,
        interfacePlaneParallelToWall: true,
        separationSkinCount: 2,
        printUndersideAtZero: true,
      })
      expect(quality.slotResidualVolumes).toHaveLength(2)
      expect(quality.slotResidualVolumes.every((volume) => volume < 0.01)).toBe(
        true,
      )
      const expectedBounds = boundsForOpenGridOpenConnectOrganizer(value)
      for (let axis = 0; axis < 3; axis += 1) {
        expect(quality.bounds.min[axis]).toBeCloseTo(
          expectedBounds.min[axis]!,
          2,
        )
        expect(quality.bounds.max[axis]).toBeCloseTo(
          expectedBounds.max[axis]!,
          2,
        )
      }
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('verifies every socket across multiple quality batches and cancels between them', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDiameter: 14,
      holeDepth: 440,
      bottomThickness: 3,
      tiltAngle: 0,
    })
    const { shape, slot, mesh, quality } = await buildAndInspect(value)
    try {
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        slotCount: 17,
        separationSkinCount: 17,
      })
      expect(quality.slotResidualVolumes).toHaveLength(17)

      const faces = shape.faces
      const faceCount = faces.length
      faces.forEach(deleteShape)
      const firstSlotBatchBoundary = 1 + Math.ceil(faceCount / 16) + 1 + 1
      let yieldCount = 0
      let current = true

      await expect(
        inspectOpenGridOpenConnectOrganizerShapeQuality(
          shape,
          value,
          mesh,
          slot,
          {
            isGenerationCurrent: () => current,
            yieldToEventLoop: async () => {
              yieldCount += 1
              if (yieldCount === firstSlotBatchBoundary) current = false
            },
          },
        ),
      ).rejects.toThrow('STALE_GENERATION')
      expect(yieldCount).toBe(firstSlotBatchBoundary)
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('keeps the wall interface fixed while the cavity openings tilt toward the user', async () => {
    const value = parameters({
      holeCountX: 1,
      holeCountY: 1,
      holeDepth: 30,
      bottomThickness: 4,
      tiltAngle: 30,
    })
    const { shape, slot, quality } = await buildAndInspect(value)
    try {
      const axis = openGridOpenConnectOrganizerTiltAxisFor(value.tiltAngle)
      expect(quality.installedCavityAxis[0]).toBeCloseTo(axis[0], 8)
      expect(quality.installedCavityAxis[1]).toBeCloseTo(axis[1], 8)
      expect(quality.installedCavityAxis[2]).toBeCloseTo(axis[2], 8)
      expect(quality.openingToFloorDelta).toEqual(
        expect.objectContaining({
          y: expect.closeTo(-value.holeDepth * 0.5, 6),
          z: expect.closeTo(value.holeDepth * Math.cos(Math.PI / 6), 6),
        }),
      )
      expect(quality.interfacePlaneParallelToWall).toBe(true)
      expect(quality.passed).toBe(true)
    } finally {
      deleteShape(shape)
      deleteShape(slot)
    }
  }, 180_000)

  it('rejects invalid geometry before loading the shared slot asset', async () => {
    let slotLoads = 0
    await expect(
      buildOpenGridOpenConnectOrganizer(parameters({ holeDepth: 0 }), {
        getLockedSlot: async () => {
          slotLoads += 1
          return lockedSlotSource()
        },
      }),
    ).rejects.toThrow('INVALID_INPUT')
    expect(slotLoads).toBe(0)
  })

  it('stops at a safe boundary when a newer generation supersedes the build', async () => {
    let current = true
    let slotLoads = 0

    await expect(
      buildOpenGridOpenConnectOrganizer(
        parameters({
          holeCountX: 20,
          holeCountY: 20,
          holeDiameter: 1,
          holeSpacingX: 0.5,
          holeSpacingY: 0.5,
          holeDepth: 1,
          bottomThickness: 1,
          tiltAngle: 0,
        }),
        {
          isGenerationCurrent: () => current,
          yieldToEventLoop: async () => {
            current = false
          },
          getLockedSlot: async () => {
            slotLoads += 1
            return lockedSlotSource()
          },
        },
      ),
    ).rejects.toThrow('STALE_GENERATION')
    expect(slotLoads).toBe(0)
  })
})

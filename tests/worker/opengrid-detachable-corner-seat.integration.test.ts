import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  openGridStackableBoxSocketCentersFor,
  openGridStackableCylinderHoleCentersFor,
} from '../../src/cad-contract/units'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import { inspectOpenGridDetachableCornerSeatConsumers } from '../../src/cad-kernel/components/opengrid-locating-assembly/consumer'
import {
  buildOpenGridDetachableCornerSeatHolderFromReference,
  buildOpenGridDetachableCornerSeatSocketVoid,
  importOpenGridDetachableCornerSeatHolderReference,
  importOpenGridDetachableCornerSeatReference,
  inspectOpenGridDetachableCornerSeatCompatibility,
  placeOpenGridDetachableCornerSeatSocketShape,
} from '../../src/cad-kernel/components/opengrid-locating-assembly/reference'
import { countSolids } from '../../src/cad-kernel/components/opengrid-stackable-box/quality-metrics'

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

const MALE_ASSET_URL = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-v13.step',
  import.meta.url,
)
const HOLDER_ASSET_URL = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-holder-11.step',
  import.meta.url,
)

let maleReference: Shape3D
let holderReference: Shape3D

async function assetBlob(url: URL): Promise<Blob> {
  return new Blob([await readFile(url)], { type: 'model/step' })
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not hide the geometry assertion.
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

function expectBoundsClose(actual: number[][], expected: number[][]): void {
  for (const pointIndex of [0, 1]) {
    for (const coordinateIndex of [0, 1, 2]) {
      expect(actual[pointIndex]?.[coordinateIndex]).toBeCloseTo(
        expected[pointIndex]?.[coordinateIndex] ?? Number.NaN,
        5,
      )
    }
  }
}

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
  ;[maleReference, holderReference] = await Promise.all([
    importOpenGridDetachableCornerSeatReference(
      await assetBlob(MALE_ASSET_URL),
    ),
    importOpenGridDetachableCornerSeatHolderReference(
      await assetBlob(HOLDER_ASSET_URL),
    ),
  ])
})

afterAll(() => {
  deleteShape(maleReference)
  deleteShape(holderReference)
})

describe('OpenGrid detachable corner-seat canonical references', () => {
  it('builds locking sockets for the Stackable Box and Cylinder consumers', () => {
    const boxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
      height: 20,
      cornerSeatMode: 'detachable-corner-seat' as const,
      fullBottomHoleGrid: false,
    }
    const cylinderParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 56,
      height: 20,
      bottomSeatMode: 'detachable-corner-seat' as const,
    }
    const box = buildOpenGridStackableBox(boxParameters, {
      detachableCornerSeatReference: maleReference,
      detachableCornerSeatHolderReference: holderReference,
    })
    const cylinder = buildOpenGridStackableCylinder(cylinderParameters, {
      detachableCornerSeatReference: maleReference,
      detachableCornerSeatHolderReference: holderReference,
    })
    try {
      const boxRecords = inspectOpenGridDetachableCornerSeatConsumers(
        box,
        openGridStackableBoxSocketCentersFor(boxParameters),
        {
          detachableCornerSeatReference: maleReference,
          detachableCornerSeatHolderReference: holderReference,
        },
      )
      const cylinderRecords = inspectOpenGridDetachableCornerSeatConsumers(
        cylinder,
        openGridStackableCylinderHoleCentersFor(cylinderParameters),
        {
          detachableCornerSeatReference: maleReference,
          detachableCornerSeatHolderReference: holderReference,
        },
      )

      expect(boxRecords).toHaveLength(4)
      expect(cylinderRecords).toHaveLength(5)
      expect(
        [...boxRecords, ...cylinderRecords].every(
          (record) =>
            record.socketVoidResidualVolume <=
              OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance &&
            record.maleCollisionVolume <=
              OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance &&
            record.roofVolume > 0.001,
        ),
      ).toBe(true)
    } finally {
      deleteShape(box)
      deleteShape(cylinder)
    }
  }, 120_000)

  it('requires both fixed references before a locking consumer can build', () => {
    const boxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
      height: 20,
      cornerSeatMode: 'detachable-corner-seat' as const,
    }
    const cylinderParameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      innerDiameter: 56,
      height: 20,
      bottomSeatMode: 'detachable-corner-seat' as const,
    }

    expect(() => buildOpenGridStackableBox(boxParameters)).toThrow(
      'HOLDER_REFERENCE_MISSING',
    )
    expect(() => buildOpenGridStackableCylinder(cylinderParameters)).toThrow(
      'HOLDER_REFERENCE_MISSING',
    )
    expect(() =>
      buildOpenGridStackableBox(boxParameters, {
        detachableCornerSeatHolderReference: holderReference,
      }),
    ).toThrow('MALE_REFERENCE_MISSING')
    expect(() =>
      buildOpenGridStackableCylinder(cylinderParameters, {
        detachableCornerSeatHolderReference: holderReference,
      }),
    ).toThrow('MALE_REFERENCE_MISSING')
  })

  it('stops before consumer geometry when the generation is stale', () => {
    const boxParameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 1,
      y: 1,
      height: 20,
      cornerSeatMode: 'detachable-corner-seat' as const,
    }

    expect(() =>
      buildOpenGridStackableBox(boxParameters, {
        detachableCornerSeatReference: maleReference,
        detachableCornerSeatHolderReference: holderReference,
        isGenerationCurrent: () => false,
      }),
    ).toThrow('STALE_GENERATION')
  })

  it('imports the fixed male and retaining-tab holder as compatible solids', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const report = inspectOpenGridDetachableCornerSeatCompatibility(
      maleReference,
      holderReference,
    )

    expect(report.male.solidCount).toBe(1)
    expect(report.male.valid).toBe(true)
    expectBoundsClose(report.male.bounds, [
      [...configuration.maleReference.bounds.min],
      [...configuration.maleReference.bounds.max],
    ])
    expect(report.male.volume).toBeCloseTo(
      configuration.maleReference.nominalVolume,
      5,
    )
    expect(report.female.solidCount).toBe(1)
    expect(report.female.valid).toBe(true)
    expectBoundsClose(report.female.bounds, [
      [...configuration.femaleReference.bounds.min],
      [...configuration.femaleReference.bounds.max],
    ])
    expect(report.female.volume).toBeCloseTo(
      configuration.femaleReference.nominalVolume,
      5,
    )
    expect(report.intersectionVolume).toBeLessThanOrEqual(
      configuration.intersectionVolumeTolerance,
    )

    const lockedMale = maleReference.clone().rotate(90, [0, 0, 0], [0, 0, 1])
    const lockedIntersection = lockedMale.intersect(holderReference)
    try {
      expect(measureVolume(lockedIntersection)).toBeLessThanOrEqual(
        configuration.intersectionVolumeTolerance,
      )
    } finally {
      deleteShape(lockedIntersection)
      deleteShape(lockedMale)
    }
  })

  it('uses the supplied Ø11 holder exactly as supplied with no extension', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const holder =
      buildOpenGridDetachableCornerSeatHolderFromReference(holderReference)
    try {
      const bounds = shapeBounds(holder)
      expect(bounds[0]?.[2]).toBeCloseTo(
        configuration.femaleReference.sourceMinZ,
        5,
      )
      expect(bounds[1]?.[2]).toBeCloseTo(
        configuration.femaleReference.sourceMaxZ,
        5,
      )
      expect((bounds[1]?.[2] ?? 0) - (bounds[0]?.[2] ?? 0)).toBeCloseTo(
        configuration.female.depth,
        5,
      )
      expect(countSolids(holder)).toBe(1)
      expect(measureVolume(holder)).toBeCloseTo(
        configuration.female.nominalVolume,
        5,
      )
    } finally {
      deleteShape(holder)
    }
  })

  it('keeps the configured pocket side clearance around the seated leaf head', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const socketVoid =
      buildOpenGridDetachableCornerSeatSocketVoid(holderReference)
    try {
      for (const [z0, z1] of [
        [3.85, 4.0],
        [4.4, 4.6],
        [5.0, 5.15],
      ] as const) {
        const probe = makeBox([-6, -6, z0], [6, 6, z1])
        const voidSlab = socketVoid.intersect(probe)
        const headSlab = maleReference.intersect(probe)
        const voidBounds = shapeBounds(voidSlab)
        const headBounds = shapeBounds(headSlab)
        try {
          // In the locked pose the head length lies along the pocket's
          // widening axis; every band must clear it by the configured margin.
          const pocketHalf =
            ((voidBounds[1]?.[1] ?? 0) - (voidBounds[0]?.[1] ?? 0)) / 2
          const headHalf =
            ((headBounds[1]?.[0] ?? 0) - (headBounds[0]?.[0] ?? 0)) / 2
          expect(pocketHalf - headHalf).toBeGreaterThanOrEqual(
            configuration.female.pocketSideClearance,
          )
        } finally {
          deleteShape(voidSlab)
          deleteShape(headSlab)
          deleteShape(probe)
        }
      }
    } finally {
      deleteShape(socketVoid)
    }
  }, 60_000)

  it('derives and places the bottom-open socket void from the holder material', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const socketVoid =
      buildOpenGridDetachableCornerSeatSocketVoid(holderReference)
    let placed: Shape3D | null = null
    try {
      const sourceBounds = shapeBounds(socketVoid)
      expect(measureVolume(socketVoid)).toBeGreaterThan(0)

      placed = placeOpenGridDetachableCornerSeatSocketShape(socketVoid, {
        center: [12, -8],
        rotationDegrees: 90,
      })
      const placedBounds = shapeBounds(placed)
      expect(placedBounds[0]?.[2]).toBeCloseTo(0, 5)
      expect(placedBounds[1]?.[2]).toBeCloseTo(configuration.female.depth, 5)
      expect(placedBounds[1]?.[2]).toBeCloseTo(1.5, 5)
      expect(
        (placedBounds[0]?.[0] ?? 0) + (placedBounds[1]?.[0] ?? 0),
      ).toBeCloseTo(24, 5)
      expect(
        (placedBounds[0]?.[1] ?? 0) + (placedBounds[1]?.[1] ?? 0),
      ).toBeCloseTo(-16, 5)
      expect(
        (placedBounds[1]?.[0] ?? 0) - (placedBounds[0]?.[0] ?? 0),
      ).toBeCloseTo(
        (sourceBounds[1]?.[1] ?? 0) - (sourceBounds[0]?.[1] ?? 0),
        5,
      )
      expect(
        (placedBounds[1]?.[1] ?? 0) - (placedBounds[0]?.[1] ?? 0),
      ).toBeCloseTo(
        (sourceBounds[1]?.[0] ?? 0) - (sourceBounds[0]?.[0] ?? 0),
        5,
      )
    } finally {
      deleteShape(placed)
      deleteShape(socketVoid)
    }
  })
})

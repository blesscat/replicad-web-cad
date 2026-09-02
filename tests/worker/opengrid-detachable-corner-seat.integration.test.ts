import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
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
  buildOpenGridDetachableCornerSeatIndicatorCutter,
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
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-3.8.step',
  import.meta.url,
)
const HOLDER_ASSET_URL = new URL(
  '../../src/cad-kernel/components/opengrid-locating-assembly/assets/detachable-corner-seat-holder.step',
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

function keyedPlanarYCoordinates(shape: Shape3D): number[] {
  const coordinates: number[] = []
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    try {
      const [min, max] = boundingBox.bounds as [
        [number, number, number],
        [number, number, number],
      ]
      const coordinate = (min[1] + max[1]) / 2
      if (
        face.surface.surfaceType === 'PLANE' &&
        Math.abs(max[1] - min[1]) < 1e-6 &&
        Math.abs(coordinate) >= 0.5 &&
        Math.abs(coordinate) <= 1.5
      ) {
        coordinates.push(coordinate)
      }
    } finally {
      boundingBox.delete()
      face.delete()
    }
  }
  return [...new Set(coordinates.map((coordinate) => coordinate.toFixed(6)))]
    .map(Number)
    .sort((first, second) => first - second)
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
            record.indicatorResidualVolume <=
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

  it('builds the printable straight lock-indicator cutter at the requested recess depth', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const cutter = buildOpenGridDetachableCornerSeatIndicatorCutter()
    try {
      expectBoundsClose(shapeBounds(cutter), [
        [
          -configuration.indicator.radialLength / 2,
          -configuration.indicator.width / 2,
          -configuration.indicator.cutterOverlap,
        ],
        [
          configuration.indicator.radialLength / 2,
          configuration.indicator.width / 2,
          configuration.indicator.depth,
        ],
      ])
      expect(measureVolume(cutter)).toBeCloseTo(
        configuration.indicator.nominalRemovedVolume +
          configuration.indicator.width *
            configuration.indicator.radialLength *
            configuration.indicator.cutterOverlap,
        5,
      )
    } finally {
      deleteShape(cutter)
    }
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
  })

  it('extends the retaining-tab holder 0.25 mm inward from the fixed entrance datum', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const extended =
      buildOpenGridDetachableCornerSeatHolderFromReference(holderReference)
    try {
      const bounds = shapeBounds(extended)
      expect(bounds[0]?.[2]).toBeCloseTo(3, 5)
      expect(bounds[1]?.[2]).toBeCloseTo(4.75, 5)
      expect((bounds[1]?.[2] ?? 0) - (bounds[0]?.[2] ?? 0)).toBeCloseTo(1.75, 5)
      expect(countSolids(extended)).toBe(1)
      expect(measureVolume(extended)).toBeCloseTo(
        configuration.female.nominalVolume,
        5,
      )
    } finally {
      deleteShape(extended)
    }
  })

  it('measures the configured key clearance on each side from the STEP solids', () => {
    const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
    const maleSides = keyedPlanarYCoordinates(maleReference)
    const femaleSides = keyedPlanarYCoordinates(holderReference)
    const maleKeyWidth = (maleSides.at(-1) ?? 0) - (maleSides[0] ?? 0)
    const femalePassageWidth = (femaleSides.at(-1) ?? 0) - (femaleSides[0] ?? 0)

    expect(maleSides).toEqual([
      -configuration.male.keyWidth / 2,
      configuration.male.keyWidth / 2,
    ])
    expect(femaleSides).toEqual([
      -configuration.female.passageWidth / 2,
      configuration.female.passageWidth / 2,
    ])
    expect(maleKeyWidth).toBeCloseTo(configuration.male.keyWidth, 5)
    expect(femalePassageWidth).toBeCloseTo(configuration.female.passageWidth, 5)
    expect((femalePassageWidth - maleKeyWidth) / 2).toBeCloseTo(
      configuration.female.keySideClearance,
      5,
    )
  })

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
      expect(placedBounds[1]?.[2]).toBeCloseTo(1.75, 5)
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

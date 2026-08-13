import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  getOC,
  makeBox,
  makeCylinder,
  measureDistanceBetween,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  buildOpenGridStackableBox,
  importOpenGridSnapHoldReference,
  assertOpenGridSnapHoldCompatibility,
  inspectOpenGridStackableBoxInterface,
  inspectOpenGridStackableBoxOpenings,
  inspectOpenGridStackableBoxThinShell,
  inspectOpenGridSnapHoldCompatibility,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  buildModelBRep,
  type KernelBuildContext,
} from '../../src/cad-kernel/model'
import {
  boundsForOpenGridStackableBox,
  externalOpenGridStackableBoxHeightFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  type OpenGridStackableBoxParameters,
  validateOpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'
import { createBooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import { bottomStackingProfileTopZ } from '../../src/cad-kernel/components/opengrid-stackable-box/geometry'
import { measureMountingHoleProfiles } from '../../src/cad-kernel/components/opengrid-stackable-box/quality-holes'
import {
  readFaceQualityRecords,
  volumeInBox,
} from '../../src/cad-kernel/components/opengrid-stackable-box/quality-metrics'

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
const SNAP_REFERENCE_PATH = new URL(
  '../../src/cad-kernel/components/opengrid-snap/assets/opengrid-bare-lite-snap.step',
  import.meta.url,
)

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function parameters(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return {
    ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
    x: overrides.x ?? 2,
    y: overrides.y ?? 2,
    height: overrides.height ?? 10,
    cornerSeatMode: overrides.cornerSeatMode ?? 'hole',
    fullBottomHoleGrid: overrides.fullBottomHoleGrid ?? false,
    basePlateMode: overrides.basePlateMode ?? false,
    ...overrides,
  }
}

function captureProbeStackZ(height: number): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    height +
    configuration.bottomAssemblyHeight +
    configuration.topRailInnerChamfer +
    configuration.topRailInnerVerticalHeight
  )
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function cylindricalFaceCount(shape: Shape3D): number {
  let count = 0
  for (const face of shape.faces) {
    try {
      if (face.surface.surfaceType === 'CYLINDRE') count += 1
    } finally {
      face.delete()
    }
  }
  return count
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep cleanup failures from hiding the geometry assertion.
  }
}

describe('OpenGrid stackable-box B-Rep', () => {
  it('reports remaining counts for deterministic fuse and cut scopes', () => {
    const progress: Array<{
      kind: string
      state: string
      completed?: number
      total?: number
    }> = []
    const reporter = createBooleanOperationReporter((update) =>
      progress.push(update),
    )
    const input = parameters({ x: 2, y: 2, fullBottomHoleGrid: true })
    const shape = buildOpenGridStackableBox(input, {
      booleanOperations: reporter,
    })

    try {
      const completed = progress.filter(
        (update) => update.state === 'completed',
      )
      expect(completed.length).toBeGreaterThan(0)
      expect(completed.every((update) => update.total !== undefined)).toBe(true)
      expect(
        completed.some(
          (update) => update.kind === 'fuse' && update.total !== undefined,
        ),
      ).toBe(true)
      expect(
        completed.some(
          (update) => update.kind === 'cut' && update.total !== undefined,
        ),
      ).toBe(true)
    } finally {
      deleteShape(shape)
    }
  })

  it.each([
    { x: 1, y: 1 },
    { x: 1, y: 4 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0.5 },
  ])(
    'builds a valid $x×$y centered box',
    ({ x, y }) => {
      const input = parameters({ x, y })
      const shape = buildOpenGridStackableBox(input)
      try {
        const actual = boundsOf(shape)
        const expected = boundsForOpenGridStackableBox(input)
        expect(actual[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.min[0], 3),
            expect.closeTo(expected.min[1], 3),
            expect.closeTo(expected.min[2], 3),
          ]),
        )
        expect(actual[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.max[0], 3),
            expect.closeTo(expected.max[1], 3),
            expect.closeTo(expected.max[2], 3),
          ]),
        )
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(cylindricalFaceCount(shape)).toBeGreaterThanOrEqual(
          openGridStackableBoxSocketCentersFor(input).length,
        )
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('builds through kernel dispatch without a Snap reference loader', async () => {
    const input = parameters({ x: 1, y: 1 })
    let snapReferenceLoadAttempts = 0
    const context: KernelBuildContext = {
      getModularGridBaseTemplate: async () => {
        throw new Error('UNEXPECTED_MODULAR_GRID_TEMPLATE_LOAD')
      },
      getHswCellTemplate: async () => {
        throw new Error('UNEXPECTED_HSW_TEMPLATE_LOAD')
      },
      getOpenGridSnapReference: async () => {
        snapReferenceLoadAttempts += 1
        throw new Error('SNAP_REFERENCE_MUST_NOT_BE_LOADED')
      },
    }
    const shape = await buildModelBRep('opengrid-stackable-box', input, context)
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expect(cylindricalFaceCount(shape)).toBeGreaterThanOrEqual(
        openGridStackableBoxSocketCentersFor(input).length,
      )
      expect(snapReferenceLoadAttempts).toBe(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { x: 1, y: 1 },
    { x: 1, y: 4 },
    { x: 2, y: 2 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0.5 },
  ])(
    'builds the nominal full-hole grid for $x×$y without replacing corner sockets',
    ({ x, y }) => {
      const input = parameters({ x, y, fullBottomHoleGrid: true })
      const shape = buildOpenGridStackableBox(input)
      try {
        const report = inspectOpenGridStackableBoxInterface(shape, input)
        const ordinaryCenters =
          openGridStackableBoxOrdinaryBottomHoleCentersFor(input)

        expect(report.expectedOrdinaryBottomHoleCount).toBe(
          ordinaryCenters.length,
        )
        expect(report.ordinaryBottomHoleCount).toBe(ordinaryCenters.length)
        expect(report.captiveSocketRecords).toHaveLength(
          openGridStackableBoxSocketCentersFor(input).length,
        )
        const actualBounds = boundsOf(shape)
        const expectedBounds = boundsForOpenGridStackableBox(input)
        expect(actualBounds[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expectedBounds.min[0], 3),
            expect.closeTo(expectedBounds.min[1], 3),
            expect.closeTo(expectedBounds.min[2], 3),
          ]),
        )
        expect(actualBounds[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expectedBounds.max[0], 3),
            expect.closeTo(expectedBounds.max[1], 3),
            expect.closeTo(expectedBounds.max[2], 3),
          ]),
        )
        expect(measureVolume(shape)).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps ordinary full-grid holes straight at the assembly opening', () => {
    const input = parameters({ x: 2, y: 2, fullBottomHoleGrid: true })
    const shape = buildOpenGridStackableBox(input)
    const ordinaryCenters =
      openGridStackableBoxOrdinaryBottomHoleCentersFor(input)
    try {
      const records = readFaceQualityRecords(shape)
      for (const [centerX, centerY] of ordinaryCenters) {
        const centeredRecords = records.filter((record) => {
          if (record.surfaceType !== 'CYLINDRE') return false
          const recordCenterX = (record.min[0] + record.max[0]) / 2
          const recordCenterY = (record.min[1] + record.max[1]) / 2
          return (
            Math.abs(recordCenterX - centerX) < 0.04 &&
            Math.abs(recordCenterY - centerY) < 0.04
          )
        })
        const throughHole = centeredRecords.find(
          (record) => record.min[2] <= 0.03 && record.max[2] >= 4.97,
        )
        expect(throughHole).toBeDefined()
        const throughHoleDiameter = throughHole
          ? Math.max(
              throughHole.max[0] - throughHole.min[0],
              throughHole.max[1] - throughHole.min[1],
            )
          : Number.NaN
        expect(throughHoleDiameter).toBeCloseTo(
          OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridHoleDiameter,
          2,
        )
        expect(
          centeredRecords.some((record) => {
            const diameter = Math.max(
              record.max[0] - record.min[0],
              record.max[1] - record.min[1],
            )
            return (
              Math.abs(
                diameter -
                  OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter,
              ) < 0.02
            )
          }),
        ).toBe(false)
      }
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps the floor quality probe clear of seams and full-hole cutters', () => {
    const input = parameters({
      x: 8,
      y: 1.5,
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxInterface(shape, input)
      expect(report.floorProbeVolumes[0]).toBeGreaterThan(0.01)
      expect(report.floorProbeThicknesses[0]).toBeCloseTo(1.2, 1)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('cuts the lower guide into a printable flat base-plate mode', () => {
    const input = parameters({
      x: 1,
      y: 1,
      height: 20,
      basePlateMode: true,
    })
    const shape = buildOpenGridStackableBox(input)
    const edgeProbe = makeBox([10, -1, 0.01], [11, -0.5, 0.11])
    try {
      const actual = boundsOf(shape)
      const expected = boundsForOpenGridStackableBox(input)
      expect(actual[0]?.[2]).toBeCloseTo(expected.min[2], 3)
      expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 3)
      expect(measureVolume(shape.intersect(edgeProbe))).toBeGreaterThan(0.01)
    } finally {
      edgeProbe.delete()
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 0.5, y: 0.5 },
  ])(
    'builds the non-stackable thin-shell profile at $x×$y',
    ({ x, y }) => {
      const input = parameters({
        x,
        y,
        height: 20,
        thinShellMode: true,
      })
      const shape = buildOpenGridStackableBox(input)
      try {
        const report = inspectOpenGridStackableBoxThinShell(shape, input)
        const expected = boundsForOpenGridStackableBox(input)
        const actual = boundsOf(shape)
        expect(actual[0]?.[2]).toBeCloseTo(0, 3)
        expect(actual[1]?.[2]).toBeCloseTo(expected.max[2], 3)
        expect(report.floorProbeThicknesses[0]).toBeCloseTo(2, 1)
        expect(
          report.sideWallProbeThicknesses.every(
            (thickness) => thickness >= 1.5 && thickness <= 1.7,
          ),
        ).toBe(true)
        expect(report.bottomChamferFaceCount).toBeGreaterThanOrEqual(4)
        expect(report.topChamferFaceCount).toBeGreaterThanOrEqual(4)
        expect(report.innerFloorFilletFaceCount).toBeGreaterThanOrEqual(4)
        expect(report.topRimHorizontalPlanarFaceCount).toBe(0)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('uses the thin-shell two-stage sockets and ordinary through holes', async () => {
    const input = parameters({
      x: 1,
      y: 1,
      height: 20,
      thinShellMode: true,
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    const [center] = openGridStackableBoxSocketCentersFor(input)
    if (!center) throw new Error('MISSING_SOCKET_CENTER')
    try {
      const report = inspectOpenGridStackableBoxThinShell(shape, input)
      const [profile] = report.mountingHoleProfiles
      expect(profile).toMatchObject({
        lowerBoreDiameter: expect.closeTo(
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
          2,
        ),
        lowerBoreDepth: expect.closeTo(1, 1),
        upperBoreDiameter: expect.closeTo(
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
          2,
        ),
        upperBoreDepth: expect.closeTo(1, 1),
      })
      expect(report.ordinaryBottomHoleCount).toBe(
        openGridStackableBoxOrdinaryBottomHoleCentersFor(input).length,
      )
      const [socket] = report.captiveSocketRecords
      expect(socket?.shaftBounds).toEqual([
        expect.arrayContaining([
          expect.any(Number),
          expect.any(Number),
          expect.closeTo(
            -OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftExposure,
            3,
          ),
        ]),
        expect.arrayContaining([
          expect.any(Number),
          expect.any(Number),
          expect.closeTo(
            OPENGRID_STACKABLE_BOX_CONFIGURATION.thinShellFloorThickness +
              OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
            3,
          ),
        ]),
      ])
      expect(socket?.seatedIntersectionVolume).toBeLessThanOrEqual(0.01)
      expect(socket?.loweredIntersectionVolume).toBeGreaterThan(0.001)
      const [step, stl] = await Promise.all([
        exportStepBytes(shape),
        exportStlBytes(shape),
      ])
      expect(step.byteLength).toBeGreaterThan(0)
      expect(stl.byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps all four box-native opening modes on the thin-shell datum', () => {
    const input = parameters({
      x: 2,
      y: 2,
      height: 20,
      thinShellMode: true,
      openingPlusXDepth: 4,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 45,
      openingMinusXDepth: 8,
      openingMinusXBottomLength: 8,
      openingMinusXAngle: 90,
      openingPlusYDepth: 4,
      openingPlusYBottomLength: 8,
      openingPlusYAngle: 45,
      openingMinusYDepth: 8,
      openingMinusYBottomLength: 8,
      openingMinusYAngle: 90,
    })
    const validation = validateOpenGridStackableBoxParameters(input)
    expect(validation.valid).toBe(true)
    const shape = buildOpenGridStackableBox(input)
    try {
      const quality = inspectOpenGridStackableBoxOpenings(shape, input)
      expect(quality).toHaveLength(4)
      expect(quality.every((record) => record.cutProbeVolume <= 0.01)).toBe(
        true,
      )
      expect(quality.every((record) => record.planarSillFaceCount >= 1)).toBe(
        true,
      )
      expect(quality.every((record) => record.planarSideFaceCount >= 2)).toBe(
        true,
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps ordinary thin-shell grid holes when corner sockets are disabled', () => {
    const input = parameters({
      x: 1,
      y: 1,
      thinShellMode: true,
      cornerSeatMode: 'none',
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxThinShell(shape, input)
      expect(report.captiveSocketRecords).toHaveLength(0)
      expect(report.ordinaryBottomHoleCount).toBe(
        openGridStackableBoxOrdinaryBottomHoleCentersFor(input).length,
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('uses a 3 mm base plate with a 2 mm lower bore and 1 mm upper seat', () => {
    const input = parameters({
      x: 1,
      y: 1,
      height: 20,
      basePlateMode: true,
    })
    const shape = buildOpenGridStackableBox(input)
    const [center] = openGridStackableBoxSocketCentersFor(input)
    if (!center) throw new Error('MISSING_SOCKET_CENTER')
    try {
      const [profile] = measureMountingHoleProfiles(shape, [center], {
        lower: [-0.03, 2],
        upper: [2, 3],
      })
      expect(profile).toMatchObject({
        lowerBoreDiameter: expect.closeTo(
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
          2,
        ),
        lowerBoreDepth: expect.closeTo(2, 1),
        upperBoreDiameter: expect.closeTo(
          OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
          2,
        ),
        upperBoreDepth: expect.closeTo(1, 1),
      })
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([{ basePlateMode: false }, { basePlateMode: true }])(
    'builds a rounded +X opening in $basePlateMode mode',
    ({ basePlateMode }) => {
      const input = parameters({
        x: 2,
        y: 2,
        height: 20,
        basePlateMode,
        openingPlusXDepth: 4,
        openingPlusXBottomLength: 8,
        openingPlusXAngle: 45,
      })
      const shape = buildOpenGridStackableBox(input)
      try {
        const [quality] = inspectOpenGridStackableBoxOpenings(shape, input)
        expect(quality).toMatchObject({
          direction: '+X',
          cutProbeVolume: expect.closeTo(0, 2),
          sillProbeVolume: expect.any(Number),
        })
        expect(quality?.planarSillFaceCount).toBeGreaterThanOrEqual(1)
        expect(quality?.planarSideFaceCount).toBeGreaterThanOrEqual(2)
        expect(quality?.cylindricalFaceCount).toBeGreaterThanOrEqual(4)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('opens the notch through the top edge with rounded transitions', () => {
    const input = parameters({
      x: 2,
      y: 2,
      height: 20,
      openingPlusXDepth: 18,
      openingPlusXBottomLength: 20,
      openingPlusXAngle: 90,
    })
    const shape = buildOpenGridStackableBox(input)
    const [sideHalfExtent] = boundsForOpenGridStackableBox(input).max
    const externalHeight = externalOpenGridStackableBoxHeightFor(input)
    const topEdgeProbe = makeBox(
      [sideHalfExtent - 1.15, -6, externalHeight - 1.5],
      [sideHalfExtent + 0.02, 6, externalHeight - 0.1],
    )
    const railProbe = makeBox(
      [
        sideHalfExtent -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailWidth +
          0.08,
        -6,
        externalHeight -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight +
          0.1,
      ],
      [
        sideHalfExtent -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness +
          0.02,
        6,
        externalHeight - 0.1,
      ],
    )
    try {
      const [quality] = inspectOpenGridStackableBoxOpenings(shape, input)
      expect(measureVolume(shape.intersect(topEdgeProbe))).toBeCloseTo(0, 2)
      expect(measureVolume(shape.intersect(railProbe))).toBeCloseTo(0, 2)
      expect(quality?.cylindricalFaceCount).toBeGreaterThanOrEqual(4)
    } finally {
      topEdgeProbe.delete()
      railProbe.delete()
      deleteShape(shape)
    }
  }, 120_000)

  it('removes the complete selected rail for a long -Y opening', () => {
    const input = parameters({
      x: 4.5,
      y: 2,
      height: 63,
      openingMinusYDepth: 18,
      openingMinusYBottomLength: 20,
      openingMinusYAngle: 90,
    })
    const shape = buildOpenGridStackableBox(input)
    const bounds = boundsForOpenGridStackableBox(input)
    const sideHalfExtent = Math.abs(bounds.min[1] ?? 0)
    const externalHeight = externalOpenGridStackableBoxHeightFor(input)
    const railProbe = makeBox(
      [
        -10,
        -sideHalfExtent +
          OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness -
          0.02,
        externalHeight -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight +
          0.1,
      ],
      [
        10,
        -sideHalfExtent +
          OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailWidth -
          0.08,
        externalHeight - 0.1,
      ],
    )
    try {
      expect(measureVolume(shape.intersect(railProbe))).toBeCloseTo(0, 2)
    } finally {
      railProbe.delete()
      deleteShape(shape)
    }
  }, 120_000)

  it('builds four independent rectangular openings without changing the box footprint', () => {
    const input = parameters({
      x: 2,
      y: 2,
      height: 20,
      fullBottomHoleGrid: true,
      openingPlusXDepth: 6,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 90,
      openingMinusXDepth: 4,
      openingMinusXBottomLength: 6,
      openingMinusXAngle: 60,
      openingPlusYDepth: 5,
      openingPlusYBottomLength: 7,
      openingPlusYAngle: 45,
      openingMinusYDepth: 5,
      openingMinusYBottomLength: 9,
      openingMinusYAngle: 75,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const quality = inspectOpenGridStackableBoxOpenings(shape, input)
      expect(quality.map((record) => record.direction)).toEqual([
        '+X',
        '-X',
        '+Y',
        '-Y',
      ])
      expect(quality.every((record) => record.cutProbeVolume <= 0.01)).toBe(
        true,
      )
      expect(boundsOf(shape)).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.closeTo(-27.925, 3),
            expect.closeTo(-27.925, 3),
            expect.closeTo(0, 3),
          ]),
          expect.arrayContaining([
            expect.closeTo(27.925, 3),
            expect.closeTo(27.925, 3),
            expect.closeTo(32.55, 3),
          ]),
        ]),
      )
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps a zero-depth opposite wall solid when one side is open', () => {
    const input = parameters({
      x: 2,
      y: 2,
      height: 20,
      openingPlusXDepth: 4,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 45,
    })
    const shape = buildOpenGridStackableBox(input)
    const bounds = boundsForOpenGridStackableBox(input)
    try {
      const oppositeWallVolume = volumeInBox(
        shape,
        [bounds.min[0] - 0.02, -0.25, 21.05],
        [bounds.min[0] + 1.15, 0.25, 24.95],
      )
      expect(oppositeWallVolume).toBeGreaterThan(0.1)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('keeps a side opening valid on a half-cell footprint', () => {
    const input = parameters({
      x: 0.5,
      y: 1.5,
      height: 20,
      openingPlusXDepth: 2,
      openingPlusXBottomLength: 1,
      openingPlusXAngle: 90,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const [quality] = inspectOpenGridStackableBoxOpenings(shape, input)
      expect(quality).toMatchObject({
        direction: '+X',
        cutProbeVolume: expect.closeTo(0, 2),
      })
      expect(
        quality?.cornerBridgeVolumes.every((volume) => volume > 0.001),
      ).toBe(true)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it.each([
    { cornerSeatMode: 'none' as const, fullBottomHoleGrid: false },
    { cornerSeatMode: 'none' as const, fullBottomHoleGrid: true },
  ])(
    'builds no-seat mode with fullBottomHoleGrid=$fullBottomHoleGrid',
    (holeMode) => {
      const input = parameters({ x: 1, y: 1, ...holeMode })
      const shape = buildOpenGridStackableBox(input)
      try {
        const report = inspectOpenGridStackableBoxInterface(shape, input)
        const ordinaryCenters =
          openGridStackableBoxOrdinaryBottomHoleCentersFor(input)

        expect(report.captiveSocketRecords).toHaveLength(0)
        expect(report.ordinaryBottomHoleCount).toBe(ordinaryCenters.length)
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps a thick supported shell with an integrated self-mating guide', () => {
    const input = parameters({ x: 1, y: 4 })
    const shape = buildOpenGridStackableBox(input)
    try {
      const interfaceQuality = inspectOpenGridStackableBoxInterface(
        shape,
        input,
      )
      expect(interfaceQuality.floorProbeVolumes[0]).toBeGreaterThan(0.5)
      expect(interfaceQuality.floorProbeThicknesses[0]).toBeCloseTo(1.2, 1)
      expect(interfaceQuality.measuredExternalHeight).toBeCloseTo(22.55, 2)
      expect(
        interfaceQuality.sideWallProbeThicknesses.every(
          (thickness) => thickness >= 1.1 && thickness <= 1.3,
        ),
      ).toBe(true)
      expect(interfaceQuality.externalHeight).toBeCloseTo(
        externalOpenGridStackableBoxHeightFor(input),
        2,
      )
      expect(interfaceQuality.upperInnerRimZ).toBeCloseTo(15, 2)
      expect(interfaceQuality.bottomAssemblyHeight).toBeCloseTo(5, 2)
      expect(interfaceQuality.topRailProfileHeight).toBeCloseTo(7.55, 2)
      expect(interfaceQuality.bottomGuideProfileHeight).toBeCloseTo(4.75, 2)
      expect(
        Object.values(interfaceQuality.topRailProfileSegmentFaceCounts).every(
          (faceCount) => faceCount > 0,
        ),
      ).toBe(true)
      expect(
        Object.values(
          interfaceQuality.bottomGuideProfileSegmentFaceCounts,
        ).every((faceCount) => faceCount > 0),
      ).toBe(true)
      expect(interfaceQuality.topGuideLeadInFaceCount).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailCornerContinuationFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailInnerCornerRadiusFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailOuterCornerRadiusFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.bottomGuideLeadInFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailProbeVolumes.every((volume) => volume > 0.001),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGridSeamSlopeFaceCount,
      ).toBeGreaterThanOrEqual(interfaceQuality.bottomGridSeamCount * 2)
      expect(
        interfaceQuality.bottomGridSeamSlopeFaceCounts.every(
          (faceCount) => faceCount >= 2,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGridSeamApexFaceCounts.every(
          (faceCount) => faceCount >= 2,
        ),
      ).toBe(true)
      expect(interfaceQuality.bottomGridSeamCount).toBe(3)
      expect(interfaceQuality.bottomGridSeams).toEqual([
        { axis: 'y', position: expect.closeTo(-27.925, 3) },
        { axis: 'y', position: expect.closeTo(0.075, 3) },
        { axis: 'y', position: expect.closeTo(28.075, 3) },
      ])
      expect(
        interfaceQuality.bottomGridSeamClearanceVolumes.every(
          (volume) => volume <= 0.05,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGridSeamSupportVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGridSeamSupportThicknesses.every(
          (thickness) => thickness >= 3,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bearingLandVolumes.every((volume) => volume > 0.001),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGuideProtrusionVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomFootChamferVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomSupportBandVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomSupportVolumes.every((volume) => volume > 0.25),
      ).toBe(true)
      expect(
        interfaceQuality.bottomPerimeterResidualVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomSupportFloorThicknesses.every(
          (thickness) => thickness >= 1.1 && thickness <= 1.3,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomTransitionSupportThicknesses.every(
          (thickness) => thickness >= 1.1,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.mountingHoleStepVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.mountingHoleProfiles.every((profile) => {
          expect(profile.lowerBoreDiameter).toBeCloseTo(
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter,
            2,
          )
          expect(profile.lowerBoreDepth).toBeCloseTo(3, 1)
          expect(profile.upperBoreDiameter).toBeCloseTo(
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter,
            2,
          )
          expect(profile.upperBoreDepth).toBeCloseTo(2, 1)
          return true
        }),
      ).toBe(true)
      expect(interfaceQuality.captiveSocketRecords).toHaveLength(4)
      expect(interfaceQuality.bottomGridSeamClosureFaceCount).toBe(0)
      expect(
        interfaceQuality.bottomGridSeamFloorVolumes.every(
          (volume) => volume > 0.001,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.captiveSocketRecords.every(
          (record) => record.bottomOpeningBoundaryVolume > 0.001,
        ),
      ).toBe(true)
      const topProbe = makeCylinder(14, 0.2, [0, 0, 22.2])
      const bottomProbe = makeCylinder(14, 0.2, [0, 0, 0.1])
      try {
        expect(measureVolume(shape.intersect(topProbe))).toBeGreaterThan(0)
        expect(measureVolume(shape.intersect(bottomProbe))).toBeGreaterThan(0)
      } finally {
        topProbe.delete()
        bottomProbe.delete()
      }
      expect(shape.faces.length).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('places supported printable relief at every internal 28 mm grid seam', () => {
    const cases = [
      { x: 1, y: 1, seams: [] },
      {
        x: 1.5,
        y: 1.5,
        seams: [
          { axis: 'x', position: 7.075 },
          { axis: 'y', position: 7.075 },
        ],
      },
      {
        x: 2,
        y: 2,
        seams: [
          { axis: 'x', position: 0.075 },
          { axis: 'y', position: 0.075 },
        ],
      },
      { x: 0.5, y: 1, seams: [] },
    ] as const

    for (const testCase of cases) {
      const input = parameters({ x: testCase.x, y: testCase.y })
      const shape = buildOpenGridStackableBox(input)
      try {
        const report = inspectOpenGridStackableBoxInterface(shape, input)
        expect(report.bottomGridSeamCount).toBe(testCase.seams.length)
        expect(report.bottomGridSeams).toEqual(
          testCase.seams.map((seam) => ({
            ...seam,
            position: expect.closeTo(seam.position, 3),
          })),
        )
      } finally {
        deleteShape(shape)
      }
    }
  }, 120_000)

  it('keeps the 2×2 grid-seam relief open beneath the supported floor', () => {
    const input = parameters({ x: 2, y: 2 })
    const shape = buildOpenGridStackableBox(input)
    const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
    const transitionProbeBottom =
      configuration.bottomFootChamferHeight +
      configuration.bottomSupportBandHeight +
      0.1
    const verticalSeamProbe = makeBox(
      [-0.25, -10, 0.2],
      [0.25, 10, configuration.bottomFootChamferHeight],
    )
    const horizontalSeamProbe = makeBox(
      [-10, -0.25, 0.2],
      [10, 0.25, configuration.bottomFootChamferHeight],
    )
    const verticalSlopeProbe = makeBox(
      [1.9, -10, transitionProbeBottom],
      [2.1, 10, transitionProbeBottom + 0.5],
    )
    const horizontalSlopeProbe = makeBox(
      [-10, 1.9, transitionProbeBottom],
      [10, 2.1, transitionProbeBottom + 0.5],
    )
    const verticalFloorProbe = makeBox(
      [-0.25, -10, bottomStackingProfileTopZ() + 0.05],
      [0.25, 10, configuration.bottomAssemblyHeight - 0.05],
    )
    const horizontalFloorProbe = makeBox(
      [-10, -0.25, bottomStackingProfileTopZ() + 0.05],
      [10, 0.25, configuration.bottomAssemblyHeight - 0.05],
    )
    try {
      expect(measureVolume(shape.intersect(verticalSeamProbe))).toBeLessThan(
        0.01,
      )
      expect(measureVolume(shape.intersect(horizontalSeamProbe))).toBeLessThan(
        0.01,
      )
      expect(
        measureVolume(shape.intersect(verticalSlopeProbe)),
      ).toBeGreaterThan(0.01)
      expect(
        measureVolume(shape.intersect(horizontalSlopeProbe)),
      ).toBeGreaterThan(0.01)
      expect(
        measureVolume(shape.intersect(verticalFloorProbe)),
      ).toBeGreaterThan(0.01)
      expect(
        measureVolume(shape.intersect(horizontalFloorProbe)),
      ).toBeGreaterThan(0.01)
    } finally {
      verticalSeamProbe.delete()
      horizontalSeamProbe.delete()
      verticalSlopeProbe.delete()
      horizontalSlopeProbe.delete()
      verticalFloorProbe.delete()
      horizontalFloorProbe.delete()
      deleteShape(shape)
    }
  }, 120_000)

  it('enforces the fixed 0.25 mm stacking clearance datum', () => {
    const input = parameters({ x: 1, y: 4 })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxInterface(shape, input)
      expect(report.stackingClearanceNominalIntersectionVolume).toBeLessThan(
        0.01,
      )
      expect(
        report.stackingClearanceBelowNominalIntersectionVolume,
      ).toBeGreaterThan(0.01)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('allows a 1×1 upper box to slide along a 1×4 lower box', () => {
    const lower = buildOpenGridStackableBox(parameters({ x: 1, y: 4 }))
    const upper = buildOpenGridStackableBox(parameters({ x: 1, y: 1 }))
    try {
      const seatedZ =
        captureProbeStackZ(10) +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance
      const clearanceZ =
        seatedZ +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomSupportBandHeight
      const lowered = upper.clone().translate(0, 0, seatedZ)
      try {
        expect(measureVolume(lower.intersect(lowered))).toBeLessThan(0.01)
        expect(measureDistanceBetween(lower, lowered)).toBeLessThan(0.15)
      } finally {
        deleteShape(lowered)
      }

      const clearancePositioned = upper
        .clone()
        .translate(
          OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance,
          0,
          clearanceZ,
        )
      try {
        expect(
          measureVolume(lower.intersect(clearancePositioned)),
        ).toBeLessThan(0.01)
      } finally {
        deleteShape(clearancePositioned)
      }

      const loweredBeyondClearance = upper
        .clone()
        .translate(
          OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance + 0.75,
          0,
          captureProbeStackZ(10) - 0.05,
        )
      try {
        expect(
          measureVolume(lower.intersect(loweredBeyondClearance)),
        ).toBeGreaterThan(0.01)
      } finally {
        deleteShape(loweredBeyondClearance)
      }

      for (const offset of [-28, -21, -14, -7, 0, 7, 14, 21, 28]) {
        const positioned = upper.clone().translate(0, offset, seatedZ)
        try {
          expect(measureVolume(lower.intersect(positioned))).toBeLessThan(0.01)
        } finally {
          deleteShape(positioned)
        }
      }
    } finally {
      deleteShape(lower)
      deleteShape(upper)
    }
  }, 120_000)

  it('lets a 2×2 upper box bridge two adjacent 1×2 lower boxes', () => {
    const left = buildOpenGridStackableBox(parameters({ x: 1, y: 2 }))
    const right = buildOpenGridStackableBox(parameters({ x: 1, y: 2 }))
    const upper = buildOpenGridStackableBox(parameters({ x: 2, y: 2 }))
    const leftPositioned = left.translate(-14, 0, 0)
    const rightPositioned = right.translate(14, 0, 0)
    const lowerPair = leftPositioned.fuse(rightPositioned)
    deleteShape(leftPositioned)
    deleteShape(rightPositioned)
    try {
      const positionedUpper = upper
        .clone()
        .translate(
          0,
          0,
          captureProbeStackZ(10) +
            OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance +
            OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn +
            OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomSupportBandHeight,
        )
      try {
        expect(
          measureVolume(lowerPair.intersect(positionedUpper)),
        ).toBeLessThan(0.01)
      } finally {
        deleteShape(positionedUpper)
      }
      const loweredUpper = upper
        .clone()
        .translate(0, 0, captureProbeStackZ(10) - 0.05)
      try {
        expect(
          measureVolume(lowerPair.intersect(loweredUpper)),
        ).toBeGreaterThan(0.01)
      } finally {
        deleteShape(loweredUpper)
      }
    } finally {
      deleteShape(lowerPair)
      deleteShape(upper)
    }
  }, 120_000)

  it.each([{ basePlateMode: false }, { basePlateMode: true }])(
    'retains a Ø5 shaft with a Ø7 flange in $basePlateMode mode',
    ({ basePlateMode }) => {
      const input = parameters({ x: 1, y: 1, basePlateMode })
      const box = buildOpenGridStackableBox(input)
      const [center] = openGridStackableBoxSocketCentersFor(input)
      if (!center) throw new Error('MISSING_SOCKET_CENTER')
      const floorThickness = openGridStackableBoxActiveFloorTopZFor(input)
      const shaft = makeCylinder(
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftDiameter / 2,
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftLengthForFloor(
          floorThickness,
        ),
        [
          center[0],
          center[1],
          -OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftExposure,
        ],
      )
      const flange = makeCylinder(
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeDiameter / 2,
        OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
        [center[0], center[1], floorThickness],
      )
      const insert = shaft.fuse(flange)
      try {
        const insertBounds = boundsOf(insert)
        expect(insertBounds[0]?.[2]).toBeCloseTo(
          -OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testShaftExposure,
          2,
        )
        expect(insertBounds[1]?.[2]).toBeCloseTo(
          floorThickness +
            OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.testFlangeHeight,
          2,
        )
        const seated = box.intersect(insert)
        try {
          expect(measureVolume(seated)).toBeLessThan(0.01)
        } finally {
          deleteShape(seated)
        }
        const retentionProbeOffset = Math.max(
          0.2,
          floorThickness -
            (basePlateMode
              ? OPENGRID_STACKABLE_BOX_CONFIGURATION.basePlateHoleBottomDepth
              : OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleStepHeight) +
            0.2,
        )
        const loweredInsert = insert.clone().translateZ(-retentionProbeOffset)
        try {
          expect(measureVolume(box.intersect(loweredInsert))).toBeGreaterThan(0)
        } finally {
          deleteShape(loweredInsert)
        }
      } finally {
        deleteShape(shaft)
        deleteShape(flange)
        deleteShape(box)
        deleteShape(insert)
      }
    },
    120_000,
  )

  it('exports successful full-cell geometry as STEP and STL', async () => {
    const shape = buildOpenGridStackableBox(
      parameters({ fullBottomHoleGrid: true }),
    )
    try {
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      expect(mesh.triangleCount).toBeGreaterThan(0)
      const [step, stl] = await Promise.all([
        exportStepBytes(shape),
        exportStlBytes(shape, { tolerance: 0.01, angularTolerance: 0.1 }),
      ])
      expect(step.byteLength).toBeGreaterThan(0)
      expect(stl.byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('loads and validates the supplied Snap reference without using it as a body', async () => {
    const reference = await importOpenGridSnapHoldReference(
      new Blob([readFileSync(SNAP_REFERENCE_PATH)]),
    )
    try {
      expect(boundsOf(reference)[1]?.[0]).toBeGreaterThan(0)
      expect(cylindricalFaceCount(reference)).toBeGreaterThanOrEqual(4)
      const report = inspectOpenGridSnapHoldCompatibility(reference)
      expect(report.nominalInterfaces).toHaveLength(4)
      expect(report.minimumAxialSpan).toBeGreaterThanOrEqual(3)
      expect(report.nominalInterfaces.map((item) => item.diameter)).toEqual(
        expect.arrayContaining([
          expect.closeTo(
            OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter,
            5,
          ),
        ]),
      )
      expect(report.maximumCenterError).toBeLessThan(0.25)
      expect(() => assertOpenGridSnapHoldCompatibility(reference)).not.toThrow()
      const incompatible = makeBox([-1, -1, 0], [1, 1, 1])
      try {
        expect(() => assertOpenGridSnapHoldCompatibility(incompatible)).toThrow(
          'OPENGRID_SNAP_HOLD_INTERFACE_DIAMETER_MISMATCH',
        )
      } finally {
        incompatible.delete()
      }
      const shortReference = makeCylinder(2.5, 1, [0, 0, 0])
      try {
        expect(() =>
          assertOpenGridSnapHoldCompatibility(shortReference, {
            ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
            x: 0.5,
            y: 0.5,
            height: 10,
            cornerSeatMode: 'hole',
            fullBottomHoleGrid: false,
            basePlateMode: false,
          }),
        ).toThrow('OPENGRID_SNAP_HOLD_INSERTION_ENVELOPE_MISMATCH')
      } finally {
        shortReference.delete()
      }
    } finally {
      deleteShape(reference)
    }
  }, 120_000)

  it('deduplicates half-cell socket positions without changing the footprint', () => {
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 0.5 })),
    ).toEqual([[0, 0]])
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 1 })),
    ).toHaveLength(2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter).toBe(5)
  })

  it('fuses integrated seats through the normal bottom and preserves ordinary grid holes', () => {
    const input = parameters({
      x: 1,
      y: 1,
      cornerSeatMode: 'integrated',
      fullBottomHoleGrid: true,
    })
    const shape = buildOpenGridStackableBox(input)
    try {
      const report = inspectOpenGridStackableBoxInterface(shape, input)
      const ordinaryCenters =
        openGridStackableBoxOrdinaryBottomHoleCentersFor(input)
      expect(report.cornerSeatMode).toBe('integrated')
      expect(report.integratedSeatRecordCount).toBe(
        openGridStackableBoxSocketCentersFor(input).length,
      )
      expect(report.captiveSocketRecords).toHaveLength(0)
      expect(report.ordinaryBottomHoleCount).toBe(ordinaryCenters.length)
      expect(boundsOf(shape)[0]?.[2]).toBeCloseTo(-3, 2)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)
})

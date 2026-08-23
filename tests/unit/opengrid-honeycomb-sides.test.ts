import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxDerivedGeometryFor,
  openGridStackableCylinderDerivedGeometryFor,
  OPENGRID_HONEYCOMB_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  makeOpenGridStackableBoxSideHoneycombCutters,
  makeOpenGridStackableCylinderSideHoneycombCutters,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import { buildOpenGridStackableCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'

type Bounds = [[number, number, number], [number, number, number]]

const createdShapes: Shape3D[] = []

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

function remember<T extends Shape3D>(shape: T): T {
  createdShapes.push(shape)
  return shape
}

function boundsOf(shape: Shape3D): Bounds {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as Bounds
  } finally {
    bounds.delete()
  }
}

function span(bounds: Bounds, axis: 0 | 1 | 2): number {
  return bounds[1][axis] - bounds[0][axis]
}

function positiveXBoxSideCutters(
  cutters: readonly Shape3D[],
  width: number,
): Array<{ cutter: Shape3D; bounds: Bounds }> {
  const minimumNormal =
    width / 2 - OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness - 0.2
  return cutters
    .map((cutter) => ({ cutter, bounds: boundsOf(cutter) }))
    .filter(({ bounds }) => bounds[0][0] >= minimumNormal)
}

function angleForBounds(bounds: Bounds): number {
  const centerX = (bounds[0][0] + bounds[1][0]) / 2
  const centerY = (bounds[0][1] + bounds[1][1]) / 2
  return Math.atan2(centerY, centerX)
}

function angularDistanceFromPositiveX(angle: number): number {
  return Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)))
}

afterEach(() => {
  for (const shape of createdShapes.splice(0)) shape.delete()
})

describe('OpenGrid clipped container-side Hex Mesh', () => {
  it('fills every protected box side edge with clipped partial cells', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 2,
      height: 30,
      honeycombMode: true,
    }
    const cutters = makeOpenGridStackableBoxSideHoneycombCutters(parameters)
    cutters.forEach(remember)

    const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
    const derived = openGridStackableBoxDerivedGeometryFor(parameters)
    const positiveX = positiveXBoxSideCutters(cutters, width)
    const bounds = positiveX.map((entry) => entry.bounds)
    const minimumTangent =
      -depth / 2 + OPENGRID_HONEYCOMB_CONFIGURATION.sideFrame
    const maximumTangent =
      depth / 2 - OPENGRID_HONEYCOMB_CONFIGURATION.sideFrame
    const minimumZ =
      derived.activeFloorTopZ + OPENGRID_HONEYCOMB_CONFIGURATION.lowerFrame
    const maximumZ =
      derived.activeUpperInnerRimZ - OPENGRID_HONEYCOMB_CONFIGURATION.topFrame

    expect(positiveX.length).toBeGreaterThan(0)
    expect(Math.min(...bounds.map((entry) => entry[0][1]))).toBeCloseTo(
      minimumTangent,
      3,
    )
    expect(Math.max(...bounds.map((entry) => entry[1][1]))).toBeCloseTo(
      maximumTangent,
      3,
    )
    expect(Math.min(...bounds.map((entry) => entry[0][2]))).toBeCloseTo(
      minimumZ,
      3,
    )
    expect(Math.max(...bounds.map((entry) => entry[1][2]))).toBeCloseTo(
      maximumZ,
      3,
    )

    const fullTangentSpan =
      Math.sqrt(3) * OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius
    const fullVerticalSpan = OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius * 2
    expect(
      bounds.some(
        (entry) =>
          span(entry, 1) < fullTangentSpan - 0.05 ||
          span(entry, 2) < fullVerticalSpan - 0.05,
      ),
    ).toBe(true)
  })

  it('clips box side cells to an enabled opening safety bridge', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      openingPlusXDepth: 20,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 90,
      honeycombMode: true,
    }
    const cutters = makeOpenGridStackableBoxSideHoneycombCutters(parameters)
    cutters.forEach(remember)

    const [width] = nominalOpenGridStackableBoxFootprintFor(parameters)
    const derived = openGridStackableBoxDerivedGeometryFor(parameters)
    const opening = derived.openings['+X']
    const positiveX = positiveXBoxSideCutters(cutters, width)
    const protectedHalfWidth =
      opening.upperWidth / 2 + OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
    const protectedBottom =
      opening.bottomZ - OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
    const leftCutters = positiveX.filter(
      ({ bounds }) => bounds[1][1] <= -protectedHalfWidth + 0.001,
    )
    const rightCutters = positiveX.filter(
      ({ bounds }) => bounds[0][1] >= protectedHalfWidth - 0.001,
    )
    const lowerCutters = positiveX.filter(
      ({ bounds }) =>
        bounds[0][1] < protectedHalfWidth &&
        bounds[1][1] > -protectedHalfWidth &&
        bounds[1][2] <= protectedBottom + 0.001,
    )

    expect(leftCutters.length).toBeGreaterThan(0)
    expect(rightCutters.length).toBeGreaterThan(0)
    expect(lowerCutters.length).toBeGreaterThan(0)
    expect(
      Math.max(...leftCutters.map(({ bounds }) => bounds[1][1])),
    ).toBeCloseTo(-protectedHalfWidth, 3)
    expect(
      Math.min(...rightCutters.map(({ bounds }) => bounds[0][1])),
    ).toBeCloseTo(protectedHalfWidth, 3)
    expect(
      Math.max(...lowerCutters.map(({ bounds }) => bounds[1][2])),
    ).toBeCloseTo(protectedBottom, 3)

    const wallThickness = OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness
    const keepoutProbe = remember(
      makeBox(
        [
          width / 2 - wallThickness - 0.1,
          -protectedHalfWidth + 0.05,
          protectedBottom + 0.05,
        ],
        [
          width / 2 + 0.1,
          protectedHalfWidth - 0.05,
          derived.activeUpperOuterEdgeZ + 0.1,
        ],
      ),
    )
    const overlapVolumes = positiveX.map(({ cutter }) => {
      const overlap = remember(cutter.intersect(keepoutProbe))
      return measureVolume(overlap)
    })
    expect(Math.max(...overlapVolumes)).toBeCloseTo(0, 4)
  })

  it('fills the protected cylinder wall band and opening edge with partial cells', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 60,
      height: 60,
      bottomSeatMode: 'none' as const,
      openingPlusXDepth: 20,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 90,
      honeycombMode: true,
    }
    const cutters =
      makeOpenGridStackableCylinderSideHoneycombCutters(parameters)
    cutters.forEach(remember)
    const entries = cutters.map((cutter) => {
      const bounds = boundsOf(cutter)
      return { bounds, angle: angleForBounds(bounds) }
    })

    const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
    const minimumZ =
      derived.outerTransitionEndZ + OPENGRID_HONEYCOMB_CONFIGURATION.lowerFrame
    const maximumZ =
      parameters.height -
      Math.max(
        OPENGRID_HONEYCOMB_CONFIGURATION.topFrame,
        derived.topInnerChamfer,
      )
    const opening = derived.openings['+X']
    const protectedBottom =
      opening.bottomZ - OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance
    const protectedAngularHalfWidth =
      opening.angularHalfWidth +
      OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance /
        (parameters.diameter / 2)
    const belowOpening = entries.filter(
      ({ bounds, angle }) =>
        angularDistanceFromPositiveX(angle) <= protectedAngularHalfWidth &&
        bounds[1][2] <= protectedBottom + 0.001,
    )

    expect(Math.min(...entries.map(({ bounds }) => bounds[0][2]))).toBeCloseTo(
      minimumZ,
      3,
    )
    expect(Math.max(...entries.map(({ bounds }) => bounds[1][2]))).toBeCloseTo(
      maximumZ,
      3,
    )
    expect(belowOpening.length).toBeGreaterThan(0)
    expect(
      Math.max(...belowOpening.map(({ bounds }) => bounds[1][2])),
    ).toBeCloseTo(protectedBottom, 3)
    expect(
      entries.some(
        ({ bounds }) =>
          span(bounds, 2) <
          OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius * 2 - 0.05,
      ),
    ).toBe(true)
  })

  it('preserves cylinder opening bridges and cuts complete and clipped cells through the inner curve', () => {
    const parameters = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 60,
      height: 60,
      bottomSeatMode: 'none' as const,
      openingPlusXDepth: 20,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 90,
      honeycombMode: true,
    }
    const cutters =
      makeOpenGridStackableCylinderSideHoneycombCutters(parameters)
    cutters.forEach(remember)
    const fullVerticalSpan = OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius * 2
    const derived = openGridStackableCylinderDerivedGeometryFor(parameters)
    const opening = derived.openings['+X']
    const protectedAngularHalfWidth =
      opening.angularHalfWidth +
      OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance /
        (parameters.diameter / 2)
    const entries = cutters.map((cutter) => {
      const bounds = boundsOf(cutter)
      return { cutter, bounds, angle: angleForBounds(bounds) }
    })
    const entriesAwayFromOpening = entries.filter(
      ({ angle }) =>
        angularDistanceFromPositiveX(angle) > protectedAngularHalfWidth + 0.2,
    )
    const complete = entriesAwayFromOpening.find(
      ({ bounds }) => span(bounds, 2) >= fullVerticalSpan - 0.001,
    )
    const clipped = entriesAwayFromOpening.find(({ bounds }) => {
      const verticalSpan = span(bounds, 2)
      return verticalSpan > 0.5 && verticalSpan < fullVerticalSpan - 0.05
    })

    expect(complete).toBeDefined()
    expect(clipped).toBeDefined()
    if (!complete || !clipped) return

    const baseline = remember(
      buildOpenGridStackableCylinder({
        ...parameters,
        honeycombMode: false,
      }),
    )
    const honeycomb = remember(buildOpenGridStackableCylinder(parameters))
    const radius = parameters.diameter / 2
    const wallProbeRadius = (derived.innerRadius + radius) / 2
    const sideBridgeAngle =
      opening.angularHalfWidth +
      OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance / (radius * 2)
    const upperSideBandZ =
      parameters.height -
      Math.max(
        OPENGRID_HONEYCOMB_CONFIGURATION.topFrame,
        derived.topInnerChamfer,
      )
    const sideBridgeZ = (opening.bottomZ + upperSideBandZ) / 2
    const lowerBridgeZ =
      opening.bottomZ - OPENGRID_HONEYCOMB_CONFIGURATION.featureClearance / 2
    const safetyBridgeLocations = [
      { angle: -sideBridgeAngle, z: sideBridgeZ },
      { angle: sideBridgeAngle, z: sideBridgeZ },
      { angle: 0, z: lowerBridgeZ },
    ]

    for (const location of safetyBridgeLocations) {
      const probe = remember(
        makeCylinder(0.06, 0.1, [
          wallProbeRadius * Math.cos(location.angle),
          wallProbeRadius * Math.sin(location.angle),
          location.z - 0.05,
        ]),
      )
      const baselineOverlap = remember(baseline.intersect(probe))
      const honeycombOverlap = remember(honeycomb.intersect(probe))
      const baselineVolume = measureVolume(baselineOverlap)

      expect(baselineVolume).toBeGreaterThan(0.0001)
      expect(measureVolume(honeycombOverlap)).toBeCloseTo(baselineVolume, 4)
    }

    const tangentExtent =
      (Math.sqrt(3) * OPENGRID_HONEYCOMB_CONFIGURATION.cellRadius) / 2
    const tangentOffset = tangentExtent - 0.35

    for (const entry of [complete, clipped]) {
      const centerZ = (entry.bounds[0][2] + entry.bounds[1][2]) / 2
      const curvedInnerRadial = Math.sqrt(
        derived.innerRadius ** 2 - tangentOffset ** 2,
      )
      const probeRadial = curvedInnerRadial + 0.02
      const probeX =
        probeRadial * Math.cos(entry.angle) -
        tangentOffset * Math.sin(entry.angle)
      const probeY =
        probeRadial * Math.sin(entry.angle) +
        tangentOffset * Math.cos(entry.angle)
      const probe = remember(
        makeCylinder(0.012, 0.08, [probeX, probeY, centerZ - 0.04]),
      )
      const cutterOverlap = remember(entry.cutter.intersect(probe))
      const baselineOverlap = remember(baseline.intersect(probe))
      const honeycombOverlap = remember(honeycomb.intersect(probe))

      expect(measureVolume(cutterOverlap)).toBeGreaterThan(0.000001)
      expect(measureVolume(baselineOverlap)).toBeGreaterThan(0.000001)
      expect(measureVolume(honeycombOverlap)).toBeCloseTo(0, 6)
    }
  }, 180_000)
})

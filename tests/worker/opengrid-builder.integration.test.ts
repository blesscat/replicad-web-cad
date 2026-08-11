import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import {
  assertOpenGridShapeQuality,
  inspectOpenGridShapeQuality,
} from '../../src/cad-kernel/components/opengrid/quality'
import {
  buildOpenGridBRep,
  buildOpenGridBRepWithStrategy,
  buildOpenGridCanonicalTile,
  importOpenGridPrototypeTemplate,
  OPENGRID_PROTOTYPE_TEMPLATE_URLS,
} from '../../src/cad-kernel/components/opengrid/builder'
import { meshBRep, serializeMesh } from '../../src/cad-kernel/mesh'
import { PreviewTimingRecorder } from '../../src/cad-contract/preview-timing'
import { createBooleanOperationReporter } from '../../src/cad-kernel/boolean-progress'
import {
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  deterministicOpenGridCustomScrewPositions,
  normalizeOpenGridParameters,
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
  openGridScrewCentersFor,
  type OpenGridParameters,
  type OpenGridVariant,
} from '../../src/cad-contract/units'

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
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  })
}

async function buildAndInspect(input: OpenGridParameters) {
  const shape = await buildOpenGridBRep(input)
  const mesh = meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 })
  const quality = inspectOpenGridShapeQuality(shape, input, mesh)
  return { shape, mesh, quality }
}

type Point3D = [number, number, number]
type ProbeBounds = readonly [Point3D, Point3D]

function measureIntersectionVolume(
  shape: Shape3D,
  minimum: Point3D,
  maximum: Point3D,
): number {
  const probe = makeBox(minimum, maximum)
  const intersection = shape.intersect(probe)
  try {
    return measureVolume(intersection)
  } finally {
    if (intersection !== shape && intersection !== probe) intersection.delete()
    probe.delete()
  }
}

function readShapeBounds(shape: Shape3D): {
  min: [number, number, number]
  max: [number, number, number]
} {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return {
      min,
      max,
    }
  } finally {
    boundingBox.delete()
  }
}

function expectFiniteMesh(mesh: ReturnType<typeof meshBRep>): void {
  expect(mesh.positions.length).toBeGreaterThan(0)
  expect(mesh.normals.length).toBe(mesh.positions.length)
  expect(mesh.indices.length % 3).toBe(0)
  expect(mesh.triangleCount).toBeGreaterThan(0)
  for (const value of mesh.positions) expect(Number.isFinite(value)).toBe(true)
  for (const value of mesh.normals) expect(Number.isFinite(value)).toBe(true)
  for (const value of mesh.indices)
    expect(Number.isSafeInteger(value)).toBe(true)
}

function expectHalfCellBoundaryStrips(
  shape: Shape3D,
  input: OpenGridParameters,
  checkCorner: boolean,
): void {
  const bounds = boundsForOpenGrid(input)
  if (input.halfCellX !== 'none') {
    const isLeft = input.halfCellX === 'left'
    const minX = isLeft ? bounds.min[0] + 0.3 : bounds.max[0] - 0.7
    const maxX = isLeft ? bounds.min[0] + 0.7 : bounds.max[0] - 0.3
    for (let row = 0; row < input.rows; row += 1) {
      const [, centerY] = cellCenterForOpenGrid(input, row, 0)
      const volume = measureIntersectionVolume(
        shape,
        [minX, centerY - 0.5, 0.5],
        [maxX, centerY + 0.5, 1.5],
      )
      expect(volume).toBeGreaterThan(0.01)
    }
  }

  if (input.halfCellY !== 'none') {
    const isBottom = input.halfCellY === 'bottom'
    const minY = isBottom ? bounds.min[1] + 0.3 : bounds.max[1] - 0.7
    const maxY = isBottom ? bounds.min[1] + 0.7 : bounds.max[1] - 0.3
    for (let column = 0; column < input.columns; column += 1) {
      const [centerX] = cellCenterForOpenGrid(input, 0, column)
      const volume = measureIntersectionVolume(
        shape,
        [centerX - 0.5, minY, 0.5],
        [centerX + 0.5, maxY, 1.5],
      )
      expect(volume).toBeGreaterThan(0.01)
    }
  }

  if (checkCorner && input.halfCellX !== 'none' && input.halfCellY !== 'none') {
    const isLeft = input.halfCellX === 'left'
    const isBottom = input.halfCellY === 'bottom'
    const minX = isLeft ? bounds.min[0] + 0.3 : bounds.max[0] - 0.7
    const maxX = isLeft ? bounds.min[0] + 0.7 : bounds.max[0] - 0.3
    const minY = isBottom ? bounds.min[1] + 0.3 : bounds.max[1] - 0.7
    const maxY = isBottom ? bounds.min[1] + 0.7 : bounds.max[1] - 0.3
    const volume = measureIntersectionVolume(
      shape,
      [minX, minY, 0.5],
      [maxX, maxY, 1.5],
    )
    expect(volume).toBeGreaterThan(0.01)
  }
}

function captureLedgeProbes(
  zMin: number,
  zMax: number,
): readonly ProbeBounds[] {
  return [
    [
      [-8, -12.7, zMin],
      [8, -12.4, zMax],
    ],
    [
      [-8, 12.4, zMin],
      [8, 12.7, zMax],
    ],
    [
      [-12.7, -8, zMin],
      [-12.4, 8, zMax],
    ],
    [
      [12.4, -8, zMin],
      [12.7, 8, zMax],
    ],
  ]
}

const CAPTURE_LEDGE_CASES = [
  { variant: 'Full' as const, zMin: 1, zMax: 1.3 },
  { variant: 'Lite' as const, zMin: 2.7, zMax: 3 },
  { variant: 'Heavy' as const, zMin: 1, zMax: 1.3 },
]

describe('OpenGrid official-profile product builder', () => {
  it('builds the official Full, Lite, and Heavy 1×1 profiles', async () => {
    for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
      const input = parameters({
        variant,
        rows: 1,
        columns: 1,
        chamfers: 'none',
        connectorHoles: 'none',
        screwMode: 'none',
      })
      const { shape, quality } = await buildAndInspect(input)
      try {
        expect(quality.passed).toBe(true)
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(quality.bounds?.min[0]).toBeCloseTo(-14, 5)
        expect(quality.bounds?.min[1]).toBeCloseTo(-14, 5)
        expect(quality.bounds?.min[2]).toBeCloseTo(0, 5)
        expect(quality.bounds?.max[2]).toBeCloseTo(
          OPENGRID_CONFIGURATION.variants[variant].thickness,
          5,
        )
      } finally {
        shape.delete()
      }
    }
  }, 15_000)

  it('reports fuse, cut, and intersect boundaries without changing geometry', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'corners',
    })
    const progress: Array<{
      kind: 'fuse' | 'cut' | 'intersect'
      state: 'running' | 'completed'
      elapsedMs: number
      completed?: number
      total?: number
    }> = []
    const reporter = createBooleanOperationReporter((update) => {
      progress.push(update)
    })
    const shape = await buildOpenGridBRep(input, {
      booleanOperations: reporter,
    })
    try {
      const quality = inspectOpenGridShapeQuality(
        shape,
        input,
        meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION),
      )
      expect(quality.passed, quality.failures.join('; ')).toBe(true)
    } finally {
      shape.delete()
    }

    for (const kind of ['fuse', 'cut', 'intersect'] as const) {
      const updates = progress.filter((update) => update.kind === kind)
      expect(updates.some((update) => update.state === 'running')).toBe(true)
      expect(updates.some((update) => update.state === 'completed')).toBe(true)
      expect(
        updates
          .filter((update) => update.state === 'completed')
          .every((update) => update.elapsedMs >= 0),
      ).toBe(true)
    }
  }, 60_000)

  it('keeps preview tolerance independent from B-Rep quality and export precision', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const firstShape = await buildOpenGridBRep(input)
    const secondShape = await buildOpenGridBRep(input)
    try {
      const firstMesh = meshBRep(firstShape, OPENGRID_PREVIEW_CONFIGURATION)
      const secondMesh = meshBRep(secondShape, {
        ...OPENGRID_PREVIEW_CONFIGURATION,
        tolerance: 0.05,
      })
      const firstQuality = inspectOpenGridShapeQuality(
        firstShape,
        input,
        firstMesh,
      )
      const secondQuality = inspectOpenGridShapeQuality(
        secondShape,
        input,
        secondMesh,
      )
      expect(firstQuality.passed).toBe(true)
      expect(secondQuality.passed).toBe(true)
      expect(secondMesh.triangleCount).toBe(firstMesh.triangleCount)
      expect(secondQuality.bounds).toEqual(firstQuality.bounds)
      expect(measureVolume(secondShape)).toBeCloseTo(
        measureVolume(firstShape),
        6,
      )

      const [firstStep, secondStep, firstStl, secondStl] = await Promise.all([
        exportStepBytes(firstShape),
        exportStepBytes(secondShape),
        exportStlBytes(firstShape, { tolerance: 0.001, angularTolerance: 0.1 }),
        exportStlBytes(secondShape, {
          tolerance: 0.001,
          angularTolerance: 0.1,
        }),
      ])
      expect(firstStep.byteLength).toBe(secondStep.byteLength)
      expect(firstStl.byteLength).toBe(secondStl.byteLength)
      expect(new DataView(firstStl).getUint32(80, true)).toBe(
        new DataView(secondStl).getUint32(80, true),
      )
      expect(normalizeOpenGridParameters(input)).toEqual(input)
    } finally {
      firstShape.delete()
      secondShape.delete()
    }
  }, 60_000)

  it('keeps global and individual face meshing finite with equivalent bounds', async () => {
    for (const variant of ['Lite', 'Full', 'Heavy'] as const) {
      const input = parameters({
        variant,
        rows: 1,
        columns: 1,
        chamfers: 'none',
        connectorHoles: 'none',
        screwMode: 'none',
      })
      const shape = await buildOpenGridBRep(input)
      try {
        const individual = meshBRep(shape, {
          ...OPENGRID_PREVIEW_CONFIGURATION,
          faceMeshingThreshold: 1,
        })
        const global = meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION)
        expectFiniteMesh(individual)
        expectFiniteMesh(global)
        expect(global.bounds).toEqual(individual.bounds)
        expect(inspectOpenGridShapeQuality(shape, input, global).passed).toBe(
          true,
        )
      } finally {
        shape.delete()
      }
    }
  }, 60_000)

  it('builds centered single and dual half-cell envelopes for every Full direction', async () => {
    const directions = [
      { halfCellX: 'left' as const, halfCellY: 'none' as const },
      { halfCellX: 'right' as const, halfCellY: 'none' as const },
      { halfCellX: 'none' as const, halfCellY: 'top' as const },
      { halfCellX: 'none' as const, halfCellY: 'bottom' as const },
      { halfCellX: 'left' as const, halfCellY: 'top' as const },
      { halfCellX: 'left' as const, halfCellY: 'bottom' as const },
      { halfCellX: 'right' as const, halfCellY: 'top' as const },
      { halfCellX: 'right' as const, halfCellY: 'bottom' as const },
    ]
    for (const direction of directions) {
      const input = parameters({
        variant: 'Full',
        rows: 1,
        columns: 1,
        chamfers: 'none',
        connectorHoles: 'none',
        screwMode: 'none',
        ...direction,
      })
      const shape = await buildOpenGridBRep(input)
      try {
        const bounds = readShapeBounds(shape)
        const expectedWidth = direction.halfCellX === 'none' ? 28 : 42
        const expectedDepth = direction.halfCellY === 'none' ? 28 : 42
        expect(bounds.min[0]).toBeCloseTo(-expectedWidth / 2, 2)
        expect(bounds.max[0]).toBeCloseTo(expectedWidth / 2, 2)
        expect(bounds.min[1]).toBeCloseTo(-expectedDepth / 2, 2)
        expect(bounds.max[1]).toBeCloseTo(expectedDepth / 2, 2)
        expect(bounds.min[2]).toBeCloseTo(0, 2)
        expectHalfCellBoundaryStrips(shape, input, true)
      } finally {
        shape.delete()
      }
    }
  }, 60_000)

  it('keeps feature cutters and Heavy layers valid at a dual half-cell boundary', async () => {
    for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
      const input = parameters({
        variant,
        rows: 2,
        columns: 2,
        halfCellX: 'right',
        halfCellY: 'top',
        chamfers: 'corners',
        connectorHoles: 'enabled',
        screwMode: 'corners',
      })
      const { shape, quality } = await buildAndInspect(input)
      try {
        expect(quality.passed, `${variant}:${quality.failures.join(';')}`).toBe(
          true,
        )
        expect(quality.cellOpeningCount).toBe(4)
        expectHalfCellBoundaryStrips(shape, input, false)
      } finally {
        shape.delete()
      }
    }
  }, 120_000)

  it('cuts the corner screw completely through a dual half-cell seam', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      halfCellX: 'right',
      halfCellY: 'top',
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'corners',
    })
    const seamCenter = openGridScrewCentersFor(input).find(
      ([x, y]) => x > 0 && y > 0,
    )
    expect(seamCenter).toEqual([7, 7])
    if (!seamCenter) throw new Error('TEST_SEAM_SCREW_MISSING')

    const shape = await buildOpenGridBRep(input)
    try {
      const [x, y] = seamCenter
      const halfCornerMaterial = measureIntersectionVolume(
        shape,
        [x + 0.5, y + 0.5, 0.5],
        [x + 1.5, y + 1.5, 1.5],
      )
      expect(halfCornerMaterial).toBeLessThan(0.01)
    } finally {
      shape.delete()
    }
  }, 60_000)

  it('keeps the screw through-hole and countersink open on a full cell', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'corners',
    })
    const center = openGridScrewCentersFor(input)[0]
    expect(center).toBeDefined()
    if (!center) throw new Error('TEST_SCREW_CENTER_MISSING')

    const shape = await buildOpenGridBRep(input)
    const referenceShape = await buildOpenGridBRep({
      ...input,
      screwMode: 'none',
    })
    try {
      const [x, y] = center
      const thickness = OPENGRID_CONFIGURATION.variants[input.variant].thickness
      const shaftMaterial = measureIntersectionVolume(
        shape,
        [x - input.screwDiameter / 4, y - input.screwDiameter / 4, -0.1],
        [
          x + input.screwDiameter / 4,
          y + input.screwDiameter / 4,
          thickness + 0.1,
        ],
      )
      const countersinkAxisOffset =
        (input.screwDiameter + input.screwHeadDiameter) / 4 / Math.sqrt(2)
      const countersinkProbeMinimum: Point3D = [
        x - countersinkAxisOffset - 0.2,
        y - countersinkAxisOffset - 0.2,
        thickness - input.screwHeadInset - 0.01,
      ]
      const countersinkProbeMaximum: Point3D = [
        x - countersinkAxisOffset + 0.2,
        y - countersinkAxisOffset + 0.2,
        thickness + 0.1,
      ]
      const countersinkMaterial = measureIntersectionVolume(
        shape,
        countersinkProbeMinimum,
        countersinkProbeMaximum,
      )
      const referenceCountersinkMaterial = measureIntersectionVolume(
        referenceShape,
        countersinkProbeMinimum,
        countersinkProbeMaximum,
      )
      expect(shaftMaterial).toBeLessThan(0.01)
      expect(referenceCountersinkMaterial).toBeGreaterThan(0.01)
      expect(countersinkMaterial).toBeLessThan(0.01)
      const previewMesh = meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION)
      expectFiniteMesh(previewMesh)
      expect(
        inspectOpenGridShapeQuality(shape, input, previewMesh).passed,
      ).toBe(true)
    } finally {
      shape.delete()
      referenceShape.delete()
    }
  }, 60_000)

  it('cuts connector holes on the final outer sides of half-cell extensions', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 2,
      columns: 2,
      halfCellX: 'right',
      halfCellY: 'top',
      chamfers: 'none',
      connectorHoles: 'enabled',
      screwMode: 'none',
    })
    const bounds = boundsForOpenGrid(input)
    const shape = await buildOpenGridBRep(input)
    try {
      const rightOuterMaterial = measureIntersectionVolume(
        shape,
        [bounds.max[0] - 1, -8, 2.5],
        [bounds.max[0] + 0.1, -6, 4.3],
      )
      const topOuterMaterial = measureIntersectionVolume(
        shape,
        [-8, bounds.max[1] - 1, 2.5],
        [-6, bounds.max[1] + 0.1, 4.3],
      )
      expect(rightOuterMaterial).toBeLessThan(0.01)
      expect(topOuterMaterial).toBeLessThan(0.01)
    } finally {
      shape.delete()
    }
  }, 60_000)

  it('cuts connector holes on left and bottom half-cell outer sides', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 2,
      columns: 2,
      halfCellX: 'left',
      halfCellY: 'bottom',
      chamfers: 'none',
      connectorHoles: 'enabled',
      screwMode: 'none',
    })
    const bounds = boundsForOpenGrid(input)
    const shape = await buildOpenGridBRep(input)
    try {
      const leftOuterMaterial = measureIntersectionVolume(
        shape,
        [bounds.min[0] - 0.1, 6, 2.5],
        [bounds.min[0] + 1, 8, 4.3],
      )
      const bottomOuterMaterial = measureIntersectionVolume(
        shape,
        [6, bounds.min[1] - 0.1, 2.5],
        [8, bounds.min[1] + 1, 4.3],
      )
      expect(leftOuterMaterial).toBeLessThan(0.01)
      expect(bottomOuterMaterial).toBeLessThan(0.01)
    } finally {
      shape.delete()
    }
  }, 60_000)

  it('cuts generated corner screws on both boundaries of a single X extension', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 5,
      columns: 3,
      halfCellX: 'left',
      halfCellY: 'none',
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'corners',
    })
    const centers = openGridScrewCentersFor(input)
    expect(centers).toEqual([
      [-35, -42],
      [-35, 42],
      [21, -42],
      [21, 42],
    ])

    const shape = await buildOpenGridBRep(input)
    try {
      for (const [x, y] of centers) {
        const seamMaterial = measureIntersectionVolume(
          shape,
          [x + 0.5, y - 1.5, 0.5],
          [x + 1.5, y - 0.5, 1.5],
        )
        expect(seamMaterial).toBeLessThan(0.01)
      }
    } finally {
      shape.delete()
    }
  }, 60_000)

  it.each([
    { rows: 3, columns: 4, center: [0, 14] as [number, number] },
    { rows: 5, columns: 5, center: [-14, 14] as [number, number] },
  ])(
    'cuts the official center screw on an odd $columns×$rows board',
    async ({ rows, columns, center }) => {
      const input = parameters({
        variant: 'Lite',
        rows,
        columns,
        chamfers: 'none',
        connectorHoles: 'none',
        screwKind: 'official-default',
        screwMode: 'corners',
        screwCenter: true,
      })
      expect(openGridScrewCentersFor(input)).toContainEqual(center)

      const shape = await buildOpenGridBRep(input)
      try {
        const [x, y] = center
        const centerHoleMaterial = measureIntersectionVolume(
          shape,
          [x - 0.5, y - 0.5, 0.5],
          [x + 0.5, y + 0.5, 1.5],
        )
        expect(centerHoleMaterial).toBeLessThan(0.01)
      } finally {
        shape.delete()
      }
    },
    60_000,
  )

  it.each(CAPTURE_LEDGE_CASES)(
    'keeps the inward capture ledge on all four sides for $variant',
    async ({ variant, zMin, zMax }) => {
      const input = parameters({
        variant,
        rows: 1,
        columns: 1,
        chamfers: 'none',
        connectorHoles: 'none',
        screwMode: 'none',
      })
      const shape = await buildOpenGridBRep(input)
      try {
        const ledgeVolumes = captureLedgeProbes(zMin, zMax).map(
          ([minimum, maximum]) =>
            measureIntersectionVolume(shape, minimum, maximum),
        )

        for (const volume of ledgeVolumes) {
          expect(volume).toBeGreaterThan(0)
        }
      } finally {
        shape.delete()
      }
    },
  )

  it('uses cell-balanced product assembly without a prototype fallback', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 2,
      columns: 2,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    let prototypeRequested = false
    const shape = await buildOpenGridBRep(input, {
      getOpenGridPrototype: async () => {
        prototypeRequested = true
        throw new Error('PROTOTYPE_MUST_NOT_BE_USED_BY_PRODUCT_BUILDER')
      },
    })
    try {
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const quality = inspectOpenGridShapeQuality(shape, input, mesh)
      expect(quality.passed).toBe(true)
      expect(quality.cellOpeningCount).toBe(4)
    } finally {
      shape.delete()
    }
    expect(prototypeRequested).toBe(false)
  }, 60_000)

  it('reuses retained canonical and half-cell prototypes without sharing result ownership', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 2,
      columns: 2,
      halfCellX: 'left',
      halfCellY: 'none',
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const canonical = new Map<string, Promise<Shape3D>>()
    const halfCell = new Map<string, Promise<Shape3D>>()
    let halfCellFactoryCalls = 0
    const context = {
      getOpenGridCanonicalTile: (
        variant: OpenGridVariant,
        thickness: number,
      ) => {
        const key = `${variant}:${thickness}`
        const cached = canonical.get(key)
        if (cached) return cached
        const next = buildOpenGridCanonicalTile(variant)
        canonical.set(key, next)
        return next
      },
      getOpenGridHalfCellPrototype: (
        key: string,
        factory: () => Promise<Shape3D> | Shape3D,
      ) => {
        const cached = halfCell.get(key)
        if (cached) return cached
        halfCellFactoryCalls += 1
        const next = Promise.resolve().then(factory)
        halfCell.set(key, next)
        return next
      },
    }

    const first = await buildOpenGridBRep(input, context)
    const firstHalfCellFactoryCalls = halfCellFactoryCalls
    try {
      expect(firstHalfCellFactoryCalls).toBeGreaterThan(0)
      expect(
        inspectOpenGridShapeQuality(
          first,
          input,
          meshBRep(first, OPENGRID_PREVIEW_CONFIGURATION),
        ).passed,
      ).toBe(true)
    } finally {
      first.delete()
    }

    const second = await buildOpenGridBRep(input, context)
    try {
      expect(halfCellFactoryCalls).toBe(firstHalfCellFactoryCalls)
      expect(
        inspectOpenGridShapeQuality(
          second,
          input,
          meshBRep(second, OPENGRID_PREVIEW_CONFIGURATION),
        ).passed,
      ).toBe(true)
    } finally {
      second.delete()
    }

    for (const prototype of [...canonical.values(), ...halfCell.values()]) {
      await prototype.then((shape) => shape.delete())
    }
  }, 60_000)

  it('releases the source when the retained half-cell fallback becomes stale', async () => {
    const input = parameters({
      variant: 'Lite',
      rows: 2,
      columns: 2,
      halfCellX: 'right',
      halfCellY: 'none',
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    let failExtension = true
    const context = {
      fuseHalfCellExtensionsIntoAssembly: false,
      getOpenGridHalfCellPrototype: (
        key: string,
        factory: () => Promise<Shape3D> | Shape3D,
      ) => {
        if (failExtension && key.startsWith('boundary:'))
          return Promise.reject(new Error('TEST_HALF_CELL_EXTENSION_STALE'))
        return Promise.resolve().then(factory)
      },
    }

    await expect(buildOpenGridBRep(input, context)).rejects.toThrow(
      'TEST_HALF_CELL_EXTENSION_STALE',
    )

    failExtension = false
    const shape = await buildOpenGridBRep(input, context)
    try {
      expect(
        inspectOpenGridShapeQuality(
          shape,
          input,
          meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION),
        ).passed,
      ).toBe(true)
    } finally {
      shape.delete()
    }
  }, 60_000)

  it.skipIf(process.env.RUN_OPENGRID_LIFECYCLE_REGRESSION !== '1')(
    'releases repeated large half-cell assemblies in one native epoch',
    async () => {
      const input = parameters({
        variant: 'Lite',
        rows: 5,
        columns: 5,
        halfCellX: 'right',
        halfCellY: 'top',
      })
      const canonical = new Map<OpenGridVariant, Promise<Shape3D>>()
      const halfCell = new Map<string, Promise<Shape3D>>()
      const context = {
        useCompoundChamferCutters: true,
        useCompoundScrewParts: true,
        fuseHalfCellExtensionsIntoAssembly: true,
        balancedFuseBatchSize: 2,
        getOpenGridCanonicalTile: (
          variant: OpenGridVariant,
          thickness: number,
        ) => {
          const cached = canonical.get(variant)
          if (cached) return cached
          const next = buildOpenGridCanonicalTile(variant, {
            balancedFuseBatchSize: 2,
          })
          canonical.set(variant, next)
          return next
        },
        getOpenGridHalfCellPrototype: (
          key: string,
          factory: () => Promise<Shape3D> | Shape3D,
        ) => {
          const cached = halfCell.get(key)
          if (cached) return cached
          const next = Promise.resolve().then(factory)
          halfCell.set(key, next)
          return next
        },
      }

      try {
        for (let sample = 1; sample <= 5; sample += 1) {
          const shape = await buildOpenGridBRep(input, context)
          try {
            const bounds = shape.boundingBox
            bounds.delete()
            const mesh = meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION)
            expect(mesh.triangleCount).toBeGreaterThan(0)
            expect(inspectOpenGridShapeQuality(shape, input, mesh).passed).toBe(
              true,
            )
          } finally {
            shape.delete()
          }
        }
      } finally {
        for (const prototype of [...canonical.values(), ...halfCell.values()]) {
          await prototype.then((shape) => shape.delete())
        }
      }
    },
    120_000,
  )

  it('keeps the official Lite profile across a multi-cell board', async () => {
    const input = parameters({
      variant: 'Lite',
      rows: 2,
      columns: 3,
      chamfers: 'corners',
      connectorHoles: 'enabled',
      screwMode: 'none',
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed).toBe(true)
      expect(quality.cellOpeningCount).toBe(6)
      expect(quality.bounds?.min[0]).toBeCloseTo(-42, 1)
      expect(quality.bounds?.max[0]).toBeCloseTo(42, 1)
      expect(quality.bounds?.max[2]).toBeCloseTo(4, 1)
    } finally {
      shape.delete()
    }
  }, 60_000)

  it('keeps every benchmark assembly strategy on the official profile', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 2,
      columns: 2,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })

    for (const strategy of [
      'whole-profile',
      'row-block',
      'cell-balanced',
    ] as const) {
      const shape = await buildOpenGridBRepWithStrategy(input, strategy)
      try {
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridShapeQuality(shape, input, mesh)
        expect(quality.passed, strategy).toBe(true)
        expect(quality.cellOpeningCount).toBe(4)
      } finally {
        shape.delete()
      }
    }
  }, 60_000)

  it('assembles from one 1×1 prototype and applies board features afterward', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 2,
      columns: 2,
      chamfers: 'corners',
      connectorHoles: 'enabled',
      screwMode: 'corners',
    })
    const templateBytes = readFileSync(
      fileURLToPath(OPENGRID_PROTOTYPE_TEMPLATE_URLS.Full),
    )
    const template = await importOpenGridPrototypeTemplate(
      new Blob([templateBytes]),
      'Full',
    )
    const shape = await buildOpenGridBRepWithStrategy(
      input,
      'prototype-template',
      {
        getOpenGridPrototype: async () => template,
      },
    )
    try {
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const quality = inspectOpenGridShapeQuality(shape, input, mesh)
      expect(quality.passed).toBe(true)
      expect(quality.cellOpeningCount).toBe(4)
    } finally {
      shape.delete()
      template.delete()
    }
  }, 60_000)

  it('builds each variant from a feature-free 1×1 prototype', async () => {
    for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
      const input = parameters({
        variant,
        rows: 1,
        columns: 1,
        chamfers: 'none',
        connectorHoles: 'none',
        screwMode: 'none',
      })
      const shape = await buildOpenGridBRepWithStrategy(
        input,
        'prototype-template',
      )
      try {
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridShapeQuality(shape, input, mesh)
        expect(quality.passed, variant).toBe(true)
        expect(quality.bounds?.max[2], variant).toBeCloseTo(
          OPENGRID_CONFIGURATION.variants[variant].thickness,
          5,
        )
      } finally {
        shape.delete()
      }
    }
  }, 60_000)

  it('loads the saved 1×1 STEP prototype for every variant', async () => {
    for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
      const bytes = readFileSync(
        fileURLToPath(OPENGRID_PROTOTYPE_TEMPLATE_URLS[variant]),
      )
      const shape = await importOpenGridPrototypeTemplate(
        new Blob([bytes]),
        variant,
      )
      try {
        const input = parameters({
          variant,
          rows: 1,
          columns: 1,
          chamfers: 'none',
          connectorHoles: 'none',
          screwMode: 'none',
        })
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridShapeQuality(shape, input, mesh)
        expect(quality.passed, variant).toBe(true)
      } finally {
        shape.delete()
      }
    }
  }, 60_000)

  it('applies post-processing to a Heavy prototype assembly', async () => {
    const input = parameters({
      variant: 'Heavy',
      rows: 2,
      columns: 2,
      chamfers: 'corners',
      connectorHoles: 'enabled',
      screwMode: 'corners',
    })
    const shape = await buildOpenGridBRepWithStrategy(
      input,
      'prototype-template',
    )
    try {
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const quality = inspectOpenGridShapeQuality(shape, input, mesh)
      expect(quality.passed).toBe(true)
      expect(quality.cellOpeningCount).toBe(4)
      expect(quality.bounds?.max[2]).toBeCloseTo(13.8, 1)
    } finally {
      shape.delete()
    }
  }, 60_000)

  it('uses internal intersections for everywhere and custom screw modes', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 5,
      columns: 5,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'custom',
      customScrewPositions: deterministicOpenGridCustomScrewPositions(5, 5),
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed).toBe(true)
      expect(quality.bounds?.min[0]).toBeCloseTo(-70, 1)
      expect(quality.bounds?.min[1]).toBeCloseTo(-70, 1)
      expect(quality.bounds?.min[2]).toBeCloseTo(0, 1)
    } finally {
      shape.delete()
    }
  }, 30_000)

  it('builds Heavy as opposing profiled layers rather than a solid plate', async () => {
    const input = parameters({
      variant: 'Heavy',
      rows: 2,
      columns: 2,
      chamfers: 'corners',
      connectorHoles: 'enabled',
      screwMode: 'corners',
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed).toBe(true)
      expect(quality.bounds?.max[2]).toBeCloseTo(13.8, 1)
      expect(quality.cellOpeningCount).toBe(4)
    } finally {
      shape.delete()
    }
  }, 120_000)

  it('exports STEP and binary STL from the quality-gated B-Rep', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed).toBe(true)
      const [stepBytes, stlBytes] = await Promise.all([
        exportStepBytes(shape),
        exportStlBytes(shape, { tolerance: 0.001, angularTolerance: 0.1 }),
      ])
      expect(stepBytes.byteLength).toBeGreaterThan(0)
      const triangleCount = new DataView(stlBytes).getUint32(80, true)
      expect(triangleCount).toBeGreaterThan(0)
      expect(stlBytes.byteLength).toBe(84 + triangleCount * 50)
    } finally {
      shape.delete()
    }
  })

  it('stops at a safe boundary when the generation becomes stale', async () => {
    await expect(
      buildOpenGridBRep(
        parameters({
          rows: 2,
          columns: 2,
          connectorHoles: 'none',
          screwMode: 'none',
        }),
        { isGenerationCurrent: () => false },
      ),
    ).rejects.toThrow('STALE_GENERATION')
  })

  it('rejects a flat plate that only has the expected envelope', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const shape = makeBox([-14, -14, 0], [14, 14, 6.8])
    try {
      const mesh = meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 })
      const report = inspectOpenGridShapeQuality(shape, input, mesh)
      expect(report.passed).toBe(false)
      expect(report.failures).toContain('openings:cell-0-0-not-through')
    } finally {
      shape.delete()
    }
  })

  it('rejects a square-hole plate without the official capture profile', async () => {
    const input = parameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const plate = makeBox([-14, -14, 0], [14, 14, 6.8])
    const cutter = makeBox([-11.9, -11.9, -1], [11.9, 11.9, 7.8])
    const shape = plate.cut(cutter, { optimisation: 'none' })
    if (shape !== plate) plate.delete()
    cutter.delete()
    try {
      const mesh = meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 })
      const report = inspectOpenGridShapeQuality(shape, input, mesh)
      expect(report.passed).toBe(false)
      expect(report.failures.length).toBeGreaterThan(0)
    } finally {
      shape.delete()
    }
  })

  it.skipIf(process.env.RUN_OPENGRID_PERFORMANCE_TEST !== '1')(
    'builds the UI-like half-cell preview within the interactive budget',
    async () => {
      const input = parameters({
        variant: 'Full',
        rows: 5,
        columns: 3,
        halfCellX: 'left',
        halfCellY: 'none',
      })
      const tolerance = Number(
        process.env.OPENGRID_PERFORMANCE_TOLERANCE ?? '0.05',
      )
      const faceMeshingThreshold = Number(
        process.env.OPENGRID_PERFORMANCE_FACE_THRESHOLD ??
          OPENGRID_PREVIEW_CONFIGURATION.faceMeshingThreshold,
      )
      const timing = new PreviewTimingRecorder()
      const batchSize = Number(
        process.env.OPENGRID_PERFORMANCE_BATCH_SIZE ??
          OPENGRID_CONFIGURATION.balancedFuseBatchSize,
      )
      const useCompoundChamferCutters =
        process.env.OPENGRID_PERFORMANCE_COMPOUND_CUTTERS !== '0'
      const fuseHalfCellExtensionsIntoAssembly =
        process.env.OPENGRID_PERFORMANCE_INTEGRATED_HALF_CELLS !== '0'
      const useCompoundScrewParts =
        process.env.OPENGRID_PERFORMANCE_COMPOUND_SCREW_PARTS !== '0'
      const assemblyFuseDurations: number[] = []
      const shape = await timing.measure('build', () =>
        buildOpenGridBRep(input, {
          balancedFuseBatchSize: batchSize,
          useCompoundChamferCutters,
          useCompoundScrewParts,
          fuseHalfCellExtensionsIntoAssembly,
          reportPhase: (phase, durationMs) => {
            if (phase === 'assembly-fuse')
              assemblyFuseDurations.push(durationMs)
          },
        }),
      )
      try {
        const mesh = timing.measureSync('mesh', () =>
          meshBRep(shape, {
            tolerance,
            angularTolerance: 0.1,
            faceMeshingThreshold,
          }),
        )
        const quality = timing.measureSync('quality', () =>
          assertOpenGridShapeQuality(shape, input, mesh),
        )
        timing.measureSync('serialization', () => serializeMesh(mesh))
        const snapshot = timing.snapshot()
        console.log(
          JSON.stringify({
            fixture: 'Full-5x3-half-cell-x-left',
            tolerance,
            faceMeshingThreshold,
            batchSize,
            useCompoundChamferCutters,
            useCompoundScrewParts,
            fuseHalfCellExtensionsIntoAssembly,
            assemblyFuseMs: assemblyFuseDurations.reduce(
              (total, durationMs) => total + durationMs,
              0,
            ),
            timing: snapshot,
            triangleCount: mesh.triangleCount,
            volume: quality.volume,
          }),
        )
        const elapsedMs = snapshot.totalMs
        expect(elapsedMs).toBeLessThan(12_000)
      } finally {
        shape.delete()
      }
    },
    30_000,
  )
})

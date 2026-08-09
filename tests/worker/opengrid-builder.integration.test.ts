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
  importOpenGridPrototypeTemplate,
  OPENGRID_PROTOTYPE_TEMPLATE_URLS,
} from '../../src/cad-kernel/components/opengrid/builder'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  deterministicOpenGridCustomScrewPositions,
  normalizeOpenGridParameters,
  OPENGRID_CONFIGURATION,
  type OpenGridParameters,
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
})

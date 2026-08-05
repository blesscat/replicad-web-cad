import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC } from 'replicad'
import { buildBoxBRep } from '../../src/cad-kernel/components/box/builder'
import {
  buildModularGridBase,
  importModularGridBaseTemplate,
} from '../../src/cad-kernel/components/modular-grid-base/builder'
import { exportStlBytes } from '../../src/cad-kernel/export'
import {
  boundsForBox,
  boundsForModularGridBase,
  PROTOTYPE_CONFIGURATION,
  type ModularGridBaseParameters,
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
const TEMPLATE_PATH = new URL(
  '../../src/cad-kernel/components/modular-grid-base/cell-template.step',
  import.meta.url,
)
const runBenchmark = process.env.RUN_STL_BENCHMARK === '1'

async function loadTemplate() {
  return importModularGridBaseTemplate(new Blob([readFileSync(TEMPLATE_PATH)]))
}

function triangleCount(bytes: ArrayBuffer): number {
  return new DataView(bytes).getUint32(80, true)
}

function assertBounds(
  shape: import('replicad').Shape3D,
  expected: { min: readonly number[]; max: readonly number[] },
): void {
  const bounds = shape.boundingBox
  try {
    const [min, max] = bounds.bounds as number[][]
    min.forEach((coordinate, index) =>
      expect(coordinate).toBeCloseTo(expected.min[index], 5),
    )
    max.forEach((coordinate, index) =>
      expect(coordinate).toBeCloseTo(expected.max[index], 5),
    )
  } finally {
    bounds.delete()
  }
}

describe.skipIf(!runBenchmark)('STL export measurement', () => {
  beforeAll(async () => {
    const openCascade = await initialiseOpenCascade({
      locateFile: () => WASM_PATH,
    })
    setOC(openCascade as Parameters<typeof setOC>[0])
  })

  it.each([
    { label: 'box-20x30x40', model: 'box' as const },
    {
      label: 'modular-grid-base-2x2',
      model: 'grid' as const,
      parameters: { rows: 2, columns: 2 },
    },
    {
      label: 'modular-grid-base-5x5',
      model: 'grid' as const,
      parameters: { rows: 5, columns: 5 },
    },
  ])(
    'measures binary STL quality for $label',
    async (fixture) => {
      const startedAt = performance.now()
      let shape: import('replicad').Shape3D
      let template: import('replicad').Shape3D | null = null
      if (fixture.model === 'box') {
        shape = buildBoxBRep({ width: 20, depth: 30, height: 40 })
      } else {
        template = await loadTemplate()
        shape = await buildModularGridBase(
          fixture.parameters as ModularGridBaseParameters,
          template,
        )
      }

      try {
        let expectedBounds
        if (fixture.model === 'box') {
          expectedBounds = boundsForBox({ width: 20, depth: 30, height: 40 })
        } else {
          expectedBounds = boundsForModularGridBase(
            fixture.parameters as ModularGridBaseParameters,
          )
        }
        assertBounds(shape, expectedBounds)
        const bytes = await exportStlBytes(shape, {
          tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
          angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
        })
        const elapsedMs = performance.now() - startedAt
        const facets = triangleCount(bytes)
        expect(facets).toBeGreaterThan(0)
        expect(bytes.byteLength).toBe(84 + facets * 50)
        console.log(
          JSON.stringify({
            fixture: fixture.label,
            tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
            angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
            elapsedMs: Number(elapsedMs.toFixed(1)),
            byteLength: bytes.byteLength,
            triangleCount: facets,
          }),
        )
      } finally {
        shape.delete()
        template?.delete()
      }
    },
    180_000,
  )
})

import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import {
  buildHexagonalColumn,
  importHexagonalColumnReference,
} from '../../src/cad-kernel/components/hexagonal-column/builder'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  runHexagonalColumnBenchmark,
  type HexagonalColumnBenchmarkAdapter,
} from '../../src/workers/benchmark/hexagonal-column'

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
const ASSET_PATH = new URL(
  '../../src/cad-kernel/components/hexagonal-column/hexagonal.step',
  import.meta.url,
)

let reference: Shape3D | null = null

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
  reference = await importHexagonalColumnReference(
    new Blob([readFileSync(ASSET_PATH)]),
  )
})

afterAll(() => {
  reference?.delete()
  reference = null
})

describe('hexagonal-column warm benchmark', () => {
  it('reports stage medians/P95 and meets the count-20 gate', async () => {
    let stepImports = 0
    const adapter: HexagonalColumnBenchmarkAdapter = {
      loadReference: async () => {
        if (!reference) throw new Error('reference not initialized')
        if (stepImports === 0) stepImports = 1
        return reference
      },
      build: (parameters, loadedReference, context) =>
        buildHexagonalColumn(parameters, {
          reference: loadedReference,
          reportPhase: context.reportPhase,
        }),
      mesh: (shape, previewConfig) => meshBRep(shape, previewConfig),
      getOperationTrace: () => ({ stepImports, fuseOperations: 0 }),
    }

    const report = await runHexagonalColumnBenchmark({
      adapter,
      environment: 'local-reference',
    })

    expect(stepImports).toBeGreaterThan(0)
    expect(report.warmupRuns).toBe(1)
    expect(report.measuredRuns).toBe(5)
    expect(report.trace).toEqual({ stepImports: 1, fuseOperations: 0 })
    expect(report.summaries).toHaveLength(3)
    for (const summary of report.summaries) {
      for (const phase of Object.values(summary.phases)) {
        expect(phase.medianMs).toBeGreaterThanOrEqual(0)
        expect(phase.p95Ms).toBeGreaterThanOrEqual(0)
      }
    }
    expect(report.summaries[2]?.phases.totalMs.p95Ms).toBeLessThan(2_000)
    expect(report.gate).toEqual({ passed: true, failures: [] })
  }, 180_000)
})

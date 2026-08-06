import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC } from 'replicad'
import { exportStepBytes } from '../../src/cad-kernel/export'
import {
  hswCellTemplateUrl,
  importHswCellTemplate,
} from '../../src/cad-kernel/components/hsw-cell/builder'
import {
  createDefaultHswBenchmarkAdapter,
  HSW_CELL_BENCHMARK_FIXTURES,
  runHswCellBenchmark,
} from '../../src/workers/benchmark/hsw-cell'

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
const LOCKFILE_VERSION =
  readFileSync(new URL('../../pnpm-lock.yaml', import.meta.url), 'utf8').match(
    /^lockfileVersion:\s*['"]?([^'"\n]+)['"]?/m,
  )?.[1] ?? 'unknown'
const ASSET_PATH = hswCellTemplateUrl
const runBenchmark = process.env.RUN_CAD_BENCHMARK === '1'
const selectedFixtures = process.env.RUN_CAD_BENCHMARK_FIXTURES
  ? HSW_CELL_BENCHMARK_FIXTURES.filter((fixture) =>
      process.env.RUN_CAD_BENCHMARK_FIXTURES?.split(',').includes(
        `${fixture.rows}x${fixture.columns}`,
      ),
    )
  : undefined
const selectedStrategies = process.env.RUN_CAD_BENCHMARK_STRATEGIES
  ? process.env.RUN_CAD_BENCHMARK_STRATEGIES.split(',').filter(
      (strategy): strategy is 'sequential' | 'column' =>
        strategy === 'sequential' || strategy === 'column',
    )
  : undefined

async function loadTemplate() {
  return importHswCellTemplate(new Blob([readFileSync(ASSET_PATH)]))
}

describe.skipIf(!runBenchmark)('hsw-cell Worker benchmark', () => {
  beforeAll(async () => {
    const openCascade = await initialiseOpenCascade({
      locateFile: () => WASM_PATH,
    })
    setOC(openCascade as Parameters<typeof setOC>[0])
  })

  it('separates cold import, measures warm generations, and enforces the HSW gate', async () => {
    const report = await runHswCellBenchmark({
      adapter: {
        ...createDefaultHswBenchmarkAdapter(loadTemplate),
        exportStep: exportStepBytes,
      },
      environment: {
        browserBuildMode: 'vitest-worker-node',
        dependencyLockfileVersion: `pnpm-lock.yaml@${LOCKFILE_VERSION}`,
        referenceEnvironment: `${process.platform}-${process.arch}-node-${process.version}`,
      },
      fixtures: selectedFixtures,
      strategies: selectedStrategies,
    })

    console.log(JSON.stringify(report, null, 2))
    expect(report.coldAssetImportMs).not.toBeNull()
    expect(report.measuredRuns).toBeGreaterThanOrEqual(5)
    expect(report.runs.every((run) => run.quality.singleSolid)).toBe(true)
    expect(report.runs.every((run) => run.quality.openingCount > 0)).toBe(true)
    expect(report.runs.every((run) => run.quality.sharpEdgeCount > 0)).toBe(
      true,
    )
    expect(
      report.summaries.every((summary) => (summary.stepByteLength ?? 0) > 0),
    ).toBe(true)
    expect(
      report.summaries.every((summary) => (summary.stlByteLength ?? 0) > 84),
    ).toBe(true)
    expect(
      report.summaries.every((summary) => (summary.stlTriangleCount ?? 0) > 0),
    ).toBe(true)
    if (
      !selectedFixtures &&
      (!selectedStrategies || selectedStrategies.length > 1)
    ) {
      expect(report.gate.passed, report.gate.failures.join('; ')).toBe(true)
    }
  }, 1_200_000)
})

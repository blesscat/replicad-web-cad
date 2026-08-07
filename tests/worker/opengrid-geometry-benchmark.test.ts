import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { setOC } from 'replicad'
import {
  createDefaultOpenGridBenchmarkAdapter,
  mergeOpenGridBenchmarkReports,
  OPENGRID_BENCHMARK_FIXTURES,
  renderOpenGridBenchmarkMarkdown,
  runOpenGridBenchmark,
} from '../../src/workers/benchmark/opengrid-geometry'

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

const runBenchmark = process.env.RUN_CAD_BENCHMARK === '1'
const selectedFixtureIds = process.env.RUN_OPENGRID_BENCHMARK_FIXTURES?.split(
  ',',
)
  .map((value) => value.trim())
  .filter(Boolean)
const selectedFixtures = selectedFixtureIds
  ? OPENGRID_BENCHMARK_FIXTURES.filter((fixture) =>
      selectedFixtureIds.includes(fixture.id),
    )
  : undefined
const selectedStrategies = process.env.RUN_OPENGRID_BENCHMARK_STRATEGIES?.split(
  ',',
)
  .map((value) => value.trim())
  .filter(
    (value): value is 'whole-profile' | 'row-block' | 'cell-balanced' =>
      value === 'whole-profile' ||
      value === 'row-block' ||
      value === 'cell-balanced',
  )

describe.skipIf(!runBenchmark)('OpenGrid geometry Worker benchmark', () => {
  it('records the OpenGrid strategy matrix and generator handoff', async () => {
    const fixtures = selectedFixtures ?? OPENGRID_BENCHMARK_FIXTURES
    const reports = []
    for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
      const variantFixtures = fixtures.filter(
        (fixture) => fixture.variant === variant,
      )
      if (variantFixtures.length === 0) continue
      const openCascade = await initialiseOpenCascade({
        locateFile: () => WASM_PATH,
      })
      setOC(openCascade as Parameters<typeof setOC>[0])
      reports.push(
        await runOpenGridBenchmark({
          adapter: createDefaultOpenGridBenchmarkAdapter(),
          environment: {
            browserBuildMode: 'vitest-worker-node',
            dependencyLockfileVersion: `pnpm-lock.yaml@${LOCKFILE_VERSION}`,
            referenceEnvironment: `${process.platform}-${process.arch}-node-${process.version}`,
            nativeExecutionEpoch: `vitest-${variant.toLowerCase()}-${Date.now()}`,
          },
          fixtures: variantFixtures,
          strategies: selectedStrategies,
        }),
      )
    }
    const report = mergeOpenGridBenchmarkReports(reports, selectedStrategies)

    console.log(JSON.stringify(report, null, 2))
    expect(report.measuredRuns).toBeGreaterThanOrEqual(5)
    expect(
      report.coldRuns.length +
        report.warmups.length +
        report.runs.length +
        report.failures.length,
    ).toBeGreaterThan(0)

    if (process.env.WRITE_OPENGRID_BENCHMARK_ARTIFACTS === '1') {
      const changeDir = join(
        process.cwd(),
        'openspec/changes/opengrid-geometry-benchmark',
      )
      writeFileSync(
        join(changeDir, 'benchmark-results.json'),
        `${JSON.stringify(report, null, 2)}\n`,
      )
      writeFileSync(
        join(changeDir, 'benchmark-results.md'),
        renderOpenGridBenchmarkMarkdown(report),
      )
    }
  }, 600_000)
})

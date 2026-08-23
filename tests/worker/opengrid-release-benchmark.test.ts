import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { setOC } from 'replicad'
import { writeFileSync } from 'node:fs'
import {
  normalizeOpenGridParameters,
  openGridFileName,
  openGridStlFileName,
  OPENGRID_CONFIGURATION,
  type OpenGridParameters,
  type OpenGridVariant,
} from '../../src/cad-contract/units'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import { assertOpenGridShapeQuality } from '../../src/cad-kernel/components/opengrid/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'

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

const runReleaseBenchmark = process.env.RUN_OPENGRID_RELEASE_BENCHMARK === '1'
const writeReport = process.env.WRITE_OPENGRID_RELEASE_REPORT === '1'
const strategy = 'cell-balanced' as const
const variants: readonly OpenGridVariant[] = ['Full', 'Lite', 'Heavy', 'Hybrid']

type ReleaseFixture = {
  id: string
  rows: number
  columns: number
  overrides?: Partial<OpenGridParameters>
}

const releaseFixtures: readonly ReleaseFixture[] = [
  {
    id: '1x1',
    rows: 1,
    columns: 1,
    overrides: {
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    },
  },
  {
    id: '2x2',
    rows: 2,
    columns: 2,
    overrides: {
      screwMode: 'corners',
      connectorHoles: 'enabled',
    },
  },
  {
    id: '5x5',
    rows: 5,
    columns: 5,
    overrides: {
      screwKind: 'custom',
      screwMode: 'by-row-column',
      screwEveryRows: 2,
      screwEveryColumns: 2,
      connectorHoles: 'none',
    },
  },
  {
    id: '10x10',
    rows: 10,
    columns: 10,
    overrides: {
      screwKind: 'custom',
      screwMode: 'everywhere',
      connectorHoles: 'enabled',
    },
  },
  {
    id: 'max-grid-row-column',
    rows: OPENGRID_CONFIGURATION.maxGridCount,
    columns: OPENGRID_CONFIGURATION.maxGridCount,
    overrides: {
      screwKind: 'custom',
      screwMode: 'by-row-column',
      screwEveryRows: 3,
      screwEveryColumns: 2,
      connectorHoles: 'enabled',
    },
  },
]

type ReleaseRunKind = 'cold' | 'warmup' | 'measured'

type ReleaseRun = {
  fixtureId: string
  variant: OpenGridVariant
  strategy: typeof strategy
  kind: ReleaseRunKind
  sample: number
  durationMs: number | null
  qualityPassed: boolean
  meshTriangleCount: number | null
  stepByteLength: number | null
  stlByteLength: number | null
  stepFileName: string
  stlFileName: string
  error?: string
}

type ReleaseReport = {
  generatedAt: string
  sourceCommit: string
  nativeExecutionEpochs: Record<OpenGridVariant, string>
  environment: {
    platform: string
    arch: string
    node: string
    packageManager: string
  }
  selectedStrategy: typeof strategy
  measuredRuns: number
  p95LimitMs: number
  runs: ReleaseRun[]
}

function parametersFor(
  variant: OpenGridVariant,
  fixture: ReleaseFixture,
): OpenGridParameters {
  return normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    variant,
    rows: fixture.rows,
    columns: fixture.columns,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    ...fixture.overrides,
  })
}

function stlTriangleCount(bytes: ArrayBuffer): number {
  if (bytes.byteLength < 84) throw new Error('STL_EMPTY_OR_INVALID')
  const triangleCount = new DataView(bytes).getUint32(80, true)
  if (triangleCount <= 0 || bytes.byteLength !== 84 + triangleCount * 50) {
    throw new Error('STL_INVALID_STRUCTURE')
  }
  return triangleCount
}

async function runFixture(
  variant: OpenGridVariant,
  fixture: ReleaseFixture,
  kind: ReleaseRunKind,
  sample: number,
): Promise<ReleaseRun> {
  const parameters = parametersFor(variant, fixture)
  const startedAt = performance.now()
  let shape: Awaited<ReturnType<typeof buildOpenGridBRep>> | null = null
  const result: ReleaseRun = {
    fixtureId: fixture.id,
    variant,
    strategy,
    kind,
    sample,
    durationMs: null,
    qualityPassed: false,
    meshTriangleCount: null,
    stepByteLength: null,
    stlByteLength: null,
    stepFileName: openGridFileName(parameters),
    stlFileName: openGridStlFileName(parameters),
  }

  try {
    shape = await buildOpenGridBRep(parameters)
    const mesh = meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 })
    const quality = assertOpenGridShapeQuality(shape, parameters, mesh)
    const [stepBytes, stlBytes] = await Promise.all([
      exportStepBytes(shape),
      exportStlBytes(shape, { tolerance: 0.001, angularTolerance: 0.1 }),
    ])
    const triangleCount = stlTriangleCount(stlBytes)
    result.qualityPassed = quality.passed
    result.meshTriangleCount = quality.meshTriangleCount
    result.stepByteLength = stepBytes.byteLength
    result.stlByteLength = stlBytes.byteLength
    if (triangleCount <= 0) throw new Error('STL_EMPTY')
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
  } finally {
    shape?.delete()
    result.durationMs = performance.now() - startedAt
  }
  return result
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((first, second) => first - second)
  if (sorted.length === 0) return 0
  const index = (sorted.length - 1) * fraction
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower] ?? 0
  const lowerValue = sorted[lower] ?? 0
  const upperValue = sorted[upper] ?? lowerValue
  return lowerValue + (upperValue - lowerValue) * (index - lower)
}

function renderReport(report: ReleaseReport): string {
  const rows = variants.flatMap((variant) =>
    releaseFixtures.map((fixture) => {
      const measured = report.runs.filter(
        (run) =>
          run.variant === variant &&
          run.fixtureId === fixture.id &&
          run.kind === 'measured' &&
          run.durationMs !== null,
      )
      const durations = measured.map((run) => run.durationMs ?? 0)
      const passed = measured.every((run) => run.qualityPassed && !run.error)
      return `| ${variant} | ${fixture.id} | ${durations.length} | ${percentile(durations, 0.5).toFixed(2)} | ${percentile(durations, 0.95).toFixed(2)} | ${passed ? 'pass' : 'fail'} |`
    }),
  )

  return `# OpenGrid official-profile release gate

- Generated: ${report.generatedAt}
- Official source commit: \`${report.sourceCommit}\`
- Native execution epochs: ${variants.map((variant) => `${variant}=\`${report.nativeExecutionEpochs[variant]}\``).join(', ')}
- Environment: ${report.environment.platform}-${report.environment.arch}, Node ${report.environment.node}, ${report.environment.packageManager}
- Selected product strategy: \`${report.selectedStrategy}\`
- Measured samples per fixture: ${report.measuredRuns}
- P95 limit: ${report.p95LimitMs} ms

Every fixture uses one cold run, one warm-up run, and five measured runs. Each sample runs the official profile quality gate, mesh validation, STEP export, and binary STL export.

| Variant | Fixture | Measured runs | Median (ms) | P95 (ms) | Quality/export |
| --- | --- | ---: | ---: | ---: | --- |
${rows.join('\n')}

The previous flat-plate, 16 mm opening, four-slot, and cylindrical-connector benchmark is obsolete.
`
}

describe.skipIf(!runReleaseBenchmark)(
  'OpenGrid official release benchmark',
  () => {
    it('records the official release matrix with cold, warm-up, and five measured runs', async () => {
      const nativeExecutionEpochs = {} as Record<OpenGridVariant, string>
      const runs: ReleaseRun[] = []

      for (const variant of variants) {
        const openCascade = await initialiseOpenCascade({
          locateFile: () => WASM_PATH,
        })
        setOC(openCascade as Parameters<typeof setOC>[0])
        nativeExecutionEpochs[variant] =
          `vitest-release-${variant.toLowerCase()}-${Date.now()}`
        for (const fixture of releaseFixtures) {
          runs.push(await runFixture(variant, fixture, 'cold', 0))
          runs.push(await runFixture(variant, fixture, 'warmup', 1))
          for (let sample = 1; sample <= 5; sample += 1) {
            runs.push(await runFixture(variant, fixture, 'measured', sample))
          }
        }
      }

      const report: ReleaseReport = {
        generatedAt: new Date().toISOString(),
        sourceCommit: '61231295ea08c302eff32051769113c48cbda255',
        nativeExecutionEpochs,
        environment: {
          platform: process.platform,
          arch: process.arch,
          node: process.version,
          packageManager: 'pnpm@11.20.0',
        },
        selectedStrategy: strategy,
        measuredRuns: 5,
        p95LimitMs: 120_000,
        runs,
      }

      if (writeReport) {
        const changeDir = join(
          process.cwd(),
          'openspec/changes/add-opengrid-generator',
        )
        writeFileSync(
          join(changeDir, 'release-report.json'),
          `${JSON.stringify(report, null, 2)}\n`,
        )
        writeFileSync(
          join(changeDir, 'release-report.md'),
          renderReport(report),
        )
      }

      const failures = runs.filter(
        (run) => !run.qualityPassed || Boolean(run.error),
      )
      const measuredRuns = runs.filter((run) => run.kind === 'measured')
      const slowRuns = measuredRuns.filter(
        (run) => (run.durationMs ?? Infinity) >= 120_000,
      )
      expect(runs).toHaveLength(105)
      expect(failures).toEqual([])
      expect(slowRuns).toEqual([])
      console.log(renderReport(report))
    }, 1_800_000)
  },
)

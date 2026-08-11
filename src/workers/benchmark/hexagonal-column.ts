import type { Shape3D } from 'replicad'
import {
  buildHexagonalColumn,
  loadHexagonalColumnReference,
} from '../../cad-kernel/components/hexagonal-column/builder'
import { meshBRep, type MeshData } from '../../cad-kernel/mesh'
import {
  PROTOTYPE_CONFIGURATION,
  type HexagonalColumnParameters,
} from '../../cad-contract/units'

export const HEXAGONAL_COLUMN_BENCHMARK_FIXTURES: readonly HexagonalColumnParameters[] =
  [
    { height: 50, count: 1, gap: 1, orientation: 'lying' },
    { height: 50, count: 3, gap: 1, orientation: 'lying' },
    { height: 50, count: 20, gap: 1, orientation: 'lying' },
  ]

export const HEXAGONAL_COLUMN_BENCHMARK_RUNS = 5

export type HexagonalColumnBenchmarkPhase =
  | 'referenceProfileLoadMs'
  | 'prototypeBuildMs'
  | 'cloneTranslateCompoundMs'
  | 'meshMs'
  | 'totalMs'

export type HexagonalColumnBenchmarkTiming = Record<
  HexagonalColumnBenchmarkPhase,
  number
>

export type HexagonalColumnBenchmarkRun = {
  fixture: HexagonalColumnParameters
  sample: number
  timing: HexagonalColumnBenchmarkTiming
}

export type HexagonalColumnBenchmarkSummary = {
  fixture: HexagonalColumnParameters
  samples: number
  phases: Record<
    HexagonalColumnBenchmarkPhase,
    { medianMs: number; p95Ms: number }
  >
}

export type HexagonalColumnOperationTrace = {
  stepImports: number
  fuseOperations: number
}

export type HexagonalColumnBenchmarkReport = {
  environment: string
  warmupRuns: number
  measuredRuns: number
  warmups: HexagonalColumnBenchmarkRun[]
  runs: HexagonalColumnBenchmarkRun[]
  summaries: HexagonalColumnBenchmarkSummary[]
  trace: HexagonalColumnOperationTrace
  gate: { passed: boolean; failures: string[] }
}

export type HexagonalColumnBenchmarkBuildContext = {
  reportPhase: (
    phase: 'prototype-build' | 'clone-translate-compound',
    durationMs: number,
  ) => void
}

export type HexagonalColumnBenchmarkAdapter = {
  loadReference: () => Promise<Shape3D>
  build: (
    parameters: HexagonalColumnParameters,
    reference: Shape3D,
    context: HexagonalColumnBenchmarkBuildContext,
  ) => Promise<Shape3D> | Shape3D
  mesh: (
    shape: Shape3D,
    previewConfig: { tolerance: number; angularTolerance: number },
  ) => MeshData
  getOperationTrace: () => HexagonalColumnOperationTrace
  disposeReference?: () => void
}

export type RunHexagonalColumnBenchmarkOptions = {
  adapter: HexagonalColumnBenchmarkAdapter
  environment: string
  fixtures?: readonly HexagonalColumnParameters[]
  measuredRuns?: number
  previewConfig?: { tolerance: number; angularTolerance: number }
}

function emptyTiming(): HexagonalColumnBenchmarkTiming {
  return {
    referenceProfileLoadMs: 0,
    prototypeBuildMs: 0,
    cloneTranslateCompoundMs: 0,
    meshMs: 0,
    totalMs: 0,
  }
}

function deleteShape(shape: Shape3D | null): void {
  try {
    shape?.delete()
  } catch {
    // Benchmark cleanup must not hide the measured operation error.
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

function p95(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second)
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index] ?? 0
}

function fixtureKey(fixture: HexagonalColumnParameters): string {
  return `${fixture.height}x${fixture.count}-g${fixture.gap}`
}

function readPhases(
  phaseTimings: Partial<
    Record<'prototype-build' | 'clone-translate-compound', number>
  >,
  timing: HexagonalColumnBenchmarkTiming,
): void {
  timing.prototypeBuildMs = phaseTimings['prototype-build'] ?? 0
  timing.cloneTranslateCompoundMs =
    phaseTimings['clone-translate-compound'] ?? 0
}

async function runSample(
  adapter: HexagonalColumnBenchmarkAdapter,
  fixture: HexagonalColumnParameters,
  sample: number,
  previewConfig: { tolerance: number; angularTolerance: number },
): Promise<HexagonalColumnBenchmarkRun> {
  const timing = emptyTiming()
  const totalStartedAt = performance.now()
  let shape: Shape3D | null = null

  const referenceStartedAt = performance.now()
  const reference = await adapter.loadReference()
  timing.referenceProfileLoadMs = performance.now() - referenceStartedAt

  try {
    const phaseTimings: Partial<
      Record<'prototype-build' | 'clone-translate-compound', number>
    > = {}
    shape = await adapter.build(fixture, reference, {
      reportPhase: (phase, durationMs) => {
        phaseTimings[phase] = (phaseTimings[phase] ?? 0) + durationMs
      },
    })
    readPhases(phaseTimings, timing)

    const meshStartedAt = performance.now()
    adapter.mesh(shape, previewConfig)
    timing.meshMs = performance.now() - meshStartedAt
    timing.totalMs = performance.now() - totalStartedAt
    return { fixture, sample, timing }
  } finally {
    deleteShape(shape)
  }
}

function summarizeRuns(
  fixture: HexagonalColumnParameters,
  runs: HexagonalColumnBenchmarkRun[],
): HexagonalColumnBenchmarkSummary {
  const phases: Record<
    HexagonalColumnBenchmarkPhase,
    { medianMs: number; p95Ms: number }
  > = {} as Record<
    HexagonalColumnBenchmarkPhase,
    { medianMs: number; p95Ms: number }
  >
  const phaseNames: HexagonalColumnBenchmarkPhase[] = [
    'referenceProfileLoadMs',
    'prototypeBuildMs',
    'cloneTranslateCompoundMs',
    'meshMs',
    'totalMs',
  ]

  for (const phase of phaseNames) {
    const values = runs.map((run) => run.timing[phase])
    phases[phase] = { medianMs: median(values), p95Ms: p95(values) }
  }

  return { fixture, samples: runs.length, phases }
}

export async function runHexagonalColumnBenchmark({
  adapter,
  environment,
  fixtures = HEXAGONAL_COLUMN_BENCHMARK_FIXTURES,
  measuredRuns = HEXAGONAL_COLUMN_BENCHMARK_RUNS,
  previewConfig = {
    tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
    angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
  },
}: RunHexagonalColumnBenchmarkOptions): Promise<HexagonalColumnBenchmarkReport> {
  const warmups: HexagonalColumnBenchmarkRun[] = []
  const runs: HexagonalColumnBenchmarkRun[] = []

  try {
    for (const fixture of fixtures) {
      warmups.push(await runSample(adapter, fixture, 0, previewConfig))
    }
    for (const fixture of fixtures) {
      for (let sample = 1; sample <= measuredRuns; sample += 1) {
        runs.push(await runSample(adapter, fixture, sample, previewConfig))
      }
    }
  } finally {
    adapter.disposeReference?.()
  }

  const summaries = fixtures.map((fixture) =>
    summarizeRuns(
      fixture,
      runs.filter((run) => fixtureKey(run.fixture) === fixtureKey(fixture)),
    ),
  )
  const trace = adapter.getOperationTrace()
  const failures: string[] = []
  if (measuredRuns < HEXAGONAL_COLUMN_BENCHMARK_RUNS) {
    failures.push(`measured-runs-below-${HEXAGONAL_COLUMN_BENCHMARK_RUNS}`)
  }

  const count20 = summaries.find((summary) => summary.fixture.count === 20)
  const totalP95 = count20?.phases.totalMs.p95Ms
  if (totalP95 === undefined || totalP95 >= 2_000) {
    failures.push('count-20-total-p95-must-be-under-2000ms')
  }
  if (trace.stepImports > 1) failures.push('per-column-step-import-detected')
  if (trace.fuseOperations > 0) failures.push('boolean-fuse-detected')

  return {
    environment,
    warmupRuns: 1,
    measuredRuns,
    warmups,
    runs,
    summaries,
    trace,
    gate: { passed: failures.length === 0, failures },
  }
}

export function createHexagonalColumnBenchmarkAdapter(): HexagonalColumnBenchmarkAdapter {
  let reference: Shape3D | null = null
  let stepImports = 0

  return {
    async loadReference() {
      if (!reference) {
        reference = await loadHexagonalColumnReference()
        stepImports += 1
      }
      return reference
    },
    build(parameters, loadedReference, context) {
      return buildHexagonalColumn(parameters, {
        reference: loadedReference,
        reportPhase: context.reportPhase,
      })
    },
    mesh(shape, previewConfig) {
      return meshBRep(shape, previewConfig)
    },
    getOperationTrace() {
      return { stepImports, fuseOperations: 0 }
    },
    disposeReference() {
      deleteShape(reference)
      reference = null
    },
  }
}

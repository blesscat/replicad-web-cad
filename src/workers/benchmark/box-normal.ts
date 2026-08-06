import type { Shape3D } from 'replicad'
import {
  buildBoxNormal,
  loadBoxNormalReference,
  type BoxNormalOperationCounts,
} from '../../cad-kernel/components/box-normal/builder'
import { meshBRep, type MeshData } from '../../cad-kernel/mesh'
import {
  PROTOTYPE_CONFIGURATION,
  type BoxNormalParameters,
} from '../../cad-contract/units'

export const BOX_NORMAL_BENCHMARK_FIXTURES: readonly BoxNormalParameters[] = [
  { x: 2, y: 2, height: 10, cornerPosts: false },
  { x: 2, y: 2, height: 10, cornerPosts: true },
  { x: 3, y: 3, height: 10, cornerPosts: false },
  { x: 3, y: 3, height: 10, cornerPosts: true },
  { x: 40, y: 35, height: 10, cornerPosts: false },
  { x: 40, y: 35, height: 10, cornerPosts: true },
]

export const BOX_NORMAL_BENCHMARK_RUNS = 5

export type BoxNormalBenchmarkPhase = 'buildMs' | 'meshMs' | 'totalMs'
export type BoxNormalBenchmarkTiming = Record<BoxNormalBenchmarkPhase, number>

export type BoxNormalBenchmarkRun = {
  fixture: BoxNormalParameters
  sample: number
  timing: BoxNormalBenchmarkTiming
}

export type BoxNormalBenchmarkSummary = {
  fixture: BoxNormalParameters
  samples: number
  phases: Record<BoxNormalBenchmarkPhase, { medianMs: number; p95Ms: number }>
}

export type BoxNormalBenchmarkTrace = {
  fixture: BoxNormalParameters
  counts: BoxNormalOperationCounts
}

export type BoxNormalBenchmarkReport = {
  environment: string
  warmupRuns: number
  measuredRuns: number
  warmups: BoxNormalBenchmarkRun[]
  runs: BoxNormalBenchmarkRun[]
  summaries: BoxNormalBenchmarkSummary[]
  traces: BoxNormalBenchmarkTrace[]
  gate: { passed: boolean; failures: string[] }
}

export type BoxNormalBenchmarkBuildContext = {
  reportOperationCounts: (counts: BoxNormalOperationCounts) => void
}

export type BoxNormalBenchmarkAdapter = {
  loadReference: () => Promise<Shape3D>
  build: (
    parameters: BoxNormalParameters,
    reference: Shape3D,
    context: BoxNormalBenchmarkBuildContext,
  ) => Promise<Shape3D> | Shape3D
  mesh: (
    shape: Shape3D,
    previewConfig: { tolerance: number; angularTolerance: number },
  ) => MeshData
  disposeReference?: () => void
}

export type RunBoxNormalBenchmarkOptions = {
  adapter: BoxNormalBenchmarkAdapter
  environment: string
  fixtures?: readonly BoxNormalParameters[]
  measuredRuns?: number
  previewConfig?: { tolerance: number; angularTolerance: number }
}

function emptyTiming(): BoxNormalBenchmarkTiming {
  return { buildMs: 0, meshMs: 0, totalMs: 0 }
}

function deleteShape(shape: Shape3D | null): void {
  try {
    shape?.delete()
  } catch {
    // Benchmark cleanup must not hide the measured operation error.
  }
}

export function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

export function percentile95(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second)
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index] ?? 0
}

function fixtureKey(fixture: BoxNormalParameters): string {
  return `${fixture.x}x${fixture.y}-h${fixture.height}-${fixture.cornerPosts ? 'posts' : 'plain'}`
}

function expectedCounts(
  fixture: BoxNormalParameters,
): BoxNormalOperationCounts {
  return {
    bodyPrototype: 1,
    postInstances: fixture.cornerPosts ? 4 : 0,
    placements: fixture.cornerPosts ? 4 : 0,
    assemblyFuses: fixture.cornerPosts ? 4 : 0,
    gridCellBuilds: 0,
  }
}

function sameCounts(
  actual: BoxNormalOperationCounts,
  expected: BoxNormalOperationCounts,
): boolean {
  return (
    actual.bodyPrototype === expected.bodyPrototype &&
    actual.postInstances === expected.postInstances &&
    actual.placements === expected.placements &&
    actual.assemblyFuses === expected.assemblyFuses &&
    actual.gridCellBuilds === expected.gridCellBuilds
  )
}

async function runSample(
  adapter: BoxNormalBenchmarkAdapter,
  fixture: BoxNormalParameters,
  sample: number,
  previewConfig: { tolerance: number; angularTolerance: number },
  traces: BoxNormalBenchmarkTrace[],
): Promise<BoxNormalBenchmarkRun> {
  const reference = await adapter.loadReference()
  const timing = emptyTiming()
  let shape: Shape3D | null = null
  const totalStartedAt = performance.now()
  try {
    const buildStartedAt = performance.now()
    shape = await adapter.build(fixture, reference, {
      reportOperationCounts: (counts) => {
        traces.push({ fixture, counts })
      },
    })
    timing.buildMs = performance.now() - buildStartedAt

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
  fixture: BoxNormalParameters,
  runs: BoxNormalBenchmarkRun[],
): BoxNormalBenchmarkSummary {
  const phases = {} as BoxNormalBenchmarkSummary['phases']
  for (const phase of ['buildMs', 'meshMs', 'totalMs'] as const) {
    const values = runs.map((run) => run.timing[phase])
    phases[phase] = {
      medianMs: median(values),
      p95Ms: percentile95(values),
    }
  }
  return { fixture, samples: runs.length, phases }
}

export async function runBoxNormalBenchmark({
  adapter,
  environment,
  fixtures = BOX_NORMAL_BENCHMARK_FIXTURES,
  measuredRuns = BOX_NORMAL_BENCHMARK_RUNS,
  previewConfig = {
    tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
    angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
  },
}: RunBoxNormalBenchmarkOptions): Promise<BoxNormalBenchmarkReport> {
  const warmups: BoxNormalBenchmarkRun[] = []
  const runs: BoxNormalBenchmarkRun[] = []
  const traces: BoxNormalBenchmarkTrace[] = []

  try {
    for (const fixture of fixtures) {
      warmups.push(await runSample(adapter, fixture, 0, previewConfig, traces))
    }
    for (const fixture of fixtures) {
      for (let sample = 1; sample <= measuredRuns; sample += 1) {
        runs.push(
          await runSample(adapter, fixture, sample, previewConfig, traces),
        )
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
  const failures: string[] = []
  if (measuredRuns < BOX_NORMAL_BENCHMARK_RUNS) {
    failures.push(`measured-runs-below-${BOX_NORMAL_BENCHMARK_RUNS}`)
  }
  for (const fixture of fixtures) {
    const fixtureTraces = traces.filter(
      (trace) => fixtureKey(trace.fixture) === fixtureKey(fixture),
    )
    const expected = expectedCounts(fixture)
    const expectedTraceCount = measuredRuns + 1
    if (fixtureTraces.length !== expectedTraceCount) {
      failures.push(`operation-count-missing:${fixtureKey(fixture)}`)
    } else if (
      fixtureTraces.some((trace) => !sameCounts(trace.counts, expected))
    ) {
      failures.push(`operation-count-mismatch:${fixtureKey(fixture)}`)
    }
  }

  return {
    environment,
    warmupRuns: 1,
    measuredRuns,
    warmups,
    runs,
    summaries,
    traces,
    gate: { passed: failures.length === 0, failures },
  }
}

export function createBoxNormalBenchmarkAdapter(): BoxNormalBenchmarkAdapter {
  let reference: Shape3D | null = null

  return {
    async loadReference() {
      if (!reference) reference = await loadBoxNormalReference()
      return reference
    },
    build(parameters, loadedReference, context) {
      return buildBoxNormal(parameters, loadedReference, {
        reportOperationCounts: context.reportOperationCounts,
      })
    },
    mesh(shape, previewConfig) {
      return meshBRep(shape, previewConfig)
    },
    disposeReference() {
      deleteShape(reference)
      reference = null
    },
  }
}

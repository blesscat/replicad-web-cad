import type { Shape3D } from 'replicad'
import { exportStepBytes } from '../../cad-kernel/export'
import {
  buildModularGridBaseWithStrategy,
  type ModularGridAssemblyStrategy,
  type ModularGridBaseBuildContext,
} from '../../cad-kernel/components/modular-grid-base/builder'
import { meshBRep, type MeshData } from '../../cad-kernel/mesh'
import {
  PROTOTYPE_CONFIGURATION,
  type BoxBounds,
  type ModularGridBaseParameters,
} from '../../cad-contract/units'

export const MODULAR_GRID_BENCHMARK_FIXTURES: readonly ModularGridBaseParameters[] =
  [
    { rows: 1, columns: 1 },
    { rows: 2, columns: 2 },
    { rows: 5, columns: 5 },
    { rows: 10, columns: 10 },
    { rows: 20, columns: 20 },
    { rows: 25, columns: 25 },
  ]

export const MODULAR_GRID_BENCHMARK_RUNS = 5

export type BenchmarkPhase =
  | 'templateMs'
  | 'cloneTranslateMs'
  | 'assemblyFuseMs'
  | 'filletMs'
  | 'meshMs'
  | 'totalMs'

export type BenchmarkEnvironment = {
  browserBuildMode: string
  dependencyLockfileVersion: string
  referenceEnvironment: string
}

export type BenchmarkQuality = {
  bounds: BoxBounds
  meshTriangleCount: number
  shapeType: string
  singleSolid: boolean
  stepByteLength: number | null
}

export type BenchmarkTiming = Record<BenchmarkPhase, number>

export type BenchmarkRun = {
  strategy: ModularGridAssemblyStrategy
  fixture: ModularGridBaseParameters
  sample: number
  timing: BenchmarkTiming
  quality: BenchmarkQuality
}

export type BenchmarkFailure = {
  strategy: ModularGridAssemblyStrategy
  fixture: ModularGridBaseParameters
  sample: number
  phase: string
  message: string
}

export type BenchmarkPhaseSummary = {
  medianMs: number
  p95Ms: number
}

export type BenchmarkSummary = {
  strategy: ModularGridAssemblyStrategy
  fixture: ModularGridBaseParameters
  samples: number
  medianMs: number
  p95Ms: number
  stepByteLength?: number
  phases?: Partial<Record<BenchmarkPhase, BenchmarkPhaseSummary>>
}

export type BenchmarkReport = {
  environment: BenchmarkEnvironment
  measuredRuns: number
  warmupRuns: number
  warmups: BenchmarkRun[]
  runs: BenchmarkRun[]
  failures: BenchmarkFailure[]
  summaries: BenchmarkSummary[]
  gate: PerformanceGateResult
}

export type PerformanceGateResult = {
  passed: boolean
  failures: string[]
  warnings: string[]
}

export type ModularGridBenchmarkAdapter = {
  loadTemplate: () => Promise<Shape3D>
  build: (
    parameters: ModularGridBaseParameters,
    template: Shape3D,
    strategy: ModularGridAssemblyStrategy,
    context: ModularGridBaseBuildContext,
  ) => Shape3D | Promise<Shape3D>
  mesh: (
    shape: Shape3D,
    previewConfig: { tolerance: number; angularTolerance: number },
  ) => MeshData
  exportStep: (shape: Shape3D) => Promise<ArrayBuffer>
}

export type RunModularGridBenchmarkOptions = {
  adapter: ModularGridBenchmarkAdapter
  environment: BenchmarkEnvironment
  fixtures?: readonly ModularGridBaseParameters[]
  measuredRuns?: number
  previewConfig?: { tolerance: number; angularTolerance: number }
  strategies?: readonly ModularGridAssemblyStrategy[]
}

function fixtureKey(fixture: ModularGridBaseParameters): string {
  return `${fixture.rows}x${fixture.columns}`
}

function benchmarkKey(
  strategy: ModularGridAssemblyStrategy,
  fixture: ModularGridBaseParameters,
): string {
  return `${strategy}:${fixtureKey(fixture)}`
}

function readBounds(shape: Shape3D): BoxBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as [
      [number, number, number],
      [number, number, number],
    ]
    return { min, max }
  } finally {
    boundingBox.delete()
  }
}

function emptyTiming(): BenchmarkTiming {
  return {
    templateMs: 0,
    cloneTranslateMs: 0,
    assemblyFuseMs: 0,
    filletMs: 0,
    meshMs: 0,
    totalMs: 0,
  }
}

function deleteShape(shape: Shape3D | null): void {
  try {
    shape?.delete()
  } catch {
    // Benchmark cleanup must not hide the measured operation result.
  }
}

function collectOptionalGarbage(): void {
  const candidate = globalThis as typeof globalThis & { gc?: () => void }
  candidate.gc?.()
}

class BenchmarkSampleFailure extends Error {
  constructor(
    readonly strategy: ModularGridAssemblyStrategy,
    readonly fixture: ModularGridBaseParameters,
    readonly sample: number,
    readonly phase: string,
    message: string,
  ) {
    super(
      `BENCHMARK_SAMPLE_FAILED:${strategy}:${fixtureKey(fixture)}:${sample}:${phase}:${message}`,
    )
    this.name = 'BenchmarkSampleFailure'
  }
}

function benchmarkFailure(
  strategy: ModularGridAssemblyStrategy,
  fixture: ModularGridBaseParameters,
  sample: number,
  phase: string,
  error: unknown,
): Error {
  const message = error instanceof Error ? error.message : String(error)
  return new BenchmarkSampleFailure(strategy, fixture, sample, phase, message)
}

function benchmarkFailureRecord(
  strategy: ModularGridAssemblyStrategy,
  fixture: ModularGridBaseParameters,
  sample: number,
  error: unknown,
): BenchmarkFailure {
  if (error instanceof BenchmarkSampleFailure) {
    return {
      strategy: error.strategy,
      fixture: error.fixture,
      sample: error.sample,
      phase: error.phase,
      message: error.message,
    }
  }
  return {
    strategy,
    fixture,
    sample,
    phase: 'unknown',
    message: error instanceof Error ? error.message : String(error),
  }
}

async function runSample(
  adapter: ModularGridBenchmarkAdapter,
  fixture: ModularGridBaseParameters,
  strategy: ModularGridAssemblyStrategy,
  sample: number,
  previewConfig: { tolerance: number; angularTolerance: number },
  includeStepQuality: boolean,
): Promise<BenchmarkRun> {
  const timing = emptyTiming()
  const totalStartedAt = performance.now()
  const templateStartedAt = performance.now()
  let template: Shape3D
  try {
    template = await adapter.loadTemplate()
  } catch (error) {
    throw benchmarkFailure(strategy, fixture, sample, 'template', error)
  }
  timing.templateMs = performance.now() - templateStartedAt
  let shape: Shape3D | null = null

  try {
    const phaseTimings: Partial<
      Record<'clone-translate' | 'assembly-fuse' | 'fillet', number>
    > = {}
    try {
      shape = await adapter.build(fixture, template, strategy, {
        reportPhase: (phase, durationMs) => {
          phaseTimings[phase] = (phaseTimings[phase] ?? 0) + durationMs
        },
      })
    } catch (error) {
      throw benchmarkFailure(strategy, fixture, sample, 'build', error)
    }
    timing.cloneTranslateMs = phaseTimings['clone-translate'] ?? 0
    timing.assemblyFuseMs = phaseTimings['assembly-fuse'] ?? 0
    timing.filletMs = phaseTimings.fillet ?? 0

    const meshStartedAt = performance.now()
    let mesh: MeshData
    try {
      mesh = adapter.mesh(shape, previewConfig)
    } catch (error) {
      throw benchmarkFailure(strategy, fixture, sample, 'mesh', error)
    }
    timing.meshMs = performance.now() - meshStartedAt
    const generationFinishedAt = performance.now()
    let stepByteLength: number | null = null
    if (includeStepQuality) {
      let step: ArrayBuffer
      try {
        step = await adapter.exportStep(shape)
      } catch (error) {
        throw benchmarkFailure(strategy, fixture, sample, 'step', error)
      }
      stepByteLength = step.byteLength
    }
    timing.totalMs = generationFinishedAt - totalStartedAt

    return {
      strategy,
      fixture,
      sample,
      timing,
      quality: {
        bounds: readBounds(shape),
        meshTriangleCount: mesh.triangleCount,
        shapeType: shape.constructor.name,
        singleSolid: shape.constructor.name === 'Solid',
        stepByteLength,
      },
    }
  } finally {
    deleteShape(shape)
    deleteShape(template)
  }
}

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('BENCHMARK_SAMPLES_EMPTY')
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function percentile95(values: readonly number[]): number {
  if (values.length === 0) throw new Error('BENCHMARK_SAMPLES_EMPTY')
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index]
}

function summarizeRuns(runs: BenchmarkRun[]): BenchmarkSummary {
  const first = runs[0]
  if (!first) throw new Error('BENCHMARK_SAMPLES_EMPTY')
  const phases = Object.fromEntries(
    (Object.keys(first.timing) as BenchmarkPhase[]).map((phase) => [
      phase,
      {
        medianMs: median(runs.map((run) => run.timing[phase])),
        p95Ms: percentile95(runs.map((run) => run.timing[phase])),
      },
    ]),
  ) as Partial<Record<BenchmarkPhase, BenchmarkPhaseSummary>>

  return {
    strategy: first.strategy,
    fixture: first.fixture,
    samples: runs.length,
    medianMs: median(runs.map((run) => run.timing.totalMs)),
    p95Ms: percentile95(runs.map((run) => run.timing.totalMs)),
    stepByteLength:
      runs.find((run) => run.quality.stepByteLength !== null)?.quality
        .stepByteLength ?? undefined,
    phases,
  }
}

function expectedSummary(
  summaries: readonly BenchmarkSummary[],
  strategy: ModularGridAssemblyStrategy,
  fixture: ModularGridBaseParameters,
): BenchmarkSummary | undefined {
  return summaries.find(
    (summary) =>
      summary.strategy === strategy &&
      fixtureKey(summary.fixture) === fixtureKey(fixture),
  )
}

export function evaluatePerformanceGate(
  summaries: readonly BenchmarkSummary[],
  failures: readonly BenchmarkFailure[] = [],
): PerformanceGateResult {
  const gateFailures: string[] = []
  const warnings: string[] = []
  const smallFixtures = [
    { rows: 1, columns: 1 },
    { rows: 2, columns: 2 },
  ] as const
  const largeFixtures = [
    { rows: 10, columns: 10 },
    { rows: 25, columns: 25 },
  ] as const

  for (const fixture of smallFixtures) {
    const baseline = expectedSummary(summaries, 'sequential', fixture)
    const optimized = expectedSummary(summaries, 'balanced', fixture)
    if (
      !baseline ||
      !optimized ||
      baseline.samples < MODULAR_GRID_BENCHMARK_RUNS ||
      optimized.samples < MODULAR_GRID_BENCHMARK_RUNS
    ) {
      gateFailures.push(
        `missing small-grid comparison for ${fixtureKey(fixture)}`,
      )
      continue
    }
    if (optimized.medianMs > baseline.medianMs * 1.1) {
      gateFailures.push(
        `small-grid regression over 10% for ${fixtureKey(fixture)}`,
      )
    }
  }

  for (const fixture of largeFixtures) {
    const baseline = expectedSummary(summaries, 'sequential', fixture)
    const optimized = expectedSummary(summaries, 'balanced', fixture)
    if (!optimized || optimized.samples < MODULAR_GRID_BENCHMARK_RUNS) {
      gateFailures.push(
        `missing optimized large-grid result for ${fixtureKey(fixture)}`,
      )
      continue
    }
    if (!baseline || baseline.samples < MODULAR_GRID_BENCHMARK_RUNS) {
      const baselineFailure = failures.find(
        (failure) =>
          failure.strategy === 'sequential' &&
          fixtureKey(failure.fixture) === fixtureKey(fixture),
      )
      if (!baselineFailure) {
        gateFailures.push(
          `missing large-grid comparison for ${fixtureKey(fixture)}`,
        )
        continue
      }
      if (optimized.medianMs > PROTOTYPE_CONFIGURATION.operationTimeoutMs) {
        gateFailures.push(
          `optimized large-grid result exceeds operation timeout for ${fixtureKey(fixture)}`,
        )
      } else {
        warnings.push(
          `sequential baseline unavailable for ${fixtureKey(fixture)} (${baselineFailure.phase}); relative improvement gate was not evaluated`,
        )
      }
      continue
    }
    if (optimized.medianMs > baseline.medianMs * 0.8) {
      gateFailures.push(
        `large-grid improvement under 20% for ${fixtureKey(fixture)}`,
      )
    }
  }

  return { passed: gateFailures.length === 0, failures: gateFailures, warnings }
}

export async function runModularGridBenchmark(
  options: RunModularGridBenchmarkOptions,
): Promise<BenchmarkReport> {
  const fixtures = options.fixtures ?? MODULAR_GRID_BENCHMARK_FIXTURES
  const measuredRuns = Math.max(
    MODULAR_GRID_BENCHMARK_RUNS,
    options.measuredRuns ?? MODULAR_GRID_BENCHMARK_RUNS,
  )
  const previewConfig = options.previewConfig ?? {
    tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
    angularTolerance: 0.1,
  }
  const strategies = options.strategies ?? (['sequential', 'balanced'] as const)
  const warmups: BenchmarkRun[] = []
  const runs: BenchmarkRun[] = []
  const failures: BenchmarkFailure[] = []
  const stepQuality = new Map<string, number>()

  for (const fixture of fixtures) {
    for (const strategy of strategies) {
      let warmup: BenchmarkRun
      try {
        warmup = await runSample(
          options.adapter,
          fixture,
          strategy,
          0,
          previewConfig,
          true,
        )
      } catch (error) {
        failures.push(benchmarkFailureRecord(strategy, fixture, 0, error))
        collectOptionalGarbage()
        continue
      }
      warmups.push(warmup)
      if (warmup.quality.stepByteLength !== null) {
        stepQuality.set(
          benchmarkKey(strategy, fixture),
          warmup.quality.stepByteLength,
        )
      }
      collectOptionalGarbage()
      for (let sample = 1; sample <= measuredRuns; sample += 1) {
        try {
          runs.push(
            await runSample(
              options.adapter,
              fixture,
              strategy,
              sample,
              previewConfig,
              false,
            ),
          )
          collectOptionalGarbage()
        } catch (error) {
          failures.push(
            benchmarkFailureRecord(strategy, fixture, sample, error),
          )
          collectOptionalGarbage()
          break
        }
      }
    }
  }

  const summaries: BenchmarkSummary[] = []
  for (const fixture of fixtures) {
    for (const strategy of strategies) {
      const matchingRuns = runs.filter(
        (run) =>
          run.strategy === strategy &&
          fixtureKey(run.fixture) === fixtureKey(fixture),
      )
      if (matchingRuns.length === 0) continue
      const summary = summarizeRuns(matchingRuns)
      summary.stepByteLength = stepQuality.get(benchmarkKey(strategy, fixture))
      summaries.push(summary)
    }
  }

  return {
    environment: options.environment,
    measuredRuns,
    warmupRuns: fixtures.length * strategies.length,
    warmups,
    runs,
    failures,
    summaries,
    gate: evaluatePerformanceGate(summaries, failures),
  }
}

export function createDefaultModularGridBenchmarkAdapter(
  loadTemplate: () => Promise<Shape3D>,
): ModularGridBenchmarkAdapter {
  return {
    loadTemplate,
    build: (parameters, template, strategy, context) =>
      buildModularGridBaseWithStrategy(parameters, template, strategy, context),
    mesh: meshBRep,
    exportStep: exportStepBytes,
  }
}

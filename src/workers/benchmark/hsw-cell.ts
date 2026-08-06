import type { Shape3D } from 'replicad'
import { exportStlBytes, exportStepBytes } from '../../cad-kernel/export'
import {
  buildHswCellWithStrategy,
  type HswCellAssemblyStrategy,
  type HswCellBuildContext,
} from '../../cad-kernel/components/hsw-cell/builder'
import { meshBRep, type MeshData } from '../../cad-kernel/mesh'
import {
  boundsForHswCell,
  PROTOTYPE_CONFIGURATION,
  type BoxBounds,
  type HswCellParameters,
} from '../../cad-contract/units'

export const HSW_CELL_BENCHMARK_FIXTURES: readonly HswCellParameters[] = [
  { rows: 1, columns: 1 },
  { rows: 2, columns: 2 },
  { rows: 5, columns: 5 },
  { rows: 10, columns: 10 },
  { rows: 20, columns: 20 },
]

export const HSW_CELL_BENCHMARK_RUNS = 5

export type HswBenchmarkPhase =
  'cloneTranslateMs' | 'assemblyFuseMs' | 'meshMs' | 'totalMs'

export type HswBenchmarkEnvironment = {
  browserBuildMode: string
  dependencyLockfileVersion: string
  referenceEnvironment: string
}

export type HswBenchmarkQuality = {
  bounds: BoxBounds
  meshTriangleCount: number
  openingCount: number
  sharpEdgeCount: number
  singleSolid: boolean
  stepByteLength: number | null
  stlByteLength: number | null
  stlTriangleCount: number | null
}

export type HswBenchmarkTiming = Record<HswBenchmarkPhase, number>

export type HswBenchmarkRun = {
  strategy: HswCellAssemblyStrategy
  fixture: HswCellParameters
  sample: number
  timing: HswBenchmarkTiming
  quality: HswBenchmarkQuality
}

export type HswBenchmarkFailure = {
  strategy: HswCellAssemblyStrategy
  fixture: HswCellParameters
  sample: number
  phase: string
  message: string
}

export type HswBenchmarkPhaseSummary = {
  medianMs: number
  p95Ms: number
}

export type HswBenchmarkSummary = {
  strategy: HswCellAssemblyStrategy
  fixture: HswCellParameters
  samples: number
  medianMs: number
  p95Ms: number
  phases: Record<HswBenchmarkPhase, HswBenchmarkPhaseSummary>
  stepByteLength?: number
  stlByteLength?: number
  stlTriangleCount?: number
}

export type HswGeometryComparison = {
  fixture: HswCellParameters
  equivalent: boolean
  reason?: string
}

export type HswPerformanceGateResult = {
  passed: boolean
  failures: string[]
  warnings: string[]
}

export type HswBenchmarkReport = {
  environment: HswBenchmarkEnvironment
  coldAssetImportMs: number | null
  coldAssetImport: HswBenchmarkPhaseSummary | null
  measuredRuns: number
  warmupRuns: number
  warmups: HswBenchmarkRun[]
  runs: HswBenchmarkRun[]
  failures: HswBenchmarkFailure[]
  summaries: HswBenchmarkSummary[]
  geometry: HswGeometryComparison[]
  gate: HswPerformanceGateResult
}

export type HswBenchmarkAdapter = {
  loadTemplate: () => Promise<Shape3D>
  build: (
    parameters: HswCellParameters,
    template: Shape3D,
    strategy: HswCellAssemblyStrategy,
    context: HswCellBuildContext,
  ) => Shape3D | Promise<Shape3D>
  mesh: (
    shape: Shape3D,
    previewConfig: { tolerance: number; angularTolerance: number },
  ) => MeshData
  inspect: (shape: Shape3D, mesh: MeshData) => HswBenchmarkQuality
  exportStep: (shape: Shape3D) => Promise<ArrayBuffer>
  exportStl: (shape: Shape3D) => Promise<ArrayBuffer>
}

export type RunHswBenchmarkOptions = {
  adapter: HswBenchmarkAdapter
  environment: HswBenchmarkEnvironment
  fixtures?: readonly HswCellParameters[]
  measuredRuns?: number
  previewConfig?: { tolerance: number; angularTolerance: number }
  strategies?: readonly HswCellAssemblyStrategy[]
}

function fixtureKey(fixture: HswCellParameters): string {
  return `${fixture.rows}x${fixture.columns}`
}

function benchmarkKey(
  strategy: HswCellAssemblyStrategy,
  fixture: HswCellParameters,
): string {
  return `${strategy}:${fixtureKey(fixture)}`
}

function emptyTiming(): HswBenchmarkTiming {
  return {
    cloneTranslateMs: 0,
    assemblyFuseMs: 0,
    meshMs: 0,
    totalMs: 0,
  }
}

function summarizeSingleTiming(
  durationMs: number | null,
): HswBenchmarkPhaseSummary | null {
  if (durationMs === null) return null
  return { medianMs: durationMs, p95Ms: durationMs }
}

type Deletable = { delete?: () => void }

function deleteShape(shape: Deletable | null): void {
  try {
    shape?.delete?.()
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
    readonly strategy: HswCellAssemblyStrategy,
    readonly fixture: HswCellParameters,
    readonly sample: number,
    readonly phase: string,
    message: string,
  ) {
    super(
      `HSW_BENCHMARK_SAMPLE_FAILED:${strategy}:${fixtureKey(fixture)}:${sample}:${phase}:${message}`,
    )
    this.name = 'BenchmarkSampleFailure'
  }
}

function benchmarkFailure(
  strategy: HswCellAssemblyStrategy,
  fixture: HswCellParameters,
  sample: number,
  phase: string,
  error: unknown,
): Error {
  const message = error instanceof Error ? error.message : String(error)
  return new BenchmarkSampleFailure(strategy, fixture, sample, phase, message)
}

function benchmarkFailureRecord(
  strategy: HswCellAssemblyStrategy,
  fixture: HswCellParameters,
  sample: number,
  error: unknown,
): HswBenchmarkFailure {
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
  adapter: HswBenchmarkAdapter,
  template: Shape3D,
  fixture: HswCellParameters,
  strategy: HswCellAssemblyStrategy,
  sample: number,
  previewConfig: { tolerance: number; angularTolerance: number },
  includeExportQuality: boolean,
): Promise<HswBenchmarkRun> {
  const timing = emptyTiming()
  const totalStartedAt = performance.now()
  let shape: Shape3D | null = null

  try {
    const phaseTimings: Partial<
      Record<'clone-translate' | 'assembly-fuse', number>
    > = {}
    try {
      shape = await adapter.build(fixture, template, strategy, {
        reportPhase: (phase, durationMs) => {
          phaseTimings[phase] = durationMs
        },
      })
    } catch (error) {
      throw benchmarkFailure(strategy, fixture, sample, 'build', error)
    }

    timing.cloneTranslateMs = phaseTimings['clone-translate'] ?? 0
    timing.assemblyFuseMs = phaseTimings['assembly-fuse'] ?? 0

    const meshStartedAt = performance.now()
    let mesh: MeshData
    try {
      mesh = adapter.mesh(shape, previewConfig)
    } catch (error) {
      throw benchmarkFailure(strategy, fixture, sample, 'mesh', error)
    }
    timing.meshMs = performance.now() - meshStartedAt

    timing.totalMs = performance.now() - totalStartedAt
    let quality: HswBenchmarkQuality
    try {
      quality = adapter.inspect(shape, mesh)
    } catch (error) {
      throw benchmarkFailure(strategy, fixture, sample, 'inspect', error)
    }
    if (includeExportQuality) {
      let stepBytes: ArrayBuffer
      let stlBytes: ArrayBuffer
      try {
        stepBytes = await adapter.exportStep(shape)
        stlBytes = await adapter.exportStl(shape)
      } catch (error) {
        throw benchmarkFailure(strategy, fixture, sample, 'export', error)
      }
      quality = {
        ...quality,
        stepByteLength: stepBytes.byteLength,
        stlByteLength: stlBytes.byteLength,
        stlTriangleCount: parseBinaryStlTriangleCount(stlBytes),
      }
    }

    return { strategy, fixture, sample, timing, quality }
  } finally {
    deleteShape(shape)
  }
}

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('HSW_BENCHMARK_SAMPLES_EMPTY')
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function percentile95(values: readonly number[]): number {
  if (values.length === 0) throw new Error('HSW_BENCHMARK_SAMPLES_EMPTY')
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index]
}

function summarizeRuns(runs: HswBenchmarkRun[]): HswBenchmarkSummary {
  const first = runs[0]
  if (!first) throw new Error('HSW_BENCHMARK_SAMPLES_EMPTY')
  const phases = {} as Record<HswBenchmarkPhase, HswBenchmarkPhaseSummary>
  for (const phase of Object.keys(first.timing) as HswBenchmarkPhase[]) {
    phases[phase] = {
      medianMs: median(runs.map((run) => run.timing[phase])),
      p95Ms: percentile95(runs.map((run) => run.timing[phase])),
    }
  }

  const stepByteLength = runs.find((run) => run.quality.stepByteLength !== null)
    ?.quality.stepByteLength
  const stlByteLength = runs.find((run) => run.quality.stlByteLength !== null)
    ?.quality.stlByteLength
  const stlTriangleCount = runs.find(
    (run) => run.quality.stlTriangleCount !== null,
  )?.quality.stlTriangleCount
  const summary: HswBenchmarkSummary = {
    strategy: first.strategy,
    fixture: first.fixture,
    samples: runs.length,
    medianMs: median(runs.map((run) => run.timing.totalMs)),
    p95Ms: percentile95(runs.map((run) => run.timing.totalMs)),
    phases,
  }
  if (stepByteLength !== undefined && stepByteLength !== null) {
    summary.stepByteLength = stepByteLength
  }
  if (stlByteLength !== undefined && stlByteLength !== null) {
    summary.stlByteLength = stlByteLength
  }
  if (stlTriangleCount !== undefined && stlTriangleCount !== null) {
    summary.stlTriangleCount = stlTriangleCount
  }
  return summary
}

function expectedSummary(
  summaries: readonly HswBenchmarkSummary[],
  strategy: HswCellAssemblyStrategy,
  fixture: HswCellParameters,
): HswBenchmarkSummary | undefined {
  return summaries.find(
    (summary) =>
      summary.strategy === strategy &&
      fixtureKey(summary.fixture) === fixtureKey(fixture),
  )
}

function closeEnough(first: number, second: number, tolerance = 0.01): boolean {
  return Math.abs(first - second) <= tolerance
}

function boundsAreEquivalent(first: BoxBounds, second: BoxBounds): boolean {
  const minMatches = first.min.every((value, index) =>
    closeEnough(value, second.min[index]),
  )
  const maxMatches = first.max.every((value, index) =>
    closeEnough(value, second.max[index]),
  )
  return minMatches && maxMatches
}

function meshQualityIsEquivalent(first: number, second: number): boolean {
  const difference = Math.abs(first - second)
  const allowedDifference = Math.max(10, Math.max(first, second) * 0.1)
  return difference <= allowedDifference
}

function topologyIsEquivalent(
  first: HswBenchmarkQuality,
  second: HswBenchmarkQuality,
): boolean {
  const solidsAreValid = first.singleSolid && second.singleSolid
  const openingsMatch = first.openingCount === second.openingCount
  const sharpGeometryPresent =
    first.sharpEdgeCount > 0 && second.sharpEdgeCount > 0
  const meshIsPresent =
    first.meshTriangleCount > 0 && second.meshTriangleCount > 0
  const stlStructurePresent =
    (first.stlTriangleCount === null || first.stlTriangleCount > 0) &&
    (second.stlTriangleCount === null || second.stlTriangleCount > 0)
  const meshMatches = meshQualityIsEquivalent(
    first.meshTriangleCount,
    second.meshTriangleCount,
  )
  return (
    solidsAreValid &&
    openingsMatch &&
    sharpGeometryPresent &&
    meshIsPresent &&
    stlStructurePresent &&
    meshMatches
  )
}

function parseBinaryStlTriangleCount(bytes: ArrayBuffer): number {
  if (bytes.byteLength < 84) {
    throw new Error('HSW_STL_INVALID_HEADER')
  }
  const view = new DataView(bytes)
  const triangleCount = view.getUint32(80, true)
  const expectedByteLength = 84 + triangleCount * 50
  if (triangleCount === 0 || expectedByteLength !== bytes.byteLength) {
    throw new Error('HSW_STL_INVALID_STRUCTURE')
  }
  return triangleCount
}

export function compareHswGeometry(
  warmups: readonly HswBenchmarkRun[],
  fixtures: readonly HswCellParameters[],
): HswGeometryComparison[] {
  return fixtures.map((fixture) => {
    const sequential = warmups.find(
      (run) =>
        run.strategy === 'sequential' &&
        fixtureKey(run.fixture) === fixtureKey(fixture),
    )
    const column = warmups.find(
      (run) =>
        run.strategy === 'column' &&
        fixtureKey(run.fixture) === fixtureKey(fixture),
    )
    if (!sequential || !column) {
      return {
        fixture,
        equivalent: false,
        reason: 'missing sequential or column warm-up',
      }
    }

    const boundsMatch = boundsAreEquivalent(
      sequential.quality.bounds,
      column.quality.bounds,
    )
    const qualityMatch = topologyIsEquivalent(
      sequential.quality,
      column.quality,
    )
    if (!boundsMatch || !qualityMatch) {
      return {
        fixture,
        equivalent: false,
        reason: 'bounds, topology, sharpness, or mesh quality differs',
      }
    }
    return { fixture, equivalent: true }
  })
}

export function evaluateHswPerformanceGate(
  summaries: readonly HswBenchmarkSummary[],
  failures: readonly HswBenchmarkFailure[] = [],
  geometry: readonly HswGeometryComparison[] = [],
): HswPerformanceGateResult {
  const gateFailures: string[] = []
  const warnings: string[] = []
  const smallFixtures = [
    { rows: 1, columns: 1 },
    { rows: 2, columns: 2 },
  ] as const
  const largeFixtures = [
    { rows: 10, columns: 10 },
    { rows: 20, columns: 20 },
  ] as const

  for (const comparison of geometry) {
    if (!comparison.equivalent) {
      const baselineUnavailable = failures.some(
        (failure) =>
          failure.strategy === 'sequential' &&
          fixtureKey(failure.fixture) === fixtureKey(comparison.fixture),
      )
      const optimizedAvailable = summaries.some(
        (summary) =>
          summary.strategy === 'column' &&
          fixtureKey(summary.fixture) === fixtureKey(comparison.fixture),
      )
      if (baselineUnavailable && optimizedAvailable) {
        warnings.push(
          `geometry comparison unavailable for ${fixtureKey(comparison.fixture)} because the sequential baseline failed`,
        )
        continue
      }
      gateFailures.push(
        `geometry mismatch for ${fixtureKey(comparison.fixture)} (${comparison.reason ?? 'unknown'})`,
      )
    }
  }

  for (const fixture of smallFixtures) {
    const baseline = expectedSummary(summaries, 'sequential', fixture)
    const optimized = expectedSummary(summaries, 'column', fixture)
    if (
      !baseline ||
      !optimized ||
      baseline.samples < HSW_CELL_BENCHMARK_RUNS ||
      optimized.samples < HSW_CELL_BENCHMARK_RUNS
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
    const optimized = expectedSummary(summaries, 'column', fixture)
    if (!optimized || optimized.samples < HSW_CELL_BENCHMARK_RUNS) {
      gateFailures.push(
        `missing optimized large-grid result for ${fixtureKey(fixture)}`,
      )
      continue
    }
    if (!baseline || baseline.samples < HSW_CELL_BENCHMARK_RUNS) {
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

export async function runHswCellBenchmark(
  options: RunHswBenchmarkOptions,
): Promise<HswBenchmarkReport> {
  const fixtures = options.fixtures ?? HSW_CELL_BENCHMARK_FIXTURES
  const measuredRuns = Math.max(
    HSW_CELL_BENCHMARK_RUNS,
    options.measuredRuns ?? HSW_CELL_BENCHMARK_RUNS,
  )
  const previewConfig = options.previewConfig ?? {
    tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
    angularTolerance: 0.1,
  }
  const strategies = options.strategies ?? (['column', 'sequential'] as const)
  const warmups: HswBenchmarkRun[] = []
  const runs: HswBenchmarkRun[] = []
  const failures: HswBenchmarkFailure[] = []
  const stepQuality = new Map<string, number>()
  const stlQuality = new Map<string, number>()
  const stlTriangleQuality = new Map<string, number>()
  let template: Shape3D | null = null
  let coldAssetImportMs: number | null = null

  const templateStartedAt = performance.now()
  try {
    template = await options.adapter.loadTemplate()
    coldAssetImportMs = performance.now() - templateStartedAt
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    for (const fixture of fixtures) {
      for (const strategy of strategies) {
        failures.push({
          strategy,
          fixture,
          sample: 0,
          phase: 'template',
          message,
        })
      }
    }
  }

  if (template) {
    for (const fixture of fixtures) {
      for (const strategy of strategies) {
        let warmup: HswBenchmarkRun
        try {
          warmup = await runSample(
            options.adapter,
            template,
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
        if (warmup.quality.stlByteLength !== null) {
          stlQuality.set(
            benchmarkKey(strategy, fixture),
            warmup.quality.stlByteLength,
          )
        }
        if (warmup.quality.stlTriangleCount !== null) {
          stlTriangleQuality.set(
            benchmarkKey(strategy, fixture),
            warmup.quality.stlTriangleCount,
          )
        }
        collectOptionalGarbage()

        for (let sample = 1; sample <= measuredRuns; sample += 1) {
          try {
            runs.push(
              await runSample(
                options.adapter,
                template,
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
          }
        }
      }
    }
  }

  deleteShape(template)

  const summaries: HswBenchmarkSummary[] = []
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
      summary.stlByteLength = stlQuality.get(benchmarkKey(strategy, fixture))
      summary.stlTriangleCount = stlTriangleQuality.get(
        benchmarkKey(strategy, fixture),
      )
      summaries.push(summary)
    }
  }

  const geometry = compareHswGeometry(warmups, fixtures)
  return {
    environment: options.environment,
    coldAssetImportMs,
    coldAssetImport: summarizeSingleTiming(coldAssetImportMs),
    measuredRuns,
    warmupRuns: fixtures.length * strategies.length,
    warmups,
    runs,
    failures,
    summaries,
    geometry,
    gate: evaluateHswPerformanceGate(summaries, failures, geometry),
  }
}

export function createDefaultHswBenchmarkAdapter(
  loadTemplate: () => Promise<Shape3D>,
): HswBenchmarkAdapter {
  return {
    loadTemplate,
    build: (parameters, template, strategy, context) =>
      buildHswCellWithStrategy(parameters, template, strategy, context),
    mesh: meshBRep,
    inspect: (shape, mesh) => inspectHswShape(shape, mesh),
    exportStep: exportStepBytes,
    exportStl: exportStlBytes,
  }
}

function countTopOpenings(shape: Shape3D): number {
  let count = 0
  for (const face of shape.faces) {
    const center = face.center
    const isTop = face.geomType === 'PLANE' && Math.abs(center.z - 8) <= 0.01
    deleteShape(center)
    if (!isTop) {
      deleteShape(face)
      continue
    }
    const wires = face.innerWires()
    count += wires.length
    for (const wire of wires) deleteShape(wire)
    deleteShape(face)
  }
  return count
}

function countSharpEdges(shape: Shape3D): number {
  let count = 0
  for (const edge of shape.edges) {
    if (edge.geomType === 'LINE') count += 1
    deleteShape(edge)
  }
  return count
}

export function inspectHswShape(
  shape: Shape3D,
  mesh: MeshData,
): HswBenchmarkQuality {
  const bounds = {
    min: [...mesh.bounds.min] as [number, number, number],
    max: [...mesh.bounds.max] as [number, number, number],
  }
  let openingCount: number
  try {
    openingCount = countTopOpenings(shape)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`HSW_OPENING_INSPECTION_FAILED:${message}`)
  }
  let sharpEdgeCount: number
  try {
    sharpEdgeCount = countSharpEdges(shape)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`HSW_EDGE_INSPECTION_FAILED:${message}`)
  }
  return {
    bounds,
    meshTriangleCount: mesh.triangleCount,
    openingCount,
    sharpEdgeCount,
    singleSolid: shape.constructor.name === 'Solid',
    stepByteLength: null,
    stlByteLength: null,
    stlTriangleCount: null,
  }
}

export function expectedHswBounds(parameters: HswCellParameters): BoxBounds {
  return boundsForHswCell(parameters)
}

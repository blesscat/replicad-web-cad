import { getOC, measureVolume, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { exportStlBytes, exportStepBytes } from '../../cad-kernel/export'
import {
  buildOpenGridBenchmarkShape,
  deterministicCustomScrewPositions,
  expectedOpenGridBounds,
  normalizeOpenGridBenchmarkRequest,
  OPENGRID_BENCHMARK_CONFIGURATION,
  type OpenGridBenchmarkBuildContext,
  type OpenGridBenchmarkRequest,
  type OpenGridConnectorHoles,
  type OpenGridGeometryStrategy,
  type OpenGridPreviewConfig,
  type OpenGridScrewKind,
  type OpenGridScrewMode,
  type OpenGridVariant,
} from '../../cad-kernel/components/opengrid-benchmark/builder'
import { meshBRep, type MeshData } from '../../cad-kernel/mesh'
import type { BoxBounds } from '../../cad-contract/units'

export const OPENGRID_BENCHMARK_RUNS = 5
export const OPENGRID_BENCHMARK_WARMUP_RUNS = 1
export const OPENGRID_BENCHMARK_SAMPLE_TIMEOUT_MS = 120_000
export const OPENGRID_BENCHMARK_STRATEGIES: readonly OpenGridGeometryStrategy[] =
  ['whole-profile', 'row-block', 'cell-balanced']

export const OPENGRID_BENCHMARK_PREVIEW_CONFIG: OpenGridPreviewConfig = {
  tolerance: 0.05,
  angularTolerance: 0.1,
}

type FixtureScale = {
  id: string
  rows: number
  columns: number
  screwMode: OpenGridScrewMode
  screwKind: OpenGridScrewKind
  connectorHoles: OpenGridConnectorHoles
}

const FIXTURE_SCALES: readonly FixtureScale[] = [
  {
    id: '1x1',
    rows: 1,
    columns: 1,
    screwMode: 'none',
    screwKind: 'm3-through',
    connectorHoles: 'small',
  },
  {
    id: '2x2',
    rows: 2,
    columns: 2,
    screwMode: 'corners',
    screwKind: 'm4-counterbore',
    connectorHoles: 'none',
  },
  {
    id: '5x5',
    rows: 5,
    columns: 5,
    screwMode: 'custom',
    screwKind: 'm4-counterbore',
    connectorHoles: 'none',
  },
  {
    id: '10x10',
    rows: 10,
    columns: 10,
    screwMode: 'all',
    screwKind: 'm5-counterbore',
    connectorHoles: 'large',
  },
  {
    id: '17x17-max-500mm',
    rows: OPENGRID_BENCHMARK_CONFIGURATION.maxGridCount,
    columns: OPENGRID_BENCHMARK_CONFIGURATION.maxGridCount,
    screwMode: 'custom',
    screwKind: 'm3-through',
    connectorHoles: 'large',
  },
]

export type OpenGridBenchmarkFixture = {
  id: string
  variant: OpenGridVariant
  scaleId: string
  request: OpenGridBenchmarkRequest
}

function createFixture(
  variant: OpenGridVariant,
  scale: FixtureScale,
): OpenGridBenchmarkFixture {
  const customScrewPositions =
    scale.screwMode === 'custom'
      ? deterministicCustomScrewPositions(scale.rows, scale.columns)
      : undefined
  const request = normalizeOpenGridBenchmarkRequest({
    variant,
    rows: scale.rows,
    columns: scale.columns,
    screwMode: scale.screwMode,
    screwKind: scale.screwKind,
    customScrewPositions,
    connectorHoles: scale.connectorHoles,
    previewConfig: { ...OPENGRID_BENCHMARK_PREVIEW_CONFIG },
  })
  return {
    id: `${variant.toLowerCase()}-${scale.id}`,
    variant,
    scaleId: scale.id,
    request,
  }
}

export function createOpenGridBenchmarkFixtures(): OpenGridBenchmarkFixture[] {
  const fixtures: OpenGridBenchmarkFixture[] = []
  for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
    for (const scale of FIXTURE_SCALES) {
      fixtures.push(createFixture(variant, scale))
    }
  }
  return fixtures
}

export const OPENGRID_BENCHMARK_FIXTURES: readonly OpenGridBenchmarkFixture[] =
  createOpenGridBenchmarkFixtures()

export type OpenGridBenchmarkPhase =
  | 'profileMs'
  | 'extrudeMs'
  | 'assemblyFuseMs'
  | 'booleanCutMs'
  | 'meshMs'
  | 'exportMs'
  | 'totalMs'

export type OpenGridBenchmarkTiming = Record<
  OpenGridBenchmarkPhase,
  number | null
>

export type OpenGridBenchmarkRunKind = 'cold' | 'warmup' | 'measured'

export type OpenGridBenchmarkQuality = {
  passed: boolean
  failures: string[]
  bounds: BoxBounds | null
  expectedBounds: BoxBounds
  volume: number | null
  solidCount: number | null
  singleSolid: boolean
  brepValid: boolean
  centeredXY: boolean
  baseZAtZero: boolean
  meshTriangleCount: number
  stepByteLength: number
  stlByteLength: number
  stlTriangleCount: number | null
}

export type OpenGridBenchmarkRun = {
  fixtureId: string
  variant: OpenGridVariant
  strategy: OpenGridGeometryStrategy
  kind: OpenGridBenchmarkRunKind
  sample: number
  timing: OpenGridBenchmarkTiming
  quality: OpenGridBenchmarkQuality
}

export type OpenGridBenchmarkFailure = {
  fixtureId: string
  variant: OpenGridVariant
  strategy: OpenGridGeometryStrategy
  kind: OpenGridBenchmarkRunKind
  sample: number
  phase: string
  message: string
}

export type OpenGridBenchmarkPhaseSummary = {
  applicable: boolean
  medianMs: number | null
  p95Ms: number | null
}

export type OpenGridBenchmarkSummary = {
  fixtureId: string
  variant: OpenGridVariant
  strategy: OpenGridGeometryStrategy
  samples: number
  medianMs: number
  p95Ms: number
  phases: Record<OpenGridBenchmarkPhase, OpenGridBenchmarkPhaseSummary>
}

export type OpenGridStrategyRecommendation = {
  strategy: OpenGridGeometryStrategy | null
  consideredStrategies: OpenGridGeometryStrategy[]
  fallbackStrategies: OpenGridGeometryStrategy[]
  blockedFixtureIds: string[]
  fallbackConditions: string[]
  evidence: string
}

export type OpenGridBenchmarkEnvironment = {
  browserBuildMode: string
  dependencyLockfileVersion: string
  referenceEnvironment: string
  nativeExecutionEpoch: string
}

export type OpenGridBenchmarkReport = {
  environment: OpenGridBenchmarkEnvironment
  fixtures: OpenGridBenchmarkFixture[]
  measuredRuns: number
  warmupRuns: number
  sampleTimeoutMs: number
  coldRuns: OpenGridBenchmarkRun[]
  warmups: OpenGridBenchmarkRun[]
  runs: OpenGridBenchmarkRun[]
  failures: OpenGridBenchmarkFailure[]
  summaries: OpenGridBenchmarkSummary[]
  recommendations: Record<OpenGridVariant, OpenGridStrategyRecommendation>
  selectedStrategies: Record<OpenGridVariant, OpenGridGeometryStrategy | null>
}

export type OpenGridBenchmarkAdapter = {
  build: (
    fixture: OpenGridBenchmarkFixture,
    strategy: OpenGridGeometryStrategy,
    context: OpenGridBenchmarkBuildContext,
  ) => Shape3D | Promise<Shape3D>
  mesh: (shape: Shape3D, previewConfig: OpenGridPreviewConfig) => MeshData
  exportStep: (shape: Shape3D) => Promise<ArrayBuffer>
  exportStl: (shape: Shape3D) => Promise<ArrayBuffer>
  inspect?: (
    shape: Shape3D,
    fixture: OpenGridBenchmarkFixture,
    mesh: MeshData,
    stepBytes: ArrayBuffer,
    stlBytes: ArrayBuffer,
  ) => OpenGridBenchmarkQuality
}

export type RunOpenGridBenchmarkOptions = {
  adapter: OpenGridBenchmarkAdapter
  environment: OpenGridBenchmarkEnvironment
  fixtures?: readonly OpenGridBenchmarkFixture[]
  measuredRuns?: number
  warmupRuns?: number
  previewConfig?: OpenGridPreviewConfig
  strategies?: readonly OpenGridGeometryStrategy[]
  sampleTimeoutMs?: number
}

function fixtureKey(fixture: OpenGridBenchmarkFixture): string {
  return fixture.id
}

function emptyTiming(): OpenGridBenchmarkTiming {
  return {
    profileMs: null,
    extrudeMs: null,
    assemblyFuseMs: null,
    booleanCutMs: null,
    meshMs: null,
    exportMs: null,
    totalMs: null,
  }
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
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

function isClose(first: number, second: number, tolerance = 0.01): boolean {
  return Math.abs(first - second) <= tolerance
}

function boundsMatch(actual: BoxBounds, expected: BoxBounds): boolean {
  return [
    [actual.min[0], expected.min[0]],
    [actual.min[1], expected.min[1]],
    [actual.min[2], expected.min[2]],
    [actual.max[0], expected.max[0]],
    [actual.max[1], expected.max[1]],
    [actual.max[2], expected.max[2]],
  ].every(([actualValue, expectedValue]) => isClose(actualValue, expectedValue))
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

function checkBrepValidity(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

export function parseBinaryStlTriangleCount(bytes: ArrayBuffer): number {
  if (bytes.byteLength < 84) throw new Error('OPENGRID_STL_INVALID_HEADER')
  const view = new DataView(bytes)
  const triangleCount = view.getUint32(80, true)
  const expectedLength = 84 + triangleCount * 50
  if (triangleCount === 0 || expectedLength !== bytes.byteLength) {
    throw new Error('OPENGRID_STL_INVALID_STRUCTURE')
  }
  return triangleCount
}

function emptyQuality(expectedBounds: BoxBounds): OpenGridBenchmarkQuality {
  return {
    passed: false,
    failures: [],
    bounds: null,
    expectedBounds,
    volume: null,
    solidCount: null,
    singleSolid: false,
    brepValid: false,
    centeredXY: false,
    baseZAtZero: false,
    meshTriangleCount: 0,
    stepByteLength: 0,
    stlByteLength: 0,
    stlTriangleCount: null,
  }
}

export function inspectOpenGridShape(
  shape: Shape3D,
  fixture: OpenGridBenchmarkFixture,
  mesh: MeshData,
  stepBytes: ArrayBuffer,
  stlBytes: ArrayBuffer,
): OpenGridBenchmarkQuality {
  const expectedBounds = expectedOpenGridBounds(fixture.request)
  const quality = emptyQuality(expectedBounds)
  const failures = quality.failures

  try {
    quality.bounds = readBounds(shape)
  } catch (error) {
    failures.push(
      `bounds:${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (quality.bounds) {
    quality.centeredXY =
      isClose(quality.bounds.min[0], expectedBounds.min[0]) &&
      isClose(quality.bounds.min[1], expectedBounds.min[1]) &&
      isClose(quality.bounds.max[0], expectedBounds.max[0]) &&
      isClose(quality.bounds.max[1], expectedBounds.max[1])
    if (!quality.centeredXY) failures.push('bounds:centered-xy-or-envelope')
    quality.baseZAtZero = isClose(quality.bounds.min[2], expectedBounds.min[2])
    if (!quality.baseZAtZero) failures.push('bounds:base-z')
    if (!boundsMatch(quality.bounds, expectedBounds)) {
      failures.push('bounds:expected-envelope')
    }
  }

  try {
    quality.volume = measureVolume(shape)
    if (!(quality.volume > 0)) failures.push('volume:non-positive')
  } catch (error) {
    failures.push(
      `volume:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    quality.solidCount = countSolids(shape)
    quality.singleSolid = quality.solidCount === 1
    if (!quality.singleSolid) failures.push('topology:not-single-solid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  try {
    quality.brepValid = checkBrepValidity(shape)
    if (!quality.brepValid) failures.push('topology:brep-invalid')
  } catch (error) {
    failures.push(
      `topology:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  quality.meshTriangleCount = mesh.triangleCount
  if (mesh.triangleCount <= 0) failures.push('mesh:empty')

  quality.stepByteLength = stepBytes.byteLength
  if (quality.stepByteLength <= 0) failures.push('export:step-empty')

  quality.stlByteLength = stlBytes.byteLength
  if (quality.stlByteLength <= 0) failures.push('export:stl-empty')
  try {
    quality.stlTriangleCount = parseBinaryStlTriangleCount(stlBytes)
  } catch (error) {
    failures.push(
      `export:stl:${error instanceof Error ? error.message : String(error)}`,
    )
  }

  quality.passed = failures.length === 0
  return quality
}

class BenchmarkSampleFailure extends Error {
  constructor(
    readonly fixture: OpenGridBenchmarkFixture,
    readonly strategy: OpenGridGeometryStrategy,
    readonly kind: OpenGridBenchmarkRunKind,
    readonly sample: number,
    readonly phase: string,
    message: string,
  ) {
    super(
      `OPENGRID_BENCHMARK_FAILED:${fixture.id}:${strategy}:${kind}:${sample}:${phase}:${message}`,
    )
    this.name = 'BenchmarkSampleFailure'
  }
}

function benchmarkFailure(
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  kind: OpenGridBenchmarkRunKind,
  sample: number,
  phase: string,
  error: unknown,
): BenchmarkSampleFailure {
  const message = error instanceof Error ? error.message : String(error)
  return new BenchmarkSampleFailure(
    fixture,
    strategy,
    kind,
    sample,
    phase,
    message,
  )
}

function failureRecord(
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  kind: OpenGridBenchmarkRunKind,
  sample: number,
  error: unknown,
): OpenGridBenchmarkFailure {
  if (error instanceof BenchmarkSampleFailure) {
    return {
      fixtureId: error.fixture.id,
      variant: error.fixture.variant,
      strategy: error.strategy,
      kind: error.kind,
      sample: error.sample,
      phase: error.phase,
      message: error.message,
    }
  }
  return {
    fixtureId: fixture.id,
    variant: fixture.variant,
    strategy,
    kind,
    sample,
    phase: 'unknown',
    message: error instanceof Error ? error.message : String(error),
  }
}

function timeoutFailure(
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  kind: OpenGridBenchmarkRunKind,
  sample: number,
  phase: string,
  timeoutMs: number,
): BenchmarkSampleFailure {
  return benchmarkFailure(
    fixture,
    strategy,
    kind,
    sample,
    phase,
    new Error(`OPENGRID_BENCHMARK_TIMEOUT_${timeoutMs}MS`),
  )
}

async function runSample(
  adapter: OpenGridBenchmarkAdapter,
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  kind: OpenGridBenchmarkRunKind,
  sample: number,
  previewConfig: OpenGridPreviewConfig,
  sampleTimeoutMs: number,
): Promise<OpenGridBenchmarkRun> {
  const timing = emptyTiming()
  const totalStartedAt = performance.now()
  const deadlineAt = totalStartedAt + sampleTimeoutMs
  const deadline = { expired: false }
  const timeoutHandle = setTimeout(() => {
    deadline.expired = true
  }, sampleTimeoutMs)
  const hasExpired = (): boolean => {
    if (performance.now() >= deadlineAt) deadline.expired = true
    return deadline.expired
  }
  const assertWithinDeadline = (phase: string): void => {
    if (hasExpired()) {
      throw timeoutFailure(
        fixture,
        strategy,
        kind,
        sample,
        phase,
        sampleTimeoutMs,
      )
    }
  }
  let shape: Shape3D | null = null
  let lastPhase = 'build'

  try {
    const phaseTimings: Partial<
      Record<'profile' | 'extrude' | 'assembly-fuse' | 'boolean-cut', number>
    > = {}
    try {
      assertWithinDeadline(lastPhase)
      shape = await adapter.build(fixture, strategy, {
        isGenerationCurrent: () => !hasExpired(),
        reportPhaseStart: (phase) => {
          lastPhase = phase
        },
        reportPhase: (phase, durationMs) => {
          lastPhase = phase
          phaseTimings[phase] = durationMs
        },
      })
    } catch (error) {
      if (hasExpired()) {
        throw timeoutFailure(
          fixture,
          strategy,
          kind,
          sample,
          lastPhase,
          sampleTimeoutMs,
        )
      }
      throw benchmarkFailure(fixture, strategy, kind, sample, lastPhase, error)
    }
    assertWithinDeadline(lastPhase)
    timing.profileMs = phaseTimings.profile ?? null
    timing.extrudeMs = phaseTimings.extrude ?? null
    timing.assemblyFuseMs = phaseTimings['assembly-fuse'] ?? null
    timing.booleanCutMs = phaseTimings['boolean-cut'] ?? null

    const meshStartedAt = performance.now()
    let mesh: MeshData
    try {
      assertWithinDeadline('mesh')
      mesh = adapter.mesh(shape, previewConfig)
    } catch (error) {
      if (hasExpired()) {
        throw timeoutFailure(
          fixture,
          strategy,
          kind,
          sample,
          'mesh',
          sampleTimeoutMs,
        )
      }
      throw benchmarkFailure(fixture, strategy, kind, sample, 'mesh', error)
    }
    assertWithinDeadline('mesh')
    timing.meshMs = performance.now() - meshStartedAt

    const exportStartedAt = performance.now()
    let stepBytes: ArrayBuffer
    let stlBytes: ArrayBuffer
    try {
      assertWithinDeadline('export')
      stepBytes = await adapter.exportStep(shape)
      stlBytes = await adapter.exportStl(shape)
    } catch (error) {
      if (hasExpired()) {
        throw timeoutFailure(
          fixture,
          strategy,
          kind,
          sample,
          'export',
          sampleTimeoutMs,
        )
      }
      throw benchmarkFailure(fixture, strategy, kind, sample, 'export', error)
    }
    assertWithinDeadline('export')
    timing.exportMs = performance.now() - exportStartedAt
    timing.totalMs = performance.now() - totalStartedAt

    assertWithinDeadline('quality')
    const quality = adapter.inspect
      ? adapter.inspect(shape, fixture, mesh, stepBytes, stlBytes)
      : inspectOpenGridShape(shape, fixture, mesh, stepBytes, stlBytes)
    assertWithinDeadline('quality')
    if (!quality.passed) {
      throw benchmarkFailure(
        fixture,
        strategy,
        kind,
        sample,
        'quality',
        quality.failures.join('; '),
      )
    }

    return {
      fixtureId: fixture.id,
      variant: fixture.variant,
      strategy,
      kind,
      sample,
      timing,
      quality,
    }
  } finally {
    clearTimeout(timeoutHandle)
    deleteShape(shape)
  }
}

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('OPENGRID_BENCHMARK_SAMPLES_EMPTY')
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function percentile95(values: readonly number[]): number {
  if (values.length === 0) throw new Error('OPENGRID_BENCHMARK_SAMPLES_EMPTY')
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index]
}

function summarizePhase(
  runs: readonly OpenGridBenchmarkRun[],
  phase: OpenGridBenchmarkPhase,
): OpenGridBenchmarkPhaseSummary {
  const values = runs
    .map((run) => run.timing[phase])
    .filter((value): value is number => value !== null)
  if (values.length === 0) {
    return { applicable: false, medianMs: null, p95Ms: null }
  }
  return {
    applicable: true,
    medianMs: median(values),
    p95Ms: percentile95(values),
  }
}

function summarizeRuns(
  fixture: OpenGridBenchmarkFixture,
  strategy: OpenGridGeometryStrategy,
  runs: readonly OpenGridBenchmarkRun[],
): OpenGridBenchmarkSummary {
  if (runs.length === 0) throw new Error('OPENGRID_BENCHMARK_SAMPLES_EMPTY')
  const phases = {} as Record<
    OpenGridBenchmarkPhase,
    OpenGridBenchmarkPhaseSummary
  >
  for (const phase of [
    'profileMs',
    'extrudeMs',
    'assemblyFuseMs',
    'booleanCutMs',
    'meshMs',
    'exportMs',
    'totalMs',
  ] as const) {
    phases[phase] = summarizePhase(runs, phase)
  }
  const totalValues = runs.map((run) => run.timing.totalMs)
  if (totalValues.some((value) => value === null)) {
    throw new Error('OPENGRID_TOTAL_TIMING_MISSING')
  }
  return {
    fixtureId: fixture.id,
    variant: fixture.variant,
    strategy,
    samples: runs.length,
    medianMs: median(totalValues as number[]),
    p95Ms: percentile95(totalValues as number[]),
    phases,
  }
}

function recommendationForVariant(
  variant: OpenGridVariant,
  fixtures: readonly OpenGridBenchmarkFixture[],
  summaries: readonly OpenGridBenchmarkSummary[],
  strategies: readonly OpenGridGeometryStrategy[],
): OpenGridStrategyRecommendation {
  const variantFixtures = fixtures.filter(
    (fixture) => fixture.variant === variant,
  )
  const candidates = strategies
    .map((strategy) => {
      const matching = summaries.filter(
        (summary) =>
          summary.variant === variant && summary.strategy === strategy,
      )
      if (matching.length === 0) return null
      const medianTotal =
        matching.reduce((total, summary) => total + summary.medianMs, 0) /
        matching.length
      const p95Total =
        matching.reduce((total, summary) => total + summary.p95Ms, 0) /
        matching.length
      return { strategy, medianTotal, p95Total, fixtureCount: matching.length }
    })
    .filter(
      (
        candidate,
      ): candidate is {
        strategy: OpenGridGeometryStrategy
        medianTotal: number
        p95Total: number
        fixtureCount: number
      } => candidate !== null,
    )
    .sort((first, second) => {
      if (first.medianTotal !== second.medianTotal) {
        return first.medianTotal - second.medianTotal
      }
      return first.p95Total - second.p95Total
    })
  const selected = candidates[0]
  if (!selected) {
    const blockedFixtureIds = variantFixtures.map((fixture) => fixture.id)
    return {
      strategy: null,
      consideredStrategies: [],
      fallbackStrategies: [],
      blockedFixtureIds,
      fallbackConditions:
        blockedFixtureIds.length > 0
          ? [
              `No strategy passed the quality gate for ${blockedFixtureIds.join(', ')}; do not use a fallback without geometry redesign and revalidation.`,
            ]
          : [],
      evidence: `No complete measured result is available for ${variant} across ${variantFixtures.length} required fixtures.`,
    }
  }
  const blockedFixtureIds = variantFixtures
    .filter(
      (fixture) =>
        !summaries.some(
          (summary) =>
            summary.fixtureId === fixture.id && summary.variant === variant,
        ),
    )
    .map((fixture) => fixture.id)
  return {
    strategy: selected.strategy,
    consideredStrategies: candidates.map((candidate) => candidate.strategy),
    fallbackStrategies: candidates
      .slice(1)
      .map((candidate) => candidate.strategy),
    blockedFixtureIds,
    fallbackConditions:
      blockedFixtureIds.length > 0
        ? [
            `No strategy passed the quality gate for ${blockedFixtureIds.join(', ')}; do not use a fallback without geometry redesign and revalidation.`,
          ]
        : [],
    evidence: `Selected by lowest average warm median total across ${selected.fixtureCount} successful fixture summaries for ${variant}; review P95 and quality failures before final adoption.`,
  }
}

function deriveRecommendations(
  fixtures: readonly OpenGridBenchmarkFixture[],
  summaries: readonly OpenGridBenchmarkSummary[],
  strategies: readonly OpenGridGeometryStrategy[],
): Record<OpenGridVariant, OpenGridStrategyRecommendation> {
  return {
    Full: recommendationForVariant('Full', fixtures, summaries, strategies),
    Lite: recommendationForVariant('Lite', fixtures, summaries, strategies),
    Heavy: recommendationForVariant('Heavy', fixtures, summaries, strategies),
  }
}

export async function runOpenGridBenchmark(
  options: RunOpenGridBenchmarkOptions,
): Promise<OpenGridBenchmarkReport> {
  const measuredRuns = options.measuredRuns ?? OPENGRID_BENCHMARK_RUNS
  const warmupRuns = options.warmupRuns ?? OPENGRID_BENCHMARK_WARMUP_RUNS
  if (measuredRuns < OPENGRID_BENCHMARK_RUNS) {
    throw new Error('OPENGRID_BENCHMARK_REQUIRES_FIVE_MEASURED_RUNS')
  }
  if (warmupRuns < 1) throw new Error('OPENGRID_BENCHMARK_REQUIRES_WARMUP')
  const sampleTimeoutMs =
    options.sampleTimeoutMs ?? OPENGRID_BENCHMARK_SAMPLE_TIMEOUT_MS
  if (!Number.isFinite(sampleTimeoutMs) || sampleTimeoutMs <= 0) {
    throw new Error('OPENGRID_BENCHMARK_INVALID_SAMPLE_TIMEOUT')
  }

  const strategies = options.strategies ?? OPENGRID_BENCHMARK_STRATEGIES
  const previewConfig =
    options.previewConfig ?? OPENGRID_BENCHMARK_PREVIEW_CONFIG
  const fixtures = (options.fixtures ?? OPENGRID_BENCHMARK_FIXTURES).map(
    (fixture): OpenGridBenchmarkFixture => ({
      ...fixture,
      request: normalizeOpenGridBenchmarkRequest({
        ...fixture.request,
        previewConfig: { ...previewConfig },
      }),
    }),
  )
  const coldRuns: OpenGridBenchmarkRun[] = []
  const warmups: OpenGridBenchmarkRun[] = []
  const runs: OpenGridBenchmarkRun[] = []
  const failures: OpenGridBenchmarkFailure[] = []

  async function attempt(
    fixture: OpenGridBenchmarkFixture,
    strategy: OpenGridGeometryStrategy,
    kind: OpenGridBenchmarkRunKind,
    sample: number,
    target: OpenGridBenchmarkRun[],
  ): Promise<void> {
    try {
      const run = await runSample(
        options.adapter,
        fixture,
        strategy,
        kind,
        sample,
        previewConfig,
        sampleTimeoutMs,
      )
      target.push(run)
    } catch (error) {
      failures.push(failureRecord(fixture, strategy, kind, sample, error))
    } finally {
      collectOptionalGarbage()
    }
  }

  for (const fixture of fixtures) {
    for (const strategy of strategies) {
      await attempt(fixture, strategy, 'cold', 0, coldRuns)
      for (let warmup = 1; warmup <= warmupRuns; warmup += 1) {
        await attempt(fixture, strategy, 'warmup', warmup, warmups)
      }
      for (let sample = 1; sample <= measuredRuns; sample += 1) {
        await attempt(fixture, strategy, 'measured', sample, runs)
      }
    }
  }

  const summaries: OpenGridBenchmarkSummary[] = []
  for (const fixture of fixtures) {
    for (const strategy of strategies) {
      const matchingRuns = runs.filter(
        (run) =>
          run.fixtureId === fixtureKey(fixture) && run.strategy === strategy,
      )
      if (matchingRuns.length === 0) continue
      summaries.push(summarizeRuns(fixture, strategy, matchingRuns))
    }
  }

  const selectedStrategies: Record<
    OpenGridVariant,
    OpenGridGeometryStrategy | null
  > = {
    Full: null,
    Lite: null,
    Heavy: null,
  }
  return {
    environment: options.environment,
    fixtures: fixtures.map((fixture) => ({
      ...fixture,
      request: { ...fixture.request },
    })),
    measuredRuns,
    warmupRuns,
    sampleTimeoutMs,
    coldRuns,
    warmups,
    runs,
    failures,
    summaries,
    recommendations: deriveRecommendations(fixtures, summaries, strategies),
    selectedStrategies,
  }
}

export function mergeOpenGridBenchmarkReports(
  reports: readonly OpenGridBenchmarkReport[],
  strategies?: readonly OpenGridGeometryStrategy[],
): OpenGridBenchmarkReport {
  const first = reports[0]
  if (!first) throw new Error('OPENGRID_BENCHMARK_REPORTS_EMPTY')
  const strategySet = strategies ?? OPENGRID_BENCHMARK_STRATEGIES
  const fixtures = reports.flatMap((report) => report.fixtures)
  const summaries = reports.flatMap((report) => report.summaries)
  const recommendations = deriveRecommendations(
    fixtures,
    summaries,
    strategySet,
  )
  return {
    environment: {
      ...first.environment,
      nativeExecutionEpoch: reports
        .map((report) => report.environment.nativeExecutionEpoch)
        .join(' + '),
    },
    fixtures,
    measuredRuns: first.measuredRuns,
    warmupRuns: first.warmupRuns,
    sampleTimeoutMs: first.sampleTimeoutMs,
    coldRuns: reports.flatMap((report) => report.coldRuns),
    warmups: reports.flatMap((report) => report.warmups),
    runs: reports.flatMap((report) => report.runs),
    failures: reports.flatMap((report) => report.failures),
    summaries,
    recommendations,
    selectedStrategies: {
      Full: null,
      Lite: null,
      Heavy: null,
    },
  }
}

export function createDefaultOpenGridBenchmarkAdapter(): OpenGridBenchmarkAdapter {
  return {
    build: (fixture, strategy, context) =>
      buildOpenGridBenchmarkShape(fixture.request, strategy, context),
    mesh: (shape, previewConfig) => meshBRep(shape, previewConfig),
    exportStep: exportStepBytes,
    exportStl: exportStlBytes,
    inspect: inspectOpenGridShape,
  }
}

function renderPhaseSummary(summary: OpenGridBenchmarkPhaseSummary): string {
  if (!summary.applicable) return 'n/a'
  return `${summary.medianMs?.toFixed(2)} ms / ${summary.p95Ms?.toFixed(2)} ms`
}

function renderFixtureLine(fixture: OpenGridBenchmarkFixture): string {
  const { request } = fixture
  const customCount = request.customScrewPositions?.length ?? 0
  return `| ${fixture.id} | ${fixture.variant} | ${request.rows}×${request.columns} | ${request.screwMode} (${request.screwKind}) | ${request.connectorHoles} | ${customCount} |`
}

export function renderOpenGridBenchmarkMarkdown(
  report: OpenGridBenchmarkReport,
): string {
  const reportFixtures = report.fixtures
  const lines = [
    '# OpenGrid Geometry Benchmark Handoff',
    '',
    '> Generated by the internal benchmark. `selected strategy` remains pending review; `recommended strategy` is derived from successful warm samples.',
    '',
    '## Environment',
    '',
    `- Browser/build mode: ${report.environment.browserBuildMode}`,
    `- Dependency lockfile: ${report.environment.dependencyLockfileVersion}`,
    `- Reference environment: ${report.environment.referenceEnvironment}`,
    `- Native execution epoch: ${report.environment.nativeExecutionEpoch}`,
    `- Measured runs per strategy/fixture: ${report.measuredRuns}`,
    `- Warm-up runs per strategy/fixture: ${report.warmupRuns}`,
    `- Sample timeout: ${report.sampleTimeoutMs} ms (cooperative at safe phase boundaries)`,
    '',
    '## Required fixture matrix',
    '',
    '| Fixture | Variant | Grid | Screw load | Connector holes | Custom positions |',
    '| --- | --- | ---: | --- | --- | ---: |',
    ...reportFixtures.map(renderFixtureLine),
    '',
    '## Measured results',
    '',
    '| Fixture | Strategy | Samples | Total median/P95 ms | Profile | Extrude | Assembly/fuse | Boolean cuts | Mesh | Export |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.summaries.map((summary) => {
      const phase = summary.phases
      return `| ${summary.fixtureId} | ${summary.strategy} | ${summary.samples} | ${summary.medianMs.toFixed(2)} / ${summary.p95Ms.toFixed(2)} | ${renderPhaseSummary(phase.profileMs)} | ${renderPhaseSummary(phase.extrudeMs)} | ${renderPhaseSummary(phase.assemblyFuseMs)} | ${renderPhaseSummary(phase.booleanCutMs)} | ${renderPhaseSummary(phase.meshMs)} | ${renderPhaseSummary(phase.exportMs)} |`
    }),
    '',
    '## Retained failures',
    '',
  ]
  if (report.failures.length === 0) {
    lines.push('No failed samples were recorded.')
  } else {
    lines.push('| Fixture | Strategy | Run | Sample | Phase | Error |')
    lines.push('| --- | --- | --- | ---: | --- | --- |')
    for (const failure of report.failures) {
      lines.push(
        `| ${failure.fixtureId} | ${failure.strategy} | ${failure.kind} | ${failure.sample} | ${failure.phase} | ${failure.message.replaceAll('|', '\\|')} |`,
      )
    }
  }
  lines.push('', '## Automatically derived recommendations', '')
  lines.push(
    '| Variant | Recommended strategy | Fallback order | Final selected strategy | Evidence |',
  )
  lines.push('| --- | --- | --- | --- | --- |')
  for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
    const recommendation = report.recommendations[variant]
    lines.push(
      `| ${variant} | ${recommendation.strategy ?? 'none'} | ${recommendation.fallbackStrategies.join(' → ') || 'none'} | ${report.selectedStrategies[variant] ?? 'pending review'} | ${recommendation.evidence.replaceAll('|', '\\|')} |`,
    )
  }
  lines.push('', '## Blocked fixture classes', '')
  for (const variant of ['Full', 'Lite', 'Heavy'] as const) {
    const recommendation = report.recommendations[variant]
    if (recommendation.blockedFixtureIds.length === 0) {
      lines.push(`- ${variant}: none.`)
      continue
    }
    lines.push(
      `- ${variant}: ${recommendation.blockedFixtureIds.join(', ')} — ${recommendation.fallbackConditions.join(' ')}`,
    )
  }
  lines.push(
    '',
    '## Generator handoff',
    '',
    '- The subsequent `add-opengrid-generator` change must read this handoff and use the final selected strategy or the recorded per-variant dispatch before implementation.',
    '- Carry forward Full, Lite, and Heavy variants, 28 mm grid pitch, rows/columns, screw kind, screw-position matrix, batched through/counterbore cutters, connector holes, Worker cancellation, preview, and STEP/STL export.',
    `- The current workspace limit implies a maximum benchmark grid count of ${OPENGRID_BENCHMARK_CONFIGURATION.maxGridCount} per axis (${OPENGRID_BENCHMARK_CONFIGURATION.maxGridCount * OPENGRID_BENCHMARK_CONFIGURATION.gridPitch} mm).`,
    '- This benchmark uses repository-owned geometry prototypes; external OpenGrid source or assets still require a separate attribution/license review.',
    '',
    '## Known limitations',
    '',
    '- Benchmark timings are environment-specific and should be repeated on the release target before locking a production strategy.',
    '- The benchmark prototype validates strategy cost and geometry gates; the formal generator must rerun representative quality gates after adopting the selected strategy.',
    '- A per-variant recommendation is allowed when one geometry strategy does not satisfy every board type or scale.',
    '',
  )
  return lines.join('\n')
}

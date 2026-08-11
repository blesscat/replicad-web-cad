import type { Shape3D } from 'replicad'
import { exportStlBytes, exportStepBytes } from '../../cad-kernel/export'
import {
  buildOpenGridBRep,
  type OpenGridBuildContext,
} from '../../cad-kernel/components/opengrid/builder'
import { inspectOpenGridShapeQuality } from '../../cad-kernel/components/opengrid/quality'
import { meshBRep, serializeMesh, type MeshData } from '../../cad-kernel/mesh'
import {
  PreviewTimingRecorder,
  type PreviewTiming,
} from '../../cad-contract/preview-timing'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
  normalizeOpenGridParameters,
  type BoxBounds,
  type OpenGridParameters,
} from '../../cad-contract/units'

export const OPENGRID_PREVIEW_BENCHMARK_RUNS = 5
export const OPENGRID_PREVIEW_BENCHMARK_WARMUP_RUNS = 1

function benchmarkParameters(
  overrides: Partial<OpenGridParameters>,
): OpenGridParameters {
  return normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  })
}

export type OpenGridPreviewBenchmarkFixture = {
  id: string
  parameters: OpenGridParameters
}

export const OPENGRID_PREVIEW_BENCHMARK_FIXTURES: readonly OpenGridPreviewBenchmarkFixture[] =
  [
    {
      id: 'Lite-2x2',
      parameters: benchmarkParameters({
        variant: 'Lite',
        rows: 2,
        columns: 2,
      }),
    },
    {
      id: 'Full-5x3-half-cell-x-left',
      parameters: benchmarkParameters({
        variant: 'Full',
        rows: 5,
        columns: 3,
        halfCellX: 'left',
        halfCellY: 'none',
      }),
    },
    {
      id: 'Heavy-2x2-multi-layer',
      parameters: benchmarkParameters({
        variant: 'Heavy',
        rows: 2,
        columns: 2,
      }),
    },
    {
      id: 'Lite-5x5-large',
      parameters: benchmarkParameters({
        variant: 'Lite',
        rows: 5,
        columns: 5,
        halfCellX: 'right',
        halfCellY: 'top',
      }),
    },
  ]

export type OpenGridPreviewBenchmarkRunKind = 'cold' | 'warmup' | 'measured'

export type OpenGridPreviewBenchmarkPhase =
  | 'buildMs'
  | 'booleanMs'
  | 'booleanFuseMs'
  | 'booleanCutMs'
  | 'booleanIntersectMs'
  | 'meshMs'
  | 'qualityMs'
  | 'candidateMs'
  | 'serializationMs'
  | 'transferMs'
  | 'commitMs'
  | 'workerTotalMs'
  | 'viewportBaseMs'
  | 'viewportEdgeMs'
  | 'exportMs'
  | 'totalMs'

export type OpenGridPreviewBenchmarkTiming = Record<
  OpenGridPreviewBenchmarkPhase,
  number | null
>

export type OpenGridPreviewBenchmarkQuality = {
  passed: boolean
  failures: string[]
  bounds: BoxBounds | null
  triangleCount: number
  stepByteLength: number
  stlByteLength: number
  stlTriangleCount: number
}

export type OpenGridPreviewBenchmarkRun = {
  fixtureId: string
  kind: OpenGridPreviewBenchmarkRunKind
  sample: number
  timing: OpenGridPreviewBenchmarkTiming
  previewTiming: PreviewTiming
  quality: OpenGridPreviewBenchmarkQuality
  workerEpoch?: string
  candidateId?: string
  modelRevision?: string
}

export type OpenGridPreviewBenchmarkFailure = {
  fixtureId: string
  kind: OpenGridPreviewBenchmarkRunKind
  sample: number
  phase: string
  message: string
}

export type OpenGridPreviewBenchmarkPhaseSummary = {
  medianMs: number
  p95Ms: number
}

export type OpenGridPreviewBenchmarkSummary = {
  fixtureId: string
  samples: number
  /** Primary gate: Worker generate through model.ready. */
  medianMs: number
  p95Ms: number
  /** End-to-end UI total, including viewport preparation and export when enabled. */
  uiMedianMs: number
  uiP95Ms: number
  phases: Record<
    OpenGridPreviewBenchmarkPhase,
    OpenGridPreviewBenchmarkPhaseSummary
  >
}

export type OpenGridPreviewBenchmarkEnvironment = {
  browserBuildMode: string
  dependencyLockfileVersion: string
  referenceEnvironment: string
  workerEpoch: string
  previewConfiguration: {
    tolerance: number
    angularTolerance: number
    faceMeshingThreshold?: number
  }
  label: string
}

export type OpenGridPreviewBenchmarkViewportAdapter = {
  createBase: (mesh: MeshData) => unknown
  createEdges: (base: unknown, mesh: MeshData) => unknown
  dispose: (resource: unknown) => void
}

export type OpenGridPreviewBenchmarkWorkerResult = {
  mesh: MeshData
  previewTiming: PreviewTiming
  workerTotalMs: number
  transferMs: number
  commitMs: number
  quality: Pick<
    OpenGridPreviewBenchmarkQuality,
    'passed' | 'failures' | 'bounds'
  >
  workerEpoch: string
  candidateId: string
  modelRevision: string
}

export type OpenGridPreviewBenchmarkAdapter = {
  build: (
    parameters: OpenGridParameters,
    context: OpenGridBuildContext,
  ) => Promise<Shape3D> | Shape3D
  mesh: (
    shape: Shape3D,
    previewConfig: {
      tolerance: number
      angularTolerance: number
      faceMeshingThreshold?: number
    },
  ) => MeshData
  inspect: (
    shape: Shape3D,
    parameters: OpenGridParameters,
    mesh: MeshData,
  ) => { passed: boolean; failures: string[]; bounds: BoxBounds | null }
  serialize: (mesh: MeshData) => unknown
  candidate: (parameters: OpenGridParameters, mesh: MeshData) => void
  exportStep: (shape: Shape3D) => Promise<ArrayBuffer>
  exportStl: (shape: Shape3D) => Promise<ArrayBuffer>
  viewport?: OpenGridPreviewBenchmarkViewportAdapter
  runWorkerPreview?: (
    fixture: OpenGridPreviewBenchmarkFixture,
    kind: OpenGridPreviewBenchmarkRunKind,
    sample: number,
    previewConfig: {
      tolerance: number
      angularTolerance: number
      faceMeshingThreshold?: number
    },
    context: OpenGridBuildContext,
  ) => Promise<OpenGridPreviewBenchmarkWorkerResult>
}

export type RunOpenGridPreviewBenchmarkOptions = {
  adapter?: OpenGridPreviewBenchmarkAdapter
  environment: OpenGridPreviewBenchmarkEnvironment
  fixtures?: readonly OpenGridPreviewBenchmarkFixture[]
  measuredRuns?: number
  warmupRuns?: number
  previewConfig?: {
    tolerance: number
    angularTolerance: number
    faceMeshingThreshold?: number
  }
  buildContext?: OpenGridBuildContext
  exportEachRun?: boolean
  prepareSample?: (
    fixture: OpenGridPreviewBenchmarkFixture,
    kind: OpenGridPreviewBenchmarkRunKind,
    sample: number,
  ) => Promise<void> | void
}

type SampleFailure = Error & {
  fixtureId: string
  kind: OpenGridPreviewBenchmarkRunKind
  sample: number
  phase: string
}

function deleteShape(shape: Shape3D | null): void {
  try {
    shape?.delete()
  } catch {
    // Benchmark cleanup must not hide the measured operation error.
  }
}

function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('OPENGRID_PREVIEW_SAMPLES_EMPTY')
  const sorted = [...values].sort((first, second) => first - second)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) throw new Error('OPENGRID_PREVIEW_SAMPLES_EMPTY')
  const sorted = [...values].sort((first, second) => first - second)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index] ?? 0
}

function sampleFailure(
  fixture: OpenGridPreviewBenchmarkFixture,
  kind: OpenGridPreviewBenchmarkRunKind,
  sample: number,
  phase: string,
  error: unknown,
): SampleFailure {
  const message = error instanceof Error ? error.message : String(error)
  const failure = new Error(
    `OPENGRID_PREVIEW_BENCHMARK_FAILED:${fixture.id}:${kind}:${sample}:${phase}:${message}`,
  ) as SampleFailure
  failure.fixtureId = fixture.id
  failure.kind = kind
  failure.sample = sample
  failure.phase = phase
  return failure
}

function phaseTiming(
  previewTiming: PreviewTiming,
  workerTotalMs: number | null,
  transferMs: number | null,
  commitMs: number | null,
  viewportBaseMs: number | null,
  viewportEdgeMs: number | null,
  exportMs: number | null,
): OpenGridPreviewBenchmarkTiming {
  const viewportTotalMs = (viewportBaseMs ?? 0) + (viewportEdgeMs ?? 0)
  return {
    buildMs: previewTiming.buildMs,
    booleanMs: previewTiming.booleanMs ?? null,
    booleanFuseMs: previewTiming.booleanFuseMs ?? null,
    booleanCutMs: previewTiming.booleanCutMs ?? null,
    booleanIntersectMs: previewTiming.booleanIntersectMs ?? null,
    meshMs: previewTiming.meshMs,
    qualityMs: previewTiming.qualityMs,
    candidateMs: previewTiming.candidateMs,
    serializationMs: previewTiming.serializationMs,
    transferMs,
    commitMs,
    workerTotalMs,
    viewportBaseMs,
    viewportEdgeMs,
    exportMs,
    totalMs:
      workerTotalMs === null
        ? null
        : workerTotalMs + viewportTotalMs + (exportMs ?? 0),
  }
}

export function createOpenGridPreviewBenchmarkAdapter(): OpenGridPreviewBenchmarkAdapter {
  return {
    build: (parameters, context) => buildOpenGridBRep(parameters, context),
    mesh: (shape, previewConfig) => meshBRep(shape, previewConfig),
    inspect: (shape, parameters, mesh) => {
      const report = inspectOpenGridShapeQuality(shape, parameters, mesh)
      return {
        passed: report.passed,
        failures: report.failures,
        bounds: report.bounds,
      }
    },
    serialize: (mesh) => serializeMesh(mesh),
    candidate: () => undefined,
    exportStep: (shape) => exportStepBytes(shape),
    exportStl: (shape) =>
      exportStlBytes(shape, {
        tolerance: 0.001,
        angularTolerance: 0.1,
      }),
  }
}

function parseStlTriangleCount(bytes: ArrayBuffer): number {
  if (bytes.byteLength < 84) throw new Error('OPENGRID_STL_INVALID_HEADER')
  const triangleCount = new DataView(bytes).getUint32(80, true)
  if (triangleCount <= 0 || 84 + triangleCount * 50 !== bytes.byteLength) {
    throw new Error('OPENGRID_STL_INVALID_STRUCTURE')
  }
  return triangleCount
}

async function runSample(
  adapter: OpenGridPreviewBenchmarkAdapter,
  fixture: OpenGridPreviewBenchmarkFixture,
  kind: OpenGridPreviewBenchmarkRunKind,
  sample: number,
  previewConfig: {
    tolerance: number
    angularTolerance: number
    faceMeshingThreshold?: number
  },
  buildContext: OpenGridBuildContext,
  includeExport: boolean,
): Promise<OpenGridPreviewBenchmarkRun> {
  let shape: Shape3D | null = null
  let mesh: MeshData | null = null
  let exportMs: number | null = null
  let transferMs: number | null = null
  let commitMs: number | null = null
  let viewportBaseMs: number | null = null
  let viewportEdgeMs: number | null = null
  let viewportBase: unknown = null
  let viewportEdges: unknown = null
  let previewTiming: PreviewTiming | null = null
  let workerTotalMs: number | null = null
  let quality: OpenGridPreviewBenchmarkQuality | null = null
  let workerEpoch: string | undefined
  let candidateId: string | undefined
  let modelRevision: string | undefined
  let phase = 'build'
  try {
    if (adapter.runWorkerPreview) {
      phase = 'worker-lifecycle'
      try {
        const result = await adapter.runWorkerPreview(
          fixture,
          kind,
          sample,
          previewConfig,
          buildContext,
        )
        mesh = result.mesh
        previewTiming = result.previewTiming
        workerTotalMs = result.workerTotalMs
        transferMs = result.transferMs
        commitMs = result.commitMs
        workerEpoch = result.workerEpoch
        candidateId = result.candidateId
        modelRevision = result.modelRevision
        quality = {
          passed: result.quality.passed,
          failures: [...result.quality.failures],
          bounds: result.quality.bounds,
          triangleCount: mesh.triangleCount,
          stepByteLength: 0,
          stlByteLength: 0,
          stlTriangleCount: 0,
        }
      } catch (error) {
        const failurePhase =
          typeof error === 'object' && error !== null && 'phase' in error
            ? String((error as { phase?: unknown }).phase)
            : phase
        throw sampleFailure(fixture, kind, sample, failurePhase, error)
      }
      if (!quality?.passed) {
        throw sampleFailure(
          fixture,
          kind,
          sample,
          'quality',
          new Error(quality?.failures.join('; ') || 'QUALITY_FAILED'),
        )
      }
    } else {
      const recorder = new PreviewTimingRecorder()
      try {
        shape = await recorder.measure('build', () =>
          Promise.resolve(adapter.build(fixture.parameters, buildContext)),
        )
      } catch (error) {
        throw sampleFailure(fixture, kind, sample, phase, error)
      }

      phase = 'mesh'
      try {
        mesh = recorder.measureSync('mesh', () =>
          adapter.mesh(shape!, previewConfig),
        )
      } catch (error) {
        throw sampleFailure(fixture, kind, sample, phase, error)
      }

      phase = 'quality'
      try {
        const report = recorder.measureSync('quality', () =>
          adapter.inspect(shape!, fixture.parameters, mesh!),
        )
        quality = {
          passed: report.passed,
          failures: [...report.failures],
          bounds: report.bounds,
          triangleCount: mesh.triangleCount,
          stepByteLength: 0,
          stlByteLength: 0,
          stlTriangleCount: 0,
        }
        if (!quality.passed) {
          throw new Error(quality.failures.join('; '))
        }
      } catch (error) {
        throw sampleFailure(fixture, kind, sample, phase, error)
      }

      phase = 'candidate'
      try {
        recorder.measureSync('candidate', () =>
          adapter.candidate(fixture.parameters, mesh!),
        )
      } catch (error) {
        throw sampleFailure(fixture, kind, sample, phase, error)
      }

      phase = 'serialization'
      try {
        recorder.measureSync('serialization', () => adapter.serialize(mesh!))
      } catch (error) {
        throw sampleFailure(fixture, kind, sample, phase, error)
      }

      previewTiming = recorder.snapshot()
      workerTotalMs = previewTiming.totalMs
    }

    if (!mesh || !previewTiming || !quality || workerTotalMs === null) {
      throw new Error('OPENGRID_PREVIEW_BENCHMARK_RESULT_INCOMPLETE')
    }

    if (adapter.viewport) {
      phase = 'viewport-base'
      try {
        const startedAt = performance.now()
        try {
          viewportBase = adapter.viewport.createBase(mesh)
        } finally {
          viewportBaseMs = performance.now() - startedAt
        }
      } catch (error) {
        throw sampleFailure(fixture, kind, sample, phase, error)
      }

      phase = 'viewport-edge'
      try {
        const startedAt = performance.now()
        try {
          viewportEdges = adapter.viewport.createEdges(viewportBase, mesh)
        } finally {
          viewportEdgeMs = performance.now() - startedAt
        }
      } catch (error) {
        throw sampleFailure(fixture, kind, sample, phase, error)
      }
    }

    if (includeExport) {
      phase = 'export'
      try {
        if (!shape) throw new Error('OPENGRID_WORKER_EXPORT_UNSUPPORTED')
        const exportStartedAt = performance.now()
        const stepBytes = await adapter.exportStep(shape)
        const stlBytes = await adapter.exportStl(shape)
        exportMs = performance.now() - exportStartedAt
        quality.stepByteLength = stepBytes.byteLength
        quality.stlByteLength = stlBytes.byteLength
        quality.stlTriangleCount = parseStlTriangleCount(stlBytes)
        if (stepBytes.byteLength === 0) {
          throw new Error('OPENGRID_EXPORT_EMPTY')
        }
      } catch (error) {
        throw sampleFailure(fixture, kind, sample, phase, error)
      }
    }

    return {
      fixtureId: fixture.id,
      kind,
      sample,
      timing: phaseTiming(
        previewTiming,
        workerTotalMs,
        transferMs,
        commitMs,
        viewportBaseMs,
        viewportEdgeMs,
        exportMs,
      ),
      previewTiming,
      quality,
      workerEpoch,
      candidateId,
      modelRevision,
    }
  } finally {
    try {
      if (adapter.viewport && viewportEdges !== null)
        adapter.viewport.dispose(viewportEdges)
    } catch {
      // Benchmark cleanup must not hide the measured operation error.
    }
    try {
      if (adapter.viewport && viewportBase !== null)
        adapter.viewport.dispose(viewportBase)
    } catch {
      // Benchmark cleanup must not hide the measured operation error.
    }
    deleteShape(shape)
  }
}

function summarize(
  fixtureId: string,
  runs: readonly OpenGridPreviewBenchmarkRun[],
): OpenGridPreviewBenchmarkSummary {
  const phases = {} as Record<
    OpenGridPreviewBenchmarkPhase,
    OpenGridPreviewBenchmarkPhaseSummary
  >
  for (const phase of [
    'buildMs',
    'booleanMs',
    'booleanFuseMs',
    'booleanCutMs',
    'booleanIntersectMs',
    'meshMs',
    'qualityMs',
    'candidateMs',
    'serializationMs',
    'transferMs',
    'commitMs',
    'workerTotalMs',
    'viewportBaseMs',
    'viewportEdgeMs',
    'exportMs',
    'totalMs',
  ] as const) {
    const values = runs
      .map((run) => run.timing[phase])
      .filter((value): value is number => value !== null)
    if (values.length === 0) continue
    phases[phase] = {
      medianMs: median(values),
      p95Ms: percentile95(values),
    }
  }
  const workerTotals = runs
    .map((run) => run.timing.workerTotalMs)
    .filter((value): value is number => value !== null)
  const uiTotals = runs
    .map((run) => run.timing.totalMs)
    .filter((value): value is number => value !== null)
  return {
    fixtureId,
    samples: runs.length,
    medianMs: median(workerTotals),
    p95Ms: percentile95(workerTotals),
    uiMedianMs: median(uiTotals),
    uiP95Ms: percentile95(uiTotals),
    phases,
  }
}

export type OpenGridPreviewBenchmarkReport = {
  environment: OpenGridPreviewBenchmarkEnvironment
  measuredRuns: number
  warmupRuns: number
  coldRuns: OpenGridPreviewBenchmarkRun[]
  warmups: OpenGridPreviewBenchmarkRun[]
  runs: OpenGridPreviewBenchmarkRun[]
  failures: OpenGridPreviewBenchmarkFailure[]
  summaries: OpenGridPreviewBenchmarkSummary[]
}

export type OpenGridPreviewExportGate = {
  fixtureId: string
  passed: boolean
  triangleCount: number
  stepByteLength: number
  stlByteLength: number
  stlTriangleCount: number
  error?: string
}

export type RunOpenGridPreviewExportGatesOptions = {
  adapter?: OpenGridPreviewBenchmarkAdapter
  fixtures?: readonly OpenGridPreviewBenchmarkFixture[]
  previewConfig?: {
    tolerance: number
    angularTolerance: number
    faceMeshingThreshold?: number
  }
  buildContext?: OpenGridBuildContext
  prepareFixture?: (
    fixture: OpenGridPreviewBenchmarkFixture,
  ) => Promise<void> | void
}

export async function runOpenGridPreviewExportGates({
  adapter = createOpenGridPreviewBenchmarkAdapter(),
  fixtures = OPENGRID_PREVIEW_BENCHMARK_FIXTURES,
  previewConfig = { ...OPENGRID_PREVIEW_CONFIGURATION },
  buildContext = {},
  prepareFixture,
}: RunOpenGridPreviewExportGatesOptions): Promise<OpenGridPreviewExportGate[]> {
  const gates: OpenGridPreviewExportGate[] = []
  const exportOrder = [...fixtures].sort((first, second) => {
    const firstIsFull = first.parameters.variant === 'Full'
    const secondIsFull = second.parameters.variant === 'Full'
    return Number(firstIsFull) - Number(secondIsFull)
  })

  for (const fixture of exportOrder) {
    let shape: Shape3D | null = null
    try {
      await prepareFixture?.(fixture)
      shape = await adapter.build(fixture.parameters, buildContext)
      const mesh = adapter.mesh(shape, previewConfig)
      const quality = adapter.inspect(shape, fixture.parameters, mesh)
      if (!quality.passed) throw new Error(quality.failures.join('; '))
      const stepBytes = await adapter.exportStep(shape)
      const stlBytes = await adapter.exportStl(shape)
      const stlTriangleCount = parseStlTriangleCount(stlBytes)
      if (stepBytes.byteLength === 0) throw new Error('OPENGRID_EXPORT_EMPTY')
      gates.push({
        fixtureId: fixture.id,
        passed: true,
        triangleCount: mesh.triangleCount,
        stepByteLength: stepBytes.byteLength,
        stlByteLength: stlBytes.byteLength,
        stlTriangleCount,
      })
    } catch (error) {
      gates.push({
        fixtureId: fixture.id,
        passed: false,
        triangleCount: 0,
        stepByteLength: 0,
        stlByteLength: 0,
        stlTriangleCount: 0,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      deleteShape(shape)
    }
  }
  return gates
}

export async function runOpenGridPreviewBenchmark({
  adapter = createOpenGridPreviewBenchmarkAdapter(),
  environment,
  fixtures = OPENGRID_PREVIEW_BENCHMARK_FIXTURES,
  measuredRuns = OPENGRID_PREVIEW_BENCHMARK_RUNS,
  warmupRuns = OPENGRID_PREVIEW_BENCHMARK_WARMUP_RUNS,
  previewConfig = { ...OPENGRID_PREVIEW_CONFIGURATION },
  buildContext = {},
  exportEachRun = false,
  prepareSample,
}: RunOpenGridPreviewBenchmarkOptions): Promise<OpenGridPreviewBenchmarkReport> {
  const coldRuns: OpenGridPreviewBenchmarkRun[] = []
  const warmups: OpenGridPreviewBenchmarkRun[] = []
  const runs: OpenGridPreviewBenchmarkRun[] = []
  const failures: OpenGridPreviewBenchmarkFailure[] = []
  const execute = async (
    fixture: OpenGridPreviewBenchmarkFixture,
    kind: OpenGridPreviewBenchmarkRunKind,
    sample: number,
  ): Promise<void> => {
    try {
      await prepareSample?.(fixture, kind, sample)
      const result = await runSample(
        adapter,
        fixture,
        kind,
        sample,
        previewConfig,
        buildContext,
        exportEachRun,
      )
      if (kind === 'cold') coldRuns.push(result)
      if (kind === 'warmup') warmups.push(result)
      if (kind === 'measured') runs.push(result)
    } catch (error) {
      const failure = error as Partial<SampleFailure>
      failures.push({
        fixtureId: failure.fixtureId ?? fixture.id,
        kind: failure.kind ?? kind,
        sample: failure.sample ?? sample,
        phase: failure.phase ?? 'unknown',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  for (const fixture of fixtures) await execute(fixture, 'cold', 0)
  for (let warmup = 1; warmup <= warmupRuns; warmup += 1) {
    for (const fixture of fixtures) await execute(fixture, 'warmup', warmup)
  }
  for (const fixture of fixtures) {
    for (let sample = 1; sample <= measuredRuns; sample += 1) {
      await execute(fixture, 'measured', sample)
    }
  }

  const summaries = fixtures.flatMap((fixture) => {
    const fixtureRuns = runs.filter((run) => run.fixtureId === fixture.id)
    return fixtureRuns.length > 0 ? [summarize(fixture.id, fixtureRuns)] : []
  })
  return {
    environment,
    measuredRuns,
    warmupRuns,
    coldRuns,
    warmups,
    runs,
    failures,
    summaries,
  }
}

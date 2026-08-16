import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { setOC } from 'replicad'
import type {
  PreviewConfig,
  WorkerEvent,
} from '../../src/cad-contract/messages'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
} from '../../src/cad-contract/units'
import {
  CadWorkerRuntime,
  type CadWorkerBuildOptions,
} from '../../src/workers/cad.worker'
import { createViewportBaseGeometry } from '../../src/features/cad/viewport/base-geometry'
import { createViewportEdgeGeometry } from '../../src/features/cad/viewport/edge-lines'
import {
  createOpenGridPreviewBenchmarkAdapter,
  OPENGRID_PREVIEW_BENCHMARK_FIXTURES,
  runOpenGridPreviewExportGates,
  runOpenGridPreviewBenchmark,
  type OpenGridPreviewBenchmarkAdapter,
  type OpenGridPreviewBenchmarkReport,
  type OpenGridPreviewBenchmarkWorkerResult,
} from '../../src/workers/benchmark/opengrid-preview'

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

const shouldRun = process.env.RUN_OPENGRID_PREVIEW_BENCHMARK === '1'

function selectedFixtures() {
  const requested = process.env.RUN_OPENGRID_PREVIEW_FIXTURES?.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (!requested) return [...OPENGRID_PREVIEW_BENCHMARK_FIXTURES]
  return OPENGRID_PREVIEW_BENCHMARK_FIXTURES.filter((fixture) =>
    requested.includes(fixture.id),
  )
}

function measuredRuns(): number {
  const value = Number(process.env.OPENGRID_PREVIEW_BENCHMARK_RUNS ?? '5')
  return Number.isSafeInteger(value) && value > 0 ? value : 5
}

function environment(
  label: string,
  previewConfiguration: {
    tolerance: number
    angularTolerance: number
    faceMeshingThreshold?: number
  },
) {
  return {
    browserBuildMode: 'vitest-worker-node',
    dependencyLockfileVersion: `pnpm-lock.yaml@${LOCKFILE_VERSION}`,
    referenceEnvironment: `${process.platform}-${process.arch}-node-${process.version}`,
    workerEpoch: 'fresh-native-epoch-per-fixture;large-fixture-per-sample',
    previewConfiguration,
    label,
  }
}

function baselineContext(): CadWorkerBuildOptions {
  return {
    useCompoundChamferCutters: false,
    useCompoundScrewParts: false,
    fuseHalfCellExtensionsIntoAssembly: false,
    balancedFuseBatchSize: 4,
    useOpenGridCanonicalTileCache: false,
    useOpenGridHalfCellPrototypeCache: false,
  }
}

function optimizedContext(usePrototypeCache = true): CadWorkerBuildOptions {
  const batchSize = Number(
    process.env.OPENGRID_PREVIEW_BENCHMARK_BATCH_SIZE ??
      OPENGRID_CONFIGURATION.balancedFuseBatchSize,
  )
  return {
    useCompoundChamferCutters: true,
    useCompoundScrewParts: true,
    fuseHalfCellExtensionsIntoAssembly: true,
    balancedFuseBatchSize: batchSize,
    useOpenGridCanonicalTileCache: usePrototypeCache,
    useOpenGridHalfCellPrototypeCache: usePrototypeCache,
  }
}

function previewConfig(tolerance: number) {
  return {
    ...OPENGRID_PREVIEW_CONFIGURATION,
    tolerance,
    faceMeshingThreshold: Number(
      process.env.OPENGRID_PREVIEW_BENCHMARK_FACE_THRESHOLD ??
        OPENGRID_PREVIEW_CONFIGURATION.faceMeshingThreshold,
    ),
  }
}

function baselinePreviewConfig() {
  return {
    ...previewConfig(OPENGRID_PREVIEW_CONFIGURATION.tolerance),
    faceMeshingThreshold: 512,
  }
}

function successfulRuns(
  report: OpenGridPreviewBenchmarkReport,
  fixtureId: string,
): OpenGridPreviewBenchmarkReport['runs'] {
  return report.runs.filter((run) => run.fixtureId === fixtureId)
}

function summary(report: OpenGridPreviewBenchmarkReport, fixtureId: string) {
  const result = report.summaries.find((item) => item.fixtureId === fixtureId)
  if (!result) throw new Error(`BENCHMARK_SUMMARY_MISSING:${fixtureId}`)
  return result
}

type WorkerSession = {
  runtime: CadWorkerRuntime
  events: WorkerEvent[]
  handoff: {
    transferMs: number
  }
  epoch: string
  nextGeneration: number
  sequence: number
}

function workerError(
  events: readonly WorkerEvent[],
  operationId: string,
): Error & { phase?: string } {
  const event = events.find(
    (candidate) =>
      candidate.kind === 'operation.error' &&
      candidate.operationId === operationId,
  )
  const failure = new Error(
    event?.kind === 'operation.error'
      ? `${event.code}:${event.messageId}`
      : `WORKER_EVENT_MISSING:${operationId}`,
  ) as Error & { phase?: string }
  failure.phase = event?.kind === 'operation.error' ? event.stage : 'worker'
  return failure
}

async function createWorkerSession(
  label: string,
  context: CadWorkerBuildOptions,
  sequence: number,
): Promise<WorkerSession> {
  const epoch = `${label}-worker-${sequence}`
  const events: WorkerEvent[] = []
  const handoff = { transferMs: 0 }
  const runtime = new CadWorkerRuntime(
    epoch,
    (event, transfer) => {
      const startedAt = performance.now()
      const cloned = structuredClone(event, {
        transfer: transfer ?? [],
      }) as WorkerEvent
      if (event.kind === 'model.candidate-ready') {
        handoff.transferMs = performance.now() - startedAt
      }
      events.push(cloned)
    },
    context,
  )
  const operationId = `${epoch}-init`
  await runtime.handle({
    version: 2,
    requestId: `${operationId}-request`,
    operationId,
    kind: 'engine.init',
    asset: { wasmUrl: WASM_PATH },
  })
  if (!events.some((event) => event.kind === 'engine.ready')) {
    throw workerError(events, operationId)
  }
  return { runtime, events, handoff, epoch, nextGeneration: 1, sequence }
}

async function disposeWorkerSession(
  session: WorkerSession | null,
): Promise<void> {
  if (!session) return
  await session.runtime.handle({
    version: 2,
    requestId: `${session.epoch}-dispose-request`,
    operationId: `${session.epoch}-dispose`,
    kind: 'worker.dispose',
  })
}

async function runWorkerPreview(
  session: WorkerSession,
  fixture: Parameters<
    NonNullable<OpenGridPreviewBenchmarkAdapter['runWorkerPreview']>
  >[0],
  kind: Parameters<
    NonNullable<OpenGridPreviewBenchmarkAdapter['runWorkerPreview']>
  >[1],
  sample: number,
  previewConfig: PreviewConfig,
): Promise<OpenGridPreviewBenchmarkWorkerResult> {
  session.events.length = 0
  session.handoff.transferMs = 0
  const generation = session.nextGeneration
  session.nextGeneration += 1
  const operationId = `${session.epoch}-generation-${generation}`
  const startedAt = performance.now()
  await session.runtime.handle({
    version: 2,
    requestId: `${operationId}-generate-request`,
    operationId,
    kind: 'model.generate',
    generation,
    modelId: 'opengrid',
    parameters: fixture.parameters,
    previewConfig,
  })
  const candidate = session.events.find(
    (event) =>
      event.kind === 'model.candidate-ready' &&
      event.operationId === operationId,
  )
  if (!candidate || candidate.kind !== 'model.candidate-ready')
    throw workerError(session.events, operationId)

  const commitStartedAt = performance.now()
  await session.runtime.handle({
    version: 2,
    requestId: `${operationId}-commit-request`,
    operationId,
    kind: 'model.commit',
    generation,
    candidateId: candidate.candidateId,
    workerEpoch: session.epoch,
  })
  const ready = session.events.find(
    (event) =>
      event.kind === 'model.ready' && event.operationId === operationId,
  )
  if (!ready || ready.kind !== 'model.ready')
    throw workerError(session.events, operationId)
  if (!candidate.previewTiming || !ready.previewTiming) {
    throw new Error('WORKER_PREVIEW_TIMING_MISSING')
  }
  const commitMs = performance.now() - commitStartedAt

  const snapshot = candidate.mesh
  const mesh = {
    positions: new Float32Array(snapshot.positions),
    normals: new Float32Array(snapshot.normals),
    indices: new Uint32Array(snapshot.indices),
    bounds: snapshot.bounds,
    triangleCount: snapshot.triangleCount,
  }
  return {
    mesh,
    previewTiming: ready.previewTiming,
    workerTotalMs: performance.now() - startedAt,
    transferMs: session.handoff.transferMs,
    commitMs,
    quality: {
      passed: true,
      failures: [],
      bounds: ready.bounds,
    },
    workerEpoch: ready.workerEpoch,
    candidateId: candidate.candidateId,
    modelRevision: ready.modelRevision,
  }
}

function viewportAdapter(): NonNullable<
  OpenGridPreviewBenchmarkAdapter['viewport']
> {
  return {
    createBase: (mesh) => createViewportBaseGeometry(mesh),
    createEdges: (base) =>
      createViewportEdgeGeometry(base as THREE.BufferGeometry),
    dispose: (resource) => {
      ;(resource as { dispose: () => void }).dispose()
    },
  }
}

describe.skipIf(!shouldRun)('OpenGrid production preview benchmark', () => {
  const prepareSample = async () => {
    const openCascade = await initialiseOpenCascade({
      locateFile: () => WASM_PATH,
    })
    setOC(openCascade as Parameters<typeof setOC>[0])
  }

  beforeAll(async () => {
    await prepareSample()
  })

  it('records baseline, preview A/B, quality, export, and performance gates', async () => {
    const fixtures = selectedFixtures()
    const targetFixtures = fixtures.filter((fixture) =>
      ['Lite-2x2', 'Full-5x3-half-cell-x-left'].includes(fixture.id),
    )
    const runs = measuredRuns()
    const runPerFixture = async ({
      label,
      fixtureSet,
      createContext,
      fixturePreviewConfig,
      isolateLargeFixture,
    }: {
      label: string
      fixtureSet: typeof fixtures
      createContext: (isolateLargeFixture: boolean) => CadWorkerBuildOptions
      fixturePreviewConfig: {
        tolerance: number
        angularTolerance: number
        faceMeshingThreshold?: number
      }
      isolateLargeFixture?: boolean
    }): Promise<OpenGridPreviewBenchmarkReport> => {
      const reports: OpenGridPreviewBenchmarkReport[] = []
      let workerSession: WorkerSession | null = null
      let sessionSequence = 0
      for (const fixture of fixtureSet) {
        const isolateCurrentFixture =
          isolateLargeFixture && fixture.id === 'Lite-5x5-large'
        const context = createContext(isolateCurrentFixture === true)
        const resetWorker = async () => {
          await disposeWorkerSession(workerSession)
          sessionSequence += 1
          workerSession = await createWorkerSession(
            label,
            context,
            sessionSequence,
          )
        }
        if (!isolateCurrentFixture) await resetWorker()
        const adapter: OpenGridPreviewBenchmarkAdapter = {
          ...createOpenGridPreviewBenchmarkAdapter(),
          viewport: viewportAdapter(),
          runWorkerPreview: (currentFixture, kind, sample, config) => {
            if (!workerSession) throw new Error('WORKER_SESSION_MISSING')
            return runWorkerPreview(
              workerSession,
              currentFixture,
              kind,
              sample,
              config,
            )
          },
        }
        reports.push(
          await runOpenGridPreviewBenchmark({
            adapter,
            environment: environment(label, fixturePreviewConfig),
            fixtures: [fixture],
            measuredRuns: runs,
            buildContext: context,
            previewConfig: fixturePreviewConfig,
            prepareSample: isolateCurrentFixture ? resetWorker : undefined,
          }),
        )
        await disposeWorkerSession(workerSession)
        workerSession = null
      }
      return {
        environment: environment(label, fixturePreviewConfig),
        measuredRuns: runs,
        warmupRuns: 1,
        coldRuns: reports.flatMap((report) => report.coldRuns),
        warmups: reports.flatMap((report) => report.warmups),
        runs: reports.flatMap((report) => report.runs),
        failures: reports.flatMap((report) => report.failures),
        summaries: reports.flatMap((report) => report.summaries),
      }
    }

    const baseline = await runPerFixture({
      label: 'baseline',
      fixtureSet: fixtures,
      createContext: () => baselineContext(),
      fixturePreviewConfig: baselinePreviewConfig(),
      isolateLargeFixture: true,
    })
    const optimizedUi = await runPerFixture({
      label: 'optimized-ui-0.01',
      fixtureSet: fixtures,
      createContext: (isolateLargeFixture) =>
        optimizedContext(!isolateLargeFixture),
      fixturePreviewConfig: previewConfig(
        OPENGRID_PREVIEW_CONFIGURATION.tolerance,
      ),
      isolateLargeFixture: true,
    })
    const optimizedComparison = await runPerFixture({
      label: 'optimized-comparison-0.05',
      fixtureSet: fixtures,
      createContext: (isolateLargeFixture) =>
        optimizedContext(!isolateLargeFixture),
      fixturePreviewConfig: previewConfig(0.05),
      isolateLargeFixture: true,
    })
    const exportGates = await runOpenGridPreviewExportGates({
      fixtures,
      buildContext: {},
      previewConfig: previewConfig(OPENGRID_PREVIEW_CONFIGURATION.tolerance),
      prepareFixture: prepareSample,
    })
    console.log(JSON.stringify({ exportGates }))
    if (process.env.WRITE_OPENGRID_PREVIEW_BENCHMARK_ARTIFACT === '1') {
      writeFileSync(
        join(
          process.cwd(),
          'openspec/changes/optimize-opengrid-preview-performance',
          'preview-export-gates.json',
        ),
        `${JSON.stringify(exportGates, null, 2)}\n`,
      )
    }

    if (process.env.WRITE_OPENGRID_PREVIEW_BENCHMARK_ARTIFACT === '1') {
      const changeDir = join(
        process.cwd(),
        'openspec/changes/optimize-opengrid-preview-performance',
      )
      writeFileSync(
        join(changeDir, 'baseline-preview-benchmark.json'),
        `${JSON.stringify(baseline, null, 2)}\n`,
      )
      writeFileSync(
        join(changeDir, 'optimized-preview-benchmark.json'),
        `${JSON.stringify(optimizedUi, null, 2)}\n`,
      )
      writeFileSync(
        join(changeDir, 'preview-tolerance-ab-benchmark.json'),
        `${JSON.stringify(optimizedComparison, null, 2)}\n`,
      )
      writeFileSync(
        join(changeDir, 'preview-export-gates.json'),
        `${JSON.stringify(exportGates, null, 2)}\n`,
      )
    }

    console.log(
      JSON.stringify({
        baseline: baseline.summaries,
        optimizedUi: optimizedUi.summaries,
        optimizedComparison: optimizedComparison.summaries,
        exportGates,
      }),
    )

    for (const report of [baseline, optimizedUi, optimizedComparison]) {
      expect(report.failures, report.environment.referenceEnvironment).toEqual(
        [],
      )
      for (const fixture of fixtures) {
        expect(successfulRuns(report, fixture.id)).toHaveLength(runs)
      }
    }
    expect(exportGates.every((gate) => gate.passed)).toBe(true)

    if (
      !targetFixtures.some((fixture) => fixture.id === 'Lite-2x2') ||
      !targetFixtures.some(
        (fixture) => fixture.id === 'Full-5x3-half-cell-x-left',
      )
    ) {
      console.log(
        JSON.stringify({
          baseline: baseline.summaries,
          optimizedUi: optimizedUi.summaries,
          optimizedComparison: optimizedComparison.summaries,
          exportGates,
        }),
      )
      return
    }

    const fullBaseline = summary(baseline, 'Full-5x3-half-cell-x-left')
    const fullOptimized = summary(optimizedUi, 'Full-5x3-half-cell-x-left')
    const liteBaseline = summary(baseline, 'Lite-2x2')
    const liteOptimized = summary(optimizedUi, 'Lite-2x2')
    const fullImprovement =
      (fullBaseline.medianMs - fullOptimized.medianMs) / fullBaseline.medianMs
    const liteRegression =
      (liteOptimized.medianMs - liteBaseline.medianMs) / liteBaseline.medianMs
    console.log(
      JSON.stringify({
        baseline: baseline.summaries,
        optimizedUi: optimizedUi.summaries,
        optimizedComparison: optimizedComparison.summaries,
        fullImprovement,
        liteRegression,
      }),
    )
    expect(fullImprovement).toBeGreaterThanOrEqual(0.2)
    expect(liteRegression).toBeLessThanOrEqual(0.1)

    for (const fixture of fixtures) {
      const uiRun = successfulRuns(optimizedUi, fixture.id)[0]
      const comparisonRun = successfulRuns(optimizedComparison, fixture.id)[0]
      expect(comparisonRun?.quality.triangleCount).toBe(
        uiRun?.quality.triangleCount,
      )
      expect(comparisonRun?.quality.bounds).toEqual(uiRun?.quality.bounds)
      expect(comparisonRun?.quality.stlTriangleCount).toBe(
        uiRun?.quality.stlTriangleCount,
      )
    }
  }, 900_000)
})

import { exportStlBytes, exportStepBytes } from '../cad-kernel/export'
import { initialiseCadKernel } from '../cad-kernel/initialise'
import type { Shape3D } from 'replicad'
import {
  RevisionLifetime,
  type CandidateRecord,
  type RevisionRecord,
} from '../cad-kernel/lifetime'
import { loadHswCellTemplate } from '../cad-kernel/components/hsw-cell/builder'
import {
  loadBoxNormalReference,
  type BoxNormalOperationCounts,
} from '../cad-kernel/components/box-normal/builder'
import { loadHexagonalColumnReference } from '../cad-kernel/components/hexagonal-column/builder'
import { loadModularGridBaseTemplate } from '../cad-kernel/components/modular-grid-base/builder'
import {
  buildOpenGridCanonicalTile,
  loadOpenGridPrototypeTemplate,
  type OpenGridBuildContext,
} from '../cad-kernel/components/opengrid/builder'
import {
  loadOpenGridSnapFixedFootprint,
  loadOpenGridSnapReference,
  type OpenGridSnapFixedFootprint,
} from '../cad-kernel/components/opengrid-snap/builder'
import { loadOpenGridSnapRemoverAsset } from '../cad-kernel/components/opengrid-snap-remover/builder'
import { buildModelBRep, type KernelBuildContext } from '../cad-kernel/model'
import { assertOpenGridShapeQuality } from '../cad-kernel/components/opengrid/quality'
import { assertOpenGridSnapShapeQuality } from '../cad-kernel/components/opengrid-snap/quality'
import { assertOpenGridDividerShapeQuality } from '../cad-kernel/components/opengrid-divider/quality'
import { assertPillarShapeQuality } from '../cad-kernel/components/opengrid-pillar/quality'
import { assertOpenGridOpenShelfShapeQuality } from '../cad-kernel/components/opengrid-open-shelf/quality'
import { meshBRep, serializeMesh, type MeshData } from '../cad-kernel/mesh'
import {
  createBooleanOperationReporter,
  type BooleanOperationReporter,
} from '../cad-kernel/boolean-progress'
import { PreviewTimingRecorder } from '../cad-contract/preview-timing'
import {
  errorEvent,
  isWorkerCommand,
  PROTOCOL_VERSION,
  type BooleanOperationProgress,
  type ProgressUnit,
  type ProgressEvent,
  type WorkerCommand,
  type WorkerEvent,
} from '../cad-contract/messages'
import type {
  CadError,
  CadErrorCode,
  CadErrorStage,
} from '../cad-contract/errors'
import {
  modelFileName,
  modelStlFileName,
  boundsForOpenGridSnap,
  isHswCellParameters,
  isOpenGridDividerModelParameters,
  isOpenGridOpenShelfParameters,
  isOpenGridParameters,
  normalizeOpenGridDividerParameters,
  normalizeOpenGridParameters,
  PROTOTYPE_CONFIGURATION,
  type ModelParameterValues,
  type OpenGridSnapParameters,
  type OpenGridVariant,
  type OpenGridSnapVariant,
  isOpenGridSnapParameters,
  isPillarParameters,
  validateOpenGridGenerationSupport,
  validateModelParameters,
} from '../cad-contract/units'
import { cadErrorCodeFor, cadErrorStageFor } from './error-mapping'
import { createThrottledMeshProgressReporter } from './mesh-progress'

type EventSink = (event: WorkerEvent, transfer?: Transferable[]) => void

export type CadWorkerBuildOptions = Pick<
  OpenGridBuildContext,
  | 'useCompoundChamferCutters'
  | 'useCompoundScrewParts'
  | 'fuseHalfCellExtensionsIntoAssembly'
  | 'balancedFuseBatchSize'
> & {
  useOpenGridCanonicalTileCache?: boolean
  useOpenGridHalfCellPrototypeCache?: boolean
}

type SupersededReason =
  | 'STALE_GENERATION'
  | 'CANDIDATE_CAPACITY'
  | 'CANDIDATE_EXPIRED'
  | 'CANDIDATE_ORPHANED'

type CandidateTerminal = {
  operationId: string
  requestId: string
  generation: number
  reason: SupersededReason
}

function id(): string {
  return crypto.randomUUID()
}

function makeError(
  stage: CadErrorStage,
  code: CadErrorCode,
  userMessage: string,
  recoverable = true,
): CadError {
  return { stage, code, userMessage, recoverable }
}

function cylinderQualityContext(command: WorkerCommand): string {
  if (
    command.kind !== 'model.generate' ||
    command.modelId !== 'opengrid-stackable-cylinder'
  ) {
    return ''
  }

  let profile = '預設'
  if (command.parameters.bottomPlateMode === true) {
    profile = '底板'
  } else if (command.parameters.thinBottomMode === true) {
    profile = '薄底'
  }
  const holeState =
    command.parameters.bottomHolesEnabled === false
      ? '底部孔洞關閉'
      : '底部孔洞開啟'
  return `（${profile}模式、${holeState}）`
}

function yieldToWorkerEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

export class CadWorkerRuntime {
  private initialized = false
  private initializing: Promise<void> | null = null
  private latestInputGeneration = 0
  private invalidatedGeneration = 0
  private disposed = false
  private modularGridBaseTemplate: Promise<import('replicad').Shape3D> | null =
    null
  private hswCellTemplate: Promise<import('replicad').Shape3D> | null = null
  private boxNormalReference: Promise<import('replicad').Shape3D> | null = null
  private lastBoxNormalOperationCounts: BoxNormalOperationCounts | null = null
  private hexagonalColumnReference: Promise<import('replicad').Shape3D> | null =
    null
  private readonly openGridPrototypes = new Map<
    OpenGridVariant,
    Promise<import('replicad').Shape3D>
  >()
  private readonly openGridCanonicalTiles = new Map<
    OpenGridVariant,
    Promise<import('replicad').Shape3D>
  >()
  private readonly openGridHalfCellPrototypes = new Map<
    string,
    Promise<import('replicad').Shape3D>
  >()
  private readonly openGridSnapReferences = new Map<
    string,
    Promise<import('replicad').Shape3D>
  >()
  private readonly openGridSnapFixedFootprints = new Map<
    OpenGridSnapFixedFootprint,
    Promise<import('replicad').Shape3D>
  >()
  private openGridSnapRemoverAsset: Promise<import('replicad').Shape3D> | null =
    null
  private readonly lifetime: RevisionLifetime
  private readonly candidateTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()
  // Terminal records intentionally retain only correlation metadata so duplicate
  // commit/discard messages cannot release a candidate twice or invent a new terminal id.
  private readonly candidateTerminals = new Map<string, CandidateTerminal>()

  constructor(
    private readonly epoch: string = `epoch-${id()}`,
    private readonly emit: EventSink = () => undefined,
    private readonly openGridBuildOptions: CadWorkerBuildOptions = {},
  ) {
    this.lifetime = new RevisionLifetime(
      epoch,
      PROTOTYPE_CONFIGURATION.pendingCandidateLimit,
      PROTOTYPE_CONFIGURATION.candidateTtlMs,
    )
  }

  async handle(value: unknown): Promise<void> {
    if (!isWorkerCommand(value)) {
      this.emit({
        version: PROTOCOL_VERSION,
        kind: 'operation.error',
        requestId: id(),
        operationId: 'protocol',
        terminalForRequestId: 'protocol',
        stage: 'protocol',
        code: 'PROTOCOL_INVALID',
        userMessage: 'Worker 收到無法辨識的訊息。',
        recoverable: false,
      })
      return
    }

    if (this.disposed && value.kind !== 'worker.dispose') {
      this.emit(
        errorEvent(
          value,
          makeError(
            'worker',
            'WORKER_TERMINATED',
            'CAD Worker 已釋放，請重試。',
            false,
          ),
        ),
      )
      return
    }

    try {
      switch (value.kind) {
        case 'engine.init':
          await this.initialize(value)
          return
        case 'model.generate':
          await this.generate(value)
          return
        case 'model.invalidate':
          this.invalidate(value)
          return
        case 'model.commit':
          this.commit(value)
          return
        case 'model.discard':
          this.discard(value)
          return
        case 'export.step':
          await this.exportStep(value)
          return
        case 'export.stl':
          await this.exportStl(value)
          return
        case 'worker.dispose':
          if (this.disposed) return
          this.clearCandidateTimers()
          this.candidateTerminals.clear()
          this.lifetime.dispose()
          this.disposed = true
          this.disposeModularGridBaseTemplate()
          this.disposeHswCellTemplate()
          this.disposeBoxNormalReference()
          this.disposeHexagonalColumnReference()
          this.disposeOpenGridPrototypes()
          this.disposeOpenGridCanonicalTiles()
          this.disposeOpenGridHalfCellPrototypes()
          this.disposeOpenGridSnapReferences()
          this.disposeOpenGridSnapFixedFootprints()
          this.disposeOpenGridSnapRemoverAsset()
          this.lastBoxNormalOperationCounts = null
          this.initialized = false
          this.initializing = null
          this.invalidatedGeneration = 0
          return
      }
    } catch (error) {
      this.emit(errorEvent(value, this.toCadError(error, value)))
    }
  }

  private async initialize(
    command: Extract<WorkerCommand, { kind: 'engine.init' }>,
  ): Promise<void> {
    if (this.initialized) {
      this.ready(command)
      return
    }
    if (!this.initializing) {
      this.emitProgress(command, 'loading')
      this.initializing = initialiseCadKernel(command.asset.wasmUrl)
        .then(() => {
          if (!this.disposed) this.initialized = true
        })
        .finally(() => {
          this.initializing = null
        })
    }
    await this.initializing
    if (this.disposed) throw new Error('WORKER_TERMINATED')
    this.ready(command)
  }

  private ready(
    command: Extract<WorkerCommand, { kind: 'engine.init' }>,
  ): void {
    this.emit({
      version: PROTOCOL_VERSION,
      kind: 'engine.ready',
      requestId: command.requestId,
      operationId: command.operationId,
      workerEpoch: this.epoch,
      engine: { name: 'replicad', wasm: true },
    })
  }

  private async generate(
    command: Extract<WorkerCommand, { kind: 'model.generate' }>,
  ): Promise<void> {
    if (!this.initialized) throw new Error('ENGINE_NOT_READY')
    const isRegenerationAfterInvalidation =
      command.generation === this.latestInputGeneration &&
      this.invalidatedGeneration === command.generation
    if (
      command.generation < this.latestInputGeneration ||
      (command.generation === this.latestInputGeneration &&
        !isRegenerationAfterInvalidation)
    ) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    this.latestInputGeneration = command.generation
    this.invalidatedGeneration = 0
    this.lifetime.pruneCommitsBeforeGeneration(this.latestInputGeneration)
    const timing = new PreviewTimingRecorder()
    const booleanOperations = createBooleanOperationReporter(
      (progress) =>
        this.emitProgress(command, 'building', undefined, undefined, progress),
      (kind, durationMs) => timing.recordBoolean(kind, durationMs),
    )
    let generationParameters: ModelParameterValues = command.parameters
    if (command.modelId === 'opengrid') {
      const normalizedParameters = normalizeOpenGridParameters(
        command.parameters,
      )
      generationParameters = normalizedParameters
      const support = validateOpenGridGenerationSupport(normalizedParameters)
      if (!support.valid) throw new Error('OPENGRID_UNSUPPORTED_CONFIGURATION')
    }
    if (command.modelId === 'opengrid-divider') {
      generationParameters = normalizeOpenGridDividerParameters(
        command.parameters,
      )
    }
    const hswProgress =
      command.modelId === 'hsw-cell' && isHswCellParameters(command.parameters)
        ? {
            completed: 0,
            total: command.parameters.rows * command.parameters.columns,
            unit: 'cells' as const,
          }
        : undefined
    this.emitProgress(command, 'building', undefined, hswProgress)
    let shape: Shape3D
    try {
      const {
        useOpenGridCanonicalTileCache = true,
        useOpenGridHalfCellPrototypeCache = true,
        ...openGridBuildOptions
      } = this.openGridBuildOptions
      const buildContext: KernelBuildContext = {
        ...openGridBuildOptions,
        getModularGridBaseTemplate: () => this.getModularGridBaseTemplate(),
        getHswCellTemplate: () => this.getHswCellTemplate(),
        getBoxNormalReference: () => this.getBoxNormalReference(),
        getHexagonalColumnReference: () => this.getHexagonalColumnReference(),
        getOpenGridPrototype: (variant) => this.getOpenGridPrototype(variant),
        getOpenGridSnapReference: (variant, profile) =>
          this.getOpenGridSnapReference(variant, profile),
        getOpenGridSnapFixedFootprint: (footprint) =>
          this.getOpenGridSnapFixedFootprint(footprint),
        getOpenGridSnapRemoverAsset: () => this.getOpenGridSnapRemoverAsset(),
        yieldToEventLoop: yieldToWorkerEventLoop,
        isGenerationCurrent: () => this.isGenerationCurrent(command.generation),
        booleanOperations,
        reportProgress: (progress) =>
          this.emitProgress(command, progress.stage, undefined, {
            completed: progress.completed,
            total: progress.total,
            unit: progress.unit,
          }),
        reportOperationCounts:
          command.modelId === 'box-normal'
            ? (counts) => {
                this.lastBoxNormalOperationCounts = { ...counts }
              }
            : undefined,
      }
      if (useOpenGridCanonicalTileCache) {
        buildContext.getOpenGridCanonicalTile = (
          variant,
          thickness,
          canonicalBooleanOperations,
        ) =>
          this.getOpenGridCanonicalTile(
            variant,
            thickness,
            command.generation,
            canonicalBooleanOperations,
          )
      }
      if (useOpenGridHalfCellPrototypeCache) {
        buildContext.getOpenGridHalfCellPrototype = (key, factory) =>
          this.getOpenGridHalfCellPrototype(key, factory)
      }
      shape = await timing.measure('build', () =>
        buildModelBRep(command.modelId, generationParameters, buildContext),
      )
    } catch (error) {
      if (error instanceof Error && error.message === 'STALE_GENERATION') {
        this.superseded(command, 'STALE_GENERATION')
        return
      }
      throw error
    }
    if (
      command.generation !== this.latestInputGeneration ||
      this.invalidatedGeneration === command.generation
    ) {
      shape.delete()
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    let mesh: MeshData
    try {
      const reportFaceProgress = createThrottledMeshProgressReporter(
        ({ completed, total }) =>
          this.emitProgress(command, 'meshing', undefined, {
            completed,
            total,
            unit: 'faces',
          }),
      )
      this.emitProgress(command, 'meshing')
      try {
        mesh = timing.measureSync('mesh', () =>
          meshBRep(shape, {
            ...command.previewConfig,
            reportFaceProgress,
          }),
        )
      } catch (error) {
        reportFaceProgress.flush()
        throw error
      }
      if (command.modelId === 'opengrid-snap') {
        if (!isOpenGridSnapParameters(generationParameters)) {
          throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
        }
        if (generationParameters.footprint === 'full') {
          mesh.bounds = boundsForOpenGridSnap(generationParameters)
        }
      }
      if (command.modelId === 'opengrid') {
        if (!isOpenGridParameters(generationParameters)) {
          throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
        }
        timing.measureSync('quality', () =>
          assertOpenGridShapeQuality(shape, generationParameters, mesh),
        )
      }
      if (command.modelId === 'opengrid-snap') {
        if (!isOpenGridSnapParameters(generationParameters)) {
          throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
        }
        if (generationParameters.footprint === 'full') {
          const reference = await this.getOpenGridSnapReference(
            generationParameters.variant,
            generationParameters.profile,
          )
          timing.measureSync('quality', () =>
            assertOpenGridSnapShapeQuality(
              shape,
              generationParameters,
              mesh,
              reference,
            ),
          )
        }
      }

      if (command.modelId === 'opengrid-divider') {
        if (!isOpenGridDividerModelParameters(generationParameters)) {
          throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
        }
        timing.measureSync('quality', () =>
          assertOpenGridDividerShapeQuality(shape, generationParameters, mesh),
        )
      }
      if (command.modelId === 'opengrid-pillar') {
        if (!isPillarParameters(generationParameters)) {
          throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
        }
        timing.measureSync('quality', () =>
          assertPillarShapeQuality(shape, generationParameters, mesh),
        )
      }
      if (command.modelId === 'opengrid-open-shelf') {
        if (!isOpenGridOpenShelfParameters(generationParameters)) {
          throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
        }
        timing.measureSync('quality', () =>
          assertOpenGridOpenShelfShapeQuality(
            shape,
            generationParameters,
            mesh,
          ),
        )
      }
    } catch (error) {
      try {
        shape.delete()
      } catch {
        // A failed native delete must not hide the original mesh error.
      }
      throw error
    }
    const candidate: CandidateRecord = {
      candidateId: `candidate-${this.epoch}-${id()}`,
      operationId: command.operationId,
      requestId: command.requestId,
      generation: command.generation,
      workerEpoch: this.epoch,
      modelId: command.modelId,
      parameters: generationParameters,
      shape,
      mesh,
      previewTiming: timing.snapshot(),
      createdAt: Date.now(),
    }

    timing.measureSync('candidate', () => {
      const evicted = this.lifetime.addCandidate(candidate)
      for (const old of evicted)
        this.finalizeCandidate(old, 'CANDIDATE_CAPACITY')
      const expired = this.lifetime.cleanupExpired(this.latestInputGeneration)
      for (const old of expired) {
        this.finalizeCandidate(
          old,
          old.generation < this.latestInputGeneration
            ? 'STALE_GENERATION'
            : 'CANDIDATE_EXPIRED',
        )
      }

      this.scheduleCandidateCleanup(candidate)
    })
    let meshSnapshot: ReturnType<typeof serializeMesh>
    try {
      meshSnapshot = timing.measureSync('serialization', () =>
        serializeMesh(mesh),
      )
      candidate.previewTiming = timing.snapshot()
    } catch (error) {
      this.lifetime.discardCandidate(candidate.candidateId)
      throw error
    }
    this.emit(
      {
        version: PROTOCOL_VERSION,
        kind: 'model.candidate-ready',
        requestId: id(),
        operationId: command.operationId,
        generation: command.generation,
        candidateId: candidate.candidateId,
        workerEpoch: this.epoch,
        modelId: candidate.modelId,
        parameters: candidate.parameters,
        mesh: meshSnapshot,
        previewTiming: candidate.previewTiming,
      },
      [meshSnapshot.positions, meshSnapshot.normals, meshSnapshot.indices],
    )
  }

  getBoxNormalOperationCounts(): BoxNormalOperationCounts | null {
    return this.lastBoxNormalOperationCounts
      ? { ...this.lastBoxNormalOperationCounts }
      : null
  }

  private invalidate(
    command: Extract<WorkerCommand, { kind: 'model.invalidate' }>,
  ): void {
    if (command.workerEpoch !== this.epoch) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    if (command.generation < this.latestInputGeneration) {
      this.emit({
        version: PROTOCOL_VERSION,
        kind: 'model.invalidated',
        requestId: id(),
        operationId: command.operationId,
        generation: command.generation,
        workerEpoch: this.epoch,
      })
      return
    }
    if (command.generation > this.latestInputGeneration) {
      this.latestInputGeneration = command.generation
      this.lifetime.pruneCommitsBeforeGeneration(this.latestInputGeneration)
    }
    this.invalidatedGeneration = command.generation
    const expired = this.lifetime.cleanupExpired(command.generation, true)
    for (const old of expired) {
      this.finalizeCandidate(
        old,
        old.generation <= command.generation
          ? 'STALE_GENERATION'
          : 'CANDIDATE_EXPIRED',
      )
    }
    this.emit({
      version: PROTOCOL_VERSION,
      kind: 'model.invalidated',
      requestId: id(),
      operationId: command.operationId,
      generation: command.generation,
      workerEpoch: this.epoch,
    })
  }

  private commit(
    command: Extract<WorkerCommand, { kind: 'model.commit' }>,
  ): void {
    if (command.workerEpoch !== this.epoch) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    const terminal = this.candidateTerminals.get(command.candidateId)
    if (terminal) return
    const candidate = this.lifetime.getCandidate(command.candidateId)
    if (
      candidate &&
      (candidate.generation < this.latestInputGeneration ||
        this.invalidatedGeneration === candidate.generation)
    ) {
      const removed = this.lifetime.discardCandidate(command.candidateId)
      if (removed) this.finalizeCandidate(removed, 'STALE_GENERATION')
      return
    }
    if (
      command.generation !== this.latestInputGeneration ||
      this.invalidatedGeneration === command.generation
    ) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    const previousCommit = this.lifetime.getCommit(command.operationId)
    if (previousCommit) {
      this.readyFromRevision(command, previousCommit.revision)
      return
    }
    if (
      !candidate ||
      candidate.workerEpoch !== this.epoch ||
      candidate.generation !== this.latestInputGeneration
    ) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    const revision = this.lifetime.commitCandidate(command.candidateId)
    this.clearCandidateTimer(command.candidateId)
    this.readyFromRevision(command, revision)
  }

  private readyFromRevision(
    command: Extract<WorkerCommand, { kind: 'model.commit' }>,
    revision: RevisionRecord,
  ): void {
    this.emit({
      version: PROTOCOL_VERSION,
      kind: 'model.ready',
      requestId: id(),
      operationId: command.operationId,
      generation: revision.generation,
      modelRevision: revision.modelRevision,
      workerEpoch: this.epoch,
      modelId: revision.modelId,
      parameters: revision.parameters,
      bounds: revision.mesh.bounds,
      previewTiming: revision.previewTiming,
    })
  }

  private discard(
    command: Extract<WorkerCommand, { kind: 'model.discard' }>,
  ): void {
    if (command.workerEpoch !== this.epoch) {
      this.superseded(command, 'STALE_GENERATION')
      return
    }
    const terminal = this.candidateTerminals.get(command.candidateId)
    if (terminal) return
    const candidate = this.lifetime.discardCandidate(command.candidateId)
    if (!candidate) return
    this.finalizeCandidate(candidate, 'CANDIDATE_ORPHANED')
  }

  private async exportStep(
    command: Extract<WorkerCommand, { kind: 'export.step' }>,
  ): Promise<void> {
    if (command.workerEpoch !== this.epoch) throw new Error('WORKER_RESTARTED')
    const revision = this.lifetime.pin(command.modelRevision)
    try {
      const validation = validateModelParameters(
        revision.modelId,
        revision.parameters,
      )
      if (!validation.valid) throw new Error('STEP_METADATA_INVALID')
      if (command.file.name !== modelFileName(validation.value)) {
        throw new Error('STEP_METADATA_INVALID')
      }
      this.emit({
        version: PROTOCOL_VERSION,
        kind: 'export.accepted',
        requestId: id(),
        operationId: command.operationId,
        modelRevision: revision.modelRevision,
        workerEpoch: this.epoch,
      })
      this.emitProgress(command, 'exporting', revision.modelRevision)
      const bytes = await exportStepBytes(revision.shape)
      if (bytes.byteLength === 0) throw new Error('STEP_EMPTY')
      this.emit(
        {
          version: PROTOCOL_VERSION,
          kind: 'export.ready',
          requestId: id(),
          operationId: command.operationId,
          modelRevision: revision.modelRevision,
          workerEpoch: this.epoch,
          format: 'step',
          bytes,
          mime: 'model/step',
          fileName: command.file.name,
        },
        [bytes],
      )
    } finally {
      this.lifetime.unpin(revision.modelRevision)
    }
  }

  private async exportStl(
    command: Extract<WorkerCommand, { kind: 'export.stl' }>,
  ): Promise<void> {
    if (command.workerEpoch !== this.epoch) throw new Error('WORKER_RESTARTED')
    const revision = this.lifetime.pin(command.modelRevision)
    try {
      const validation = validateModelParameters(
        revision.modelId,
        revision.parameters,
      )
      if (!validation.valid) throw new Error('STL_METADATA_INVALID')
      if (command.file.name !== modelStlFileName(validation.value)) {
        throw new Error('STL_METADATA_INVALID')
      }
      this.emit({
        version: PROTOCOL_VERSION,
        kind: 'export.accepted',
        requestId: id(),
        operationId: command.operationId,
        modelRevision: revision.modelRevision,
        workerEpoch: this.epoch,
      })
      this.emitProgress(command, 'exporting', revision.modelRevision)
      const bytes = await exportStlBytes(revision.shape, {
        tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
        angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
      })
      if (bytes.byteLength === 0) throw new Error('STL_EMPTY')
      this.emit(
        {
          version: PROTOCOL_VERSION,
          kind: 'export.ready',
          requestId: id(),
          operationId: command.operationId,
          modelRevision: revision.modelRevision,
          workerEpoch: this.epoch,
          format: 'stl',
          bytes,
          mime: PROTOTYPE_CONFIGURATION.stlMime,
          fileName: command.file.name,
        },
        [bytes],
      )
    } finally {
      this.lifetime.unpin(revision.modelRevision)
    }
  }

  private emitProgress(
    command: { operationId: string; requestId: string; generation?: number },
    stage: 'loading' | 'building' | 'meshing' | 'exporting',
    modelRevision?: string,
    counters?: {
      completed?: number
      total?: number
      unit?: ProgressUnit
    },
    booleanOperation?: BooleanOperationProgress,
  ): void {
    const event: ProgressEvent = {
      version: PROTOCOL_VERSION,
      kind: 'operation.progress',
      requestId: id(),
      operationId: command.operationId,
      stage,
      generation: command.generation,
      modelRevision,
      ...counters,
    }
    if (booleanOperation !== undefined)
      event.booleanOperation = booleanOperation
    this.emit(event)
  }

  private superseded(
    command: { operationId: string; requestId: string; generation?: number },
    reason: SupersededReason,
  ): void {
    this.emit({
      version: PROTOCOL_VERSION,
      kind: 'operation.superseded',
      requestId: id(),
      operationId: command.operationId,
      terminalForRequestId: command.requestId,
      generation: command.generation ?? this.latestInputGeneration,
      reason,
    })
  }

  private finalizeCandidate(
    candidate: CandidateRecord,
    reason: SupersededReason,
  ): void {
    this.clearCandidateTimer(candidate.candidateId)
    const terminal = {
      operationId: candidate.operationId,
      requestId: candidate.requestId,
      generation: candidate.generation,
      reason,
    } satisfies CandidateTerminal
    this.candidateTerminals.set(candidate.candidateId, terminal)
    this.emit({
      version: PROTOCOL_VERSION,
      kind: 'operation.superseded',
      requestId: id(),
      operationId: terminal.operationId,
      terminalForRequestId: terminal.requestId,
      generation: terminal.generation,
      reason: terminal.reason,
    })
  }

  private scheduleCandidateCleanup(candidate: CandidateRecord): void {
    this.clearCandidateTimer(candidate.candidateId)
    const delay = Math.max(
      0,
      candidate.createdAt + PROTOTYPE_CONFIGURATION.candidateTtlMs - Date.now(),
    )
    const timer = setTimeout(() => {
      const remaining =
        candidate.createdAt +
        PROTOTYPE_CONFIGURATION.candidateTtlMs -
        Date.now()
      if (remaining > 0) {
        this.scheduleCandidateCleanup(candidate)
        return
      }
      const expired = this.lifetime.cleanupExpired(this.latestInputGeneration)
      for (const old of expired) {
        this.finalizeCandidate(
          old,
          old.generation < this.latestInputGeneration
            ? 'STALE_GENERATION'
            : 'CANDIDATE_EXPIRED',
        )
      }
    }, delay)
    this.candidateTimers.set(candidate.candidateId, timer)
  }

  private clearCandidateTimer(candidateId: string): void {
    const timer = this.candidateTimers.get(candidateId)
    if (timer) clearTimeout(timer)
    this.candidateTimers.delete(candidateId)
  }

  private clearCandidateTimers(): void {
    for (const timer of this.candidateTimers.values()) clearTimeout(timer)
    this.candidateTimers.clear()
  }

  private getModularGridBaseTemplate(): Promise<import('replicad').Shape3D> {
    if (!this.modularGridBaseTemplate) {
      this.modularGridBaseTemplate = loadModularGridBaseTemplate().then(
        (template) => {
          if (this.disposed) {
            template.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return template
        },
      )
    }
    return this.modularGridBaseTemplate
  }

  private getHswCellTemplate(): Promise<import('replicad').Shape3D> {
    if (!this.hswCellTemplate) {
      this.hswCellTemplate = loadHswCellTemplate().then((template) => {
        if (this.disposed) {
          template.delete()
          throw new Error('WORKER_TERMINATED')
        }
        return template
      })
    }
    return this.hswCellTemplate
  }

  private getHexagonalColumnReference(): Promise<import('replicad').Shape3D> {
    if (!this.hexagonalColumnReference) {
      this.hexagonalColumnReference = loadHexagonalColumnReference().then(
        (reference) => {
          if (this.disposed) {
            reference.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return reference
        },
      )
    }
    return this.hexagonalColumnReference
  }

  private getOpenGridPrototype(
    variant: OpenGridVariant,
  ): Promise<import('replicad').Shape3D> {
    const cached = this.openGridPrototypes.get(variant)
    if (cached) return cached

    const prototype = loadOpenGridPrototypeTemplate(variant).then((shape) => {
      if (this.disposed) {
        shape.delete()
        throw new Error('WORKER_TERMINATED')
      }
      return shape
    })
    const recoverable = prototype.catch((error) => {
      this.openGridPrototypes.delete(variant)
      throw error
    })
    this.openGridPrototypes.set(variant, recoverable)
    return recoverable
  }

  private getOpenGridCanonicalTile(
    variant: OpenGridVariant,
    _thickness: number,
    generation: number,
    booleanOperations?: BooleanOperationReporter,
  ): Promise<import('replicad').Shape3D> {
    const cached = this.openGridCanonicalTiles.get(variant)
    if (cached) return cached

    const canonical = buildOpenGridCanonicalTile(variant, {
      balancedFuseBatchSize: this.openGridBuildOptions.balancedFuseBatchSize,
      yieldToEventLoop: yieldToWorkerEventLoop,
      isGenerationCurrent: () => this.isGenerationCurrent(generation),
      booleanOperations,
    })
    const recoverable = canonical.catch((error) => {
      this.openGridCanonicalTiles.delete(variant)
      throw error
    })
    this.openGridCanonicalTiles.set(variant, recoverable)
    return recoverable
  }

  private getOpenGridHalfCellPrototype(
    key: string,
    factory: () =>
      Promise<import('replicad').Shape3D> | import('replicad').Shape3D,
  ): Promise<import('replicad').Shape3D> {
    const cached = this.openGridHalfCellPrototypes.get(key)
    if (cached) return cached

    const prototype = Promise.resolve().then(factory)
    const recoverable = prototype.catch((error) => {
      this.openGridHalfCellPrototypes.delete(key)
      throw error
    })
    this.openGridHalfCellPrototypes.set(key, recoverable)
    return recoverable
  }

  private getOpenGridSnapReference(
    variant: OpenGridSnapVariant,
    profile: OpenGridSnapParameters['profile'],
  ): Promise<import('replicad').Shape3D> {
    const cacheKey = `${profile}:${variant}`
    const cached = this.openGridSnapReferences.get(cacheKey)
    if (cached) return cached

    const reference = loadOpenGridSnapReference(variant, profile).then(
      (shape) => {
        if (this.disposed) {
          shape.delete()
          throw new Error('WORKER_TERMINATED')
        }
        return shape
      },
    )
    const recoverable = reference.catch((error) => {
      this.openGridSnapReferences.delete(cacheKey)
      throw error
    })
    this.openGridSnapReferences.set(cacheKey, recoverable)
    return recoverable
  }

  private getOpenGridSnapFixedFootprint(
    footprint: OpenGridSnapFixedFootprint,
  ): Promise<import('replicad').Shape3D> {
    const cached = this.openGridSnapFixedFootprints.get(footprint)
    if (cached) return cached

    const fixedFootprint = loadOpenGridSnapFixedFootprint(footprint).then(
      (shape) => {
        if (this.disposed) {
          shape.delete()
          throw new Error('WORKER_TERMINATED')
        }
        return shape
      },
    )
    const recoverable = fixedFootprint.catch((error) => {
      this.openGridSnapFixedFootprints.delete(footprint)
      throw error
    })
    this.openGridSnapFixedFootprints.set(footprint, recoverable)
    return recoverable
  }

  private getOpenGridSnapRemoverAsset(): Promise<import('replicad').Shape3D> {
    if (!this.openGridSnapRemoverAsset) {
      const assetPromise = loadOpenGridSnapRemoverAsset()
        .then((asset) => {
          if (this.disposed) {
            asset.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return asset
        })
        .catch((error) => {
          if (this.openGridSnapRemoverAsset === assetPromise) {
            this.openGridSnapRemoverAsset = null
          }
          throw error
        })
      this.openGridSnapRemoverAsset = assetPromise
    }
    return this.openGridSnapRemoverAsset
  }

  private getBoxNormalReference(): Promise<import('replicad').Shape3D> {
    if (!this.boxNormalReference) {
      const referencePromise = loadBoxNormalReference()
        .then((reference) => {
          if (this.disposed) {
            reference.delete()
            throw new Error('WORKER_TERMINATED')
          }
          return reference
        })
        .catch((error) => {
          if (this.boxNormalReference === referencePromise) {
            this.boxNormalReference = null
          }
          throw error
        })
      this.boxNormalReference = referencePromise
    }
    return this.boxNormalReference
  }

  private isGenerationCurrent(generation: number): boolean {
    return (
      !this.disposed &&
      generation === this.latestInputGeneration &&
      this.invalidatedGeneration !== generation
    )
  }

  private disposeModularGridBaseTemplate(): void {
    const templatePromise = this.modularGridBaseTemplate
    this.modularGridBaseTemplate = null
    if (!templatePromise) return
    void templatePromise
      .then((template) => template.delete())
      .catch(() => undefined)
  }

  private disposeHswCellTemplate(): void {
    const templatePromise = this.hswCellTemplate
    this.hswCellTemplate = null
    if (!templatePromise) return
    void templatePromise
      .then((template) => template.delete())
      .catch(() => undefined)
  }

  private disposeHexagonalColumnReference(): void {
    const referencePromise = this.hexagonalColumnReference
    this.hexagonalColumnReference = null
    if (!referencePromise) return
    void referencePromise
      .then((reference) => reference.delete())
      .catch(() => undefined)
  }

  private disposeOpenGridPrototypes(): void {
    const prototypes = [...this.openGridPrototypes.values()]
    this.openGridPrototypes.clear()
    for (const prototype of prototypes) {
      void prototype.then((shape) => shape.delete()).catch(() => undefined)
    }
  }

  private disposeOpenGridCanonicalTiles(): void {
    const tiles = [...this.openGridCanonicalTiles.values()]
    this.openGridCanonicalTiles.clear()
    for (const tile of tiles) {
      void tile.then((shape) => shape.delete()).catch(() => undefined)
    }
  }

  private disposeOpenGridHalfCellPrototypes(): void {
    const prototypes = [...this.openGridHalfCellPrototypes.values()]
    this.openGridHalfCellPrototypes.clear()
    for (const prototype of prototypes) {
      void prototype.then((shape) => shape.delete()).catch(() => undefined)
    }
  }

  private disposeOpenGridSnapReferences(): void {
    const references = [...this.openGridSnapReferences.values()]
    this.openGridSnapReferences.clear()
    for (const reference of references) {
      void reference.then((shape) => shape.delete()).catch(() => undefined)
    }
  }

  private disposeOpenGridSnapFixedFootprints(): void {
    const fixedFootprints = [...this.openGridSnapFixedFootprints.values()]
    this.openGridSnapFixedFootprints.clear()
    for (const fixedFootprint of fixedFootprints) {
      void fixedFootprint.then((shape) => shape.delete()).catch(() => undefined)
    }
  }

  private disposeOpenGridSnapRemoverAsset(): void {
    const assetPromise = this.openGridSnapRemoverAsset
    this.openGridSnapRemoverAsset = null
    if (!assetPromise) return
    void assetPromise.then((asset) => asset.delete()).catch(() => undefined)
  }

  private disposeBoxNormalReference(): void {
    const referencePromise = this.boxNormalReference
    this.boxNormalReference = null
    if (!referencePromise) return
    void referencePromise
      .then((reference) => reference.delete())
      .catch(() => undefined)
  }

  private toCadError(error: unknown, command: WorkerCommand): CadError {
    const message = error instanceof Error ? error.message : String(error)
    const code: CadErrorCode = cadErrorCodeFor(message, command.kind)
    const stage: CadErrorStage = cadErrorStageFor(command.kind, message)
    if (command.kind === 'export.stl') {
      const userMessage =
        code === 'STL_METADATA_INVALID'
          ? 'STL 匯出資料不正確，請重試。'
          : 'STL 匯出失敗，請重試。'
      return makeError(stage, code, userMessage, true)
    }
    if (code === 'OPENGRID_UNSUPPORTED_CONFIGURATION') {
      return makeError(
        'validation',
        code,
        'OpenGrid 參數與官方 SCAD 規格不相容，請檢查板型、格數、螺絲孔與接頭孔設定。',
        true,
      )
    }
    if (
      code === 'INVALID_INPUT' &&
      message.includes('opengrid-stackable-cylinder')
    ) {
      return makeError(
        'validation',
        code,
        'OpenGrid 可堆疊圓柱參數無效，外徑與高度必須是範圍內的 1 mm 整數。',
        true,
      )
    }
    if (code === 'OPENGRID_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        'OpenGrid 幾何未通過品質檢查，請調整參數後重試。',
        true,
      )
    }
    if (code === 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        `OpenGrid 可堆疊圓柱${cylinderQualityContext(command)}的底部輪廓、階梯孔或堆疊介面未通過品質檢查，請調整參數後重試。`,
        true,
      )
    }
    if (code === 'OPENGRID_SNAP_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        'OpenGrid Snap 幾何未通過品質檢查，請調整外框增量後重試。',
        true,
      )
    }

    if (code === 'OPENGRID_DIVIDER_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        '官方 28 mm 整格／14 mm 半格 OpenGrid 分隔器幾何未通過品質檢查，請調整參數後重試。',
        true,
      )
    }
    return makeError(stage, code, `CAD 操作失敗：${message}`, true)
  }
}

export function createCadWorkerMessageHandler(
  runtime: Pick<CadWorkerRuntime, 'handle'>,
): (value: unknown) => Promise<void> {
  let queue = Promise.resolve()

  return (value: unknown) => {
    // Invalidation is deliberately handled outside the long-running command
    // queue so an in-flight kernel build can observe the newer generation at
    // its next safe boundary. The atomic OpenCascade call itself remains
    // synchronous and cannot be interrupted.
    if (isWorkerCommand(value) && value.kind === 'model.invalidate') {
      return runtime.handle(value)
    }

    queue = queue.then(() => runtime.handle(value)).catch(() => undefined)
    return queue
  }
}

if (typeof self !== 'undefined') {
  const workerGlobal = globalThis as unknown as {
    postMessage: (event: WorkerEvent, transfer?: Transferable[]) => void
  }

  const runtime = new CadWorkerRuntime(undefined, (event, transfer) => {
    workerGlobal.postMessage(event, transfer ?? [])
  })

  const handleMessage = createCadWorkerMessageHandler(runtime)
  self.addEventListener('message', (event: MessageEvent<unknown>) => {
    void handleMessage(event.data)
  })
}

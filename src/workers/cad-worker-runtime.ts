import {
  errorEvent,
  isWorkerCommand,
  PROTOCOL_VERSION,
  type WorkerCommand,
} from '../cad-contract/messages'
import { diagnostic } from '../cad-contract/diagnostics'
import type {
  CadError,
  CadErrorCode,
  CadErrorStage,
} from '../cad-contract/errors'
import { initialiseCadKernel } from '../cad-kernel/initialise'
import { CadWorkerAssetCache } from './cad-worker-assets'
import { exportStepCommand, exportStlCommand } from './cad-worker-export'
import {
  emitProgress as emitProgressEvent,
  id,
  makeError,
} from './cad-worker-events'
import { generateCadCandidate } from './cad-worker-generation'
import { CadWorkerLifecycle } from './cad-worker-lifecycle'
import type {
  CadWorkerBuildOptions,
  EventSink,
  ProgressEmitter,
} from './cad-worker-types'
import { cadErrorCodeFor, cadErrorStageFor } from './error-mapping'

export type { CadWorkerBuildOptions } from './cad-worker-types'

export class CadWorkerRuntime {
  private initialized = false
  private initializing: Promise<void> | null = null
  private readonly lifecycle: CadWorkerLifecycle
  private readonly assets: CadWorkerAssetCache

  constructor(
    private readonly epoch: string = `epoch-${id()}`,
    private readonly emit: EventSink = () => undefined,
    private readonly openGridBuildOptions: CadWorkerBuildOptions = {},
  ) {
    this.lifecycle = new CadWorkerLifecycle(epoch, emit)
    this.assets = new CadWorkerAssetCache(
      () => this.lifecycle.isDisposed,
      openGridBuildOptions,
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
        messageId: 'diagnostic.protocolInvalid',
        recoverable: false,
      })
      return
    }

    if (this.lifecycle.isDisposed && value.kind !== 'worker.dispose') {
      this.emit(
        errorEvent(
          value,
          makeError(
            'worker',
            'WORKER_TERMINATED',
            diagnostic('diagnostic.workerTerminated'),
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
          this.dispose()
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
          if (!this.lifecycle.isDisposed) this.initialized = true
        })
        .finally(() => {
          this.initializing = null
        })
    }
    await this.initializing
    if (this.lifecycle.isDisposed) throw new Error('WORKER_TERMINATED')
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
    if (!this.lifecycle.beginGeneration(command.generation)) {
      this.lifecycle.superseded(command, 'STALE_GENERATION')
      return
    }
    await generateCadCandidate(command, {
      epoch: this.epoch,
      assets: this.assets,
      buildOptions: this.openGridBuildOptions,
      emit: this.emit,
      emitProgress: this.emitProgress.bind(this),
      isGenerationCurrent: (generation) =>
        this.lifecycle.isGenerationCurrent(generation),
      registerCandidate: (candidate) =>
        this.lifecycle.registerCandidate(candidate),
      supersede: (candidate, reason) =>
        this.lifecycle.superseded(candidate, reason),
    })
  }

  private invalidate(
    command: Extract<WorkerCommand, { kind: 'model.invalidate' }>,
  ): void {
    this.lifecycle.invalidate(command)
  }

  private commit(
    command: Extract<WorkerCommand, { kind: 'model.commit' }>,
  ): void {
    this.lifecycle.commit(command)
  }

  private discard(
    command: Extract<WorkerCommand, { kind: 'model.discard' }>,
  ): void {
    this.lifecycle.discard(command)
  }

  private async exportStep(
    command: Extract<WorkerCommand, { kind: 'export.step' }>,
  ): Promise<void> {
    await exportStepCommand(command, {
      epoch: this.epoch,
      lifecycle: this.lifecycle,
      emit: this.emit,
    })
  }

  private async exportStl(
    command: Extract<WorkerCommand, { kind: 'export.stl' }>,
  ): Promise<void> {
    await exportStlCommand(command, {
      epoch: this.epoch,
      lifecycle: this.lifecycle,
      emit: this.emit,
    })
  }

  private emitProgress(...args: Parameters<ProgressEmitter>): void {
    emitProgressEvent(this.emit, ...args)
  }

  private dispose(): void {
    if (this.lifecycle.isDisposed) return
    this.lifecycle.dispose()
    this.assets.dispose()
    this.initialized = false
    this.initializing = null
  }

  private toCadError(error: unknown, command: WorkerCommand): CadError {
    const message = error instanceof Error ? error.message : String(error)
    const code: CadErrorCode = cadErrorCodeFor(message, command.kind)
    const stage: CadErrorStage = cadErrorStageFor(command.kind, message)
    if (command.kind === 'export.stl') {
      const messageId =
        code === 'STL_METADATA_INVALID'
          ? 'diagnostic.stlMetadataInvalid'
          : 'diagnostic.stlExportFailed'
      return makeError(stage, code, diagnostic(messageId), true)
    }
    if (code === 'OPENGRID_UNSUPPORTED_CONFIGURATION') {
      return makeError(
        'validation',
        code,
        diagnostic('diagnostic.opengridUnsupported'),
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
        diagnostic('diagnostic.cylinderParametersInvalid'),
        true,
      )
    }
    if (code === 'OPENGRID_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.opengridQualityInvalid'),
        true,
      )
    }
    if (code === 'OPENGRID_STACKABLE_CYLINDER_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.cylinderQualityInvalid'),
        true,
      )
    }
    if (code === 'OPENGRID_SNAP_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.snapQualityInvalid'),
        true,
      )
    }

    if (code === 'OPENGRID_DIVIDER_QUALITY_INVALID') {
      return makeError(
        'meshing',
        code,
        diagnostic('diagnostic.dividerQualityInvalid'),
        true,
      )
    }
    return makeError(
      stage,
      code,
      diagnostic('diagnostic.modelBuildFailed'),
      true,
    )
  }
}

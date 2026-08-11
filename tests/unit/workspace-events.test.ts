import { describe, expect, it, vi } from 'vitest'
import type {
  MeshSnapshot,
  ProgressEvent,
} from '../../src/cad-contract/messages'
import { initialCadState } from '../../src/features/cad/state'
import { rawFromParameters } from '../../src/components/cad/workspace/validation'
import { createWorkerEventHandler } from '../../src/components/cad/workspace/runtime/events'
import type {
  RuntimeContext,
  RuntimeRefs,
} from '../../src/components/cad/workspace/runtime/types'

function createContext() {
  const state = initialCadState()
  const operations = new Map()
  operations.set('operation-2', {
    kind: 'model',
    generation: 2,
    modelId: 'box',
    parameters: state.input,
    requestId: 'request-2',
  })
  operations.set('operation-1', {
    kind: 'model',
    generation: 1,
    modelId: 'box',
    parameters: state.input,
    requestId: 'request-1',
  })
  const refs: RuntimeRefs = {
    client: { current: null },
    rawParameters: { current: rawFromParameters(state.input) },
    state: { current: state },
    workerEpoch: { current: 'epoch-test' },
    latestGeneration: { current: 2 },
    initialModelSent: { current: true },
    autoRecoveryAttempts: { current: 0 },
    operations: { current: operations },
    activeProgressOperationId: { current: null },
    exportRequest: { current: null },
    debounce: { current: null },
    timers: { current: new Map() },
    startWorker: { current: vi.fn() },
    recoverWorker: { current: vi.fn() },
    disposed: { current: false },
  }
  const setProgress = vi.fn()
  const setOperationProgress = vi.fn((operationId, progress) => {
    refs.activeProgressOperationId.current = operationId
    setProgress(progress)
  })
  const clearOperationProgress = vi.fn((operationId) => {
    if (refs.activeProgressOperationId.current !== operationId) return
    refs.activeProgressOperationId.current = null
    setProgress(null)
  })
  const clearProgress = vi.fn(() => {
    refs.activeProgressOperationId.current = null
    setProgress(null)
  })
  const context = {
    refs,
    dispatch: vi.fn(),
    setRawParameters: vi.fn(),
    setFieldErrors: vi.fn(),
    setProgress,
    setOperationProgress,
    clearOperationProgress,
    clearProgress,
    clearTimer: vi.fn(),
    setOperationTimeout: vi.fn(),
    recoverWorker: vi.fn(),
    generation: {
      sendGenerate: vi.fn(),
      sendInvalidate: vi.fn(),
      handleModelChange: vi.fn(),
      handleInputChange: vi.fn(),
    },
    exportHandlers: { handleExportReady: vi.fn(), handleExport: vi.fn() },
  } as unknown as RuntimeContext & {
    generation: never
    exportHandlers: never
  }
  return { context, setProgress, refs }
}

function progressEvent(
  generation: number,
  operationId: string,
  booleanOperation?: {
    kind: 'fuse' | 'cut' | 'intersect'
    state: 'running' | 'completed'
    completed?: number
    total?: number
    elapsedMs: number
  },
) {
  const event: ProgressEvent = {
    version: 1 as const,
    kind: 'operation.progress' as const,
    requestId: `progress-request-${generation}`,
    operationId,
    generation,
    stage: 'building' as const,
    completed: 2,
    total: 10,
    unit: 'cells' as const,
  }
  if (booleanOperation) event.booleanOperation = booleanOperation
  return event
}

describe('CAD Worker progress lifecycle', () => {
  it('ignores an older generation and accepts correlated current progress', () => {
    const { context, setProgress } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(progressEvent(1, 'operation-1'))
    expect(setProgress).not.toHaveBeenCalled()

    handle(progressEvent(2, 'operation-2'))
    expect(setProgress).toHaveBeenCalledWith({
      stage: 'building',
      completed: 2,
      total: 10,
      unit: 'cells',
    })
  })

  it('keeps boolean subprogress on the current operation and clears it at terminal state', () => {
    const { context, setProgress } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(
      progressEvent(2, 'operation-2', {
        kind: 'fuse',
        state: 'running',
        completed: 2,
        total: 7,
        elapsedMs: 1800,
      }),
    )
    expect(setProgress).toHaveBeenLastCalledWith({
      stage: 'building',
      completed: 2,
      total: 10,
      unit: 'cells',
      booleanOperation: {
        kind: 'fuse',
        state: 'running',
        completed: 2,
        total: 7,
        elapsedMs: 1800,
      },
    })

    handle({
      version: 1,
      kind: 'operation.superseded',
      requestId: 'superseded-response',
      operationId: 'operation-2',
      terminalForRequestId: 'request-2',
      generation: 2,
      reason: 'STALE_GENERATION',
    })
    expect(setProgress).toHaveBeenLastCalledWith(null)
  })

  it('clears current progress on invalidation and superseded/error terminals', () => {
    const { context, setProgress, refs } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(progressEvent(2, 'operation-2'))
    handle({
      version: 1,
      kind: 'model.invalidated',
      requestId: 'invalidate-response',
      operationId: 'invalidate-operation',
      generation: 2,
      workerEpoch: 'epoch-test',
    })
    expect(setProgress).toHaveBeenLastCalledWith(null)

    handle(progressEvent(2, 'operation-2'))
    handle({
      version: 1,
      kind: 'operation.superseded',
      requestId: 'superseded-response',
      operationId: 'operation-2',
      terminalForRequestId: 'request-2',
      generation: 2,
      reason: 'STALE_GENERATION',
    })
    expect(setProgress).toHaveBeenLastCalledWith(null)
    expect(refs.operations.current.has('operation-2')).toBe(false)

    refs.operations.current.set('operation-2', {
      kind: 'model',
      generation: 2,
      modelId: 'box',
      parameters: initialCadState().input,
      requestId: 'request-2',
    })
    handle(progressEvent(2, 'operation-2'))
    handle({
      version: 1,
      kind: 'operation.error',
      requestId: 'error-response',
      operationId: 'operation-2',
      terminalForRequestId: 'request-2',
      stage: 'building',
      code: 'MODEL_BUILD_FAILED',
      userMessage: '建模失敗',
      recoverable: true,
      generation: 2,
    })
    expect(setProgress).toHaveBeenLastCalledWith(null)
  })

  it('does not let an older terminal event clear newer progress', () => {
    const { context, setProgress, refs } = createContext()
    const handle = createWorkerEventHandler(context)

    handle(progressEvent(2, 'operation-2'))
    const callsBeforeOlderTerminals = setProgress.mock.calls.length

    handle({
      version: 1,
      kind: 'operation.error',
      requestId: 'old-error-response',
      operationId: 'operation-1',
      terminalForRequestId: 'request-1',
      stage: 'building',
      code: 'MODEL_BUILD_FAILED',
      userMessage: '舊建模失敗',
      recoverable: true,
    })
    handle({
      version: 1,
      kind: 'operation.superseded',
      requestId: 'old-superseded-response',
      operationId: 'operation-1',
      terminalForRequestId: 'request-1',
      generation: 1,
      reason: 'STALE_GENERATION',
    })

    expect(setProgress).toHaveBeenCalledTimes(callsBeforeOlderTerminals)
    expect(refs.activeProgressOperationId.current).toBe('operation-2')

    refs.operations.current.set('export-old', {
      kind: 'export',
      modelRevision: 'revision-old',
      requestId: 'request-export-old',
    })
    refs.exportRequest.current = {
      operationId: 'export-current',
      format: 'step',
      revision: 'revision-current',
      workerEpoch: 'epoch-test',
      fileName: 'current.step',
      downloaded: false,
    }
    handle({
      version: 1,
      kind: 'operation.progress',
      requestId: 'old-export-progress',
      operationId: 'export-old',
      stage: 'exporting',
    })
    handle({
      version: 1,
      kind: 'operation.error',
      requestId: 'old-export-error',
      operationId: 'export-old',
      terminalForRequestId: 'request-export-old',
      stage: 'exporting',
      code: 'STEP_EXPORT_FAILED',
      userMessage: '舊匯出失敗',
      recoverable: true,
    })

    expect(setProgress).toHaveBeenCalledTimes(callsBeforeOlderTerminals)
    expect(refs.activeProgressOperationId.current).toBe('operation-2')
  })

  it('reuses the candidate mesh when model.ready only transfers the revision', () => {
    const { context, refs } = createContext()
    const send = vi.fn()
    refs.client.current = { send } as never
    const handle = createWorkerEventHandler(context)
    const mesh: MeshSnapshot = {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
      indices: new Uint32Array([0, 1, 2]).buffer,
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
      triangleCount: 1,
    }

    handle({
      version: 1,
      kind: 'model.candidate-ready',
      requestId: 'candidate-response',
      operationId: 'operation-2',
      generation: 2,
      candidateId: 'candidate-1',
      workerEpoch: 'epoch-test',
      modelId: 'box',
      parameters: { width: 20, depth: 30, height: 40 },
      mesh,
    })

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'model.commit' }),
    )
    expect(refs.operations.current.get('operation-2')?.candidateMesh).toBe(mesh)

    handle({
      version: 1,
      kind: 'model.ready',
      requestId: 'ready-response',
      operationId: 'operation-2',
      generation: 2,
      modelRevision: 'revision-1',
      workerEpoch: 'epoch-test',
      modelId: 'box',
      parameters: { width: 20, depth: 30, height: 40 },
      bounds: { min: [0, 0, 0], max: [1, 1, 0] },
    })

    expect(context.dispatch).toHaveBeenCalledWith({
      type: 'model-ready',
      model: expect.objectContaining({ mesh }),
    })
    expect(refs.operations.current.has('operation-2')).toBe(false)
  })
})

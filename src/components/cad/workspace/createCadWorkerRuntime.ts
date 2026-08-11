import { normalizeError, type CadError } from '../../../cad-contract/errors'
import {
  PROTOTYPE_CONFIGURATION,
  type ModelId,
  type ModelParameterKey,
  type OpenGridParameters,
} from '../../../cad-contract/units'
import {
  cadReducer,
  type CadAction,
  type CadState,
} from '../../../features/cad/state'
import {
  CadWorkerClient,
  newOperationId,
  type WorkerClientError,
} from '../../../features/cad/worker-client'
import {
  errorForCapability,
  errorForWorker,
  supportsCadBrowser,
} from './validation'
import type { CadProgress } from '../../../features/cad/progress'
import type { ExportFormat } from '../../../features/cad/download'
import type { ExportRequest, OperationRecord, RawParameters } from './types'
import { createExportHandlers } from './runtime/export'
import { createWorkerEventHandler } from './runtime/events'
import { createModelGenerationHandlers } from './runtime/model-generation'
import type {
  FieldErrors,
  RuntimeContext,
  RuntimeRefs,
  StateSetter,
} from './runtime/types'

type CadWorkerRuntimeOptions = {
  initialState: CadState
  initialRawParameters: RawParameters
  setState: StateSetter<CadState>
  setRawParameters: StateSetter<RawParameters>
  setPersistedParameters: (
    modelId: ModelId,
    parameters: CadState['input'],
  ) => void
  setFieldErrors: StateSetter<FieldErrors>
  setProgress: StateSetter<CadProgress | null>
}

function getCadFallbackElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById('cad-fallback')
}

export type CadWorkerRuntime = {
  handleInputChange: (key: ModelParameterKey, value: string) => void
  handleOpenGridParametersChange: (parameters: OpenGridParameters) => void
  handleOpenGridDimensionCalculationInvalid: () => void
  handleExport: (format?: ExportFormat) => void
  handleRetry: () => void
  dispose: () => void
}

export function createCadWorkerRuntime(
  options: CadWorkerRuntimeOptions,
): CadWorkerRuntime {
  const clientRef = { current: null } as RuntimeRefs['client']
  const rawParametersRef = {
    current: options.initialRawParameters,
  } as RuntimeRefs['rawParameters']
  const stateRef = { current: options.initialState } as RuntimeRefs['state']
  const workerEpochRef = { current: null } as RuntimeRefs['workerEpoch']
  const latestGenerationRef = { current: 0 } as RuntimeRefs['latestGeneration']
  const initialModelSentRef = {
    current: false,
  } as RuntimeRefs['initialModelSent']
  const autoRecoveryAttemptsRef = {
    current: 0,
  } as RuntimeRefs['autoRecoveryAttempts']
  const operationsRef = {
    current: new Map<string, OperationRecord>(),
  } as RuntimeRefs['operations']
  const activeProgressOperationIdRef = {
    current: null,
  } as RuntimeRefs['activeProgressOperationId']
  const exportRef = { current: null } as RuntimeRefs['exportRequest']
  const debounceRef = { current: null } as RuntimeRefs['debounce']
  const timersRef = {
    current: new Map<string, ReturnType<typeof setTimeout>>(),
  } as RuntimeRefs['timers']
  const startWorkerRef = {
    current: (_manual?: boolean) => undefined,
  } as RuntimeRefs['startWorker']
  const recoverWorkerRef = {
    current: (_error: CadError, _client?: CadWorkerClient | null) => undefined,
  } as RuntimeRefs['recoverWorker']
  const disposedRef = { current: false } as RuntimeRefs['disposed']
  const fallback = getCadFallbackElement()

  const refs: RuntimeRefs = {
    client: clientRef,
    rawParameters: rawParametersRef,
    state: stateRef,
    workerEpoch: workerEpochRef,
    latestGeneration: latestGenerationRef,
    initialModelSent: initialModelSentRef,
    autoRecoveryAttempts: autoRecoveryAttemptsRef,
    operations: operationsRef,
    activeProgressOperationId: activeProgressOperationIdRef,
    exportRequest: exportRef,
    debounce: debounceRef,
    timers: timersRef,
    startWorker: startWorkerRef,
    recoverWorker: recoverWorkerRef,
    disposed: disposedRef,
  }

  const dispatch = (action: CadAction) => {
    const nextState = cadReducer(stateRef.current, action)
    stateRef.current = nextState
    options.setState(nextState)
  }

  const setRawParameters = (next: RawParameters) => {
    rawParametersRef.current = next
    options.setRawParameters(next)
  }

  const setFieldErrors = (next: FieldErrors) => {
    options.setFieldErrors(next)
  }

  const setProgress = (next: CadProgress | null) => {
    options.setProgress(next)
  }

  const clearTimer = (operationId: string) => {
    const timer = timersRef.current.get(operationId)
    if (timer) clearTimeout(timer)
    timersRef.current.delete(operationId)
  }

  const setOperationTimeout = (
    operationId: string,
    timeoutMs: number,
    callback: () => void,
  ) => {
    clearTimer(operationId)
    timersRef.current.set(
      operationId,
      setTimeout(() => {
        timersRef.current.delete(operationId)
        callback()
      }, timeoutMs),
    )
  }

  const setOperationProgress = (operationId: string, progress: CadProgress) => {
    activeProgressOperationIdRef.current = operationId
    setProgress({ ...progress, operationId })
  }

  const clearOperationProgress = (operationId: string) => {
    if (activeProgressOperationIdRef.current !== operationId) return
    activeProgressOperationIdRef.current = null
    setProgress(null)
  }

  const clearProgress = () => {
    activeProgressOperationIdRef.current = null
    setProgress(null)
  }

  const context: RuntimeContext = {
    refs,
    dispatch,
    setRawParameters,
    setPersistedParameters: options.setPersistedParameters,
    setFieldErrors,
    setProgress,
    setOperationProgress,
    clearOperationProgress,
    clearProgress,
    clearTimer,
    setOperationTimeout,
    recoverWorker: (error, client) => recoverWorkerRef.current(error, client),
  }
  const generation = createModelGenerationHandlers(context)
  const exportHandlers = createExportHandlers(context)
  const handleWorkerEvent = createWorkerEventHandler({
    ...context,
    generation,
    exportHandlers,
  })

  const recoverWorker = (error: CadError, client = clientRef.current) => {
    clearProgress()
    client?.terminate()
    if (
      autoRecoveryAttemptsRef.current < PROTOTYPE_CONFIGURATION.recoveryRetries
    ) {
      autoRecoveryAttemptsRef.current += 1
      dispatch({ type: 'fatal-worker-error', error })
      startWorkerRef.current(false)
      return
    }
    dispatch({ type: 'recoverable-error', error })
  }

  const startWorker = (manual = false) => {
    if (disposedRef.current) return
    if (manual) autoRecoveryAttemptsRef.current = 0
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    for (const timer of timersRef.current.values()) clearTimeout(timer)
    timersRef.current.clear()
    clearProgress()
    clientRef.current?.terminate()
    workerEpochRef.current = null
    latestGenerationRef.current = 0
    initialModelSentRef.current = false
    operationsRef.current.clear()
    exportRef.current = null
    dispatch({ type: 'worker-restarted' })

    let client: CadWorkerClient
    try {
      client = new CadWorkerClient()
    } catch (error) {
      clearProgress()
      dispatch({
        type: 'fatal-worker-error',
        error: normalizeError(error, {
          stage: 'worker',
          code: 'WORKER_TERMINATED',
          userMessage: '無法啟動 CAD Worker，請確認瀏覽器能力後重試。',
          recoverable: true,
        }),
      })
      return
    }

    clientRef.current = client
    client.onEvent(handleWorkerEvent)
    client.onError((clientError: WorkerClientError) => {
      recoverWorker(errorForWorker(clientError))
    })
    const operationId = newOperationId('engine-init')
    const requestId = client.send({
      kind: 'engine.init',
      operationId,
      asset: {
        wasmUrl: new URL('/replicad_single.wasm', window.location.origin).href,
      },
    })
    operationsRef.current.set(operationId, { kind: 'init', requestId })
    setOperationProgress(operationId, { stage: 'loading' })
    setOperationTimeout(
      operationId,
      PROTOTYPE_CONFIGURATION.engineInitializationTimeoutMs,
      () => {
        const timeoutError = normalizeError(
          new Error('engine initialization timeout'),
          {
            stage: 'initializing',
            code: 'ENGINE_TIMEOUT',
            userMessage: 'CAD engine 載入超時，請重試。',
            recoverable: true,
            operationId,
          },
        )
        recoverWorker(timeoutError, client)
      },
    )
  }

  startWorkerRef.current = startWorker
  recoverWorkerRef.current = recoverWorker

  const support = supportsCadBrowser()
  fallback?.setAttribute('hidden', 'true')
  if (!support.supported) {
    dispatch({
      type: 'fatal-worker-error',
      error: errorForCapability(support.message),
    })
  } else {
    startWorker(false)
  }

  const dispose = () => {
    if (disposedRef.current) return
    disposedRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    for (const timer of timersRef.current.values()) clearTimeout(timer)
    timersRef.current.clear()
    clientRef.current?.terminate()
    clientRef.current = null
    clearProgress()
    recoverWorkerRef.current = () => undefined
    fallback?.removeAttribute('hidden')
  }

  const handleRetry = () => {
    const retrySupport = supportsCadBrowser()
    if (!retrySupport.supported) {
      dispatch({
        type: 'fatal-worker-error',
        error: errorForCapability(retrySupport.message),
      })
      return
    }
    startWorkerRef.current(true)
  }

  return {
    handleInputChange: generation.handleInputChange,
    handleOpenGridParametersChange: generation.handleOpenGridParametersChange,
    handleOpenGridDimensionCalculationInvalid:
      generation.handleOpenGridDimensionCalculationInvalid,
    handleExport: exportHandlers.handleExport,
    handleRetry,
    dispose,
  }
}

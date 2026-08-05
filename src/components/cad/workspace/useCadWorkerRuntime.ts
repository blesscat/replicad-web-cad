import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { normalizeError, type CadError } from '../../../cad-contract/errors'
import {
  PROTOTYPE_CONFIGURATION,
  type ModelParameterKey,
} from '../../../cad-contract/units'
import type { CadAction, CadState } from '../../../features/cad/state'
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
import type { FieldErrors, RuntimeContext, RuntimeRefs } from './runtime/types'

type CadWorkerRuntimeOptions = {
  state: CadState
  rawParameters: RawParameters
  dispatch: Dispatch<CadAction>
  setRawParameters: Dispatch<SetStateAction<RawParameters>>
  setFieldErrors: Dispatch<SetStateAction<FieldErrors>>
  setProgress: Dispatch<SetStateAction<CadProgress | null>>
}

export type CadWorkerRuntime = {
  handleInputChange: (key: ModelParameterKey, value: string) => void
  handleExport: (format?: ExportFormat) => void
  handleRetry: () => void
}

export function useCadWorkerRuntime({
  state,
  rawParameters,
  dispatch,
  setRawParameters,
  setFieldErrors,
  setProgress,
}: CadWorkerRuntimeOptions): CadWorkerRuntime {
  const clientRef = useRef<CadWorkerClient | null>(null)
  const rawParametersRef = useRef(rawParameters)
  const stateRef = useRef(state)
  const workerEpochRef = useRef<string | null>(null)
  const latestGenerationRef = useRef(0)
  const initialModelSentRef = useRef(false)
  const autoRecoveryAttemptsRef = useRef(0)
  const operationsRef = useRef(new Map<string, OperationRecord>())
  const activeProgressOperationIdRef = useRef<string | null>(null)
  const exportRef = useRef<ExportRequest | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const startWorkerRef = useRef<(manual?: boolean) => void>(() => undefined)
  const recoverWorkerRef = useRef<
    (error: CadError, client?: CadWorkerClient | null) => void
  >(() => undefined)
  const disposedRef = useRef(false)

  rawParametersRef.current = rawParameters
  stateRef.current = state

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
    setProgress(progress)
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

  useEffect(() => {
    disposedRef.current = false
    const fallback = document.getElementById('cad-fallback')
    fallback?.setAttribute('hidden', 'true')

    const recoverWorker = (error: CadError, client = clientRef.current) => {
      clearProgress()
      client?.terminate()
      if (
        autoRecoveryAttemptsRef.current <
        PROTOTYPE_CONFIGURATION.recoveryRetries
      ) {
        autoRecoveryAttemptsRef.current += 1
        dispatch({ type: 'fatal-worker-error', error })
        startWorkerRef.current(false)
      } else {
        dispatch({ type: 'recoverable-error', error })
      }
    }
    recoverWorkerRef.current = recoverWorker

    const handleWorkerError = (error: WorkerClientError) => {
      recoverWorker(errorForWorker(error))
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
      client.onError(handleWorkerError)
      const operationId = newOperationId('engine-init')
      const requestId = client.send({
        kind: 'engine.init',
        operationId,
        asset: {
          wasmUrl: new URL('/replicad_single.wasm', window.location.origin)
            .href,
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
    const support = supportsCadBrowser()
    if (!support.supported) {
      dispatch({
        type: 'fatal-worker-error',
        error: errorForCapability(support.message),
      })
    } else {
      startWorker(false)
    }

    return () => {
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
  }, [])

  const handleRetry = () => {
    const support = supportsCadBrowser()
    if (!support.supported) {
      dispatch({
        type: 'fatal-worker-error',
        error: errorForCapability(support.message),
      })
      return
    }
    startWorkerRef.current(true)
  }

  return {
    handleInputChange: generation.handleInputChange,
    handleExport: exportHandlers.handleExport,
    handleRetry,
  }
}

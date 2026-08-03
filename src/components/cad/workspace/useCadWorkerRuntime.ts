import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { normalizeError, type CadError } from '../../../cad-contract/errors'
import {
  isWorkerEvent,
  type ExportReadyEvent,
  type WorkerEvent,
} from '../../../cad-contract/messages'
import {
  PROTOTYPE_CONFIGURATION,
  type BoxParameters,
  type DimensionKey,
} from '../../../cad-contract/units'
import {
  triggerStepDownload,
  validateStepResponse,
} from '../../../features/cad/download'
import { boxDefinition } from '../../../features/cad/model-catalog'
import { progressMessage } from '../../../features/cad/progress'
import { type CadAction, type CadState } from '../../../features/cad/state'
import {
  CadWorkerClient,
  newOperationId,
  validateMeshSnapshot,
  type WorkerClientError,
} from '../../../features/cad/worker-client'
import {
  errorForCapability,
  errorForInput,
  errorForWorker,
  parseRawParameters,
  supportsCadBrowser,
} from './validation'
import type { ExportRequest, OperationRecord, RawParameters } from './types'

type FieldErrors = Partial<Record<DimensionKey, string>>

type CadWorkerRuntimeOptions = {
  state: CadState
  rawParameters: RawParameters
  dispatch: Dispatch<CadAction>
  setRawParameters: Dispatch<SetStateAction<RawParameters>>
  setFieldErrors: Dispatch<SetStateAction<FieldErrors>>
  setProgress: Dispatch<SetStateAction<string>>
}

export type CadWorkerRuntime = {
  handleInputChange: (key: DimensionKey, value: string) => void
  handleExport: () => void
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

  useEffect(() => {
    disposedRef.current = false
    const fallback = document.getElementById('cad-fallback')
    fallback?.setAttribute('hidden', 'true')

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

    const recoverWorker = (error: CadError, client = clientRef.current) => {
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

    const sendInvalidate = (
      generation: number,
      reason: 'invalid-input' | 'superseded',
    ) => {
      const client = clientRef.current
      const workerEpoch = workerEpochRef.current
      if (!client || !workerEpoch) return
      const operationId = newOperationId('invalidate')
      client.send({
        kind: 'model.invalidate',
        operationId,
        generation,
        workerEpoch,
        reason,
      })
    }

    const sendGenerate = (
      parameters: BoxParameters,
      generation: number,
      operationId = newOperationId('model'),
    ) => {
      const client = clientRef.current
      if (!client) return
      const requestId = client.send({
        kind: 'model.generate',
        operationId,
        generation,
        modelId: 'box',
        parameters,
        previewConfig: {
          tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
          angularTolerance: 0.1,
        },
      })
      operationsRef.current.set(operationId, {
        kind: 'model',
        generation,
        parameters,
        requestId,
      })
      setOperationTimeout(
        operationId,
        PROTOTYPE_CONFIGURATION.operationTimeoutMs,
        () => {
          recoverWorker(
            normalizeError(new Error('建模超時。'), {
              stage: 'worker',
              code: 'WORKER_TIMEOUT',
              userMessage: '模型建立超時，請重試。',
              recoverable: true,
              generation,
              operationId,
            }),
            client,
          )
        },
      )
    }

    const handleExportReady = (event: ExportReadyEvent) => {
      const request = exportRef.current
      if (
        !request ||
        request.operationId !== event.operationId ||
        request.downloaded
      )
        return
      const validation = validateStepResponse(
        event,
        request.revision,
        request.workerEpoch,
        request.fileName,
      )
      if (!validation.valid) {
        dispatch({
          type: 'recoverable-error',
          error: normalizeError(new Error(validation.message), {
            stage: 'exporting',
            code: 'STEP_METADATA_INVALID',
            userMessage: validation.message,
            recoverable: true,
            modelRevision: request.revision,
            operationId: request.operationId,
          }),
        })
        clearTimer(request.operationId)
        operationsRef.current.delete(request.operationId)
        exportRef.current = null
        dispatch({ type: 'export-end' })
        return
      }
      request.downloaded = true
      const revoke = triggerStepDownload(event)
      setTimeout(revoke, 1_000)
      clearTimer(request.operationId)
      operationsRef.current.delete(request.operationId)
      exportRef.current = null
      dispatch({ type: 'export-end' })
    }

    const handleEvent = (event: WorkerEvent) => {
      if (!isWorkerEvent(event)) return
      switch (event.kind) {
        case 'engine.ready': {
          clearTimer(event.operationId)
          if (
            workerEpochRef.current === event.workerEpoch &&
            initialModelSentRef.current
          )
            return
          workerEpochRef.current = event.workerEpoch
          initialModelSentRef.current = true
          const initialGeneration = Math.max(1, latestGenerationRef.current)
          latestGenerationRef.current = initialGeneration
          dispatch({ type: 'engine-ready', workerEpoch: event.workerEpoch })
          const parsed = parseRawParameters(rawParametersRef.current)
          if (parsed.valid) {
            dispatch({
              type: 'generation-start',
              generation: initialGeneration,
            })
            sendGenerate(parsed.value, initialGeneration, 'initial-model')
          } else {
            if (parsed.field) {
              setFieldErrors({ [parsed.field]: parsed.message })
            } else {
              setFieldErrors({})
            }
            dispatch({
              type: 'input-invalid',
              input: stateRef.current.input,
              generation: initialGeneration,
              error: errorForInput(parsed.message),
            })
            sendInvalidate(initialGeneration, 'invalid-input')
          }
          return
        }
        case 'operation.progress':
          if (
            event.generation !== undefined &&
            event.generation !== latestGenerationRef.current
          )
            return
          setProgress(progressMessage(event.stage))
          return
        case 'model.candidate-ready': {
          if (event.generation === latestGenerationRef.current) setProgress('')
          const operation = operationsRef.current.get(event.operationId)
          const client = clientRef.current
          const workerEpoch = workerEpochRef.current
          if (
            !operation ||
            operation.kind !== 'model' ||
            !client ||
            !workerEpoch
          )
            return
          const commitOrDiscard =
            event.generation === latestGenerationRef.current &&
            event.workerEpoch === workerEpoch &&
            validateMeshSnapshot(event.mesh)
          client.send({
            kind: commitOrDiscard ? 'model.commit' : 'model.discard',
            operationId: event.operationId,
            generation: event.generation,
            candidateId: event.candidateId,
            workerEpoch: event.workerEpoch,
          })
          setOperationTimeout(
            event.operationId,
            PROTOTYPE_CONFIGURATION.operationTimeoutMs,
            () => {
              recoverWorker(
                normalizeError(new Error('候選模型回應超時。'), {
                  stage: 'worker',
                  code: 'WORKER_TIMEOUT',
                  userMessage: '候選模型處理超時，請重試。',
                  recoverable: true,
                  generation: event.generation,
                  operationId: event.operationId,
                }),
                client,
              )
            },
          )
          if (!validateMeshSnapshot(event.mesh)) {
            dispatch({
              type: 'recoverable-error',
              error: normalizeError(new Error('mesh validation failed'), {
                stage: 'meshing',
                code: 'MESH_INVALID',
                userMessage: '預覽 mesh 無效，請重試。',
                recoverable: true,
                generation: event.generation,
                operationId: event.operationId,
              }),
            })
          }
          return
        }
        case 'model.ready': {
          clearTimer(event.operationId)
          setProgress('')
          const operation = operationsRef.current.get(event.operationId)
          if (!operation || operation.kind !== 'model' || !operation.parameters)
            return
          if (
            event.generation !== latestGenerationRef.current ||
            event.workerEpoch !== workerEpochRef.current
          ) {
            operationsRef.current.delete(event.operationId)
            return
          }
          if (!validateMeshSnapshot(event.mesh)) {
            operationsRef.current.delete(event.operationId)
            recoverWorker(
              normalizeError(new Error('model.ready mesh validation failed'), {
                stage: 'meshing',
                code: 'MESH_INVALID',
                userMessage: '模型 mesh 無效，Worker 將重新啟動。',
                recoverable: true,
                generation: event.generation,
                operationId: event.operationId,
              }),
            )
            return
          }
          operationsRef.current.delete(event.operationId)
          if (event.operationId === 'initial-model')
            autoRecoveryAttemptsRef.current = 0
          dispatch({
            type: 'model-ready',
            model: {
              revision: event.modelRevision,
              workerEpoch: event.workerEpoch,
              generation: event.generation,
              parameters: operation.parameters,
              mesh: event.mesh,
            },
          })
          return
        }
        case 'model.invalidated':
          return
        case 'export.accepted':
          setProgress('')
          return
        case 'export.ready':
          handleExportReady(event)
          return
        case 'operation.superseded': {
          clearTimer(event.operationId)
          const operation = operationsRef.current.get(event.operationId)
          if (
            operation?.kind === 'model' &&
            operation.generation === latestGenerationRef.current
          ) {
            dispatch({
              type: 'recoverable-error',
              error: normalizeError(new Error(event.reason), {
                stage: 'worker',
                code: 'STALE_GENERATION',
                userMessage: '這次建模已被較新的輸入取代。',
                recoverable: true,
                generation: operation.generation,
                operationId: event.operationId,
              }),
            })
          }
          operationsRef.current.delete(event.operationId)
          return
        }
        case 'operation.error': {
          clearTimer(event.operationId)
          const operation = operationsRef.current.get(event.operationId)
          if (
            operation?.kind === 'model' &&
            event.generation !== undefined &&
            event.generation !== latestGenerationRef.current
          ) {
            operationsRef.current.delete(event.operationId)
            return
          }
          operationsRef.current.delete(event.operationId)
          if (exportRef.current?.operationId === event.operationId) {
            exportRef.current = null
            dispatch({ type: 'export-end' })
          }
          const error = normalizeError(new Error(event.userMessage), {
            stage: event.stage,
            code: event.code,
            userMessage: event.userMessage,
            recoverable: event.recoverable,
            generation: event.generation,
            modelRevision: event.modelRevision,
            operationId: event.operationId,
          })
          if (event.code === 'ENGINE_INIT_FAILED') {
            recoverWorker(error)
          } else {
            dispatch({ type: 'recoverable-error', error })
          }
          return
        }
      }
    }

    const handleWorkerError = (error: WorkerClientError) => {
      const normalized = errorForWorker(error)
      recoverWorker(normalized)
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
      setProgress('')
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
      client.onEvent(handleEvent)
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
      setOperationTimeout(
        operationId,
        PROTOTYPE_CONFIGURATION.engineInitializationTimeoutMs,
        () => {
          const error = normalizeError(
            new Error('engine initialization timeout'),
            {
              stage: 'initializing',
              code: 'ENGINE_TIMEOUT',
              userMessage: 'CAD engine 載入超時，請重試。',
              recoverable: true,
              operationId,
            },
          )
          recoverWorker(error, client)
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
      recoverWorkerRef.current = () => undefined
      fallback?.removeAttribute('hidden')
    }
  }, [])

  const handleInputChange = (key: DimensionKey, value: string) => {
    const next = { ...rawParametersRef.current, [key]: value }
    rawParametersRef.current = next
    setRawParameters(next)
    const generation = latestGenerationRef.current + 1
    latestGenerationRef.current = generation
    const parsed = parseRawParameters(next)
    if (!parsed.valid) {
      setFieldErrors({ [parsed.field ?? key]: parsed.message })
      dispatch({
        type: 'input-invalid',
        input: stateRef.current.input,
        generation,
        error: errorForInput(parsed.message),
      })
      sendInvalidateFromRender(generation, 'invalid-input')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }

    setFieldErrors({})
    dispatch({ type: 'input-valid', input: parsed.value, generation })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (generation !== latestGenerationRef.current) return
      dispatch({ type: 'generation-start', generation })
      const client = clientRef.current
      if (!client || !workerEpochRef.current) return
      const operationId = newOperationId('model')
      const requestId = client.send({
        kind: 'model.generate',
        operationId,
        generation,
        modelId: 'box',
        parameters: parsed.value,
        previewConfig: {
          tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
          angularTolerance: 0.1,
        },
      })
      operationsRef.current.set(operationId, {
        kind: 'model',
        generation,
        parameters: parsed.value,
        requestId,
      })
      const timer = setTimeout(() => {
        timersRef.current.delete(operationId)
        recoverWorkerRef.current(
          normalizeError(new Error('建模超時。'), {
            stage: 'worker',
            code: 'WORKER_TIMEOUT',
            userMessage: '模型建立超時，請重試。',
            recoverable: true,
            generation,
            operationId,
          }),
          client,
        )
      }, PROTOTYPE_CONFIGURATION.operationTimeoutMs)
      timersRef.current.set(operationId, timer)
    }, PROTOTYPE_CONFIGURATION.inputDebounceMs)
  }

  const sendInvalidateFromRender = (
    generation: number,
    reason: 'invalid-input' | 'superseded',
  ) => {
    const client = clientRef.current
    const workerEpoch = workerEpochRef.current
    if (!client || !workerEpoch) return
    client.send({
      kind: 'model.invalidate',
      operationId: newOperationId('invalidate'),
      generation,
      workerEpoch,
      reason,
    })
  }

  const handleExport = () => {
    const client = clientRef.current
    const model = state.committed
    const workerEpoch = workerEpochRef.current
    if (
      !client ||
      !model ||
      !workerEpoch ||
      state.status !== 'ready' ||
      state.exportStatus !== 'idle'
    )
      return
    const operationId = newOperationId('export-step')
    const fileName = boxDefinition.exportFileName(model.parameters)
    const requestId = client.send({
      kind: 'export.step',
      operationId,
      modelRevision: model.revision,
      workerEpoch,
      file: { name: fileName, mime: 'model/step' },
    })
    exportRef.current = {
      operationId,
      revision: model.revision,
      workerEpoch,
      fileName,
      downloaded: false,
    }
    operationsRef.current.set(operationId, {
      kind: 'export',
      modelRevision: model.revision,
      requestId,
    })
    dispatch({ type: 'export-start' })
    setProgress('正在匯出 STEP…')
    timersRef.current.set(
      operationId,
      setTimeout(() => {
        timersRef.current.delete(operationId)
        exportRef.current = null
        dispatch({ type: 'export-end' })
        recoverWorkerRef.current(
          normalizeError(new Error('STEP export timeout'), {
            stage: 'exporting',
            code: 'WORKER_TIMEOUT',
            userMessage: 'STEP 匯出超時，請重試。',
            recoverable: true,
            modelRevision: model.revision,
            operationId,
          }),
          client,
        )
      }, PROTOTYPE_CONFIGURATION.operationTimeoutMs),
    )
  }

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
    handleInputChange,
    handleExport,
    handleRetry,
  }
}

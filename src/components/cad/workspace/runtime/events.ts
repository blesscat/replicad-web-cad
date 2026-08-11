import { normalizeError } from '../../../../cad-contract/errors'
import {
  isWorkerEvent,
  type ProgressEvent,
  type WorkerEvent,
} from '../../../../cad-contract/messages'
import {
  PROTOTYPE_CONFIGURATION,
  validateModelParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
} from '../../../../cad-contract/units'
import { errorForInput, parseRawParameters } from '../validation'
import { validateMeshSnapshot } from '../../../../features/cad/worker-client'
import type { ExportHandlers } from './export'
import type { ModelGenerationHandlers, RuntimeContext } from './types'

type WorkerEventContext = RuntimeContext & {
  generation: ModelGenerationHandlers
  exportHandlers: ExportHandlers
}

type InitialParameterParseResult =
  | { valid: true; value: ModelParameterValues }
  | { valid: false; message: string; field?: ModelParameterKey }

function parseInitialModelParameters(
  context: RuntimeContext,
  modelId: ModelId,
): InitialParameterParseResult {
  if (modelId !== 'opengrid') {
    return parseRawParameters(context.refs.rawParameters.current, modelId)
  }

  const validation = validateModelParameters(
    modelId,
    context.refs.state.current.input,
  )
  if (!validation.valid) {
    return {
      valid: false,
      message: validation.issues[0]?.message ?? 'OpenGrid 參數無效。',
    }
  }
  return { valid: true, value: validation.value.parameters }
}

function isCurrentModelOperation(
  context: RuntimeContext,
  operation: { kind: string; generation?: number } | undefined,
  eventGeneration?: number,
): boolean {
  return (
    operation?.kind === 'model' &&
    operation.generation === context.refs.latestGeneration.current &&
    (eventGeneration === undefined || eventGeneration === operation.generation)
  )
}

function isCurrentExportOperation(
  context: RuntimeContext,
  operationId: string,
  operation: { kind: string } | undefined,
): boolean {
  return (
    operation?.kind === 'export' &&
    context.refs.exportRequest.current?.operationId === operationId
  )
}

function progressFromEvent(event: ProgressEvent) {
  const progress = {
    stage: event.stage,
    completed: event.completed,
    total: event.total,
    unit: event.unit,
  } as const

  if (event.booleanOperation === undefined) return progress
  return { ...progress, booleanOperation: event.booleanOperation }
}

export function createWorkerEventHandler(
  context: WorkerEventContext,
): (event: WorkerEvent) => void {
  return (event) => {
    if (!isWorkerEvent(event)) return

    switch (event.kind) {
      case 'engine.ready': {
        context.clearTimer(event.operationId)
        if (
          context.refs.workerEpoch.current === event.workerEpoch &&
          context.refs.initialModelSent.current
        )
          return

        context.refs.workerEpoch.current = event.workerEpoch
        context.refs.initialModelSent.current = true
        const initialGeneration = Math.max(
          1,
          context.refs.latestGeneration.current,
        )
        context.refs.latestGeneration.current = initialGeneration
        context.dispatch({
          type: 'engine-ready',
          workerEpoch: event.workerEpoch,
        })
        const modelId = context.refs.state.current.modelId
        const parsed = parseInitialModelParameters(context, modelId)
        if (parsed.valid) {
          context.dispatch({
            type: 'generation-start',
            generation: initialGeneration,
          })
          context.generation.sendGenerate(
            modelId,
            parsed.value,
            initialGeneration,
            'initial-model',
          )
        } else {
          if (parsed.field) {
            context.setFieldErrors({ [parsed.field]: parsed.message })
          } else {
            context.setFieldErrors({})
          }
          context.dispatch({
            type: 'input-invalid',
            modelId,
            input: context.refs.state.current.input,
            generation: initialGeneration,
            error: errorForInput(parsed.message),
          })
          context.generation.sendInvalidate(initialGeneration, 'invalid-input')
        }
        return
      }
      case 'operation.progress': {
        const operation = context.refs.operations.current.get(event.operationId)
        if (!operation) return
        const isModelProgress =
          event.generation !== undefined &&
          isCurrentModelOperation(context, operation, event.generation)
        const isExportProgress =
          event.generation === undefined &&
          isCurrentExportOperation(context, event.operationId, operation)
        const isInitProgress =
          operation.kind === 'init' && event.stage === 'loading'
        if (!isModelProgress && !isExportProgress && !isInitProgress) return
        if (
          context.refs.activeProgressOperationId.current !== null &&
          context.refs.activeProgressOperationId.current !== event.operationId
        )
          return
        context.setOperationProgress(
          event.operationId,
          progressFromEvent(event),
        )
        return
      }
      case 'model.candidate-ready': {
        const operation = context.refs.operations.current.get(event.operationId)
        const client = context.refs.client.current
        const workerEpoch = context.refs.workerEpoch.current
        if (!operation || operation.kind !== 'model' || !client || !workerEpoch)
          return

        const validMesh = validateMeshSnapshot(event.mesh)
        const currentOperation = isCurrentModelOperation(
          context,
          operation,
          event.generation,
        )
        const commitOrDiscard =
          currentOperation && event.workerEpoch === workerEpoch && validMesh
        if (commitOrDiscard) operation.candidateMesh = event.mesh
        client.send({
          kind: commitOrDiscard ? 'model.commit' : 'model.discard',
          operationId: event.operationId,
          generation: event.generation,
          candidateId: event.candidateId,
          workerEpoch: event.workerEpoch,
        })
        if (!currentOperation) {
          context.clearTimer(event.operationId)
          context.refs.operations.current.delete(event.operationId)
          return
        }
        context.setOperationTimeout(
          event.operationId,
          PROTOTYPE_CONFIGURATION.operationTimeoutMs,
          () => {
            context.recoverWorker(
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
        if (!validMesh) {
          context.clearOperationProgress(event.operationId)
          context.dispatch({
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
        context.clearTimer(event.operationId)
        const operation = context.refs.operations.current.get(event.operationId)
        if (!operation || operation.kind !== 'model' || !operation.parameters)
          return
        if (
          !isCurrentModelOperation(context, operation, event.generation) ||
          event.workerEpoch !== context.refs.workerEpoch.current
        ) {
          context.refs.operations.current.delete(event.operationId)
          return
        }
        const mesh = event.mesh ?? operation.candidateMesh
        if (!mesh || !validateMeshSnapshot(mesh)) {
          context.clearOperationProgress(event.operationId)
          context.refs.operations.current.delete(event.operationId)
          context.recoverWorker(
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
        context.clearOperationProgress(event.operationId)
        context.refs.operations.current.delete(event.operationId)
        delete operation.candidateMesh
        if (event.operationId === 'initial-model')
          context.refs.autoRecoveryAttempts.current = 0
        context.dispatch({
          type: 'model-ready',
          model: {
            revision: event.modelRevision,
            workerEpoch: event.workerEpoch,
            generation: event.generation,
            modelId: operation.modelId ?? event.modelId,
            parameters: operation.parameters ?? event.parameters,
            mesh,
          },
        })
        return
      }
      case 'model.invalidated':
        if (event.generation === context.refs.latestGeneration.current) {
          context.clearProgress()
        }
        return
      case 'export.accepted':
        return
      case 'export.ready':
        context.exportHandlers.handleExportReady(event)
        return
      case 'operation.superseded': {
        context.clearTimer(event.operationId)
        const operation = context.refs.operations.current.get(event.operationId)
        if (isCurrentModelOperation(context, operation, event.generation)) {
          context.clearOperationProgress(event.operationId)
          context.dispatch({
            type: 'recoverable-error',
            error: normalizeError(new Error(event.reason), {
              stage: 'worker',
              code: 'STALE_GENERATION',
              userMessage: '這次建模已被較新的輸入取代。',
              recoverable: true,
              generation: event.generation,
              operationId: event.operationId,
            }),
          })
        } else if (
          isCurrentExportOperation(context, event.operationId, operation)
        ) {
          context.clearOperationProgress(event.operationId)
        }
        context.refs.operations.current.delete(event.operationId)
        return
      }
      case 'operation.error': {
        context.clearTimer(event.operationId)
        const operation = context.refs.operations.current.get(event.operationId)
        if (
          operation?.kind === 'model' &&
          !isCurrentModelOperation(context, operation, event.generation)
        ) {
          context.refs.operations.current.delete(event.operationId)
          return
        }
        const currentExport = isCurrentExportOperation(
          context,
          event.operationId,
          operation,
        )
        if (operation?.kind === 'export' && !currentExport) {
          context.refs.operations.current.delete(event.operationId)
          return
        }
        if (
          operation?.kind === 'init' ||
          operation?.kind === 'model' ||
          currentExport
        )
          context.clearOperationProgress(event.operationId)
        context.refs.operations.current.delete(event.operationId)
        if (
          context.refs.exportRequest.current?.operationId === event.operationId
        ) {
          context.refs.exportRequest.current = null
          context.dispatch({ type: 'export-end' })
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
          context.recoverWorker(error)
        } else {
          context.dispatch({ type: 'recoverable-error', error })
        }
        return
      }
    }
  }
}

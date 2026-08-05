import { normalizeError } from '../../../../cad-contract/errors'
import type { ExportReadyEvent } from '../../../../cad-contract/messages'
import { PROTOTYPE_CONFIGURATION } from '../../../../cad-contract/units'
import {
  triggerStepDownload,
  validateStepResponse,
} from '../../../../features/cad/download'
import { getModelDefinition } from '../../../../features/cad/model-catalog'
import { newOperationId } from '../../../../features/cad/worker-client'
import type { ExportRequest } from '../types'
import type { RuntimeContext } from './types'

export type ExportHandlers = {
  handleExportReady: (event: ExportReadyEvent) => void
  handleExport: () => void
}

export function createExportHandlers(context: RuntimeContext): ExportHandlers {
  const handleExportReady = (event: ExportReadyEvent) => {
    const request = context.refs.exportRequest.current
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
      context.dispatch({
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
      context.clearOperationProgress(request.operationId)
      context.clearTimer(request.operationId)
      context.refs.operations.current.delete(request.operationId)
      context.refs.exportRequest.current = null
      context.dispatch({ type: 'export-end' })
      return
    }

    request.downloaded = true
    const revoke = triggerStepDownload(event)
    setTimeout(revoke, 1_000)
    context.clearTimer(request.operationId)
    context.clearOperationProgress(request.operationId)
    context.refs.operations.current.delete(request.operationId)
    context.refs.exportRequest.current = null
    context.dispatch({ type: 'export-end' })
  }

  const handleExport = () => {
    const client = context.refs.client.current
    const model = context.refs.state.current.committed
    const workerEpoch = context.refs.workerEpoch.current
    const state = context.refs.state.current
    if (
      !client ||
      !model ||
      !workerEpoch ||
      state.status !== 'ready' ||
      state.exportStatus !== 'idle'
    )
      return

    const definition = getModelDefinition(model.modelId)
    if (!definition) return
    const operationId = newOperationId('export-step')
    const fileName = definition.exportFileName(model.parameters)
    const requestId = client.send({
      kind: 'export.step',
      operationId,
      modelRevision: model.revision,
      workerEpoch,
      file: { name: fileName, mime: 'model/step' },
    })
    const request: ExportRequest = {
      operationId,
      revision: model.revision,
      workerEpoch,
      fileName,
      downloaded: false,
    }
    context.refs.exportRequest.current = request
    context.refs.operations.current.set(operationId, {
      kind: 'export',
      modelRevision: model.revision,
      requestId,
    })
    context.dispatch({ type: 'export-start' })
    context.setOperationProgress(operationId, { stage: 'exporting' })
    context.setOperationTimeout(
      operationId,
      PROTOTYPE_CONFIGURATION.operationTimeoutMs,
      () => {
        context.refs.exportRequest.current = null
        context.clearOperationProgress(operationId)
        context.dispatch({ type: 'export-end' })
        context.recoverWorker(
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
      },
    )
  }

  return { handleExportReady, handleExport }
}

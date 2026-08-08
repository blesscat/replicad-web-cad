import { normalizeError } from '../../../../cad-contract/errors'
import {
  PROTOTYPE_CONFIGURATION,
  isOpenGridParameters,
  validateOpenGridGenerationSupport,
  validateOpenGridParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridParameters,
} from '../../../../cad-contract/units'
import { newOperationId } from '../../../../features/cad/worker-client'
import { errorForInput, parseRawParameters } from '../validation'
import type { ModelGenerationHandlers, RuntimeContext } from './types'

export function createModelGenerationHandlers(
  context: RuntimeContext,
): ModelGenerationHandlers {
  const sendInvalidate: ModelGenerationHandlers['sendInvalidate'] = (
    generation,
    reason,
  ) => {
    const client = context.refs.client.current
    const workerEpoch = context.refs.workerEpoch.current
    if (!client || !workerEpoch) return
    client.send({
      kind: 'model.invalidate',
      operationId: newOperationId('invalidate'),
      generation,
      workerEpoch,
      reason,
    })
  }

  const sendGenerate: ModelGenerationHandlers['sendGenerate'] = (
    modelId,
    parameters,
    generation,
    operationId = newOperationId('model'),
  ) => {
    const client = context.refs.client.current
    if (!client) return
    if (modelId === 'opengrid' && isOpenGridParameters(parameters)) {
      const support = validateOpenGridGenerationSupport(parameters)
      if (!support.valid) {
        context.clearProgress()
        context.setFieldErrors({ parameters: support.issues[0]?.message })
        context.dispatch({
          type: 'input-invalid',
          modelId,
          input: parameters,
          generation,
          error: normalizeError(
            new Error('OPENGRID_UNSUPPORTED_CONFIGURATION'),
            {
              stage: 'validation',
              code: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
              userMessage:
                support.issues[0]?.message ?? 'OpenGrid 組合目前不支援。',
              recoverable: true,
              generation,
              operationId,
            },
          ),
        })
        sendInvalidate(generation, 'invalid-input')
        return
      }
    }
    const requestId = client.send({
      kind: 'model.generate',
      operationId,
      generation,
      modelId,
      parameters,
      previewConfig: {
        tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
        angularTolerance: 0.1,
      },
    })
    context.refs.operations.current.set(operationId, {
      kind: 'model',
      generation,
      modelId,
      parameters,
      requestId,
    })
    context.setOperationProgress(operationId, { stage: 'building' })
    context.setOperationTimeout(
      operationId,
      PROTOTYPE_CONFIGURATION.operationTimeoutMs,
      () => {
        context.recoverWorker(
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

  const queueModelGeneration = (
    modelId: ModelId,
    parameters: ModelParameterValues,
    generation: number,
  ) => {
    if (context.refs.debounce.current)
      clearTimeout(context.refs.debounce.current)
    context.refs.debounce.current = setTimeout(() => {
      if (generation !== context.refs.latestGeneration.current) return
      context.dispatch({ type: 'generation-start', generation })
      sendGenerate(modelId, parameters, generation)
    }, PROTOTYPE_CONFIGURATION.inputDebounceMs)
  }

  const handleInputChange = (key: ModelParameterKey, value: string) => {
    const next = { ...context.refs.rawParameters.current, [key]: value }
    context.refs.rawParameters.current = next
    context.setRawParameters(next)
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    const modelId = context.refs.state.current.modelId
    const parsed = parseRawParameters(next, modelId)
    if (!parsed.valid) {
      context.clearProgress()
      context.setFieldErrors({ [parsed.field ?? key]: parsed.message })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: context.refs.state.current.input,
        generation,
        error: errorForInput(parsed.message),
      })
      sendInvalidate(generation, 'invalid-input')
      if (context.refs.debounce.current)
        clearTimeout(context.refs.debounce.current)
      return
    }

    context.setPersistedParameters(modelId, parsed.value)
    context.setFieldErrors({})
    context.dispatch({
      type: 'input-valid',
      modelId,
      input: parsed.value,
      generation,
    })
    sendInvalidate(generation, 'superseded')
    queueModelGeneration(modelId, parsed.value, generation)
  }

  const handleOpenGridParametersChange = (
    parameters: OpenGridParameters,
  ): void => {
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    const modelId = context.refs.state.current.modelId
    const validation = validateOpenGridParameters(parameters)
    if (!validation.valid) {
      context.clearProgress()
      const firstIssue = validation.issues[0]
      context.setFieldErrors({
        [firstIssue?.field ?? 'parameters']:
          firstIssue?.message ?? 'OpenGrid 參數無效。',
      })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: parameters,
        generation,
        error: errorForInput(firstIssue?.message ?? 'OpenGrid 參數無效。'),
      })
      sendInvalidate(generation, 'invalid-input')
      if (context.refs.debounce.current) {
        clearTimeout(context.refs.debounce.current)
        context.refs.debounce.current = null
      }
      return
    }

    const support = validateOpenGridGenerationSupport(validation.value)
    if (!support.valid) {
      context.clearProgress()
      const message = support.issues[0]?.message ?? 'OpenGrid 組合目前不支援。'
      context.setFieldErrors({ parameters: message })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: validation.value,
        generation,
        error: normalizeError(new Error('OPENGRID_UNSUPPORTED_CONFIGURATION'), {
          stage: 'validation',
          code: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
          userMessage: message,
          recoverable: true,
          generation,
        }),
      })
      sendInvalidate(generation, 'invalid-input')
      if (context.refs.debounce.current) {
        clearTimeout(context.refs.debounce.current)
        context.refs.debounce.current = null
      }
      return
    }

    context.setPersistedParameters(modelId, validation.value)
    context.setFieldErrors({})
    context.dispatch({
      type: 'input-valid',
      modelId,
      input: validation.value,
      generation,
    })
    sendInvalidate(generation, 'superseded')
    queueModelGeneration(modelId, validation.value, generation)
  }

  return {
    sendGenerate,
    sendInvalidate,
    handleInputChange,
    handleOpenGridParametersChange,
  }
}

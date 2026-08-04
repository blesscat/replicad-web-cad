import { normalizeError } from '../../../../cad-contract/errors'
import {
  PROTOTYPE_CONFIGURATION,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
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

    context.setFieldErrors({})
    context.dispatch({
      type: 'input-valid',
      modelId,
      input: parsed.value,
      generation,
    })
    queueModelGeneration(modelId, parsed.value, generation)
  }

  return {
    sendGenerate,
    sendInvalidate,
    handleInputChange,
  }
}

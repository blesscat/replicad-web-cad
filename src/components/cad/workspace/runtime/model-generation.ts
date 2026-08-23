import { normalizeError } from '../../../../cad-contract/errors'
import { diagnostic } from '../../../../cad-contract/diagnostics'
import {
  OPENGRID_PREVIEW_CONFIGURATION,
  PROTOTYPE_CONFIGURATION,
  isOpenGridParameters,
  validateOpenGridGenerationSupport,
  validateOpenGridParameters,
  validateModelParameters,
  type ModelId,
  type ModelParameterKey,
  type ModelParameterValues,
  type OpenGridParameters,
} from '../../../../cad-contract/units'
import { newOperationId } from '../../../../features/cad/worker-client'
import {
  errorForInput,
  parseRawParameters,
  rawFromParameters,
} from '../validation'
import type { ModelGenerationHandlers, RuntimeContext } from './types'

function previewConfigForModel(modelId: ModelId) {
  if (modelId === 'opengrid') {
    return { ...OPENGRID_PREVIEW_CONFIGURATION }
  }
  return {
    tolerance: PROTOTYPE_CONFIGURATION.boundsTolerance,
    angularTolerance: 0.1,
  }
}

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
        const issue = support.issues[0] ?? {
          field: 'parameters' as const,
          messageId: 'validation.invalid',
        }
        context.setFieldErrors({ parameters: issue })
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
              message: diagnostic('diagnostic.opengridUnsupported'),
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
      previewConfig: previewConfigForModel(modelId),
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
          normalizeError(undefined, {
            stage: 'worker',
            code: 'WORKER_TIMEOUT',
            message: diagnostic('diagnostic.modelBuildFailed'),
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
    const modelId = context.refs.state.current.modelId
    let next = { ...context.refs.rawParameters.current, [key]: value }
    if (
      modelId === 'opengrid-pillar' &&
      key === 'mode' &&
      value === 'detachable-corner-seat'
    ) {
      const { length: _length, offset: _offset, ...lockingParameters } = next
      next = lockingParameters
    }
    context.refs.rawParameters.current = next
    context.setRawParameters(next)
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    const parsed = parseRawParameters(next, modelId)
    if (!parsed.valid) {
      context.clearProgress()
      const issue = {
        field: parsed.field ?? key,
        messageId: parsed.messageId,
      }
      context.setFieldErrors({ [issue.field]: issue })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: context.refs.state.current.input,
        generation,
        error: errorForInput(issue),
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

  const handleParametersScopeChange = (
    parameters: ModelParameterValues,
  ): void => {
    const modelId = context.refs.state.current.modelId
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    const validation = validateModelParameters(modelId, parameters)
    if (!validation.valid) {
      context.clearProgress()
      const firstIssue = validation.issues[0] ?? {
        field: 'parameters' as const,
        messageId: 'validation.invalid',
      }
      context.setFieldErrors({ [firstIssue.field]: firstIssue })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: context.refs.state.current.input,
        generation,
        error: errorForInput(firstIssue),
      })
      sendInvalidate(generation, 'invalid-input')
      if (context.refs.debounce.current) {
        clearTimeout(context.refs.debounce.current)
        context.refs.debounce.current = null
      }
      return
    }

    const nextParameters = validation.value.parameters
    context.refs.rawParameters.current = rawFromParameters(nextParameters)
    context.setRawParameters(context.refs.rawParameters.current)
    context.setPersistedParameters(modelId, nextParameters)
    context.setFieldErrors({})
    context.dispatch({
      type: 'input-valid',
      modelId,
      input: nextParameters,
      generation,
    })
    sendInvalidate(generation, 'superseded')
    queueModelGeneration(modelId, nextParameters, generation)
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
        [firstIssue?.field ?? 'parameters']: firstIssue ?? {
          field: 'parameters',
          messageId: 'validation.invalid',
        },
      })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: parameters,
        generation,
        error: errorForInput(
          firstIssue ?? {
            field: 'parameters',
            messageId: 'validation.invalid',
          },
        ),
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
      const issue = support.issues[0] ?? {
        field: 'parameters' as const,
        messageId: 'validation.invalid',
      }
      context.setFieldErrors({ parameters: issue })
      context.dispatch({
        type: 'input-invalid',
        modelId,
        input: validation.value,
        generation,
        error: normalizeError(new Error('OPENGRID_UNSUPPORTED_CONFIGURATION'), {
          stage: 'validation',
          code: 'OPENGRID_UNSUPPORTED_CONFIGURATION',
          message: diagnostic('diagnostic.opengridUnsupported'),
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

  const handleOpenGridDimensionCalculationInvalid = (): void => {
    const generation = context.refs.latestGeneration.current + 1
    context.refs.latestGeneration.current = generation
    if (context.refs.debounce.current) {
      clearTimeout(context.refs.debounce.current)
      context.refs.debounce.current = null
    }
    context.clearProgress()
    context.dispatch({
      type: 'input-invalid',
      modelId: 'opengrid',
      input: context.refs.state.current.input,
      generation,
      error: errorForInput({
        field: 'parameters',
        messageId: 'validation.invalid',
      }),
    })
    sendInvalidate(generation, 'invalid-input')
  }

  return {
    sendGenerate,
    sendInvalidate,
    handleInputChange,
    handleParametersScopeChange,
    handleOpenGridParametersChange,
    handleOpenGridDimensionCalculationInvalid,
  }
}

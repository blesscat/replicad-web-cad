import { describe, expect, it } from 'vitest'
import { normalizeError, type CadError } from '../../src/cad-contract/errors'
import { cadReducer, initialCadState } from '../../src/features/cad/state'
import {
  errorToastKey,
  toastErrorForState,
} from '../../src/components/cad/workspace/error-toast'

function modelError(overrides: Partial<CadError> = {}): CadError {
  return normalizeError(new Error('model build failed'), {
    stage: 'building',
    code: 'MODEL_BUILD_FAILED',
    message: { messageId: 'diagnostic.modelBuildFailed' },
    recoverable: true,
    generation: 2,
    operationId: 'model-operation-2',
    ...overrides,
  })
}

describe('CAD error toast selection', () => {
  it('selects recoverable and fatal operation errors but not field validation errors', () => {
    const recoverable = modelError()
    const recoverableState = cadReducer(initialCadState(), {
      type: 'recoverable-error',
      error: recoverable,
    })
    expect(toastErrorForState(recoverableState)).toBe(recoverable)

    const fatal = modelError({
      code: 'WORKER_TERMINATED',
      stage: 'worker',
      message: { messageId: 'diagnostic.workerTerminated' },
    })
    const fatalState = cadReducer(initialCadState(), {
      type: 'fatal-worker-error',
      error: fatal,
    })
    expect(toastErrorForState(fatalState)).toBe(fatal)

    const invalidInputState = cadReducer(initialCadState(), {
      type: 'input-invalid',
      modelId: 'box',
      input: initialCadState().input,
      generation: 1,
      error: modelError({
        stage: 'validation',
        code: 'INVALID_INPUT',
        message: { messageId: 'validation.invalid' },
      }),
    })
    expect(toastErrorForState(invalidInputState)).toBeNull()
  })

  it('keeps the same error key stable and changes it for a new operation', () => {
    const first = modelError()
    const replacement = modelError({
      operationId: 'model-operation-3',
      generation: 3,
      message: { messageId: 'diagnostic.modelBuildFailed' },
    })

    expect(errorToastKey(first)).toBe(errorToastKey(first))
    expect(errorToastKey(first)).not.toBe(errorToastKey(replacement))
    expect(errorToastKey(null)).toBeNull()
  })
})

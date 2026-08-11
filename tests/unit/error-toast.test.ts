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
    userMessage: '模型建立失敗：幾何無效。',
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
      userMessage: 'CAD Worker 已終止。',
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
        userMessage: '尺寸輸入無效。',
      }),
    })
    expect(toastErrorForState(invalidInputState)).toBeNull()
  })

  it('keeps the same error key stable and changes it for a new operation', () => {
    const first = modelError()
    const replacement = modelError({
      operationId: 'model-operation-3',
      generation: 3,
      userMessage: '模型建立失敗：新的幾何無效。',
    })

    expect(errorToastKey(first)).toBe(errorToastKey(first))
    expect(errorToastKey(first)).not.toBe(errorToastKey(replacement))
    expect(errorToastKey(null)).toBeNull()
  })
})

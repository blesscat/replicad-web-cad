import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CadWorkerClient } from '../../src/features/cad/worker-client'
import { initialCadState } from '../../src/features/cad/state'
import { rawFromParameters } from '../../src/components/cad/workspace/validation'
import { createModelGenerationHandlers } from '../../src/components/cad/workspace/runtime/model-generation'
import type {
  RuntimeContext,
  RuntimeRefs,
} from '../../src/components/cad/workspace/runtime/types'

function createRuntimeContext() {
  const state = initialCadState()
  let requestNumber = 0
  const client = {
    send: vi.fn(() => `request-${++requestNumber}`),
  } as unknown as CadWorkerClient
  const refs: RuntimeRefs = {
    client: { current: client },
    rawParameters: { current: rawFromParameters(state.input) },
    state: { current: state },
    workerEpoch: { current: 'epoch-test' },
    latestGeneration: { current: 0 },
    initialModelSent: { current: false },
    autoRecoveryAttempts: { current: 0 },
    operations: { current: new Map() },
    exportRequest: { current: null },
    debounce: { current: null },
    timers: { current: new Map() },
    startWorker: { current: vi.fn() },
    recoverWorker: { current: vi.fn() },
    disposed: { current: false },
  }

  const context = {
    refs,
    dispatch: vi.fn(),
    setRawParameters: vi.fn(),
    setFieldErrors: vi.fn(),
    setProgress: vi.fn(),
    clearTimer: vi.fn(),
    setOperationTimeout: vi.fn(),
    recoverWorker: vi.fn(),
  } as unknown as RuntimeContext

  return { client, context }
}

describe('CAD model generation debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits 500ms after a valid parameter change before generating', () => {
    const { client, context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25')

    expect(client.send).not.toHaveBeenCalled()

    vi.advanceTimersByTime(499)
    expect(client.send).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(client.send).toHaveBeenCalledTimes(1)
    expect(client.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'box',
        generation: 1,
        parameters: { width: 25, depth: 30, height: 40 },
      }),
    )
  })
})

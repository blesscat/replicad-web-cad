import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkerCommandInput } from '../../src/cad-contract/messages'
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
  const send = vi.fn((command: WorkerCommandInput) => {
    void command
    return `request-${++requestNumber}`
  })
  const client = {
    send,
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
    activeProgressOperationId: { current: null },
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
    setOperationProgress: vi.fn(),
    clearOperationProgress: vi.fn(),
    clearProgress: vi.fn(),
    clearTimer: vi.fn(),
    setOperationTimeout: vi.fn(),
    recoverWorker: vi.fn(),
  } as unknown as RuntimeContext

  return { client, send, context }
}

describe('CAD model generation debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits 500ms after a valid parameter change before generating', () => {
    const { client, send, context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25')

    expect(client.send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'model.invalidate', generation: 1 }),
    )

    vi.advanceTimersByTime(499)
    expect(
      send.mock.calls.filter(([command]) => command.kind === 'model.generate'),
    ).toHaveLength(0)

    vi.advanceTimersByTime(1)
    expect(client.send).toHaveBeenCalledTimes(2)
    expect(client.send).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ kind: 'model.invalidate' }),
    )
    expect(client.send).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'box',
        generation: 1,
        parameters: { width: 25, depth: 30, height: 40 },
      }),
    )
  })

  it('invalidates each rapid snapshot but generates only the final legal value', () => {
    const { client, send, context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '21')
    handlers.handleInputChange('width', '22')
    handlers.handleInputChange('width', '23')

    expect(client.send).toHaveBeenCalledTimes(3)
    expect(send.mock.calls.map(([command]) => command.kind)).toEqual([
      'model.invalidate',
      'model.invalidate',
      'model.invalidate',
    ])

    vi.advanceTimersByTime(500)

    const generateCalls = send.mock.calls.filter(
      ([command]) => command.kind === 'model.generate',
    )
    expect(generateCalls).toHaveLength(1)
    expect(generateCalls[0]?.[0]).toMatchObject({
      generation: 3,
      parameters: { width: 23, depth: 30, height: 40 },
    })
  })

  it('clears an active progress stage when input becomes invalid', () => {
    const { context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25.5')

    expect(context.clearProgress).toHaveBeenCalledOnce()
    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'input-invalid' }),
    )
  })

  it('keeps an invalid settled snapshot from releasing a queued generate', () => {
    const { client, send, context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25')
    handlers.handleInputChange('width', '25.5')
    vi.advanceTimersByTime(500)

    expect(
      send.mock.calls.filter(([command]) => command.kind === 'model.generate'),
    ).toHaveLength(0)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        generation: 2,
        reason: 'invalid-input',
      }),
    )
  })
})

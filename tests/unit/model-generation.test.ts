import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkerCommandInput } from '../../src/cad-contract/messages'
import type {
  ModelId,
  ModelParameterValues,
  OpenGridParameters,
  OpenGridSnapParameters,
} from '../../src/cad-contract/units'
import { OPENGRID_CONFIGURATION } from '../../src/cad-contract/units'
import type { CadWorkerClient } from '../../src/features/cad/worker-client'
import { initialCadState } from '../../src/features/cad/state'
import { rawFromParameters } from '../../src/components/cad/workspace/validation'
import { createModelGenerationHandlers } from '../../src/components/cad/workspace/runtime/model-generation'
import { createComponentParameterStore } from '../../src/features/cad/parameters'
import type {
  RuntimeContext,
  RuntimeRefs,
} from '../../src/components/cad/workspace/runtime/types'

function defaultInputForModel(modelId: ModelId): ModelParameterValues {
  if (modelId === 'box') return { width: 20, depth: 30, height: 40 }
  if (modelId === 'box-normal') {
    return { x: 2, y: 2, height: 10, cornerPosts: true }
  }
  if (modelId === 'modular-grid-base' || modelId === 'hsw-cell') {
    return { rows: 1, columns: 1 }
  }
  if (modelId === 'hexagonal-column') {
    return { height: 8, count: 1, gap: 1, orientation: 'lying' }
  }
  if (modelId === 'opengrid') {
    return opengridParameters()
  }
  if (modelId === 'opengrid-snap') {
    return { variant: 'Full', offset: 0 }
  }
  throw new Error(`Unknown model: ${modelId}`)
}

function opengridParameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  }
}

function createRuntimeContext(
  modelId: ModelId = 'box',
  initialInput: ModelParameterValues = defaultInputForModel(modelId),
) {
  const state = initialCadState(modelId, initialInput)
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
    setPersistedParameters: vi.fn(),
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

  it('passes typed valid parameters to persistence before the debounce', () => {
    const { context } = createRuntimeContext()
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '25')

    expect(context.setPersistedParameters).toHaveBeenCalledWith('box', {
      width: 25,
      depth: 30,
      height: 40,
    })
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
    expect(context.setPersistedParameters).not.toHaveBeenCalled()
  })

  it('keeps generation flow when persistence storage rejects a write', () => {
    const parameterStore = createComponentParameterStore({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('storage write failed')
        },
      },
    })
    const { context, send } = createRuntimeContext()
    context.setPersistedParameters = (modelId, parameters) => {
      parameterStore.set(modelId, parameters)
    }
    const handlers = createModelGenerationHandlers(context)

    expect(() => handlers.handleInputChange('width', '25')).not.toThrow()
    expect(parameterStore.get('box')).toEqual({
      width: 25,
      depth: 30,
      height: 40,
    })

    vi.advanceTimersByTime(500)
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(true)
    parameterStore.dispose()
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

  it('sends an HSW slider snapshot through the same settled-input debounce', () => {
    const { client, send, context } = createRuntimeContext('hsw-cell')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('rows', '2')
    vi.advanceTimersByTime(500)

    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'hsw-cell',
        parameters: { rows: 2, columns: 1 },
      }),
    )
    expect(
      send.mock.calls.filter(([command]) => command.kind === 'model.generate'),
    ).toHaveLength(1)
  })

  it('keeps defensive validation for an out-of-range HSW snapshot', () => {
    const { client, context } = createRuntimeContext('hsw-cell')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('rows', '21')

    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'input-invalid' }),
    )
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
      }),
    )
  })

  it('rejects a programmatic HSW update for a non-HSW parameter key', () => {
    const { client, context, send } = createRuntimeContext('hsw-cell')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('width', '20')
    vi.advanceTimersByTime(500)

    expect(context.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'input-invalid' }),
    )
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
      }),
    )
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(false)
  })

  it('debounces a complete typed OpenGrid snapshot without scalar serialization', () => {
    const { client, send, context } = createRuntimeContext('opengrid')
    const handlers = createModelGenerationHandlers(context)
    const input = opengridParameters({
      variant: 'Lite',
      rows: 5,
      columns: 7,
      screwKind: 'custom',
      screwMode: 'custom',
      customScrewPositions: [{ row: 2, column: 3 }],
      connectorHoles: 'enabled',
    })
    handlers.handleOpenGridParametersChange(input)

    expect(client.send).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'model.invalidate', generation: 1 }),
    )
    vi.advanceTimersByTime(500)
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid',
        generation: 1,
        parameters: input,
      }),
    )
  })

  it('invalidates typed OpenGrid snapshots and disables generation for errors', () => {
    const { client, send, context } = createRuntimeContext('opengrid')
    const handlers = createModelGenerationHandlers(context)
    handlers.handleOpenGridParametersChange(
      opengridParameters({
        variant: 'Full',
        rows: 0,
        columns: 1,
        connectorHoles: 'none',
        screwMode: 'none',
      }) as OpenGridParameters,
    )

    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
        generation: 1,
      }),
    )
    expect(context.setFieldErrors).toHaveBeenCalledWith(
      expect.objectContaining({ rows: expect.any(String) }),
    )
    vi.advanceTimersByTime(500)
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(false)
  })

  it('accepts a legal large official OpenGrid tuple before sending model.generate', () => {
    const { client, send, context } = createRuntimeContext('opengrid')
    const handlers = createModelGenerationHandlers(context)
    const input = opengridParameters({
      variant: 'Heavy',
      rows: 10,
      columns: 10,
      screwKind: 'custom',
      screwMode: 'everywhere',
      customScrewPositions: [],
      connectorHoles: 'enabled',
    })
    handlers.handleOpenGridParametersChange(input)
    vi.advanceTimersByTime(500)
    expect(
      send.mock.calls.some(([command]) => command.kind === 'model.generate'),
    ).toBe(true)
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        parameters: input,
      }),
    )
  })

  it('debounces decimal OpenGrid Snap offsets and invalidates incomplete input', () => {
    const { client, send, context } = createRuntimeContext('opengrid-snap')
    const handlers = createModelGenerationHandlers(context)

    handlers.handleInputChange('offset', '0.2')
    vi.advanceTimersByTime(500)

    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.generate',
        modelId: 'opengrid-snap',
        parameters: { variant: 'Full', offset: 0.2 },
      }),
    )

    handlers.handleInputChange('offset', '')
    expect(client.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        kind: 'model.invalidate',
        reason: 'invalid-input',
      }),
    )
    expect(
      send.mock.calls.some(
        ([command]) =>
          command.kind === 'model.generate' &&
          command.parameters &&
          'offset' in command.parameters &&
          (command.parameters as OpenGridSnapParameters).offset === null,
      ),
    ).toBe(false)
  })
})

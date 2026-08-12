import { describe, expect, it, vi } from 'vitest'
import { PROTOCOL_VERSION } from '../../src/cad-contract/messages'
import { createExportHandlers } from '../../src/components/cad/workspace/runtime/export'
import { initialCadState, type CadState } from '../../src/features/cad/state'
import type {
  RuntimeContext,
  RuntimeRefs,
} from '../../src/components/cad/workspace/runtime/types'
import type { CadWorkerClient } from '../../src/features/cad/worker-client'
import type {
  ModelBounds,
  ModelParameterValues,
} from '../../src/cad-contract/units'
import { boundsForPillar } from '../../src/cad-contract/units'

function createContext(
  modelId: 'box' | 'opengrid-pillar' = 'box',
  pillarMode: 'standard' | 'thin-shell' = 'standard',
): {
  context: RuntimeContext
  refs: RuntimeRefs
  client: { send: ReturnType<typeof vi.fn> }
  dispatch: ReturnType<typeof vi.fn>
} {
  const parameters: ModelParameterValues =
    modelId === 'opengrid-pillar'
      ? { mode: pillarMode }
      : { width: 20, depth: 30, height: 40 }
  const rawParameters: Record<string, string> =
    modelId === 'opengrid-pillar'
      ? { mode: pillarMode }
      : { width: '20', depth: '30', height: '40' }
  const bounds: ModelBounds =
    modelId === 'opengrid-pillar'
      ? boundsForPillar({ mode: pillarMode })
      : { min: [-10, -15, 0], max: [10, 15, 40] }
  const state = {
    ...initialCadState(modelId, parameters),
    status: 'ready' as const,
    exportStatus: 'idle' as const,
    workerEpoch: 'epoch-1',
    committed: {
      revision: 'revision-1',
      workerEpoch: 'epoch-1',
      generation: 1,
      modelId,
      parameters,
      mesh: {
        positions: new ArrayBuffer(12),
        normals: new ArrayBuffer(12),
        indices: new ArrayBuffer(12),
        bounds,
        triangleCount: 1,
      },
    },
  } satisfies CadState
  const client = { send: vi.fn(() => 'request-stl') }
  const dispatch = vi.fn()
  const refs = {
    client: { current: client as unknown as CadWorkerClient },
    rawParameters: { current: rawParameters },
    state: { current: state },
    workerEpoch: { current: 'epoch-1' },
    latestGeneration: { current: 1 },
    initialModelSent: { current: true },
    autoRecoveryAttempts: { current: 0 },
    operations: { current: new Map() },
    activeProgressOperationId: { current: null },
    exportRequest: { current: null },
    debounce: { current: null },
    timers: { current: new Map() },
    startWorker: { current: vi.fn() },
    recoverWorker: { current: vi.fn() },
    disposed: { current: false },
  } as RuntimeRefs
  const context = {
    refs,
    dispatch,
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
  } satisfies RuntimeContext
  return { context, refs, client, dispatch }
}

describe('CAD export runtime', () => {
  it('sends an STL command with the committed model metadata', () => {
    const { context, refs, client } = createContext()
    const handlers = createExportHandlers(context)

    handlers.handleExport('stl')

    expect(client.send).toHaveBeenCalledWith({
      kind: 'export.stl',
      operationId: expect.stringMatching(/^export-stl-/),
      modelRevision: 'revision-1',
      workerEpoch: 'epoch-1',
      file: { name: 'box-20x30x40.stl', mime: 'model/stl' },
    })
    expect(refs.exportRequest.current).toMatchObject({
      format: 'stl',
      revision: 'revision-1',
      workerEpoch: 'epoch-1',
      fileName: 'box-20x30x40.stl',
      downloaded: false,
    })
  })

  it('uses fixed pillar modes in deterministic STEP and STL metadata', () => {
    const step = createContext('opengrid-pillar')
    const stepHandlers = createExportHandlers(step.context)
    stepHandlers.handleExport('step')

    expect(step.client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'export.step',
        file: { name: 'pillar-8-standard.step', mime: 'model/step' },
      }),
    )

    const stl = createContext('opengrid-pillar', 'thin-shell')
    const stlHandlers = createExportHandlers(stl.context)
    stlHandlers.handleExport('stl')

    expect(stl.client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'export.stl',
        file: { name: 'pillar-5-thin-shell.stl', mime: 'model/stl' },
      }),
    )
  })

  it('rejects a mismatched STL response without triggering a download', () => {
    const { context, refs, dispatch } = createContext()
    const handlers = createExportHandlers(context)
    handlers.handleExport('stl')
    const request = refs.exportRequest.current
    if (!request) throw new Error('export request was not created')

    handlers.handleExportReady({
      version: PROTOCOL_VERSION,
      kind: 'export.ready',
      requestId: 'response-1',
      operationId: request.operationId,
      modelRevision: request.revision,
      workerEpoch: request.workerEpoch,
      format: 'stl',
      mime: 'model/stl',
      fileName: request.fileName,
      bytes: new ArrayBuffer(84),
    })

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recoverable-error',
        error: expect.objectContaining({ code: 'STL_METADATA_INVALID' }),
      }),
    )
    expect(refs.exportRequest.current).toBeNull()
  })
})

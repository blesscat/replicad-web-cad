import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  initialiseCadKernel: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  assertShapeQuality: vi.fn(),
  loadLockedSlot: vi.fn(),
  lockedSlot: { delete: vi.fn() },
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))
vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
}))
vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))
vi.mock(
  '../../src/cad-kernel/components/opengrid-openconnect-shelf/quality',
  () => ({
    assertOpenGridOpenConnectShelfShapeQuality: mocks.assertShapeQuality,
  }),
)
vi.mock(
  '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot',
  () => ({
    loadOpenGridOpenConnectShelfLockedSlot: mocks.loadLockedSlot,
  }),
)
vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import {
  boundsForOpenGridOpenConnectShelf,
  openGridOpenConnectShelfFileName,
  openGridOpenConnectShelfStlFileName,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import { CadWorkerRuntime } from '../../src/workers/cad.worker'

const DEFAULT_BOUNDS = boundsForOpenGridOpenConnectShelf(
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
)

function configureMocks(): void {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.meshBRep.mockReturnValue({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: DEFAULT_BOUNDS,
    triangleCount: 1,
  })
  mocks.serializeMesh.mockImplementation((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  }))
  mocks.loadLockedSlot.mockResolvedValue(mocks.lockedSlot)
  mocks.buildModelBRep.mockImplementation(
    async (
      _modelId: string,
      _parameters: unknown,
      context: {
        getOpenGridOpenConnectShelfLockedSlot?: () => Promise<unknown>
      },
    ) => {
      await context.getOpenGridOpenConnectShelfLockedSlot?.()
      return { delete: vi.fn() }
    },
  )
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([4, 5, 6]).buffer)
}

describe('OpenGrid OpenConnect shelf Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
  })

  it('routes generation through the model registry, asset cache, and quality gate', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-openconnect-shelf', (event) =>
      events.push(event),
    )

    await runtime.handle({
      version: 2,
      requestId: 'init-request',
      operationId: 'init-operation',
      kind: 'engine.init',
      asset: { wasmUrl: '/replicad_single.wasm' },
    })
    await runtime.handle({
      version: 2,
      requestId: 'shelf-request',
      operationId: 'shelf-operation',
      kind: 'model.generate',
      generation: 1,
      modelId: 'opengrid-openconnect-shelf',
      parameters: { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    })

    expect(mocks.buildModelBRep).toHaveBeenCalledWith(
      'opengrid-openconnect-shelf',
      OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
      expect.objectContaining({
        getOpenGridOpenConnectShelfLockedSlot: expect.any(Function),
      }),
    )
    expect(mocks.assertShapeQuality).toHaveBeenCalledWith(
      expect.anything(),
      OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
      expect.anything(),
      mocks.lockedSlot,
    )
    expect(mocks.loadLockedSlot).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        modelId: 'opengrid-openconnect-shelf',
        parameters: OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
      }),
    )
  })

  it('keeps only the latest in-flight shelf generation', async () => {
    let releaseFirst: () => void = () => undefined
    let markFirstStarted: () => void = () => undefined
    const firstReleased = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve
    })
    let buildCount = 0
    mocks.buildModelBRep.mockImplementation(
      async (
        _modelId: string,
        _parameters: unknown,
        context: { isGenerationCurrent?: () => boolean },
      ) => {
        buildCount += 1
        if (buildCount === 1) {
          markFirstStarted()
          await firstReleased
        }
        if (!context.isGenerationCurrent?.()) {
          throw new Error('STALE_GENERATION')
        }
        return { delete: vi.fn() }
      },
    )

    const events: Array<Record<string, unknown>> = []
    const runtime = new CadWorkerRuntime('epoch-openconnect-latest', (event) =>
      events.push(event as unknown as Record<string, unknown>),
    )
    await runtime.handle({
      version: 2,
      requestId: 'init-request',
      operationId: 'init-operation',
      kind: 'engine.init',
      asset: { wasmUrl: '/replicad_single.wasm' },
    })

    const first = runtime.handle({
      version: 2,
      requestId: 'shelf-request-1',
      operationId: 'shelf-operation-1',
      kind: 'model.generate',
      generation: 1,
      modelId: 'opengrid-openconnect-shelf',
      parameters: { columns: 3, rows: 3, connectorRows: 1, angle: 14 },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    })
    await firstStarted
    await runtime.handle({
      version: 2,
      requestId: 'shelf-request-2',
      operationId: 'shelf-operation-2',
      kind: 'model.generate',
      generation: 2,
      modelId: 'opengrid-openconnect-shelf',
      parameters: { columns: 4, rows: 2, connectorRows: 1, angle: 20 },
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    })
    releaseFirst()
    await first

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.superseded',
        generation: 1,
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        generation: 2,
        parameters: { columns: 4, rows: 2, connectorRows: 1, angle: 20 },
      }),
    )
  })

  it('gates deterministic STEP and STL exports on a committed revision', async () => {
    const events: Array<Record<string, unknown>> = []
    const runtime = new CadWorkerRuntime('epoch-openconnect-export', (event) =>
      events.push(event as unknown as Record<string, unknown>),
    )
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    await runtime.handle({
      version: 2,
      requestId: 'init-request',
      operationId: 'init-operation',
      kind: 'engine.init',
      asset: { wasmUrl: '/replicad_single.wasm' },
    })
    await runtime.handle({
      version: 2,
      requestId: 'shelf-request',
      operationId: 'shelf-operation',
      kind: 'model.generate',
      generation: 1,
      modelId: 'opengrid-openconnect-shelf',
      parameters,
      previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
    })
    const candidate = events.find(
      (event) => event.kind === 'model.candidate-ready',
    )
    expect(candidate?.candidateId).toEqual(expect.any(String))
    await runtime.handle({
      version: 2,
      requestId: 'commit-request',
      operationId: 'shelf-operation',
      kind: 'model.commit',
      generation: 1,
      candidateId: candidate!.candidateId as string,
      workerEpoch: 'epoch-openconnect-export',
    })
    const ready = events.find((event) => event.kind === 'model.ready')
    expect(ready?.modelRevision).toEqual(expect.any(String))

    await runtime.handle({
      version: 2,
      requestId: 'step-request',
      operationId: 'step-operation',
      kind: 'export.step',
      modelRevision: ready!.modelRevision as string,
      workerEpoch: 'epoch-openconnect-export',
      file: {
        name: openGridOpenConnectShelfFileName(parameters),
        mime: 'model/step',
      },
    })
    await runtime.handle({
      version: 2,
      requestId: 'stl-request',
      operationId: 'stl-operation',
      kind: 'export.stl',
      modelRevision: ready!.modelRevision as string,
      workerEpoch: 'epoch-openconnect-export',
      file: {
        name: openGridOpenConnectShelfStlFileName(parameters),
        mime: 'model/stl',
      },
    })

    expect(mocks.exportStepBytes).toHaveBeenCalledOnce()
    expect(mocks.exportStlBytes).toHaveBeenCalledOnce()
    expect(
      events.filter((event) => event.kind === 'export.ready'),
    ).toHaveLength(2)
  })
})

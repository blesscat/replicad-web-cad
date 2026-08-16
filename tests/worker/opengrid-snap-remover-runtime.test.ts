import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
  initialiseCadKernel: vi.fn(),
  loadOpenGridSnapRemoverAsset: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
  generatedShapes: [] as Array<{ delete: ReturnType<typeof vi.fn> }>,
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))
vi.mock(
  '../../src/cad-kernel/components/opengrid-snap-remover/builder',
  () => ({
    loadOpenGridSnapRemoverAsset: mocks.loadOpenGridSnapRemoverAsset,
  }),
)
vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
}))
vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))
vi.mock('../../src/cad-kernel/export', () => ({
  exportStepBytes: mocks.exportStepBytes,
  exportStlBytes: mocks.exportStlBytes,
}))

import { CadWorkerRuntime } from '../../src/workers/cad.worker'

const base = {
  version: 2 as const,
  requestId: 'request-base',
  operationId: 'operation-base',
}

function initCommand() {
  return {
    ...base,
    kind: 'engine.init' as const,
    asset: { wasmUrl: '/replicad_single.wasm' },
  }
}

function snapRemoverCommand(generation: number) {
  return {
    ...base,
    requestId: `snap-remover-request-${generation}`,
    operationId: `snap-remover-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'opengrid-snap-remover' as const,
    parameters: {},
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([1]).buffer)
  mocks.loadOpenGridSnapRemoverAsset.mockResolvedValue({ delete: vi.fn() })
  mocks.meshBRep.mockReturnValue({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: { min: [0, 0, 0], max: [1, 1, 0] },
    triangleCount: 1,
  })
  mocks.serializeMesh.mockImplementation((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  }))
  mocks.buildModelBRep.mockImplementation(
    async (
      _modelId: string,
      _parameters: unknown,
      context: {
        getOpenGridSnapRemoverAsset?: () => Promise<unknown>
      },
    ) => {
      await context.getOpenGridSnapRemoverAsset?.()
      const shape = { delete: vi.fn() }
      mocks.generatedShapes.push(shape)
      return shape
    },
  )
}

describe('opengrid-snap-remover Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generatedShapes.length = 0
    configureMocks()
  })

  it('reuses one epoch asset source and disposes it with generated revisions', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-opengrid', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    await runtime.handle(snapRemoverCommand(1))
    await runtime.handle(snapRemoverCommand(2))

    expect(mocks.loadOpenGridSnapRemoverAsset).toHaveBeenCalledOnce()
    expect(
      events.filter((event) => event.kind === 'model.candidate-ready'),
    ).toHaveLength(2)

    await runtime.handle({ ...base, kind: 'worker.dispose' as const })
    const assetPromise =
      mocks.loadOpenGridSnapRemoverAsset.mock.results[0]?.value
    const asset = await assetPromise
    expect(asset.delete).toHaveBeenCalledOnce()
    expect(
      mocks.generatedShapes.every(
        (shape) => shape.delete.mock.calls.length > 0,
      ),
    ).toBe(true)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  exportStepBytes: vi.fn(),
  exportStlBytes: vi.fn(),
  initialiseCadKernel: vi.fn(),
  loadBoxNormalReference: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
}))

vi.mock('../../src/cad-kernel/initialise', () => ({
  initialiseCadKernel: mocks.initialiseCadKernel,
}))

vi.mock('../../src/cad-kernel/components/box-normal/builder', () => ({
  loadBoxNormalReference: mocks.loadBoxNormalReference,
}))

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
  version: 1 as const,
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

function boxNormalCommand(generation: number) {
  return {
    ...base,
    requestId: `box-normal-request-${generation}`,
    operationId: `box-normal-operation-${generation}`,
    kind: 'model.generate' as const,
    generation,
    modelId: 'box-normal' as const,
    parameters: { x: 2, y: 2, height: 10, cornerPosts: true },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  }
}

function configureMocks() {
  mocks.initialiseCadKernel.mockResolvedValue(undefined)
  mocks.loadBoxNormalReference.mockResolvedValue({ delete: vi.fn() })
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
  mocks.exportStepBytes.mockResolvedValue(new Uint8Array([1]).buffer)
  mocks.exportStlBytes.mockResolvedValue(new Uint8Array([1]).buffer)
  mocks.buildModelBRep.mockImplementation(
    async (_modelId, _parameters, context) => {
      await context.getBoxNormalReference()
      return { delete: vi.fn() }
    },
  )
}

describe('box-normal Worker runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureMocks()
  })

  it('loads one independent reference per Worker epoch and disposes it', async () => {
    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-box-normal', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(boxNormalCommand(1))
    await runtime.handle(boxNormalCommand(2))

    expect(mocks.loadBoxNormalReference).toHaveBeenCalledOnce()
    expect(
      events.filter((event) => event.kind === 'model.candidate-ready'),
    ).toHaveLength(2)

    await runtime.handle({ ...base, kind: 'worker.dispose' as const })
    const referencePromise = mocks.loadBoxNormalReference.mock.results[0]?.value
    const reference = await referencePromise
    expect(reference.delete).toHaveBeenCalledOnce()
  })

  it('clears a rejected reference promise so a later generation can retry', async () => {
    const firstError = new Error('BOX_NORMAL_ASSET_INVALID')
    mocks.loadBoxNormalReference
      .mockRejectedValueOnce(firstError)
      .mockResolvedValueOnce({ delete: vi.fn() })

    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-box-normal-retry', (event) =>
      events.push(event),
    )

    await runtime.handle(initCommand())
    await runtime.handle(boxNormalCommand(1))
    await runtime.handle(boxNormalCommand(2))

    expect(mocks.loadBoxNormalReference).toHaveBeenCalledTimes(2)
    expect(
      events.some(
        (event) =>
          event.kind === 'operation.error' &&
          event.code === 'MODEL_ASSET_INVALID',
      ),
    ).toBe(true)
    expect(events.some((event) => event.kind === 'model.candidate-ready')).toBe(
      true,
    )
  })

  it('disposes a reference that resolves after the Worker is disposed', async () => {
    let resolveReference: (reference: {
      delete: ReturnType<typeof vi.fn>
    }) => void = () => undefined
    mocks.loadBoxNormalReference.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReference = resolve
        }),
    )

    const events: any[] = []
    const runtime = new CadWorkerRuntime('epoch-box-normal-dispose', (event) =>
      events.push(event),
    )
    await runtime.handle(initCommand())
    const pendingGeneration = runtime.handle(boxNormalCommand(1))
    await Promise.resolve()
    await runtime.handle({ ...base, kind: 'worker.dispose' as const })

    const reference = { delete: vi.fn() }
    resolveReference(reference)
    await pendingGeneration

    expect(reference.delete).toHaveBeenCalledOnce()
    expect(events.at(-1)).toMatchObject({ kind: 'operation.error' })
    expect(events.some((event) => event.kind === 'model.candidate-ready')).toBe(
      false,
    )
  })
})

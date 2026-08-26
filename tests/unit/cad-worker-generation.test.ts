import { describe, expect, it, vi } from 'vitest'
import type {
  WorkerCommand,
  WorkerEvent,
} from '../../src/cad-contract/messages'
import type { CandidateRecord } from '../../src/cad-kernel/lifetime'
import { generateCadCandidate } from '../../src/workers/cad-worker-generation'
import type { CadWorkerGenerationContext } from '../../src/workers/cad-worker-generation'

const mocks = vi.hoisted(() => ({
  buildModelBRep: vi.fn(),
  meshBRep: vi.fn(),
  serializeMesh: vi.fn(),
}))

vi.mock('../../src/cad-kernel/model', () => ({
  buildModelBRep: mocks.buildModelBRep,
}))
vi.mock('../../src/cad-kernel/mesh', () => ({
  meshBRep: mocks.meshBRep,
  serializeMesh: mocks.serializeMesh,
}))

const command: Extract<WorkerCommand, { kind: 'model.generate' }> = {
  version: 2,
  kind: 'model.generate',
  requestId: 'generate-request',
  operationId: 'generate-operation',
  generation: 1,
  modelId: 'box',
  parameters: { width: 20, depth: 30, height: 40 },
  previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
}

describe('CAD Worker generation seam', () => {
  it('builds, meshes, serializes, and registers a candidate', async () => {
    const shape = { delete: vi.fn() }
    const mesh = {
      positions: new Float32Array([0, 0, 0]),
      normals: new Float32Array([0, 0, 1]),
      indices: new Uint32Array([0, 0, 0]),
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      triangleCount: 1,
    }
    const meshSnapshot = {
      positions: new ArrayBuffer(4),
      normals: new ArrayBuffer(4),
      indices: new ArrayBuffer(4),
      bounds: mesh.bounds,
      triangleCount: mesh.triangleCount,
    }
    mocks.buildModelBRep.mockResolvedValue(shape)
    mocks.meshBRep.mockReturnValue(mesh)
    mocks.serializeMesh.mockReturnValue(meshSnapshot)

    const events: WorkerEvent[] = []
    const unregister = vi.fn()
    const registerCandidate = vi.fn((_candidate: CandidateRecord) => unregister)
    const context = {
      epoch: 'epoch-1',
      assets: {},
      buildOptions: {},
      emit: (event: WorkerEvent) => events.push(event),
      emitProgress: vi.fn(),
      isGenerationCurrent: vi.fn(() => true),
      registerCandidate,
      supersede: vi.fn(),
    } as unknown as CadWorkerGenerationContext

    await generateCadCandidate(command, context)

    expect(registerCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: command.operationId,
        generation: command.generation,
        modelId: command.modelId,
        shape,
        mesh,
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.candidate-ready',
        operationId: command.operationId,
        generation: command.generation,
        modelId: 'box',
        mesh: meshSnapshot,
      }),
    )
    expect(unregister).not.toHaveBeenCalled()
    expect(mocks.serializeMesh).toHaveBeenCalledWith(mesh)
  })
})

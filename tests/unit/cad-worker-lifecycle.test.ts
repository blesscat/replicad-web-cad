import { describe, expect, it, vi } from 'vitest'
import type {
  WorkerCommand,
  WorkerEvent,
} from '../../src/cad-contract/messages'
import type { PreviewTiming } from '../../src/cad-contract/preview-timing'
import type { CandidateRecord } from '../../src/cad-kernel/lifetime'
import type { MeshData } from '../../src/cad-kernel/mesh'
import { CadWorkerLifecycle } from '../../src/workers/cad-worker-lifecycle'

const EMPTY_PREVIEW_TIMING: PreviewTiming = {
  buildMs: null,
  meshMs: null,
  qualityMs: null,
  candidateMs: null,
  serializationMs: null,
  totalMs: 0,
}

function candidate(shape: {
  delete: ReturnType<typeof vi.fn>
}): CandidateRecord {
  const mesh: MeshData = {
    positions: new Float32Array([0, 0, 0]),
    normals: new Float32Array([0, 0, 1]),
    indices: new Uint32Array([0, 0, 0]),
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    triangleCount: 1,
  }
  return {
    candidateId: 'candidate-1',
    operationId: 'operation-1',
    requestId: 'request-1',
    generation: 1,
    workerEpoch: 'epoch-1',
    modelId: 'box',
    parameters: { width: 20, depth: 30, height: 40 },
    shape: shape as unknown as CandidateRecord['shape'],
    mesh,
    previewTiming: EMPTY_PREVIEW_TIMING,
    createdAt: Date.now(),
  }
}

describe('CAD Worker lifecycle', () => {
  it('invalidates pending candidates and emits their terminal correlation', () => {
    const events: WorkerEvent[] = []
    const lifecycle = new CadWorkerLifecycle('epoch-1', (event) =>
      events.push(event),
    )
    const shape = { delete: vi.fn() }
    const invalidate: Extract<WorkerCommand, { kind: 'model.invalidate' }> = {
      version: 2,
      kind: 'model.invalidate',
      requestId: 'invalidate-request',
      operationId: 'invalidate-operation',
      generation: 1,
      workerEpoch: 'epoch-1',
      reason: 'superseded',
    }

    expect(lifecycle.beginGeneration(1)).toBe(true)
    lifecycle.registerCandidate(candidate(shape))
    lifecycle.invalidate(invalidate)

    expect(shape.delete).toHaveBeenCalledOnce()
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'model.invalidated',
        operationId: 'invalidate-operation',
        generation: 1,
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'operation.superseded',
        operationId: 'operation-1',
        terminalForRequestId: 'request-1',
        generation: 1,
        reason: 'STALE_GENERATION',
      }),
    )
  })
})

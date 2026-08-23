import { describe, expect, it, vi } from 'vitest'
import type { Solid } from 'replicad'
import {
  RevisionLifetime,
  type CandidateRecord,
} from '../../src/cad-kernel/lifetime'
import type { MeshData } from '../../src/cad-kernel/mesh'
import type { PreviewTiming } from '../../src/cad-contract/preview-timing'

const EMPTY_PREVIEW_TIMING: PreviewTiming = {
  buildMs: null,
  meshMs: null,
  qualityMs: null,
  candidateMs: null,
  serializationMs: null,
  totalMs: 0,
}

function candidate(
  id: string,
  generation: number,
  shape: Solid,
): CandidateRecord {
  const mesh: MeshData = {
    positions: new Float32Array([0, 0, 0]),
    normals: new Float32Array([0, 0, 1]),
    indices: new Uint32Array([0, 0, 0]),
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    triangleCount: 1,
  }
  return {
    candidateId: id,
    operationId: `operation-${id}`,
    requestId: `request-${id}`,
    generation,
    workerEpoch: 'epoch-1',
    modelId: 'box',
    parameters: { width: 20, depth: 30, height: 40 },
    shape,
    mesh,
    previewTiming: EMPTY_PREVIEW_TIMING,
    createdAt: generation,
  }
}

describe('revision lifetime', () => {
  it('evicts replaced candidates at the configured capacity', () => {
    const store = new RevisionLifetime('epoch-1', 2, 30_000, () => 100)
    const firstShape = { delete: vi.fn() } as unknown as Solid
    const secondShape = { delete: vi.fn() } as unknown as Solid
    const thirdShape = { delete: vi.fn() } as unknown as Solid
    store.addCandidate(candidate('c1', 1, firstShape))
    store.addCandidate(candidate('c2', 2, secondShape))
    const evicted = store.addCandidate(candidate('c3', 3, thirdShape))
    expect(evicted.map((item) => item.candidateId)).toEqual(['c1'])
    expect(firstShape.delete).toHaveBeenCalledOnce()
    expect(store.pendingCandidates.map((item) => item.candidateId)).toEqual([
      'c2',
      'c3',
    ])
  })

  it('keeps an exported old revision alive until its pin is released', () => {
    const store = new RevisionLifetime('epoch-1', 2, 30_000, () => 100)
    const firstShape = { delete: vi.fn() } as unknown as Solid
    const secondShape = { delete: vi.fn() } as unknown as Solid
    store.addCandidate(candidate('c1', 1, firstShape))
    const firstRevision = store.commitCandidate('c1')
    store.pin(firstRevision.modelRevision)
    store.addCandidate(candidate('c2', 2, secondShape))
    store.commitCandidate('c2')
    expect(firstShape.delete).not.toHaveBeenCalled()
    store.unpin(firstRevision.modelRevision)
    expect(firstShape.delete).toHaveBeenCalledOnce()
  })

  it('expires unattended candidates and releases their native shape', () => {
    let now = 0
    const store = new RevisionLifetime('epoch-1', 2, 30_000, () => now)
    const shape = { delete: vi.fn() } as unknown as Solid
    store.addCandidate(candidate('ttl', 1, shape))

    now = 30_001
    const expired = store.cleanupExpired(1)
    expect(expired.map((item) => item.candidateId)).toEqual(['ttl'])
    expect(shape.delete).toHaveBeenCalledOnce()
    expect(store.pendingCandidates).toHaveLength(0)
  })

  it('releases multipart native shapes with their candidate or revision', () => {
    const store = new RevisionLifetime('epoch-1', 2, 30_000, () => 100)
    const body = { delete: vi.fn() } as unknown as Solid
    const text = { delete: vi.fn() } as unknown as Solid
    const record = candidate('multipart', 1, body)
    record.parts = [
      { name: 'body', shape: body },
      { name: 'text', shape: text },
    ]

    store.addCandidate(record)
    const revision = store.commitCandidate('multipart')
    store.pin(revision.modelRevision)

    const replacement = candidate('replacement', 2, {
      delete: vi.fn(),
    } as unknown as Solid)
    store.addCandidate(replacement)
    store.commitCandidate('replacement')
    expect(body.delete).not.toHaveBeenCalled()
    expect(text.delete).not.toHaveBeenCalled()

    store.unpin(revision.modelRevision)
    expect(body.delete).toHaveBeenCalledOnce()
    expect(text.delete).toHaveBeenCalledOnce()
  })

  it('prunes old commit idempotency records when a newer generation starts', () => {
    const store = new RevisionLifetime('epoch-1', 2, 30_000, () => 100)
    const shape = { delete: vi.fn() } as unknown as Solid
    store.addCandidate(candidate('commit-1', 1, shape))
    store.commitCandidate('commit-1')
    expect(store.getCommit('operation-commit-1')).not.toBeNull()
    store.pruneCommitsBeforeGeneration(2)
    expect(store.getCommit('operation-commit-1')).toBeNull()
  })
})

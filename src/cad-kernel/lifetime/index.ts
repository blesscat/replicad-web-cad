import type { Shape3D } from 'replicad'
import type { MeshData } from '../mesh'
import type { PreviewTiming } from '../../cad-contract/preview-timing'
import type { ModelId, ModelParameterValues } from '../../cad-contract/units'

export type CandidateRecord = {
  candidateId: string
  operationId: string
  requestId: string
  generation: number
  workerEpoch: string
  modelId: ModelId
  parameters: ModelParameterValues
  shape: Shape3D
  mesh: MeshData
  previewTiming: PreviewTiming
  createdAt: number
}

export type RevisionRecord = {
  modelRevision: string
  operationId: string
  generation: number
  workerEpoch: string
  modelId: ModelId
  parameters: ModelParameterValues
  shape: Shape3D
  mesh: MeshData
  previewTiming: PreviewTiming
  exportPins: number
}

type CommitRecord = {
  revision: RevisionRecord
  candidateId: string
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // A failed native delete must not prevent the rest of the Worker cleanup.
  }
}

export class RevisionLifetime {
  private readonly candidates = new Map<string, CandidateRecord>()
  private readonly revisions = new Map<string, RevisionRecord>()
  private readonly commits = new Map<string, CommitRecord>()
  private currentRevisionId: string | null = null

  constructor(
    private readonly workerEpoch: string,
    private readonly candidateLimit: number,
    private readonly candidateTtlMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get pendingCandidates(): readonly CandidateRecord[] {
    return [...this.candidates.values()]
  }

  get current(): RevisionRecord | null {
    return this.currentRevisionId
      ? (this.revisions.get(this.currentRevisionId) ?? null)
      : null
  }

  addCandidate(candidate: CandidateRecord): CandidateRecord[] {
    this.candidates.set(candidate.candidateId, candidate)
    const evicted: CandidateRecord[] = []

    while (this.candidates.size > this.candidateLimit) {
      const replaceable = [...this.candidates.values()]
        .filter((item) => item.generation < candidate.generation)
        .sort(
          (a, b) => a.generation - b.generation || a.createdAt - b.createdAt,
        )[0]
      if (!replaceable) break
      this.candidates.delete(replaceable.candidateId)
      deleteShape(replaceable.shape)
      evicted.push(replaceable)
    }

    if (
      this.candidates.has(candidate.candidateId) &&
      this.candidates.size > this.candidateLimit
    ) {
      this.candidates.delete(candidate.candidateId)
      deleteShape(candidate.shape)
      throw new Error('CANDIDATE_CAPACITY')
    }
    return evicted
  }

  getCandidate(candidateId: string): CandidateRecord | null {
    return this.candidates.get(candidateId) ?? null
  }

  getCommit(operationId: string): CommitRecord | null {
    return this.commits.get(operationId) ?? null
  }

  pruneCommitsBeforeGeneration(generation: number): void {
    for (const [operationId, commit] of this.commits) {
      if (commit.revision.generation < generation)
        this.commits.delete(operationId)
    }
  }

  commitCandidate(candidateId: string): RevisionRecord {
    const candidate = this.candidates.get(candidateId)
    if (!candidate) throw new Error('CANDIDATE_MISSING')

    this.candidates.delete(candidateId)
    const revision: RevisionRecord = {
      modelRevision: `rev-${this.workerEpoch}-${crypto.randomUUID()}`,
      operationId: candidate.operationId,
      generation: candidate.generation,
      workerEpoch: candidate.workerEpoch,
      modelId: candidate.modelId,
      parameters: candidate.parameters,
      shape: candidate.shape,
      mesh: candidate.mesh,
      previewTiming: candidate.previewTiming,
      exportPins: 0,
    }
    this.revisions.set(revision.modelRevision, revision)
    this.commits.set(candidate.operationId, { revision, candidateId })

    const previous = this.current
    this.currentRevisionId = revision.modelRevision
    if (
      previous &&
      previous.modelRevision !== revision.modelRevision &&
      previous.exportPins === 0
    ) {
      this.revisions.delete(previous.modelRevision)
      deleteShape(previous.shape)
    }
    return revision
  }

  discardCandidate(candidateId: string): CandidateRecord | null {
    const candidate = this.candidates.get(candidateId)
    if (!candidate) return null
    this.candidates.delete(candidateId)
    deleteShape(candidate.shape)
    return candidate
  }

  cleanupExpired(
    latestGeneration: number,
    includeLatest = false,
  ): CandidateRecord[] {
    const expired: CandidateRecord[] = []
    for (const candidate of this.candidates.values()) {
      if (
        this.now() - candidate.createdAt >= this.candidateTtlMs ||
        candidate.generation < latestGeneration ||
        (includeLatest && candidate.generation <= latestGeneration)
      ) {
        this.candidates.delete(candidate.candidateId)
        deleteShape(candidate.shape)
        expired.push(candidate)
      }
    }
    return expired
  }

  pin(modelRevision: string): RevisionRecord {
    const revision = this.revisions.get(modelRevision)
    if (!revision) throw new Error('MODEL_REVISION_MISSING')
    revision.exportPins += 1
    return revision
  }

  unpin(modelRevision: string): void {
    const revision = this.revisions.get(modelRevision)
    if (!revision) return
    revision.exportPins = Math.max(0, revision.exportPins - 1)
    if (
      revision.modelRevision !== this.currentRevisionId &&
      revision.exportPins === 0
    ) {
      this.revisions.delete(revision.modelRevision)
      deleteShape(revision.shape)
    }
  }

  dispose(): void {
    for (const candidate of this.candidates.values())
      deleteShape(candidate.shape)
    for (const revision of this.revisions.values()) deleteShape(revision.shape)
    this.candidates.clear()
    this.revisions.clear()
    this.commits.clear()
    this.currentRevisionId = null
  }
}

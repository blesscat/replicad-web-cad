export const PREVIEW_TIMING_PHASES = [
  'build',
  'mesh',
  'quality',
  'candidate',
  'serialization',
] as const

export type PreviewTimingPhase = (typeof PREVIEW_TIMING_PHASES)[number]

export type PreviewTiming = {
  buildMs: number | null
  meshMs: number | null
  qualityMs: number | null
  candidateMs: number | null
  serializationMs: number | null
  totalMs: number
  booleanMs?: number | null
  booleanFuseMs?: number | null
  booleanCutMs?: number | null
  booleanIntersectMs?: number | null
}

type BooleanTimingKind = 'fuse' | 'cut' | 'intersect'

type PhaseDurationKey =
  'buildMs' | 'meshMs' | 'qualityMs' | 'candidateMs' | 'serializationMs'

function phaseDurationKey(phase: PreviewTimingPhase): PhaseDurationKey {
  if (phase === 'build') return 'buildMs'
  if (phase === 'mesh') return 'meshMs'
  if (phase === 'quality') return 'qualityMs'
  if (phase === 'candidate') return 'candidateMs'
  return 'serializationMs'
}

function emptyDurations(): Pick<PreviewTiming, PhaseDurationKey> {
  return {
    buildMs: null,
    meshMs: null,
    qualityMs: null,
    candidateMs: null,
    serializationMs: null,
  }
}

export class PreviewTimingRecorder {
  private readonly startedAt: number
  private readonly durations = emptyDurations()
  private booleanMs = 0
  private booleanFuseMs = 0
  private booleanCutMs = 0
  private booleanIntersectMs = 0
  private booleanOperationCount = 0
  private booleanFuseCount = 0
  private booleanCutCount = 0
  private booleanIntersectCount = 0

  constructor(private readonly now: () => number = () => performance.now()) {
    this.startedAt = now()
  }

  measureSync<T>(phase: PreviewTimingPhase, work: () => T): T {
    const startedAt = this.now()
    try {
      return work()
    } finally {
      this.durations[phaseDurationKey(phase)] = this.now() - startedAt
    }
  }

  async measure<T>(
    phase: PreviewTimingPhase,
    work: () => Promise<T>,
  ): Promise<T> {
    const startedAt = this.now()
    try {
      return await work()
    } finally {
      this.durations[phaseDurationKey(phase)] = this.now() - startedAt
    }
  }

  recordBoolean(kind: BooleanTimingKind, durationMs: number): void {
    const duration = Math.max(0, durationMs)
    this.booleanOperationCount += 1
    this.booleanMs += duration
    if (kind === 'fuse') {
      this.booleanFuseCount += 1
      this.booleanFuseMs += duration
    }
    if (kind === 'cut') {
      this.booleanCutCount += 1
      this.booleanCutMs += duration
    }
    if (kind === 'intersect') {
      this.booleanIntersectCount += 1
      this.booleanIntersectMs += duration
    }
  }

  snapshot(): PreviewTiming {
    return {
      ...this.durations,
      totalMs: this.now() - this.startedAt,
      booleanMs: this.booleanOperationCount > 0 ? this.booleanMs : null,
      booleanFuseMs: this.booleanFuseCount > 0 ? this.booleanFuseMs : null,
      booleanCutMs: this.booleanCutCount > 0 ? this.booleanCutMs : null,
      booleanIntersectMs:
        this.booleanIntersectCount > 0 ? this.booleanIntersectMs : null,
    }
  }
}

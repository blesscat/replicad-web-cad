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
}

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

  snapshot(): PreviewTiming {
    return {
      ...this.durations,
      totalMs: this.now() - this.startedAt,
    }
  }
}

export type MeshFaceProgress = {
  completed: number
  total: number
}

export const MESH_PROGRESS_UPDATE_INTERVAL_MS = 75

const MESH_PROGRESS_FRACTION_DIVISOR = 100

type ThrottledMeshProgressOptions = {
  now?: () => number
  intervalMs?: number
}

export type ThrottledMeshProgressReporter = ((
  progress: MeshFaceProgress,
) => void) & {
  flush: () => void
}

function clockNow(): number {
  if (typeof performance !== 'undefined') return performance.now()
  return Date.now()
}

export function createThrottledMeshProgressReporter(
  emit: (progress: MeshFaceProgress) => void,
  options: ThrottledMeshProgressOptions = {},
): ThrottledMeshProgressReporter {
  const now = options.now ?? clockNow
  const intervalMs = options.intervalMs ?? MESH_PROGRESS_UPDATE_INTERVAL_MS
  let lastCompleted: number | null = null
  let lastEmittedAt = Number.NEGATIVE_INFINITY
  let total: number | null = null
  let latestProgress: MeshFaceProgress | null = null

  const report = ((progress: MeshFaceProgress) => {
    if (
      !Number.isInteger(progress.completed) ||
      !Number.isInteger(progress.total) ||
      progress.total <= 0 ||
      progress.completed < 0 ||
      progress.completed > progress.total
    ) {
      return
    }

    if (total === null) total = progress.total
    if (progress.total !== total) return
    if (
      latestProgress !== null &&
      progress.completed <= latestProgress.completed
    )
      return

    latestProgress = { ...progress }

    const completedStep = Math.max(
      1,
      Math.ceil(total / MESH_PROGRESS_FRACTION_DIVISOR),
    )
    const timestamp = now()
    const isInitial = lastCompleted === null
    const isFinal = progress.completed === total
    const reachedTimeThreshold = timestamp - lastEmittedAt >= intervalMs
    const reachedCountThreshold =
      lastCompleted !== null &&
      progress.completed - lastCompleted >= completedStep

    if (
      !isInitial &&
      !isFinal &&
      !reachedTimeThreshold &&
      !reachedCountThreshold
    ) {
      return
    }

    lastCompleted = progress.completed
    lastEmittedAt = timestamp
    emit({ ...progress })
  }) as ThrottledMeshProgressReporter

  report.flush = () => {
    if (latestProgress === null || latestProgress.completed === lastCompleted)
      return

    lastCompleted = latestProgress.completed
    lastEmittedAt = now()
    emit({ ...latestProgress })
  }

  return report
}

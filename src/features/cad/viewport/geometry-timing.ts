export type ViewportGeometryPhase = 'base-geometry' | 'edge-geometry'

export const CAD_VIEWPORT_TIMING_EVENT = 'cad:viewport-timing'

export type ViewportGeometryTiming = {
  phase: ViewportGeometryPhase
  durationMs: number
}

export function measureViewportGeometry<T>(
  phase: ViewportGeometryPhase,
  work: () => T,
  onTiming?: (timing: ViewportGeometryTiming) => void,
): T {
  const startedAt = performance.now()
  try {
    return work()
  } finally {
    onTiming?.({ phase, durationMs: performance.now() - startedAt })
  }
}

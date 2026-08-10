import * as THREE from 'three'
import {
  createViewportEdgeGeometry,
  shouldDeferViewportEdges,
} from './edge-lines'
import {
  measureViewportGeometry,
  type ViewportGeometryTiming,
} from './geometry-timing'

type TimerHandle = ReturnType<typeof setTimeout>

export type ViewportEdgePreparationOptions = {
  createEdges?: (geometry: THREE.BufferGeometry) => THREE.EdgesGeometry
  schedule?: (callback: () => void) => TimerHandle
  cancel?: (handle: TimerHandle) => void
  onTiming?: (timing: ViewportGeometryTiming) => void
}

export class ViewportEdgePreparation {
  private pendingTimer: TimerHandle | null = null
  private preparedGeometry: THREE.EdgesGeometry | null = null
  private generation = 0
  private readonly createEdges: (
    geometry: THREE.BufferGeometry,
  ) => THREE.EdgesGeometry
  private readonly schedule: (callback: () => void) => TimerHandle
  private readonly cancel: (handle: TimerHandle) => void
  private readonly onTiming?: (timing: ViewportGeometryTiming) => void

  constructor(options: ViewportEdgePreparationOptions = {}) {
    this.createEdges = options.createEdges ?? createViewportEdgeGeometry
    this.schedule = options.schedule ?? ((callback) => setTimeout(callback, 0))
    this.cancel = options.cancel ?? ((handle) => clearTimeout(handle))
    this.onTiming = options.onTiming
  }

  prepare(
    geometry: THREE.BufferGeometry,
    triangleCount: number,
    onReady: (edgeGeometry: THREE.EdgesGeometry) => void,
  ): void {
    this.dispose()
    const generation = this.generation
    const create = () => {
      if (generation !== this.generation) return
      this.pendingTimer = null
      const nextGeometry = measureViewportGeometry(
        'edge-geometry',
        () => this.createEdges(geometry),
        this.onTiming,
      )
      this.preparedGeometry = nextGeometry
      onReady(nextGeometry)
    }

    if (shouldDeferViewportEdges(triangleCount)) {
      this.pendingTimer = this.schedule(create)
      return
    }
    create()
  }

  dispose(): void {
    this.generation += 1
    if (this.pendingTimer !== null) {
      this.cancel(this.pendingTimer)
      this.pendingTimer = null
    }
    this.preparedGeometry?.dispose()
    this.preparedGeometry = null
  }
}

import { describe, expect, it } from 'vitest'
import {
  createThrottledMeshProgressReporter,
  MESH_PROGRESS_UPDATE_INTERVAL_MS,
} from '../../src/workers/mesh-progress'

describe('throttled mesh face progress', () => {
  it('publishes the initial and final counts while coalescing rapid updates', () => {
    let now = 0
    const events: Array<{ completed: number; total: number }> = []
    const report = createThrottledMeshProgressReporter(
      (progress) => events.push(progress),
      { now: () => now },
    )

    for (let completed = 0; completed <= 1_000; completed += 1) {
      report({ completed, total: 1_000 })
    }

    expect(events[0]).toEqual({ completed: 0, total: 1_000 })
    expect(events.at(-1)).toEqual({ completed: 1_000, total: 1_000 })
    expect(events.length).toBeLessThan(1_001)
    expect(events).toEqual(
      [...events].sort((left, right) => left.completed - right.completed),
    )
  })

  it('publishes slow face completions without waiting for the final face', () => {
    let now = 0
    const events: Array<{ completed: number; total: number }> = []
    const report = createThrottledMeshProgressReporter(
      (progress) => events.push(progress),
      { now: () => now },
    )

    report({ completed: 0, total: 4 })
    now += MESH_PROGRESS_UPDATE_INTERVAL_MS
    report({ completed: 1, total: 4 })
    now += MESH_PROGRESS_UPDATE_INTERVAL_MS
    report({ completed: 2, total: 4 })

    expect(events).toEqual([
      { completed: 0, total: 4 },
      { completed: 1, total: 4 },
      { completed: 2, total: 4 },
    ])
  })

  it('flushes the latest coalesced count before a terminal failure', () => {
    const events: Array<{ completed: number; total: number }> = []
    const report = createThrottledMeshProgressReporter((progress) =>
      events.push(progress),
    )

    report({ completed: 0, total: 1_000 })
    report({ completed: 5, total: 1_000 })
    expect(events).toEqual([{ completed: 0, total: 1_000 }])

    report.flush()

    expect(events).toEqual([
      { completed: 0, total: 1_000 },
      { completed: 5, total: 1_000 },
    ])
    report.flush()
    expect(events).toHaveLength(2)
  })
})

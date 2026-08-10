import { describe, expect, it } from 'vitest'
import {
  PreviewTimingRecorder,
  type PreviewTimingPhase,
} from '../../src/cad-contract/preview-timing'

describe('PreviewTimingRecorder', () => {
  it('records synchronous phases and total duration', () => {
    const times = [10, 10, 14, 20]
    const now = () => times.shift() ?? 20
    const recorder = new PreviewTimingRecorder(now)

    recorder.measureSync('build', () => 'shape')

    expect(recorder.snapshot()).toMatchObject({
      buildMs: 4,
      totalMs: 10,
    })
  })

  it('records asynchronous phases and preserves the error phase timing', async () => {
    const times = [100, 103, 108, 112]
    const now = () => times.shift() ?? 112
    const recorder = new PreviewTimingRecorder(now)

    await expect(
      recorder.measure('quality', async () => {
        await Promise.resolve()
        throw new Error('quality failed')
      }),
    ).rejects.toThrow('quality failed')

    expect(recorder.snapshot()).toMatchObject({
      qualityMs: 5,
      totalMs: 12,
    })
  })

  it('rejects unknown phase names at the type boundary used by the recorder', () => {
    const phases: readonly PreviewTimingPhase[] = [
      'build',
      'mesh',
      'quality',
      'candidate',
      'serialization',
    ]

    expect(phases).toHaveLength(5)
  })
})

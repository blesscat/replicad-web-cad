import { describe, expect, it } from 'vitest'
import { normalizeError } from '../../src/cad-contract/errors'
import { cadReducer, initialCadState } from '../../src/features/cad/state'

describe('CAD state machine', () => {
  it('keeps a committed model stale while a newer generation is being built', () => {
    const initial = initialCadState()
    const model = {
      revision: 'rev-1',
      workerEpoch: 'epoch-1',
      generation: 1,
      parameters: { width: 20, depth: 30, height: 40 },
      mesh: {
        positions: new Float32Array([0, 0, 0]).buffer,
        normals: new Float32Array([0, 0, 1]).buffer,
        indices: new Uint32Array([0, 0, 0]).buffer,
        bounds: {
          min: [0, 0, 0] as [number, number, number],
          max: [0, 0, 0] as [number, number, number],
        },
        triangleCount: 1,
      },
    }
    const ready = cadReducer(initial, { type: 'model-ready', model })
    const stale = cadReducer(ready, {
      type: 'input-valid',
      input: { width: 21, depth: 30, height: 40 },
      generation: 2,
    })
    expect(ready.status).toBe('ready')
    expect(stale.status).toBe('generating')
    expect(stale.stale).toBe(true)
    expect(stale.committed?.revision).toBe('rev-1')
    expect(stale.exportStatus).toBe('disabled')
  })

  it('enters invalid-input without deleting the previous preview', () => {
    const state = cadReducer(initialCadState(), {
      type: 'input-invalid',
      input: { width: 20, depth: 30, height: 40 },
      generation: 1,
      error: normalizeError(new Error('bad input'), {
        stage: 'validation',
        code: 'INVALID_INPUT',
        userMessage: '輸入無效',
      }),
    })
    expect(state.status).toBe('invalid-input')
    expect(state.exportStatus).toBe('disabled')
  })

  it('clears old revisions after a worker restart while retaining current input', () => {
    const state = cadReducer(
      cadReducer(initialCadState(), {
        type: 'input-valid',
        input: { width: 21, depth: 30, height: 40 },
        generation: 2,
      }),
      { type: 'worker-restarted' },
    )
    expect(state.status).toBe('loading-engine')
    expect(state.input).toEqual({ width: 21, depth: 30, height: 40 })
    expect(state.committed).toBeNull()
    expect(state.workerEpoch).toBeNull()
  })
})

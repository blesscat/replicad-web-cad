import { describe, expect, it } from 'vitest'
import { CadWorkerRuntime } from '../../src/workers/cad.worker'

describe('CAD Worker runtime protocol boundary', () => {
  it('returns a terminal protocol error for an invalid command', async () => {
    const events: unknown[] = []
    const runtime = new CadWorkerRuntime('epoch-test', (event) =>
      events.push(event),
    )
    await runtime.handle({ version: 99, kind: 'nope' })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      kind: 'operation.error',
      code: 'PROTOCOL_INVALID',
    })
  })
})

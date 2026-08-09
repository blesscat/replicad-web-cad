import { describe, expect, it } from 'vitest'
import type { OpenGridSnapRemoverParameters } from '../../src/cad-contract/units'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'

describe('OpenGrid Snap Remover workspace input', () => {
  it('starts with no editable raw fields and accepts the empty snapshot', () => {
    const parameters: OpenGridSnapRemoverParameters = {}

    expect(rawFromParameters(parameters)).toEqual({})
    expect(parseRawParameters({}, 'opengrid-snap-remover')).toEqual({
      valid: true,
      value: {},
    })
    expect(parseRawParameters({ rows: '2' }, 'opengrid-snap-remover')).toEqual({
      valid: true,
      value: {},
    })
  })
})

import { describe, expect, it } from 'vitest'
import type { BoxParameters } from '../../src/cad-contract/units'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'

describe('CAD workspace validation helpers', () => {
  it('converts committed parameters to editable raw values and back', () => {
    const parameters: BoxParameters = { width: 20, depth: 30, height: 40 }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({ width: '20', depth: '30', height: '40' })
    expect(parseRawParameters(raw)).toEqual({ valid: true, value: parameters })
  })

  it('returns the first invalid dimension field and its user-facing message', () => {
    expect(
      parseRawParameters({ width: '20.5', depth: '30', height: '40' }),
    ).toEqual({
      valid: false,
      message: '必須是有限的整數。',
      field: 'width',
    })
  })
})

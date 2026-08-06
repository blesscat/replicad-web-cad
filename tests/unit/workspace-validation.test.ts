import { describe, expect, it } from 'vitest'
import type {
  BoxParameters,
  HswCellParameters,
} from '../../src/cad-contract/units'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'
import type { RawParameters } from '../../src/components/cad/workspace/types'

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

  it('parses HSW slider snapshots as rows and columns', () => {
    const parameters: HswCellParameters = { rows: 2, columns: 3 }
    const raw = rawFromParameters(parameters)

    expect(parseRawParameters(raw, 'hsw-cell')).toEqual({
      valid: true,
      value: parameters,
    })
  })

  it('keeps contract validation for malformed external HSW snapshots', () => {
    expect(
      parseRawParameters({ rows: '0', columns: '21' }, 'hsw-cell'),
    ).toEqual({
      valid: false,
      message: '格數必須是正整數。',
      field: 'rows',
    })
    expect(
      parseRawParameters({ rows: '2.5', columns: '3' }, 'hsw-cell'),
    ).toEqual({
      valid: false,
      message: '必須是有限的整數。',
      field: 'rows',
    })
    expect(
      parseRawParameters(
        { rows: '2', columns: '3', width: '20' } as RawParameters,
        'hsw-cell',
      ),
    ).toEqual({
      valid: false,
      message: '包含不支援的參數欄位。',
    })
  })
})

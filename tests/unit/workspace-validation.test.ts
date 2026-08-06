import { describe, expect, it } from 'vitest'
import type {
  BoxNormalParameters,
  BoxParameters,
  HexagonalColumnParameters,
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

  it('parses the independent hexagonal-column inputs and defaults', () => {
    const parameters: HexagonalColumnParameters = {
      height: 8,
      count: 1,
      gap: 1,
      orientation: 'lying',
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      height: '8',
      count: '1',
      gap: '1',
      orientation: 'lying',
    })
    expect(parseRawParameters(raw, 'hexagonal-column')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        { height: '8', count: '1', gap: '1' },
        'hexagonal-column',
      ),
    ).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        { height: '8.5', count: '1', gap: '1' },
        'hexagonal-column',
      ),
    ).toEqual({
      valid: false,
      message: '必須是有限的整數。',
      field: 'height',
    })
  })

  it('round-trips box-normal grid values and its typed checkbox', () => {
    const parameters: BoxNormalParameters = {
      x: 2,
      y: 2,
      height: 10,
      cornerPosts: true,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      x: '2',
      y: '2',
      height: '10',
      cornerPosts: 'true',
    })
    expect(parseRawParameters(raw, 'box-normal')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        { x: '2', y: '2', height: '10', cornerPosts: 'yes' },
        'box-normal',
      ),
    ).toEqual({
      valid: false,
      message: '必須是 true 或 false。',
      field: 'cornerPosts',
    })
    expect(
      parseRawParameters({ x: '2', y: '2', height: '10' }, 'box-normal'),
    ).toEqual({
      valid: false,
      message: '必須是 true 或 false。',
      field: 'cornerPosts',
    })
  })
})

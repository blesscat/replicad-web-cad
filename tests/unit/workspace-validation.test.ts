import { describe, expect, it } from 'vitest'
import type {
  BoxNormalParameters,
  BoxParameters,
  HexagonalColumnParameters,
  HswCellParameters,
  OpenGridDividerParameters,
  OpenGridStackableBoxParameters,
  OpenGridStackableCylinderParameters,
  OpenGridSnapParameters,
  PillarParameters,
} from '../../src/cad-contract/units'
import { OPENGRID_DIVIDER_CONFIGURATION } from '../../src/cad-contract/units'
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

  it('parses decimal OpenGrid Snap offsets without accepting board fields', () => {
    const parameters: OpenGridSnapParameters = {
      variant: 'Lite',
      offset: 0.2,
      halfCellX: 'none',
      halfCellY: 'none',
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      variant: 'Lite',
      offset: '0.2',
      halfCellX: 'none',
      halfCellY: 'none',
    })
    expect(parseRawParameters(raw, 'opengrid-snap')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          variant: 'Lite',
          offset: '0.2',
          rows: '2',
        } as RawParameters,
        'opengrid-snap',
      ),
    ).toEqual({
      valid: false,
      message: '包含不支援的參數欄位。',
    })
    expect(
      parseRawParameters({ variant: 'Lite', offset: '' }, 'opengrid-snap'),
    ).toEqual({
      valid: false,
      message: '外框總增量必須是有限的小數。',
      field: 'offset',
    })
    expect(
      parseRawParameters({ variant: 'Lite', offset: '0.03' }, 'opengrid-snap'),
    ).toEqual({
      valid: false,
      message: '外框增量必須以 0.05 mm 為步進。',
      field: 'offset',
    })
  })

  it('round-trips OpenGrid stackable-box half-cell inputs', () => {
    const parameters: OpenGridStackableBoxParameters = {
      x: 0.5,
      y: 1.5,
      height: 25,
      cornerBottomHoles: true,
      fullBottomHoleGrid: true,
      basePlateMode: false,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      x: '0.5',
      y: '1.5',
      height: '25',
      cornerBottomHoles: 'true',
      fullBottomHoleGrid: 'true',
      basePlateMode: 'false',
    })
    expect(parseRawParameters(raw, 'opengrid-stackable-box')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          x: '0.25',
          y: '1',
          height: '25',
          cornerBottomHoles: 'true',
          fullBottomHoleGrid: 'true',
          basePlateMode: 'false',
        },
        'opengrid-stackable-box',
      ),
    ).toEqual({
      valid: false,
      message: '格數必須是 0.5 的倍數。',
      field: 'x',
    })
  })

  it('round-trips independent divider arm counts and height', () => {
    const parameters: OpenGridDividerParameters = {
      left: 1,
      right: 1,
      up: 1.5,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      left: '1',
      right: '1',
      up: '1.5',
      down: '0',
      height: '20',
      wallThickness: '2',
    })
    expect(parseRawParameters(raw, 'opengrid-divider')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          left: '1',
          right: '0',
          up: '0',
          down: '0',
          height: '20',
          wallThickness: '2',
        },
        'opengrid-divider',
      ),
    ).toEqual({
      valid: false,
      message: '至少需要兩個方向才能建立一字型、L 型、T 型或十字型。',
    })
    expect(
      parseRawParameters(
        {
          left: '1.25',
          right: '1',
          up: '0',
          down: '0',
          height: '20',
          wallThickness: '2',
        },
        'opengrid-divider',
      ),
    ).toEqual({
      valid: false,
      message: `格數必須是 0–${OPENGRID_DIVIDER_CONFIGURATION.maxArmCount} 的 ${OPENGRID_DIVIDER_CONFIGURATION.gridStep} 格倍數。`,
      field: 'left',
    })
  })

  it('round-trips pillar length and its typed base-connection checkbox', () => {
    const parameters: PillarParameters = {
      length: 5,
      baseConnection: true,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({ length: '5', baseConnection: 'true' })
    expect(parseRawParameters(raw, 'opengrid-pillar')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        { length: '5', baseConnection: 'yes' },
        'opengrid-pillar',
      ),
    ).toEqual({
      valid: false,
      message: '必須是 true 或 false。',
      field: 'baseConnection',
    })
    expect(
      parseRawParameters(
        { length: '5.5', baseConnection: 'false' },
        'opengrid-pillar',
      ),
    ).toEqual({
      valid: false,
      message: '總長度必須是有限的整數 mm。',
      field: 'length',
    })
  })

  it('round-trips OpenGrid stackable-cylinder integer inputs', () => {
    const parameters: OpenGridStackableCylinderParameters = {
      diameter: 56,
      height: 30,
      thinBottomMode: false,
      bottomPlateMode: false,
      bottomHolesEnabled: true,
    }
    const raw = rawFromParameters(parameters)

    expect(raw).toEqual({
      diameter: '56',
      height: '30',
      thinBottomMode: 'false',
      bottomPlateMode: 'false',
      bottomHolesEnabled: 'true',
    })
    expect(parseRawParameters(raw, 'opengrid-stackable-cylinder')).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        { diameter: '56', height: '30' },
        'opengrid-stackable-cylinder',
      ),
    ).toEqual({
      valid: true,
      value: parameters,
    })
    expect(
      parseRawParameters(
        {
          diameter: '56.5',
          height: '30',
          thinBottomMode: 'false',
          bottomHolesEnabled: 'true',
        },
        'opengrid-stackable-cylinder',
      ),
    ).toEqual({
      valid: false,
      message: '必須是有限的整數。',
      field: 'diameter',
    })
  })
})

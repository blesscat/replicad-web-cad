import { describe, expect, it } from 'vitest'
import {
  cadPathForModel,
  getModelDefinition,
  modelIdForCadPath,
  modelDefinitions,
} from '../../src/features/cad/model-catalog'

describe('CAD component catalog', () => {
  it('exposes independent box, modular-grid-base, and HSW definitions', () => {
    expect(modelDefinitions.map((definition) => definition.id)).toEqual([
      'box',
      'modular-grid-base',
      'hsw-cell',
    ])

    const grid = getModelDefinition('modular-grid-base')
    expect(grid?.displayName).toBe('模組化網格底板')
    expect(grid?.selectionDescription).toContain('網格')
    expect(grid?.parameterSchema.map((field) => field.key)).toEqual([
      'rows',
      'columns',
    ])
    expect(grid?.parameterSchema.map((field) => field.max)).toEqual([20, 20])
    expect(grid?.exportFileName({ rows: 2, columns: 3 })).toBe(
      'modular-grid-base-3x2.step',
    )
    expect(grid?.stlFileName({ rows: 2, columns: 3 })).toBe(
      'modular-grid-base-3x2.stl',
    )
    expect(grid?.validateParameters({ rows: 2, columns: 3 })).toEqual({
      valid: true,
      value: {
        modelId: 'modular-grid-base',
        parameters: { rows: 2, columns: 3 },
      },
    })
    expect(grid?.boundsForParameters({ rows: 2, columns: 3 })).toEqual({
      min: [-30, -20, 0],
      max: [30, 20, 5],
    })

    const hsw = getModelDefinition('hsw-cell')
    expect(hsw?.displayName).toBe('HSW 六角蜂巢')
    expect(hsw?.selectionDescription).toContain('平頂六角')
    expect(hsw?.parameterSchema).toEqual([
      expect.objectContaining({
        key: 'rows',
        control: 'range',
        min: 1,
        max: 20,
        step: 1,
      }),
      expect.objectContaining({
        key: 'columns',
        control: 'range',
        min: 1,
        max: 20,
        step: 1,
      }),
    ])
    expect(hsw?.exportFileName({ rows: 2, columns: 3 })).toBe(
      'hsw-cell-3x2.step',
    )
    expect(hsw?.stlFileName({ rows: 2, columns: 3 })).toBe('hsw-cell-3x2.stl')
    expect(hsw?.validateParameters({ rows: 2, columns: 3 })).toEqual({
      valid: true,
      value: { modelId: 'hsw-cell', parameters: { rows: 2, columns: 3 } },
    })
    expect(hsw?.boundsForParameters({ rows: 2, columns: 2 })).toEqual({
      min: [-23.84456659364325, -29.500000622529047, 0],
      max: [23.84456659364325, 29.500000622529047, 8],
    })
  })

  it('maps registered models to dedicated CAD routes and rejects unknown paths', () => {
    expect(cadPathForModel('box')).toBe('/cad/box')
    expect(cadPathForModel('modular-grid-base')).toBe('/cad/modular-grid-base')
    expect(cadPathForModel('hsw-cell')).toBe('/cad/hsw-cell')
    expect(modelIdForCadPath('/cad/box')).toBe('box')
    expect(modelIdForCadPath('/cad/modular-grid-base/')).toBe(
      'modular-grid-base',
    )
    expect(modelIdForCadPath('/cad/hsw-cell/')).toBe('hsw-cell')
    expect(modelIdForCadPath('/cad/unknown')).toBeUndefined()
    expect(modelIdForCadPath('/docs/box')).toBeUndefined()
  })
})

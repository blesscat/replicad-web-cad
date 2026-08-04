import { describe, expect, it } from 'vitest'
import {
  getModelDefinition,
  modelDefinitions,
} from '../../src/features/cad/model-catalog'

describe('CAD component catalog', () => {
  it('exposes independent box and modular-grid-base definitions', () => {
    expect(modelDefinitions.map((definition) => definition.id)).toEqual([
      'box',
      'modular-grid-base',
    ])

    const grid = getModelDefinition('modular-grid-base')
    expect(grid?.displayName).toBe('模組化網格底板')
    expect(grid?.parameterSchema.map((field) => field.key)).toEqual([
      'rows',
      'columns',
    ])
    expect(grid?.exportFileName({ rows: 2, columns: 3 })).toBe(
      'modular-grid-base-3x2.step',
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
  })
})

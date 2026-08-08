import { describe, expect, it } from 'vitest'
import {
  cadPathForModel,
  getModelDefinition,
  modelIdForCadPath,
  modelDefinitions,
} from '../../src/features/cad/model-catalog'
import {
  OPENGRID_CONFIGURATION,
  type OpenGridParameters,
} from '../../src/cad-contract/units'

function opengridParameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  }
}

describe('CAD component catalog', () => {
  it('exposes independent model definitions including box-normal and OpenGrid', () => {
    expect(modelDefinitions.map((definition) => definition.id)).toEqual([
      'box',
      'box-normal',
      'modular-grid-base',
      'hsw-cell',
      'hexagonal-column',
      'opengrid',
    ])

    const boxNormal = getModelDefinition('box-normal')
    expect(boxNormal?.displayName).toBe('標準開口盒')
    expect(boxNormal?.parameterSchema.map((field) => field.key)).toEqual([
      'x',
      'y',
      'height',
    ])
    expect(boxNormal?.parameterSchema.map((field) => field.max)).toEqual([
      40, 35, 500,
    ])
    expect(boxNormal?.defaultParameters).toEqual({
      x: 2,
      y: 2,
      height: 10,
      cornerPosts: true,
    })
    expect(
      boxNormal?.exportFileName({ x: 2, y: 2, height: 10, cornerPosts: true }),
    ).toBe('box-normal-2x2-h10-posts.step')
    expect(
      boxNormal?.stlFileName({ x: 2, y: 2, height: 10, cornerPosts: false }),
    ).toBe('box-normal-2x2-h10-plain.stl')
    const bounds = boxNormal?.boundsForParameters({
      x: 2,
      y: 2,
      height: 10,
      cornerPosts: true,
    })
    expect(bounds?.min[0]).toBeCloseTo(-10.144, 10)
    expect(bounds?.min[1]).toBeCloseTo(-11.725, 10)
    expect(bounds?.min[2]).toBe(0)
    expect(bounds?.max[0]).toBeCloseTo(10.144, 10)
    expect(bounds?.max[1]).toBeCloseTo(11.725, 10)
    expect(bounds?.max[2]).toBe(17)

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

    const hexagonalColumn = getModelDefinition('hexagonal-column')
    expect(hexagonalColumn?.displayName).toBe('可調六角柱')
    expect(hexagonalColumn?.parameterSchema).toEqual([
      expect.objectContaining({
        key: 'height',
        control: 'range-text',
        defaultValue: 8,
        min: 1,
        max: 999,
        sliderMin: 1,
        sliderMax: 200,
        step: 1,
      }),
      expect.objectContaining({
        key: 'count',
        control: 'range',
        defaultValue: 1,
        min: 1,
        max: 20,
        step: 1,
      }),
      expect.objectContaining({
        key: 'gap',
        control: 'range-text',
        defaultValue: 1,
        min: 1,
        max: 99,
        sliderMin: 1,
        sliderMax: 10,
        step: 1,
      }),
    ])
    expect(hexagonalColumn?.defaultParameters).toEqual({
      height: 8,
      count: 1,
      gap: 1,
      orientation: 'lying',
    })
    expect(
      hexagonalColumn?.exportFileName({
        height: 50,
        count: 3,
        gap: 1,
        orientation: 'lying',
      }),
    ).toBe('hexagonal-column-50x3-g1-lying.step')
    expect(
      hexagonalColumn?.stlFileName({
        height: 50,
        count: 3,
        gap: 1,
        orientation: 'lying',
      }),
    ).toBe('hexagonal-column-50x3-g1-lying.stl')
    expect(
      hexagonalColumn?.validateParameters({
        height: 50,
        count: 3,
        gap: 1,
        orientation: 'lying',
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'hexagonal-column',
        parameters: {
          height: 50,
          count: 3,
          gap: 1,
          orientation: 'lying',
        },
      },
    })
  })

  it('maps registered models to dedicated CAD routes and rejects unknown paths', () => {
    expect(cadPathForModel('box')).toBe('/cad/box')
    expect(cadPathForModel('box-normal')).toBe('/cad/box-normal')
    expect(cadPathForModel('modular-grid-base')).toBe('/cad/modular-grid-base')
    expect(cadPathForModel('hsw-cell')).toBe('/cad/hsw-cell')
    expect(cadPathForModel('hexagonal-column')).toBe('/cad/hexagonal-column')
    expect(modelIdForCadPath('/cad/box')).toBe('box')
    expect(modelIdForCadPath('/cad/box-normal/')).toBe('box-normal')
    expect(modelIdForCadPath('/cad/modular-grid-base/')).toBe(
      'modular-grid-base',
    )
    expect(modelIdForCadPath('/cad/hsw-cell/')).toBe('hsw-cell')
    expect(modelIdForCadPath('/cad/hexagonal-column/')).toBe('hexagonal-column')
    expect(cadPathForModel('opengrid')).toBe('/cad/opengrid')
    expect(modelIdForCadPath('/cad/opengrid/')).toBe('opengrid')
    expect(modelIdForCadPath('/cad/unknown')).toBeUndefined()
    expect(modelIdForCadPath('/docs/box')).toBeUndefined()
  })

  it('keeps OpenGrid parameters isolated from other model definitions', () => {
    const opengrid = getModelDefinition('opengrid')
    expect(opengrid?.displayName).toContain('OpenGrid')
    expect(opengrid?.defaultParameters).toEqual(opengridParameters())
    const parameters = opengridParameters({
      variant: 'Lite' as const,
      rows: 2,
      columns: 3,
      screwKind: 'custom' as const,
      screwMode: 'custom' as const,
      customScrewPositions: [{ row: 0, column: 1 }],
      connectorHoles: 'enabled' as const,
    })
    expect(opengrid?.validateParameters(parameters)).toEqual({
      valid: true,
      value: { modelId: 'opengrid', parameters },
    })
    expect(opengrid?.boundsForParameters(parameters)).toEqual({
      min: [-42, -28, 0],
      max: [42, 28, 4],
    })
    expect(opengrid?.exportFileName(parameters)).toMatch(
      /^opengrid-lite-3x2-custom-custom-corners-enabled-[0-9a-f]{8}\.step$/,
    )
    expect(opengrid?.stlFileName(parameters)).toMatch(
      /^opengrid-lite-3x2-custom-custom-corners-enabled-[0-9a-f]{8}\.stl$/,
    )
    expect(
      getModelDefinition('modular-grid-base')?.validateParameters(parameters),
    ).toEqual({ valid: false, issues: expect.any(Array) })
    expect(getModelDefinition('box')?.validateParameters(parameters)).toEqual({
      valid: false,
      issues: expect.any(Array),
    })
  })
})

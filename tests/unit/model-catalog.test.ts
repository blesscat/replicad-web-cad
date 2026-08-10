import { describe, expect, it } from 'vitest'
import {
  cadPathForModel,
  groupModelDefinitions,
  getModelDefinition,
  modelIdForCadPath,
  modelDefinitions,
} from '../../src/features/cad/model-catalog'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
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
  it('orders visible model families and omits other models from chooser groups', () => {
    const groups = groupModelDefinitions()

    expect(groups.map((group) => group.key)).toEqual(['opengrid', 'hsw'])
    expect(groups.map((group) => group.label)).toEqual([
      'OpenGrid 系列',
      'HSW 系列',
    ])

    expect(groups[0]?.definitions.map((definition) => definition.id)).toEqual([
      'opengrid',
      'opengrid-pillar',
      'opengrid-divider',
      'opengrid-stackable-box',
      'opengrid-stackable-cylinder',
      'opengrid-snap',
      'opengrid-snap-remover',
    ])
    expect(groups[1]?.definitions.map((definition) => definition.id)).toEqual([
      'hsw-cell',
    ])

    const groupedIds = groups.flatMap((group) =>
      group.definitions.map((definition) => definition.id),
    )
    expect(groupedIds).not.toEqual(
      expect.arrayContaining([
        'box',
        'box-normal',
        'modular-grid-base',
        'hexagonal-column',
      ]),
    )
  })

  it('exposes independent model definitions including box-normal and OpenGrid', () => {
    expect(modelDefinitions.map((definition) => definition.id)).toEqual([
      'box',
      'box-normal',
      'modular-grid-base',
      'hsw-cell',
      'hexagonal-column',
      'opengrid',
      'opengrid-pillar',
      'opengrid-divider',
      'opengrid-stackable-box',
      'opengrid-stackable-cylinder',
      'opengrid-snap',
      'opengrid-snap-remover',
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
    expect(cadPathForModel('opengrid-stackable-box')).toBe(
      '/cad/opengrid-stackable-box',
    )
    expect(modelIdForCadPath('/cad/opengrid-stackable-box/')).toBe(
      'opengrid-stackable-box',
    )
    expect(cadPathForModel('opengrid-snap')).toBe('/cad/opengrid-snap')
    expect(modelIdForCadPath('/cad/opengrid-snap/')).toBe('opengrid-snap')
    expect(cadPathForModel('opengrid-snap-remover')).toBe(
      '/cad/opengrid-snap-remover',
    )
    expect(modelIdForCadPath('/cad/opengrid-snap-remover/')).toBe(
      'opengrid-snap-remover',
    )
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
      /^opengrid-lite-3x2-xnone-ynone-custom-custom-corners-enabled-[0-9a-f]{8}\.step$/,
    )
    expect(opengrid?.stlFileName(parameters)).toMatch(
      /^opengrid-lite-3x2-xnone-ynone-custom-custom-corners-enabled-[0-9a-f]{8}\.stl$/,
    )
    expect(
      getModelDefinition('modular-grid-base')?.validateParameters(parameters),
    ).toEqual({ valid: false, issues: expect.any(Array) })
    expect(getModelDefinition('box')?.validateParameters(parameters)).toEqual({
      valid: false,
      issues: expect.any(Array),
    })
  })

  it('registers Snap profiles and optional body features', () => {
    const snap = getModelDefinition('opengrid-snap')
    expect(snap?.displayName).toBe('OpenGrid Snap')
    expect(snap?.selectionDescription).toContain('Full')
    expect(snap?.selectionDescription).toContain('Lite')
    expect(snap?.selectionDescription).toContain('Directional')
    expect(snap?.parameterSchema.map((field) => field.key)).toEqual(['offset'])
    expect(snap?.parameterSchema[0]).toMatchObject({
      control: 'range',
      min: 0,
      max: 1,
      step: 0.05,
    })
    expect(snap?.defaultParameters).toEqual({
      variant: 'Full',
      profile: 'Standard',
      offset: 0,
      footprint: 'full',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
    })
    expect(
      snap?.boundsForParameters({
        variant: 'Lite',
        profile: 'Standard',
        offset: 0.2,
        footprint: 'full',
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
      }),
    ).toEqual({
      min: [-12.9, -12.9, 0],
      max: [12.9, 12.9, 3.4],
    })
    expect(
      snap?.exportFileName({
        variant: 'Full',
        profile: 'Standard',
        offset: 0.2,
        footprint: 'full',
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
      }),
    ).toBe('opengrid-snap-standard-full-offset0.2-full-corners0-center0.step')
    expect(
      snap?.stlFileName({
        variant: 'Lite',
        profile: 'Standard',
        offset: 0.15,
        footprint: 'full',
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
      }),
    ).toBe('opengrid-snap-standard-lite-offset0.15-full-corners0-center0.stl')
    expect(
      snap?.validateParameters({
        variant: 'Full',
        profile: 'Directional',
        offset: 0.2,
        footprint: 'full',
        fourCornerLocatingHoles: true,
        centerRemoverHole: true,
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-snap',
        parameters: {
          variant: 'Full',
          profile: 'Directional',
          offset: 0.2,
          footprint: 'full',
          fourCornerLocatingHoles: true,
          centerRemoverHole: true,
        },
      },
    })
  })

  it('exposes the independent OpenGrid stackable-box definition', () => {
    const definition = getModelDefinition('opengrid-stackable-box')

    expect(definition).toMatchObject({
      id: 'opengrid-stackable-box',
      buildKey: 'opengrid-stackable-box',
      family: 'opengrid',
      displayName: 'OpenGrid 堆疊盒',
    })
    expect(definition?.parameterSchema).toEqual([
      expect.objectContaining({ key: 'x', min: 0.5, max: 17.5, step: 0.5 }),
      expect.objectContaining({ key: 'y', min: 0.5, max: 17.5, step: 0.5 }),
      expect.objectContaining({
        key: 'height',
        min: 10,
        max: 500,
        step: 1,
        control: 'range-text',
      }),
    ])
    expect(definition?.defaultParameters).toEqual({
      x: 2,
      y: 2,
      height: 10,
      cornerBottomHoles: true,
      fullBottomHoleGrid: false,
      basePlateMode: false,
    })
    expect(
      definition?.validateParameters({
        x: 0.5,
        y: 1,
        height: 20,
        cornerBottomHoles: true,
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-stackable-box',
        parameters: {
          x: 0.5,
          y: 1,
          height: 20,
          cornerBottomHoles: true,
          fullBottomHoleGrid: false,
          basePlateMode: false,
        },
      },
    })
    expect(
      definition?.exportFileName({
        x: 1.5,
        y: 2,
        height: 30,
        cornerBottomHoles: true,
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    ).toBe('opengrid-stackable-box-1.5x2-h30.step')
    expect(
      definition?.stlFileName({
        x: 1.5,
        y: 2,
        height: 30,
        cornerBottomHoles: true,
        fullBottomHoleGrid: false,
        basePlateMode: false,
      }),
    ).toBe('opengrid-stackable-box-1.5x2-h30.stl')
  })

  it('exposes the independent OpenGrid divider definition and route', () => {
    const definition = getModelDefinition('opengrid-divider')

    expect(definition).toMatchObject({
      id: 'opengrid-divider',
      buildKey: 'opengrid-divider',
      family: 'opengrid',
      displayName: 'OpenGrid 分隔塊',
    })
    expect(definition?.parameterSchema.map((field) => field.key)).toEqual([
      'left',
      'right',
      'up',
      'down',
      'height',
      'wallThickness',
    ])
    expect(definition?.parameterSchema.at(-1)).toMatchObject({
      key: 'wallThickness',
      control: 'range-text',
      min: OPENGRID_DIVIDER_CONFIGURATION.minWallThickness,
      max: OPENGRID_DIVIDER_CONFIGURATION.maxWallThickness,
      step: 1,
      defaultValue:
        OPENGRID_DIVIDER_CONFIGURATION.defaultParameters.wallThickness,
    })
    expect(definition?.selectionDescription).toBe('自製 OpenGrid 分隔塊。')
    expect(definition?.defaultParameters).toEqual({
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    })
    expect(definition?.exportFileName(definition.defaultParameters)).toBe(
      'opengrid-divider-l1-r1-u0-d0-t2-h20.step',
    )
    expect(definition?.stlFileName(definition.defaultParameters)).toBe(
      'opengrid-divider-l1-r1-u0-d0-t2-h20.stl',
    )
    expect(cadPathForModel('opengrid-divider')).toBe('/cad/opengrid-divider')
    expect(modelIdForCadPath('/cad/opengrid-divider/')).toBe('opengrid-divider')
  })

  it('exposes the independent OpenGrid pillar definition and route', () => {
    const definition = getModelDefinition('opengrid-pillar')

    expect(definition).toMatchObject({
      id: 'opengrid-pillar',
      buildKey: 'opengrid-pillar',
      family: 'opengrid',
      displayName: 'OpenGrid 圓柱支柱',
    })
    expect(definition?.parameterSchema).toEqual([
      expect.objectContaining({
        key: 'length',
        unit: 'mm',
        control: 'range-text',
        defaultValue: 5,
        min: 3,
        max: 500,
        step: 1,
      }),
    ])
    expect(definition?.defaultParameters).toEqual({
      length: 5,
      baseConnection: false,
    })
    expect(
      definition?.validateParameters({ length: 12, baseConnection: true }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-pillar',
        parameters: { length: 12, baseConnection: true },
      },
    })
    expect(
      definition?.boundsForParameters({ length: 12, baseConnection: true }),
    ).toEqual({
      min: [-3.5, -3.5, 0],
      max: [3.5, 3.5, 12],
    })
    expect(
      definition?.exportFileName({ length: 12, baseConnection: false }),
    ).toBe('pillar-12-plain.step')
    expect(definition?.stlFileName({ length: 12, baseConnection: true })).toBe(
      'pillar-12-base.stl',
    )
    expect(cadPathForModel('opengrid-pillar')).toBe('/cad/opengrid-pillar')
    expect(modelIdForCadPath('/cad/opengrid-pillar/')).toBe('opengrid-pillar')
  })

  it('exposes the independent OpenGrid stackable-cylinder definition', () => {
    const definition = getModelDefinition('opengrid-stackable-cylinder')

    expect(definition).toMatchObject({
      id: 'opengrid-stackable-cylinder',
      buildKey: 'opengrid-stackable-cylinder',
      family: 'opengrid',
      displayName: 'OpenGrid 可堆疊圓柱',
    })
    expect(definition?.parameterSchema).toHaveLength(14)
    expect(definition?.parameterSchema).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'diameter',
          min: 20,
          max: 300,
          step: 1,
          control: 'range-text',
        }),
        expect.objectContaining({
          key: 'height',
          min: 10,
          max: 500,
          step: 1,
          control: 'range-text',
        }),
        expect.objectContaining({
          key: 'openingPlusXAngle',
          unit: '°',
          min: 1,
          max: 90,
          step: 1,
          sliderDirection: 'rtl',
        }),
      ]),
    )
    expect(definition?.defaultParameters).toEqual(
      OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
    )
    expect(definition?.selectionDescription).toContain('最多四個孔')
    expect(definition?.selectionDescription).toContain('底部孔洞可一次全部開關')
    expect(
      definition?.validateParameters({ diameter: 56, height: 30 }),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-stackable-cylinder',
        parameters: {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        },
      },
    })
    expect(
      definition?.exportFileName(
        OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      ),
    ).toBe('opengrid-stackable-cylinder-d56-h30.step')
    expect(
      definition?.stlFileName({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        thinBottomMode: true,
        bottomHolesEnabled: false,
      }),
    ).toBe('opengrid-stackable-cylinder-d56-h30-thin-no-holes.stl')
    expect(
      definition?.exportFileName({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        bottomPlateMode: true,
      }),
    ).toBe('opengrid-stackable-cylinder-d56-h30-bottom-plate.step')
  })
})

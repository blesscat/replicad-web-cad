import { describe, expect, it } from 'vitest'
import {
  cadPathForModel,
  getModelDefinition,
  groupModelDefinitions,
  modelDefinitions,
  modelIdForCadPath,
} from '../../src/features/cad/model-catalog'

describe('OpenGrid Snap Remover catalog entry', () => {
  it('adds an OpenGrid preview component without replacing existing entries', () => {
    const definition = getModelDefinition('opengrid-snap-remover')
    expect(definition).toBeDefined()
    expect(definition).toMatchObject({
      id: 'opengrid-snap-remover',
      buildKey: 'opengrid-snap-remover',
      family: 'opengrid',
      displayName: 'models.model.opengrid-snap-remover.name',
      parameterSchema: [],
      defaultParameters: {},
      previewMetadata: {
        centeredOnXY: false,
        baseAtZ: -5.005506125135993,
      },
    })
    expect(definition?.exportFileName({})).toBe('snap remover.step')
    expect(definition?.stlFileName({})).toBe('snap remover.stl')
    expect(definition?.validateParameters({})).toEqual({
      valid: true,
      value: { modelId: 'opengrid-snap-remover', parameters: {} },
    })

    const ids = modelDefinitions.map((entry) => entry.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'box',
        'modular-grid-base',
        'opengrid',
        'opengrid-snap',
        'opengrid-snap-remover',
      ]),
    )
    expect(cadPathForModel('opengrid-snap-remover')).toBe(
      '/cad/opengrid-snap-remover',
    )
    expect(modelIdForCadPath('/cad/opengrid-snap-remover/')).toBe(
      'opengrid-snap-remover',
    )

    const openGridGroup = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    expect(openGridGroup?.definitions.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['opengrid-snap-remover']),
    )
  })
})

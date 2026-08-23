import { describe, expect, it } from 'vitest'
import {
  cadPathForModel,
  getModelDefinition,
  groupModelDefinitions,
  modelIdForCadPath,
} from '../../src/features/cad/model-catalog'
import { systemContextForModel } from '../../src/features/cad/system-entry-context'
import { translate } from '../../src/i18n'

describe('OpenGrid OpenConnect shelf catalog identity', () => {
  it('registers one stable identity through catalog and routing', () => {
    const definition = getModelDefinition('opengrid-openconnect-shelf')

    expect(definition).toMatchObject({
      id: 'opengrid-openconnect-shelf',
      buildKey: 'opengrid-openconnect-shelf',
      family: 'opengrid',
      supportedSystemContexts: ['wall'],
    })
    expect(definition?.parameterSchema.map((field) => field.key)).toEqual([
      'columns',
      'rows',
      'angle',
    ])
    expect(cadPathForModel('opengrid-openconnect-shelf', 'wall')).toBe(
      '/cad/opengrid-openconnect-shelf?system=wall',
    )
    expect(modelIdForCadPath('/cad/opengrid-openconnect-shelf/')).toBe(
      'opengrid-openconnect-shelf',
    )
    expect(systemContextForModel('opengrid-openconnect-shelf', 'wall')).toBe(
      'wall',
    )
  })

  it('appears only in the Wall subgroup without changing existing identities', () => {
    const openGridGroup = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    const deskIds =
      openGridGroup?.subgroups
        ?.find((group) => group.key === 'desk')
        ?.definitions.map((definition) => definition.id) ?? []
    const wallIds =
      openGridGroup?.subgroups
        ?.find((group) => group.key === 'wall')
        ?.definitions.map((definition) => definition.id) ?? []

    expect(deskIds).not.toContain('opengrid-openconnect-shelf')
    expect(wallIds).toContain('opengrid-openconnect-shelf')
    expect(wallIds).toEqual(
      expect.arrayContaining(['opengrid', 'opengrid-snap']),
    )
  })

  it('uses an OpenGrid-prefixed display name in every supported locale', () => {
    const definition = getModelDefinition('opengrid-openconnect-shelf')
    expect(definition).toBeDefined()

    for (const locale of ['zh-Hant', 'en'] as const) {
      expect(translate(locale, definition!.displayName)).toMatch(/^OpenGrid /)
      expect(translate(locale, definition!.selectionDescription)).not.toContain(
        '⟦',
      )
      expect(translate(locale, definition!.previewImage!.alt)).not.toContain(
        '⟦',
      )
    }
  })
})

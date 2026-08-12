import { describe, expect, it } from 'vitest'
import {
  cadPathForModel,
  groupModelDefinitions,
} from '../../src/features/cad/model-catalog'
import {
  getSystemPreset,
  parseSystemContext,
  systemContextForModel,
} from '../../src/features/cad/system-entry-context'

describe('OpenGrid system entry context', () => {
  it('accepts only the supported system query values', () => {
    expect(parseSystemContext('?system=desk')).toBe('desk')
    expect(parseSystemContext('?system=wall')).toBe('wall')
    expect(parseSystemContext('?system=desktop')).toBeUndefined()
    expect(parseSystemContext('?system=unknown')).toBeUndefined()
    expect(parseSystemContext('')).toBeUndefined()
    expect(systemContextForModel('hsw-cell', 'desk')).toBeUndefined()
    expect(systemContextForModel('opengrid-pillar', 'wall')).toBeUndefined()
    expect(systemContextForModel('opengrid-pillar', 'desk')).toBe('desk')
  })

  it('resolves the documented Desk and Wall Snap presets', () => {
    expect(getSystemPreset('opengrid-snap', 'desk')).toEqual({
      variant: 'Lite',
      profile: 'Standard',
      offset: 0.3,
      footprint: 'full',
      fourCornerLocatingHoles: true,
      centerRemoverHole: true,
    })
    expect(getSystemPreset('opengrid-snap', 'wall')).toEqual({
      variant: 'Full',
      profile: 'Standard',
      offset: 0,
      footprint: 'full',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
    })
    expect(getSystemPreset('opengrid-pillar', 'desk')).toEqual({
      mode: 'thin-shell',
    })
  })

  it('groups context entries and gives them separate preview identities', () => {
    const openGrid = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    expect(openGrid?.subgroups?.map((group) => group.key)).toEqual([
      'desk',
      'wall',
    ])
    expect(
      openGrid?.subgroups
        ?.find((group) => group.key === 'desk')
        ?.definitions.map((entry) => entry.id),
    ).toEqual([
      'opengrid',
      'opengrid-snap',
      'opengrid-pillar',
      'opengrid-divider',
      'opengrid-stackable-box',
      'opengrid-stackable-cylinder',
      'opengrid-snap-remover',
    ])
    expect(
      openGrid?.subgroups
        ?.find((group) => group.key === 'wall')
        ?.definitions.map((entry) => entry.id),
    ).toEqual(['opengrid', 'opengrid-snap'])

    const deskSnap = openGrid?.subgroups?.[0]?.definitions[1]
    const wallSnap = openGrid?.subgroups?.[1]?.definitions[1]
    expect(deskSnap?.systemContext).toBe('desk')
    expect(wallSnap?.systemContext).toBe('wall')
    expect(deskSnap?.previewImage?.src).toBe(
      '/model-previews/opengrid-snap-desk.png',
    )
    expect(wallSnap?.previewImage?.src).toBe(
      '/model-previews/opengrid-snap-wall.png',
    )
    expect(cadPathForModel('opengrid-snap', 'wall')).toBe(
      '/cad/opengrid-snap?system=wall',
    )
  })
})

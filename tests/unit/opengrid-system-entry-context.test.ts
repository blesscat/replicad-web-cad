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
    expect(parseSystemContext('?system=desktop')).toBe('desktop')
    expect(parseSystemContext('?system=wall')).toBe('wall')
    expect(parseSystemContext('?system=unknown')).toBeUndefined()
    expect(parseSystemContext('')).toBeUndefined()
    expect(systemContextForModel('hsw-cell', 'desktop')).toBeUndefined()
    expect(systemContextForModel('opengrid-pillar', 'wall')).toBeUndefined()
    expect(systemContextForModel('opengrid-pillar', 'desktop')).toBe('desktop')
  })

  it('resolves the documented Desktop and Wall Snap presets', () => {
    expect(getSystemPreset('opengrid-snap', 'desktop')).toEqual({
      variant: 'Lite',
      profile: 'Standard',
      offset: 0,
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
  })

  it('groups context entries and gives them separate preview identities', () => {
    const openGrid = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    expect(openGrid?.subgroups?.map((group) => group.key)).toEqual([
      'desktop',
      'wall',
    ])
    expect(
      openGrid?.subgroups
        ?.find((group) => group.key === 'desktop')
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

    const desktopSnap = openGrid?.subgroups?.[0]?.definitions[1]
    const wallSnap = openGrid?.subgroups?.[1]?.definitions[1]
    expect(desktopSnap?.systemContext).toBe('desktop')
    expect(wallSnap?.systemContext).toBe('wall')
    expect(desktopSnap?.previewImage?.src).toBe(
      '/model-previews/opengrid-snap-desktop.png',
    )
    expect(wallSnap?.previewImage?.src).toBe(
      '/model-previews/opengrid-snap-wall.png',
    )
    expect(cadPathForModel('opengrid-snap', 'wall')).toBe(
      '/cad/opengrid-snap?system=wall',
    )
  })
})

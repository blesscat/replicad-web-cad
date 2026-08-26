import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridSnap,
  boundsForOpenGridWallCover,
  isOpenGridWallCoverParameters,
  openGridWallCoverFileName,
  openGridWallCoverStlFileName,
  openGridWallCoverThreeMfFileName,
  OPENGRID_SNAP_CONFIGURATION,
  normalizeOpenGridSnapParameters,
  validateOpenGridWallCoverParameters,
} from '../../src/cad-contract/units'
import {
  cadPathForModel,
  getModelDefinition,
  groupModelDefinitions,
} from '../../src/features/cad/model-catalog'
import { systemContextForModel } from '../../src/features/cad/system-entry-context'

describe('OpenGrid Wall Cover contract', () => {
  it('accepts only the fixed empty parameter object', () => {
    expect(validateOpenGridWallCoverParameters({})).toEqual({
      valid: true,
      value: {},
    })
    expect(isOpenGridWallCoverParameters({})).toBe(true)
    expect(
      validateOpenGridWallCoverParameters({ variant: 'Lite' }),
    ).toMatchObject({
      valid: false,
    })
  })

  it('uses the fixed Snap Lite Standard full-footprint cover bounds', () => {
    expect(boundsForOpenGridWallCover({})).toEqual(
      boundsForOpenGridSnap({
        ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
        variant: 'Lite',
        profile: 'Standard',
        offset: 0,
        footprint: 'full',
      }),
    )
  })

  it('exposes stable names and a 3MF filename for the fixed model', () => {
    const definition = getModelDefinition('opengrid-wall-cover')

    expect(definition).toMatchObject({
      id: 'opengrid-wall-cover',
      buildKey: 'opengrid-wall-cover',
      displayName: 'models.model.opengrid-wall-cover.name',
      parameterPresentation: { kind: 'fixed' },
      parameterSchema: [],
    })
    expect(definition?.exportFileName({})).toBe('opengrid-wall-cover.step')
    expect(definition?.stlFileName({})).toBe('opengrid-wall-cover.stl')
    expect(definition?.threeMfFileName?.({})).toBe('opengrid-wall-cover.3mf')
    expect(openGridWallCoverFileName({})).toBe('opengrid-wall-cover.step')
    expect(openGridWallCoverStlFileName({})).toBe('opengrid-wall-cover.stl')
    expect(openGridWallCoverThreeMfFileName({})).toBe('opengrid-wall-cover.3mf')
    expect(getModelDefinition('opengrid-snap')?.threeMfFileName).toBeUndefined()
  })

  it('normalizes legacy Snap text to single color', () => {
    expect(
      normalizeOpenGridSnapParameters({
        ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
        topText: 'SNAP',
      }),
    ).toMatchObject({ topText: 'none' })
  })

  it('exposes the model only in the Wall subgroup', () => {
    const openGridGroup = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    const desk = openGridGroup?.subgroups?.find(
      (subgroup) => subgroup.key === 'desk',
    )
    const wall = openGridGroup?.subgroups?.find(
      (subgroup) => subgroup.key === 'wall',
    )

    expect(
      desk?.definitions.some((item) => item.id === 'opengrid-wall-cover'),
    ).toBe(false)
    expect(wall?.definitions.map((item) => item.id)).toContain(
      'opengrid-wall-cover',
    )
    expect(systemContextForModel('opengrid-wall-cover', 'wall')).toBe('wall')
    expect(systemContextForModel('opengrid-wall-cover', 'desk')).toBeUndefined()
    expect(cadPathForModel('opengrid-wall-cover', 'wall')).toBe(
      '/cad/opengrid-wall-cover?system=wall',
    )
  })
})

import { describe, expect, it } from 'vitest'
import {
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  type OpenGridOpenConnectShelfParameters,
} from '../../src/cad-contract/units'
import {
  cadPathForModel,
  groupModelDefinitions,
} from '../../src/features/cad/model-catalog'
import { createComponentParameterStore } from '../../src/features/cad/parameters'
import { initialCadState } from '../../src/features/cad/state'
import {
  parseRawParameters,
  rawFromParameters,
} from '../../src/components/cad/workspace/validation'

type MemoryStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function createMemoryStorage(): MemoryStorage {
  let value: string | null = null
  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      value = nextValue
    },
  }
}

function parameters(
  overrides: Partial<OpenGridOpenConnectShelfParameters> = {},
): OpenGridOpenConnectShelfParameters {
  return { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS, ...overrides }
}

describe('OpenGrid OpenConnect shelf workspace integration', () => {
  it('exposes one Wall entry and no Desk entry', () => {
    const openGrid = groupModelDefinitions().find(
      (group) => group.key === 'opengrid',
    )
    const desk = openGrid?.subgroups?.find(
      (subgroup) => subgroup.key === 'desk',
    )
    const wall = openGrid?.subgroups?.find(
      (subgroup) => subgroup.key === 'wall',
    )

    expect(
      desk?.definitions.some(
        (definition) => definition.id === 'opengrid-openconnect-shelf',
      ),
    ).toBe(false)
    expect(
      wall?.definitions.filter(
        (definition) => definition.id === 'opengrid-openconnect-shelf',
      ),
    ).toHaveLength(1)
    expect(cadPathForModel('opengrid-openconnect-shelf', 'wall')).toBe(
      '/cad/opengrid-openconnect-shelf?system=wall',
    )
  })

  it('round-trips the three exact typed controls', () => {
    const value = parameters({ columns: 4, rows: 2, angle: 20 })
    const raw = rawFromParameters(value)

    expect(raw).toEqual({ columns: '4', rows: '2', angle: '20' })
    expect(parseRawParameters(raw, 'opengrid-openconnect-shelf')).toEqual({
      valid: true,
      value,
    })
  })

  it('rejects an angle above the limit derived from the current depth', () => {
    expect(
      parseRawParameters(
        { columns: '3', rows: '3', angle: '15' },
        'opengrid-openconnect-shelf',
      ),
    ).toMatchObject({ valid: false, field: 'angle' })

    expect(
      parseRawParameters(
        { columns: '3', rows: '3', angle: '14' },
        'opengrid-openconnect-shelf',
      ),
    ).toMatchObject({ valid: true })
  })

  it('persists valid Wall values independently and restores the defaults', () => {
    const storage = createMemoryStorage()
    const value = parameters({ columns: 5, rows: 2, angle: 18 })
    const store = createComponentParameterStore({
      storage,
      systemContext: 'wall',
    })

    expect(initialCadState('opengrid-openconnect-shelf').input).toEqual(
      OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
    )
    expect(store.set('opengrid-openconnect-shelf', value)).toBe(true)
    expect(store.get('opengrid-openconnect-shelf')).toEqual(value)
    store.dispose()

    const restored = createComponentParameterStore({
      storage,
      systemContext: 'wall',
    })
    expect(restored.get('opengrid-openconnect-shelf')).toEqual(value)
    restored.dispose()
  })
})

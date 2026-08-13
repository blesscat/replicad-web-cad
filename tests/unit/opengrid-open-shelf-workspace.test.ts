import { describe, expect, it } from 'vitest'
import {
  OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
  type OpenGridOpenShelfParameters,
} from '../../src/cad-contract/units'
import {
  cadPathForModel,
  groupModelDefinitions,
  modelSelectionLabelFor,
} from '../../src/features/cad/model-catalog'
import { createComponentParameterStore } from '../../src/features/cad/parameters'
import { initialCadState } from '../../src/features/cad/state'
import { systemContextForModel } from '../../src/features/cad/system-entry-context'
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
  overrides: Partial<OpenGridOpenShelfParameters> = {},
): OpenGridOpenShelfParameters {
  return { ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS, ...overrides }
}

describe('OpenGrid open-shelf workspace integration', () => {
  it('keeps the new route, Desk entry, and Wall exclusion aligned', () => {
    const groups = groupModelDefinitions()
    const openGrid = groups.find((group) => group.key === 'opengrid')
    const desk = openGrid?.subgroups?.find(
      (subgroup) => subgroup.key === 'desk',
    )
    const wall = openGrid?.subgroups?.find(
      (subgroup) => subgroup.key === 'wall',
    )
    const deskDefinition = desk?.definitions.find(
      (definition) => definition.id === 'opengrid-open-shelf',
    )

    expect(deskDefinition).toBeDefined()
    expect(modelSelectionLabelFor(deskDefinition!)).toBe(
      'Open Shelf (斜開格櫃)',
    )
    expect(
      desk?.definitions.filter((entry) => entry.id === 'opengrid-open-shelf'),
    ).toHaveLength(1)
    expect(
      wall?.definitions.some((entry) => entry.id === 'opengrid-open-shelf'),
    ).toBe(false)
    expect(cadPathForModel('opengrid-open-shelf', 'desk')).toBe(
      '/cad/opengrid-open-shelf?system=desk',
    )
    expect(systemContextForModel('opengrid-open-shelf', 'desk')).toBe('desk')
    expect(systemContextForModel('opengrid-open-shelf', 'wall')).toBeUndefined()
  })

  it('round-trips the typed fields and honeycomb mode through raw workspace input', () => {
    const value = parameters({
      x: 3.5,
      y: 2.5,
      height: 60,
      cellX: 2,
      cellZ: 3,
      angle: 10,
      honeycombMode: true,
    })
    const raw = rawFromParameters(value)

    expect(raw).toEqual({
      x: '3.5',
      y: '2.5',
      height: '60',
      cellX: '2',
      cellZ: '3',
      angle: '10',
      honeycombMode: 'true',
    })
    expect(parseRawParameters(raw, 'opengrid-open-shelf')).toEqual({
      valid: true,
      value,
    })
  })

  it('reports a geometry error through the same invalid-input parser', () => {
    const result = parseRawParameters(
      { x: '4', y: '3', height: '10', cellX: '1', cellZ: '1', angle: '75' },
      'opengrid-open-shelf',
    )

    expect(result).toMatchObject({ valid: false, field: 'angle' })
  })

  it('uses independent Desk persistence and the new defaults', () => {
    const storage = createMemoryStorage()
    const value = parameters({ height: 80, angle: 5 })
    const store = createComponentParameterStore({
      storage,
      systemContext: 'desk',
    })

    expect(initialCadState('opengrid-open-shelf').input).toEqual(
      OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
    )
    expect(store.set('opengrid-open-shelf', value)).toBe(true)
    expect(store.get('opengrid-open-shelf')).toEqual(value)
    expect(store.get('opengrid-stackable-box')).not.toEqual(value)
    store.dispose()

    const restored = createComponentParameterStore({
      storage,
      systemContext: 'desk',
    })
    expect(restored.get('opengrid-open-shelf')).toEqual(value)
    restored.dispose()
  })
})

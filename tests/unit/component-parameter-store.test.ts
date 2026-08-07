import { describe, expect, it } from 'vitest'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  createComponentParameterStore,
} from '../../src/features/cad/parameters'
import {
  OPENGRID_CONFIGURATION,
  type OpenGridParameters,
} from '../../src/cad-contract/units'

type MemoryStorage = {
  data: Map<string, string>
  writes: string[]
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function createMemoryStorage(initial?: string): MemoryStorage {
  const data = new Map<string, string>()
  const writes: string[] = []
  if (initial !== undefined) data.set(COMPONENT_PARAMETER_STORAGE_KEY, initial)

  return {
    data,
    writes,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      writes.push(value)
      data.set(key, value)
    },
  }
}

function createThrowingStorage(): Pick<MemoryStorage, 'getItem' | 'setItem'> {
  return {
    getItem: () => {
      throw new Error('storage read failed')
    },
    setItem: () => {
      throw new Error('storage write failed')
    },
  }
}

function createPayload(values: Record<string, unknown>, version = 1): string {
  return JSON.stringify({ version, values })
}

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

describe('component parameter store', () => {
  it('uses each component definition default when no value is stored', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })

    expect(store.get('box')).toEqual({ width: 20, depth: 30, height: 40 })
    expect(store.get('modular-grid-base')).toEqual({ rows: 1, columns: 1 })
    expect(store.get('hsw-cell')).toEqual({ rows: 1, columns: 1 })
    expect(store.get('opengrid')).toEqual(opengridParameters())

    store.dispose()
  })

  it('restores valid typed values for every component', () => {
    const storage = createMemoryStorage(
      createPayload({
        box: { width: 25, depth: 30, height: 40 },
        'modular-grid-base': { rows: 2, columns: 3 },
        'hsw-cell': { rows: 4, columns: 2 },
        opengrid: opengridParameters({
          variant: 'Heavy',
          rows: 5,
          columns: 7,
          screwKind: 'custom',
          screwMode: 'custom',
          customScrewPositions: [{ row: 2, column: 4 }],
          connectorHoles: 'enabled',
        }),
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('box')).toEqual({ width: 25, depth: 30, height: 40 })
    expect(store.get('modular-grid-base')).toEqual({ rows: 2, columns: 3 })
    expect(store.get('hsw-cell')).toEqual({ rows: 4, columns: 2 })
    expect(store.get('opengrid')).toEqual(
      opengridParameters({
        variant: 'Heavy',
        rows: 5,
        columns: 7,
        screwKind: 'custom',
        screwMode: 'custom',
        customScrewPositions: [{ row: 2, column: 4 }],
        connectorHoles: 'enabled',
      }),
    )

    store.dispose()
  })

  it('isolates component entries and removes malformed or unknown values on write', () => {
    const storage = createMemoryStorage(
      createPayload({
        box: { width: 25, depth: 30, height: 40 },
        'modular-grid-base': { rows: 0, columns: 3 },
        'hsw-cell': { rows: 4, columns: 2 },
        opengrid: {
          variant: 'Full',
          rows: 2,
          columns: 2,
          screwKind: 'custom',
          screwMode: 'custom',
          customScrewPositions: [
            { row: 0, column: 0 },
            { row: 0, column: 0 },
          ],
          connectorHoles: 'none',
        },
        unknown: { rows: 9, columns: 9 },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('modular-grid-base')).toEqual({ rows: 1, columns: 1 })
    expect(store.get('hsw-cell')).toEqual({ rows: 4, columns: 2 })
    expect(store.get('opengrid')).toEqual(opengridParameters())

    expect(store.set('modular-grid-base', { rows: 2, columns: 3 })).toBe(true)

    expect(JSON.parse(storage.writes.at(-1) ?? '')).toEqual({
      version: 1,
      values: {
        box: { width: 25, depth: 30, height: 40 },
        'modular-grid-base': { rows: 2, columns: 3 },
        'hsw-cell': { rows: 4, columns: 2 },
      },
    })

    store.dispose()
  })

  it('falls back to defaults for malformed payloads and unsupported versions', () => {
    const malformed = createMemoryStorage('{"version":1,"values":null}')
    const malformedStore = createComponentParameterStore({ storage: malformed })
    expect(malformedStore.get('box')).toEqual({
      width: 20,
      depth: 30,
      height: 40,
    })
    malformedStore.dispose()

    const unsupported = createMemoryStorage(
      createPayload({ box: { width: 25, depth: 30, height: 40 } }, 2),
    )
    const unsupportedStore = createComponentParameterStore({
      storage: unsupported,
    })
    expect(unsupportedStore.get('box')).toEqual({
      width: 20,
      depth: 30,
      height: 40,
    })
    unsupportedStore.dispose()
  })

  it('keeps accepted values in memory when storage read or write fails', () => {
    const store = createComponentParameterStore({
      storage: createThrowingStorage(),
    })

    expect(store.get('box')).toEqual({ width: 20, depth: 30, height: 40 })
    expect(store.set('box', { width: 25, depth: 30, height: 40 })).toBe(true)
    expect(store.get('box')).toEqual({ width: 25, depth: 30, height: 40 })

    store.dispose()
  })

  it('deep-clones OpenGrid custom positions at read and write boundaries', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })
    const parameters = opengridParameters({
      variant: 'Lite',
      rows: 3,
      columns: 3,
      screwKind: 'custom',
      screwMode: 'custom',
      customScrewPositions: [{ row: 0, column: 0 }],
      connectorHoles: 'enabled',
    })
    expect(store.set('opengrid', parameters)).toBe(true)
    parameters.customScrewPositions[0].row = 2
    const firstRead = store.get('opengrid')
    expect(firstRead).toEqual({
      ...parameters,
      customScrewPositions: [{ row: 0, column: 0 }],
    })
    if ('customScrewPositions' in firstRead) {
      firstRead.customScrewPositions[0].column = 2
    }
    expect(store.get('opengrid')).toEqual({
      ...parameters,
      customScrewPositions: [{ row: 0, column: 0 }],
    })
    store.dispose()
  })

  it('stops persistence writes after disposal', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })

    store.dispose()
    expect(store.set('box', { width: 25, depth: 30, height: 40 })).toBe(true)
    expect(storage.writes).toHaveLength(0)
  })
})

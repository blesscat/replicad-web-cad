import { describe, expect, it } from 'vitest'
import {
  COMPONENT_PARAMETER_STORAGE_KEY,
  createComponentParameterStore,
} from '../../src/features/cad/parameters'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  OPENGRID_SNAP_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  PILLAR_CONFIGURATION,
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
    expect(store.get('box-normal')).toEqual({
      x: 2,
      y: 2,
      height: 10,
      cornerPosts: true,
    })
    expect(store.get('modular-grid-base')).toEqual({ rows: 1, columns: 1 })
    expect(store.get('hsw-cell')).toEqual({ rows: 1, columns: 1 })
    expect(store.get('opengrid')).toEqual(opengridParameters())
    expect(store.get('opengrid-stackable-box')).toEqual({
      x: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultX,
      y: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultY,
      height: OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultHeight,
      fullBottomHoleGrid: false,
    })
    expect(store.get('opengrid-stackable-cylinder')).toEqual({
      diameter: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultDiameter,
      height: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultHeight,
      thinBottomMode: false,
      bottomPlateMode: false,
      bottomHolesEnabled: true,
    })
    expect(store.get('opengrid-snap')).toEqual(
      OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    )
    expect(store.get('opengrid-snap-remover')).toEqual({})
    expect(store.get('opengrid-divider')).toEqual(
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
    )
    expect(store.get('opengrid-pillar')).toEqual(
      PILLAR_CONFIGURATION.defaultParameters,
    )

    store.dispose()
  })

  it('restores valid typed values for every component', () => {
    const storage = createMemoryStorage(
      createPayload({
        box: { width: 25, depth: 30, height: 40 },
        'box-normal': { x: 3, y: 4, height: 25, cornerPosts: false },
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
        'opengrid-stackable-box': {
          x: 0.5,
          y: 1.5,
          height: 25,
          fullBottomHoleGrid: true,
        },
        'opengrid-stackable-cylinder': { diameter: 80, height: 45 },
        'opengrid-snap': { variant: 'Lite', offset: 0.2 },
        'opengrid-divider': { left: 1, right: 1, up: 1.5, down: 0, height: 25 },
        'opengrid-pillar': { length: 12, baseConnection: true },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('box')).toEqual({ width: 25, depth: 30, height: 40 })
    expect(store.get('box-normal')).toEqual({
      x: 3,
      y: 4,
      height: 25,
      cornerPosts: false,
    })
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
    expect(store.get('opengrid-stackable-box')).toEqual({
      x: 0.5,
      y: 1.5,
      height: 25,
      fullBottomHoleGrid: true,
    })
    expect(store.get('opengrid-divider')).toEqual({
      left: 1,
      right: 1,
      up: 1.5,
      down: 0,
      height: 25,
    })
    expect(store.get('opengrid-pillar')).toEqual({
      length: 12,
      baseConnection: true,
    })
    expect(store.get('opengrid-snap')).toEqual({
      variant: 'Lite',
      offset: 0.2,
      halfCellX: 'none',
      halfCellY: 'none',
    })

    expect(store.get('opengrid-stackable-cylinder')).toEqual({
      diameter: 80,
      height: 45,
      thinBottomMode: false,
      bottomPlateMode: false,
      bottomHolesEnabled: true,
    })

    expect(
      store.set('opengrid-stackable-cylinder', {
        diameter: 80,
        height: 45,
        thinBottomMode: false,
        bottomPlateMode: false,
        bottomHolesEnabled: true,
      }),
    ).toBe(true)

    const persisted = JSON.parse(
      storage.data.get(COMPONENT_PARAMETER_STORAGE_KEY) ?? '{}',
    ) as { values?: Record<string, unknown> }
    expect(persisted.values?.['opengrid-stackable-cylinder']).toEqual({
      diameter: 80,
      height: 45,
      thinBottomMode: false,
      bottomPlateMode: false,
      bottomHolesEnabled: true,
    })

    store.dispose()
  })

  it('normalizes legacy stackable-box entries and rejects invalid grid mode', () => {
    const storage = createMemoryStorage(
      createPayload({
        'opengrid-stackable-box': { x: 0.5, y: 1.5, height: 25 },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid-stackable-box')).toEqual({
      x: 0.5,
      y: 1.5,
      height: 25,
      fullBottomHoleGrid: false,
    })
    expect(
      store.set('opengrid-stackable-box', {
        x: 0.5,
        y: 1.5,
        height: 25,
        fullBottomHoleGrid: true,
      }),
    ).toBe(true)
    expect(store.get('opengrid-stackable-box')).toMatchObject({
      fullBottomHoleGrid: true,
    })
    expect(
      store.set('opengrid-stackable-box', {
        x: 0.5,
        y: 1.5,
        height: 25,
        fullBottomHoleGrid: 'true' as never,
      }),
    ).toBe(false)
    expect(store.get('opengrid-stackable-box')).toMatchObject({
      fullBottomHoleGrid: true,
    })
    store.dispose()
  })

  it('persists bottom-plate mode as a separate cylinder profile', () => {
    const storage = createMemoryStorage()
    const store = createComponentParameterStore({ storage })
    const bottomPlateParameters = {
      diameter: 80,
      height: 45,
      thinBottomMode: false,
      bottomPlateMode: true,
      bottomHolesEnabled: true,
    }

    expect(
      store.set('opengrid-stackable-cylinder', bottomPlateParameters),
    ).toBe(true)
    expect(store.get('opengrid-stackable-cylinder')).toEqual(
      bottomPlateParameters,
    )

    const persisted = JSON.parse(
      storage.data.get(COMPONENT_PARAMETER_STORAGE_KEY) ?? '{}',
    ) as { values?: Record<string, unknown> }
    expect(persisted.values?.['opengrid-stackable-cylinder']).toEqual(
      bottomPlateParameters,
    )

    store.dispose()
  })

  it('isolates component entries and removes malformed or unknown values on write', () => {
    const storage = createMemoryStorage(
      createPayload({
        box: { width: 25, depth: 30, height: 40 },
        'box-normal': { x: 3, y: 4, height: 25, cornerPosts: false },
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
        'opengrid-stackable-box': { x: 0.25, y: 1, height: 10 },
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
        'box-normal': { x: 3, y: 4, height: 25, cornerPosts: false },
        'modular-grid-base': { rows: 2, columns: 3 },
        'hsw-cell': { rows: 4, columns: 2 },
      },
    })

    store.dispose()
  })

  it('rejects legacy board-shaped Snap entries without affecting the board entry', () => {
    const board = opengridParameters({ variant: 'Lite', rows: 2, columns: 2 })
    const storage = createMemoryStorage(
      createPayload({
        opengrid: board,
        'opengrid-snap': { ...board },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid')).toEqual(board)
    expect(store.get('opengrid-snap')).toEqual(
      OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    )
    expect(
      store.set('opengrid-snap', {
        variant: 'Full',
        offset: 0.25,
        halfCellX: 'none',
        halfCellY: 'none',
      }),
    ).toBe(true)
    expect(store.get('opengrid')).toEqual(board)
    expect(store.get('opengrid-snap')).toEqual({
      variant: 'Full',
      offset: 0.25,
      halfCellX: 'none',
      halfCellY: 'none',
    })
    store.dispose()
  })

  it('persists independent half-cell directions and rejects malformed directions', () => {
    const storage = createMemoryStorage(
      createPayload({
        opengrid: {
          ...opengridParameters(),
          halfCellX: 'diagonal',
        },
        'opengrid-snap': {
          ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
          allowHalfCell: true,
        },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid')).toEqual(opengridParameters())
    expect(store.get('opengrid-snap')).toEqual(
      OPENGRID_SNAP_CONFIGURATION.defaultParameters,
    )

    expect(
      store.set(
        'opengrid',
        opengridParameters({ halfCellX: 'left', halfCellY: 'top' }),
      ),
    ).toBe(true)
    expect(
      store.set('opengrid-snap', {
        ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
        halfCellX: 'right',
        halfCellY: 'bottom',
      }),
    ).toBe(true)
    expect(store.get('opengrid')).toMatchObject({
      halfCellX: 'left',
      halfCellY: 'top',
    })
    expect(store.get('opengrid-snap')).toMatchObject({
      halfCellX: 'right',
      halfCellY: 'bottom',
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
    expect(unsupportedStore.get('opengrid-pillar')).toEqual(
      PILLAR_CONFIGURATION.defaultParameters,
    )
    unsupportedStore.dispose()
  })

  it('does not overwrite a valid pillar snapshot with an invalid draft', () => {
    const storage = createMemoryStorage(
      createPayload({
        'opengrid-pillar': { length: 20, baseConnection: false },
      }),
    )
    const store = createComponentParameterStore({ storage })

    expect(store.get('opengrid-pillar')).toEqual({
      length: 20,
      baseConnection: false,
    })
    expect(
      store.set('opengrid-pillar', {
        length: 20.5,
        baseConnection: 'true',
      } as never),
    ).toBe(false)
    expect(store.get('opengrid-pillar')).toEqual({
      length: 20,
      baseConnection: false,
    })

    store.dispose()
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

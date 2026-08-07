import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KernelBuildContext } from '../../src/cad-kernel/model'

const mocks = vi.hoisted(() => ({
  buildBoxBRep: vi.fn(() => ({ model: 'box', delete: vi.fn() })),
  buildHswCell: vi.fn(async () => ({ model: 'hsw-cell', delete: vi.fn() })),
  buildHexagonalColumn: vi.fn(async () => ({
    model: 'hexagonal-column',
    delete: vi.fn(),
  })),
  buildModularGridBase: vi.fn(async () => ({
    model: 'modular-grid-base',
    delete: vi.fn(),
  })),
  buildOpenGridBRep: vi.fn(async () => ({
    model: 'opengrid',
    delete: vi.fn(),
  })),
}))

vi.mock('../../src/cad-kernel/components/box/builder', () => ({
  buildBoxBRep: mocks.buildBoxBRep,
}))

vi.mock('../../src/cad-kernel/components/hsw-cell/builder', () => ({
  buildHswCell: mocks.buildHswCell,
}))

vi.mock('../../src/cad-kernel/components/hexagonal-column/builder', () => ({
  buildHexagonalColumn: mocks.buildHexagonalColumn,
}))

vi.mock('../../src/cad-kernel/components/modular-grid-base/builder', () => ({
  buildModularGridBase: mocks.buildModularGridBase,
}))

vi.mock('../../src/cad-kernel/components/opengrid/builder', () => ({
  buildOpenGridBRep: mocks.buildOpenGridBRep,
}))

import {
  buildModelBRep,
  getKernelModelDefinition,
  kernelModelDefinitions,
} from '../../src/cad-kernel/model'

const context = {
  getModularGridBaseTemplate: vi.fn(async () => ({ delete: vi.fn() })),
  getHswCellTemplate: vi.fn(async () => ({ delete: vi.fn() })),
  getHexagonalColumnReference: vi.fn(async () => ({ delete: vi.fn() })),
} as unknown as KernelBuildContext

describe('HSW kernel model registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers each component as an independent kernel definition', () => {
    expect(kernelModelDefinitions.map((definition) => definition.id)).toEqual([
      'box',
      'modular-grid-base',
      'hsw-cell',
      'hexagonal-column',
      'opengrid',
    ])
    expect(getKernelModelDefinition('hsw-cell')?.id).toBe('hsw-cell')
    expect(getKernelModelDefinition('hexagonal-column')?.id).toBe(
      'hexagonal-column',
    )
  })

  it('routes HSW to its own template getter and builder', async () => {
    const shape = await buildModelBRep(
      'hsw-cell',
      { rows: 2, columns: 3 },
      context,
    )

    expect(shape).toMatchObject({ model: 'hsw-cell' })
    expect(context.getHswCellTemplate).toHaveBeenCalledOnce()
    expect(mocks.buildHswCell).toHaveBeenCalledWith(
      { rows: 2, columns: 3 },
      expect.anything(),
      context,
    )
    expect(mocks.buildModularGridBase).not.toHaveBeenCalled()
    expect(context.getModularGridBaseTemplate).not.toHaveBeenCalled()
  })

  it('preserves existing builder routes after HSW registration', async () => {
    await buildModelBRep('box', { width: 20, depth: 30, height: 40 }, context)
    await buildModelBRep('modular-grid-base', { rows: 2, columns: 2 }, context)

    expect(mocks.buildBoxBRep).toHaveBeenCalledOnce()
    expect(mocks.buildModularGridBase).toHaveBeenCalledOnce()
    expect(context.getModularGridBaseTemplate).toHaveBeenCalledOnce()
  })

  it('routes hexagonal-column only to its own reference and builder', async () => {
    const shape = await buildModelBRep(
      'hexagonal-column',
      { height: 50, count: 3, gap: 1, orientation: 'lying' },
      context,
    )

    expect(shape).toMatchObject({ model: 'hexagonal-column' })
    expect(context.getHexagonalColumnReference).toHaveBeenCalledOnce()
    expect(mocks.buildHexagonalColumn).toHaveBeenCalledWith(
      { height: 50, count: 3, gap: 1, orientation: 'lying' },
      expect.objectContaining({ reference: expect.anything() }),
    )
    expect(mocks.buildHswCell).not.toHaveBeenCalled()
    expect(mocks.buildModularGridBase).not.toHaveBeenCalled()
  })
})

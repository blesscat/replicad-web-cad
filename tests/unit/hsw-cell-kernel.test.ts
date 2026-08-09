import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KernelBuildContext } from '../../src/cad-kernel/model'

const mocks = vi.hoisted(() => ({
  buildBoxBRep: vi.fn(() => ({ model: 'box', delete: vi.fn() })),
  buildBoxNormal: vi.fn(async () => ({
    model: 'box-normal',
    delete: vi.fn(),
  })),
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
  buildOpenGridStackableBox: vi.fn(() => ({
    model: 'opengrid-stackable-box',
    delete: vi.fn(),
  })),
}))

vi.mock('../../src/cad-kernel/components/box/builder', () => ({
  buildBoxBRep: mocks.buildBoxBRep,
}))

vi.mock('../../src/cad-kernel/components/box-normal/builder', () => ({
  buildBoxNormal: mocks.buildBoxNormal,
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

vi.mock(
  '../../src/cad-kernel/components/opengrid-stackable-box/builder',
  () => ({
    buildOpenGridStackableBox: mocks.buildOpenGridStackableBox,
  }),
)

import {
  buildModelBRep,
  getKernelModelDefinition,
  kernelModelDefinitions,
} from '../../src/cad-kernel/model'

const context = {
  getModularGridBaseTemplate: vi.fn(async () => ({ delete: vi.fn() })),
  getHswCellTemplate: vi.fn(async () => ({ delete: vi.fn() })),
  getBoxNormalReference: vi.fn(async () => ({ delete: vi.fn() })),
  getHexagonalColumnReference: vi.fn(async () => ({ delete: vi.fn() })),
} as unknown as KernelBuildContext

describe('HSW kernel model registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers each component as an independent kernel definition', () => {
    expect(kernelModelDefinitions.map((definition) => definition.id)).toEqual([
      'box',
      'box-normal',
      'modular-grid-base',
      'hsw-cell',
      'hexagonal-column',
      'opengrid',
      'opengrid-stackable-box',
      'opengrid-snap',
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

  it('routes box-normal only to its own reference and builder', async () => {
    const shape = await buildModelBRep(
      'box-normal',
      { x: 2, y: 2, height: 10, cornerPosts: true },
      context,
    )

    expect(shape).toMatchObject({ model: 'box-normal' })
    expect(context.getBoxNormalReference).toHaveBeenCalledOnce()
    expect(mocks.buildBoxNormal).toHaveBeenCalledWith(
      { x: 2, y: 2, height: 10, cornerPosts: true },
      expect.anything(),
      expect.objectContaining({
        isGenerationCurrent: undefined,
      }),
    )
    expect(mocks.buildHswCell).not.toHaveBeenCalled()
    expect(mocks.buildModularGridBase).not.toHaveBeenCalled()
  })

  it('preserves existing builder routes after HSW registration', async () => {
    await buildModelBRep('box', { width: 20, depth: 30, height: 40 }, context)
    await buildModelBRep('modular-grid-base', { rows: 2, columns: 2 }, context)

    expect(mocks.buildBoxBRep).toHaveBeenCalledOnce()
    expect(mocks.buildModularGridBase).toHaveBeenCalledOnce()
    expect(context.getModularGridBaseTemplate).toHaveBeenCalledOnce()
  })

  it('routes the stackable-box model to its dedicated builder', async () => {
    const shape = await buildModelBRep(
      'opengrid-stackable-box',
      { x: 0.5, y: 1, height: 20, fullBottomHoleGrid: false },
      context,
    )

    expect(shape).toMatchObject({ model: 'opengrid-stackable-box' })
    expect(mocks.buildOpenGridStackableBox).toHaveBeenCalledWith(
      { x: 0.5, y: 1, height: 20, fullBottomHoleGrid: false },
      { isGenerationCurrent: undefined },
    )
    expect(mocks.buildOpenGridBRep).not.toHaveBeenCalled()
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

import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  buildHswCellAssembly,
  buildHswCellSequential,
  selectHswCellAssemblyStrategy,
} from '../../src/cad-kernel/components/hsw-cell/builder'

describe('hsw-cell component-local builder', () => {
  it('selects the column strategy only for large HSW grids', () => {
    expect(selectHswCellAssemblyStrategy({ rows: 1, columns: 1 })).toBe(
      'sequential',
    )
    expect(selectHswCellAssemblyStrategy({ rows: 10, columns: 10 })).toBe(
      'column',
    )
  })

  it('reports cell progress and does not invoke a fillet for a single cell', async () => {
    const translatedCell = {
      delete: vi.fn(),
      boundingBox: {
        bounds: [
          [-1, -1, 0],
          [1, 1, 1],
        ],
        delete: vi.fn(),
      },
    }
    const clonedCell = {
      delete: vi.fn(),
      translate: vi.fn(() => translatedCell),
    }
    const template = {
      clone: vi.fn(() => clonedCell),
    } as unknown as Shape3D
    const progress: Array<{
      completed?: number
      total?: number
      unit?: string
    }> = []
    const context = {
      reportProgress: (value: {
        completed?: number
        total?: number
        unit?: string
      }) => progress.push(value),
    }

    const result = await buildHswCellAssembly(
      { rows: 1, columns: 1 },
      template,
      'sequential',
      context,
    )

    expect(result).toBe(translatedCell)
    expect(progress).toEqual([
      { stage: 'building', completed: 0, total: 1, unit: 'cells' },
      { stage: 'building', completed: 1, total: 1, unit: 'cells' },
    ])
    expect((translatedCell as unknown as { fillet?: unknown }).fillet).toBe(
      undefined,
    )
  })

  it('disposes a translated cell when generation becomes stale at a safe boundary', async () => {
    const translatedCell = { delete: vi.fn() }
    const clonedCell = {
      delete: vi.fn(),
      translate: vi.fn(() => translatedCell),
    }
    const template = {
      clone: vi.fn(() => clonedCell),
    } as unknown as Shape3D
    let checks = 0

    await expect(
      buildHswCellSequential({ rows: 1, columns: 2 }, template, {
        isGenerationCurrent: () => {
          checks += 1
          return checks < 3
        },
      }),
    ).rejects.toThrow('STALE_GENERATION')
    expect(clonedCell.delete).toHaveBeenCalledOnce()
    expect(translatedCell.delete).toHaveBeenCalledOnce()
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import {
  buildModularGridBaseSequential,
  cellOffsetsForGrid,
  externalCornerCoordinates,
} from '../../src/cad-kernel/components/modular-grid-base/builder'

describe('modular-grid-base placement helpers', () => {
  it('centers one template at every requested cell position', () => {
    expect(cellOffsetsForGrid({ rows: 1, columns: 1 })).toEqual([[0, 0]])
    expect(cellOffsetsForGrid({ rows: 2, columns: 2 })).toEqual([
      [-10, -10],
      [10, -10],
      [-10, 10],
      [10, 10],
    ])
  })

  it('identifies the four external corners of the overall plate envelope', () => {
    expect(externalCornerCoordinates({ rows: 2, columns: 3 })).toEqual([
      [-30, -20],
      [30, -20],
      [-30, 20],
      [30, 20],
    ])
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
      buildModularGridBaseSequential({ rows: 1, columns: 2 }, template, {
        isGenerationCurrent: () => {
          checks += 1
          return checks < 3
        },
      }),
    ).rejects.toThrow('STALE_GENERATION')
    expect(clonedCell.delete).toHaveBeenCalledOnce()
    expect(translatedCell.delete).toHaveBeenCalledOnce()
  })

  it('yields between native boundaries so a newer generation can cancel assembly', async () => {
    const translatedCell = { delete: vi.fn() }
    const clonedCell = {
      delete: vi.fn(),
      translate: vi.fn(() => translatedCell),
    }
    const template = {
      clone: vi.fn(() => clonedCell),
    } as unknown as Shape3D
    let current = true

    await expect(
      buildModularGridBaseSequential({ rows: 1, columns: 2 }, template, {
        isGenerationCurrent: () => current,
        yieldToEventLoop: async () => {
          current = false
        },
      }),
    ).rejects.toThrow('STALE_GENERATION')
    expect(clonedCell.delete).toHaveBeenCalledOnce()
    expect(translatedCell.delete).toHaveBeenCalledOnce()
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { Shape3D } from 'replicad'
import { buildOpenGridSnapRemover } from '../../src/cad-kernel/components/opengrid-snap-remover/builder'

describe('OpenGrid Snap Remover builder', () => {
  it('clones the cached source for each generation without mutating it', () => {
    const firstClone = { delete: vi.fn() }
    const secondClone = { delete: vi.fn() }
    const source = {
      clone: vi
        .fn()
        .mockReturnValueOnce(firstClone)
        .mockReturnValueOnce(secondClone),
      delete: vi.fn(),
    } as unknown as Shape3D

    expect(buildOpenGridSnapRemover(source)).toBe(firstClone)
    expect(buildOpenGridSnapRemover(source)).toBe(secondClone)
    expect(source.clone).toHaveBeenCalledTimes(2)
    expect(source.delete).not.toHaveBeenCalled()
  })

  it('deletes a clone when the generation becomes stale', () => {
    const clone = { delete: vi.fn() }
    const source = { clone: vi.fn(() => clone) } as unknown as Shape3D

    expect(() =>
      buildOpenGridSnapRemover(source, {
        isGenerationCurrent: () => false,
      }),
    ).toThrow('STALE_GENERATION')
    expect(clone.delete).toHaveBeenCalledOnce()
  })
})

import { describe, expect, it } from 'vitest'
import { CAD_VIEWPORT_CONFIG } from '../../src/features/cad/viewport/config'
import { shouldDeferViewportEdges } from '../../src/features/cad/viewport/edge-lines'

describe('CAD viewport edge preparation policy', () => {
  it('keeps small previews synchronous and defers large edge overlays', () => {
    expect(
      shouldDeferViewportEdges(
        CAD_VIEWPORT_CONFIG.largePreviewTriangleThreshold - 1,
      ),
    ).toBe(false)
    expect(
      shouldDeferViewportEdges(
        CAD_VIEWPORT_CONFIG.largePreviewTriangleThreshold,
      ),
    ).toBe(true)
    expect(shouldDeferViewportEdges(100_000)).toBe(true)
  })
})

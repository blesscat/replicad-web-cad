import { describe, expect, it } from 'vitest'
import {
  CAD_VIEWPORT_CONFIG,
  CAD_VIEWPORT_LIGHTING,
} from '../../src/features/cad/viewport/config'

function expectFiniteVector(vector: readonly number[]): void {
  expect(vector).toHaveLength(3)
  expect(vector.every(Number.isFinite)).toBe(true)
}

describe('CAD viewport lighting configuration', () => {
  it('provides a positive fill and a stronger directional key light', () => {
    const { hemisphere, key, oppositeFill } = CAD_VIEWPORT_LIGHTING

    expect(hemisphere.intensity).toBeGreaterThan(0)
    expect(key.intensity).toBeGreaterThan(oppositeFill.intensity)
    expect(oppositeFill.intensity).toBeGreaterThan(0)
    expectFiniteVector(hemisphere.position)
    expectFiniteVector(key.position)
    expectFiniteVector(oppositeFill.position)
    expect(CAD_VIEWPORT_CONFIG.modelEmissiveIntensity).toBeGreaterThan(0)
    expect(CAD_VIEWPORT_CONFIG.modelEmissiveIntensity).toBeLessThanOrEqual(0.25)
  })
})

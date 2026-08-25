import { describe, expect, it } from 'vitest'
import {
  CAD_VIEWPORT_CONFIG,
  colorForCadViewportPart,
} from '../../src/features/cad/viewport/config'

describe('CAD viewport named part presentation', () => {
  it('uses deterministic distinct colors for Wall Cover body and text', () => {
    expect(colorForCadViewportPart('body')).toBe(
      CAD_VIEWPORT_CONFIG.modelPartColors.body,
    )
    expect(colorForCadViewportPart('text')).toBe(
      CAD_VIEWPORT_CONFIG.modelPartColors.text,
    )
    expect(colorForCadViewportPart('body')).not.toBe(
      colorForCadViewportPart('text'),
    )
  })
})

import { describe, expect, it } from 'vitest'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'

describe('OpenGrid full-hole geometry error mapping', () => {
  it.each([
    'OPENGRID_STACKABLE_BOX_BOTTOM_GRID_SPACING_INVALID',
    'OPENGRID_STACKABLE_BOX_BOTTOM_GRID_HOLES_INVALID',
  ])('maps %s to a diagnosable quality error', (message) => {
    expect(cadErrorCodeFor(message, 'model.generate')).toBe(
      'OPENGRID_QUALITY_INVALID',
    )
    expect(cadErrorStageFor('model.generate', message)).toBe('meshing')
  })
})

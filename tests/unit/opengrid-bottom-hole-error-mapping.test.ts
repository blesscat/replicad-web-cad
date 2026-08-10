import { describe, expect, it } from 'vitest'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'

describe('OpenGrid full-hole geometry error mapping', () => {
  it.each([
    'OPENGRID_STACKABLE_BOX_BOTTOM_GRID_SPACING_INVALID',
    'OPENGRID_STACKABLE_BOX_BOTTOM_GRID_HOLES_INVALID',
    'OPENGRID_STACKABLE_BOX_THICK_SHELL_INVALID',
    'OPENGRID_STACKABLE_BOX_INTEGRATED_GUIDE_INVALID',
    'OPENGRID_STACKABLE_BOX_BOTTOM_SUPPORT_INVALID',
    'OPENGRID_STACKABLE_BOX_MOUNTING_HOLE_STEP_INVALID',
    'OPENGRID_STACKABLE_BOX_MOUNTING_HOLE_PROFILE_INVALID',
    'OPENGRID_STACKABLE_BOX_STACKING_CLEARANCE_INVALID',
    'OPENGRID_SNAP_HOLD_INTERFACE_DIAMETER_MISMATCH',
  ])('maps %s to a diagnosable quality error', (message) => {
    expect(cadErrorCodeFor(message, 'model.generate')).toBe(
      'OPENGRID_QUALITY_INVALID',
    )
    expect(cadErrorStageFor('model.generate', message)).toBe('meshing')
  })
})

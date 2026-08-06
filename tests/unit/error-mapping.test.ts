import { describe, expect, it } from 'vitest'
import {
  cadErrorCodeFor,
  cadErrorStageFor,
} from '../../src/workers/error-mapping'

describe('CAD Worker error mapping', () => {
  it.each([
    ['MODEL_REVISION_MISSING', 'model.generate', 'MODEL_REVISION_MISSING'],
    ['WORKER_RESTARTED', 'model.generate', 'WORKER_RESTARTED'],
    ['CANDIDATE_MISSING', 'model.commit', 'CANDIDATE_ORPHANED'],
    ['CANDIDATE_CAPACITY', 'model.generate', 'CANDIDATE_CAPACITY'],
    ['GRID_TEMPLATE_INVALID_BOUNDS', 'model.generate', 'MODEL_ASSET_INVALID'],
    ['HSW_CELL_ASSET_INVALID_BOUNDS', 'model.generate', 'MODEL_ASSET_INVALID'],
    ['MESH_INVALID: empty', 'model.generate', 'MESH_INVALID'],
    ['STEP_METADATA_INVALID', 'export.step', 'STEP_METADATA_INVALID'],
    ['STL_METADATA_INVALID', 'export.stl', 'STL_METADATA_INVALID'],
    ['ENGINE_NOT_READY', 'model.generate', 'ENGINE_INIT_FAILED'],
    ['unknown', 'engine.init', 'ENGINE_INIT_FAILED'],
    ['unknown', 'export.step', 'STEP_EXPORT_FAILED'],
    ['unknown', 'export.stl', 'STL_EXPORT_FAILED'],
    ['unknown', 'model.generate', 'MODEL_BUILD_FAILED'],
  ] as const)(
    'maps %s before applying the %s fallback',
    (message, commandKind, expectedCode) => {
      expect(cadErrorCodeFor(message, commandKind)).toBe(expectedCode)
    },
  )

  it('maps command kinds to their operational stages', () => {
    expect(cadErrorStageFor('engine.init')).toBe('initializing')
    expect(cadErrorStageFor('export.step')).toBe('exporting')
    expect(cadErrorStageFor('model.generate')).toBe('building')
    expect(cadErrorStageFor('model.generate', 'MESH_INVALID')).toBe('meshing')
    expect(cadErrorStageFor('model.commit')).toBe('worker')
  })
})

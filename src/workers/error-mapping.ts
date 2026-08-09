import type { CadErrorCode, CadErrorStage } from '../cad-contract/errors'
import type { WorkerCommand } from '../cad-contract/messages'

type WorkerCommandKind = WorkerCommand['kind']

export function cadErrorCodeFor(
  message: string,
  commandKind: WorkerCommandKind,
): CadErrorCode {
  if (message.includes('MODEL_REVISION_MISSING'))
    return 'MODEL_REVISION_MISSING'
  if (message.includes('WORKER_RESTARTED')) return 'WORKER_RESTARTED'
  if (message.includes('CANDIDATE_MISSING')) return 'CANDIDATE_ORPHANED'
  if (message.includes('CANDIDATE_CAPACITY')) return 'CANDIDATE_CAPACITY'
  if (message.includes('ENGINE_NOT_READY')) return 'ENGINE_INIT_FAILED'
  if (
    message.includes('MODEL_PARAMETERS_INVALID') ||
    message === 'INVALID_INPUT'
  ) {
    return 'INVALID_INPUT'
  }
  if (message.includes('OPENGRID_UNSUPPORTED_CONFIGURATION')) {
    return 'OPENGRID_UNSUPPORTED_CONFIGURATION'
  }
  if (
    message.includes('OPENGRID_SNAP_PARAMETERS_INVALID') ||
    message.includes('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  ) {
    return 'INVALID_INPUT'
  }
  if (message.includes('OPENGRID_SNAP_QUALITY_INVALID')) {
    return 'OPENGRID_SNAP_QUALITY_INVALID'
  }
  if (
    message.includes('OPENGRID_QUALITY_INVALID') ||
    message.includes('OPENGRID_BREP_INVALID') ||
    message.includes('OPENGRID_STACKABLE_BOX_BOTTOM_GRID_')
  ) {
    return 'OPENGRID_QUALITY_INVALID'
  }
  if (message.includes('STEP_METADATA_INVALID')) return 'STEP_METADATA_INVALID'
  if (message.includes('STL_METADATA_INVALID')) return 'STL_METADATA_INVALID'
  if (message.includes('MESH_INVALID')) return 'MESH_INVALID'
  if (
    message.includes('MODEL_ASSET_INVALID') ||
    message.includes('GRID_TEMPLATE') ||
    message.includes('HSW_CELL_ASSET') ||
    message.includes('BOX_NORMAL_ASSET') ||
    message.includes('HEXAGONAL_COLUMN_ASSET') ||
    message.includes('OPENGRID_SNAP_ASSET')
  ) {
    return 'MODEL_ASSET_INVALID'
  }
  if (commandKind === 'engine.init') return 'ENGINE_INIT_FAILED'
  if (commandKind === 'export.step') return 'STEP_EXPORT_FAILED'
  if (commandKind === 'export.stl') return 'STL_EXPORT_FAILED'
  return 'MODEL_BUILD_FAILED'
}

export function cadErrorStageFor(
  commandKind: WorkerCommandKind,
  message = '',
): CadErrorStage {
  if (message.includes('OPENGRID_UNSUPPORTED_CONFIGURATION')) {
    return 'validation'
  }
  if (message.includes('OPENGRID_SNAP_QUALITY_INVALID')) return 'meshing'
  if (
    message.includes('OPENGRID_QUALITY_INVALID') ||
    message.includes('OPENGRID_STACKABLE_BOX_BOTTOM_GRID_')
  ) {
    return 'meshing'
  }
  if (message.includes('MESH_INVALID')) return 'meshing'
  switch (commandKind) {
    case 'engine.init':
      return 'initializing'
    case 'export.step':
    case 'export.stl':
      return 'exporting'
    case 'model.generate':
      return 'building'
    default:
      return 'worker'
  }
}

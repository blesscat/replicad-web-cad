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
  if (message.includes('STEP_METADATA_INVALID')) return 'STEP_METADATA_INVALID'
  if (message.includes('MESH_INVALID')) return 'MESH_INVALID'
  if (message.includes('GRID_TEMPLATE')) return 'MODEL_ASSET_INVALID'
  if (commandKind === 'engine.init') return 'ENGINE_INIT_FAILED'
  if (commandKind === 'export.step') return 'STEP_EXPORT_FAILED'
  return 'MODEL_BUILD_FAILED'
}

export function cadErrorStageFor(
  commandKind: WorkerCommandKind,
  message = '',
): CadErrorStage {
  if (message.includes('MESH_INVALID')) return 'meshing'
  switch (commandKind) {
    case 'engine.init':
      return 'initializing'
    case 'export.step':
      return 'exporting'
    case 'model.generate':
      return 'building'
    default:
      return 'worker'
  }
}

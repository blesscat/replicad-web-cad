import type { Shape3D } from 'replicad'
import { PreviewTimingRecorder } from '../cad-contract/preview-timing'
import { PROTOCOL_VERSION, type WorkerCommand } from '../cad-contract/messages'
import {
  isHswCellParameters,
  isOpenGridDividerModelParameters,
  isOpenGridOpenShelfParameters,
  isOpenGridOrganizerBoxParameters,
  isOpenGridParameters,
  isOpenGridSnapParameters,
  isPillarParameters,
  normalizeOpenGridDividerParameters,
  normalizeOpenGridParameters,
  normalizeOpenGridSnapParameters,
  type ModelParameterValues,
  validateOpenGridGenerationSupport,
} from '../cad-contract/units'
import { createBooleanOperationReporter } from '../cad-kernel/boolean-progress'
import type { CandidateRecord } from '../cad-kernel/lifetime'
import { buildModelBRep, type KernelBuildContext } from '../cad-kernel/model'
import { meshBRep, serializeMesh, type MeshData } from '../cad-kernel/mesh'
import { assertOpenGridDividerShapeQuality } from '../cad-kernel/components/opengrid-divider/quality'
import { assertOpenGridOpenShelfShapeQuality } from '../cad-kernel/components/opengrid-open-shelf/quality'
import { assertOpenGridOrganizerBoxGeometry } from '../cad-kernel/components/opengrid-organizer-box/quality'
import { assertOpenGridShapeQuality } from '../cad-kernel/components/opengrid/quality'
import { assertPillarShapeQuality } from '../cad-kernel/components/opengrid-pillar/quality'
import {
  assertOpenGridSnapOpenConnectShapeQuality,
  assertOpenGridSnapShapeQuality,
} from '../cad-kernel/components/opengrid-snap/quality'
import { createThrottledMeshProgressReporter } from './mesh-progress'
import { id, emitSuperseded } from './cad-worker-events'
import type { CadWorkerAssetCache } from './cad-worker-assets'
import type {
  CadWorkerBuildOptions,
  EventSink,
  ProgressEmitter,
  SupersededReason,
} from './cad-worker-types'

type GenerateCommand = Extract<WorkerCommand, { kind: 'model.generate' }>

export type CadWorkerGenerationContext = {
  epoch: string
  assets: CadWorkerAssetCache
  buildOptions: CadWorkerBuildOptions
  emit: EventSink
  emitProgress: ProgressEmitter
  isGenerationCurrent: (generation: number) => boolean
  registerCandidate: (candidate: CandidateRecord) => () => void
  supersede: (
    command: { operationId: string; requestId: string; generation?: number },
    reason: SupersededReason,
  ) => void
}

function yieldToWorkerEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

export async function generateCadCandidate(
  command: GenerateCommand,
  context: CadWorkerGenerationContext,
): Promise<void> {
  const timing = new PreviewTimingRecorder()
  const booleanOperations = createBooleanOperationReporter(
    (progress) =>
      context.emitProgress(command, 'building', undefined, undefined, progress),
    (kind, durationMs) => timing.recordBoolean(kind, durationMs),
  )
  let generationParameters: ModelParameterValues = command.parameters
  if (command.modelId === 'opengrid') {
    const normalizedParameters = normalizeOpenGridParameters(command.parameters)
    generationParameters = normalizedParameters
    const support = validateOpenGridGenerationSupport(normalizedParameters)
    if (!support.valid) throw new Error('OPENGRID_UNSUPPORTED_CONFIGURATION')
  }
  if (command.modelId === 'opengrid-divider') {
    generationParameters = normalizeOpenGridDividerParameters(
      command.parameters,
    )
  }
  if (command.modelId === 'opengrid-snap') {
    const normalizedParameters = normalizeOpenGridSnapParameters(
      command.parameters,
    )
    if (!isOpenGridSnapParameters(normalizedParameters)) {
      throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
    }
    generationParameters = normalizedParameters
  }
  const hswProgress =
    command.modelId === 'hsw-cell' && isHswCellParameters(command.parameters)
      ? {
          completed: 0,
          total: command.parameters.rows * command.parameters.columns,
          unit: 'cells' as const,
        }
      : undefined
  context.emitProgress(command, 'building', undefined, hswProgress)

  let shape: Shape3D
  try {
    const {
      useOpenGridCanonicalTileCache = true,
      useOpenGridHalfCellPrototypeCache = true,
      ...openGridBuildOptions
    } = context.buildOptions
    const buildContext: KernelBuildContext = {
      ...openGridBuildOptions,
      getModularGridBaseTemplate: () =>
        context.assets.getModularGridBaseTemplate(),
      getHswCellTemplate: () => context.assets.getHswCellTemplate(),
      getHexagonalColumnReference: () =>
        context.assets.getHexagonalColumnReference(),
      getOpenGridPrototype: (variant) =>
        context.assets.getOpenGridPrototype(variant),
      getOpenGridSnapReference: (variant, profile) =>
        context.assets.getOpenGridSnapReference(variant, profile),
      getOpenGridSnapFixedFootprint: (footprint) =>
        context.assets.getOpenGridSnapFixedFootprint(footprint),
      getOpenGridSnapOpenConnectHead: () =>
        context.assets.getOpenGridSnapOpenConnectHead(),
      getOpenGridSnapRemoverAsset: () =>
        context.assets.getOpenGridSnapRemoverAsset(),
      getOpenGridDetachableCornerSeatReference: () =>
        context.assets.getOpenGridDetachableCornerSeatReference(),
      getOpenGridDetachableCornerSeatHolderReference: () =>
        context.assets.getOpenGridDetachableCornerSeatHolderReference(),
      yieldToEventLoop: yieldToWorkerEventLoop,
      isGenerationCurrent: () =>
        context.isGenerationCurrent(command.generation),
      booleanOperations,
      reportProgress: (progress) =>
        context.emitProgress(command, progress.stage, undefined, {
          completed: progress.completed,
          total: progress.total,
          unit: progress.unit,
        }),
    }
    if (useOpenGridCanonicalTileCache) {
      buildContext.getOpenGridCanonicalTile = (
        variant,
        thickness,
        canonicalBooleanOperations,
      ) =>
        context.assets.getOpenGridCanonicalTile(
          variant,
          thickness,
          () => context.isGenerationCurrent(command.generation),
          canonicalBooleanOperations,
        )
    }
    if (useOpenGridHalfCellPrototypeCache) {
      buildContext.getOpenGridHalfCellPrototype = (key, factory) =>
        context.assets.getOpenGridHalfCellPrototype(key, factory)
    }
    shape = await timing.measure('build', () =>
      buildModelBRep(command.modelId, generationParameters, buildContext),
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      emitSuperseded(
        context.emit,
        command,
        'STALE_GENERATION',
        command.generation,
      )
      return
    }
    throw error
  }

  if (!context.isGenerationCurrent(command.generation)) {
    shape.delete()
    context.supersede(command, 'STALE_GENERATION')
    return
  }

  let mesh: MeshData
  try {
    const reportFaceProgress = createThrottledMeshProgressReporter(
      ({ completed, total }) =>
        context.emitProgress(command, 'meshing', undefined, {
          completed,
          total,
          unit: 'faces',
        }),
    )
    context.emitProgress(command, 'meshing')
    try {
      mesh = timing.measureSync('mesh', () =>
        meshBRep(shape, {
          ...command.previewConfig,
          reportFaceProgress,
        }),
      )
    } catch (error) {
      reportFaceProgress.flush()
      throw error
    }
    if (command.modelId === 'opengrid-snap') {
      if (!isOpenGridSnapParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
      }
    }
    if (command.modelId === 'opengrid') {
      if (!isOpenGridParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
      }
      timing.measureSync('quality', () =>
        assertOpenGridShapeQuality(shape, generationParameters, mesh),
      )
    }
    if (command.modelId === 'opengrid-snap') {
      if (!isOpenGridSnapParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
      }
      if (generationParameters.footprint === 'full') {
        const reference = await context.assets.getOpenGridSnapReference(
          generationParameters.variant,
          generationParameters.profile,
        )
        timing.measureSync('quality', () => {
          if (generationParameters.openConnect) {
            assertOpenGridSnapOpenConnectShapeQuality(
              shape,
              generationParameters,
              mesh,
              reference,
            )
            return
          }
          assertOpenGridSnapShapeQuality(
            shape,
            generationParameters,
            mesh,
            reference,
          )
        })
      }
    }

    if (command.modelId === 'opengrid-divider') {
      if (!isOpenGridDividerModelParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-divider')
      }
      timing.measureSync('quality', () =>
        assertOpenGridDividerShapeQuality(shape, generationParameters, mesh),
      )
    }
    if (command.modelId === 'opengrid-pillar') {
      if (!isPillarParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-pillar')
      }
      timing.measureSync('quality', () =>
        assertPillarShapeQuality(shape, generationParameters, mesh),
      )
    }
    if (command.modelId === 'opengrid-open-shelf') {
      if (!isOpenGridOpenShelfParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-open-shelf')
      }
      timing.measureSync('quality', () =>
        assertOpenGridOpenShelfShapeQuality(shape, generationParameters, mesh),
      )
    }
    if (command.modelId === 'opengrid-organizer-box') {
      if (!isOpenGridOrganizerBoxParameters(generationParameters)) {
        throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-organizer-box')
      }
      let maleReference: Shape3D | undefined
      let holderReference: Shape3D | undefined
      if (generationParameters.cornerSeatMode === 'detachable-corner-seat') {
        ;[maleReference, holderReference] = await Promise.all([
          context.assets.getOpenGridDetachableCornerSeatReference(),
          context.assets.getOpenGridDetachableCornerSeatHolderReference(),
        ])
      }
      timing.measureSync('quality', () =>
        assertOpenGridOrganizerBoxGeometry(
          shape,
          generationParameters,
          holderReference,
          maleReference,
        ),
      )
    }
  } catch (error) {
    try {
      shape.delete()
    } catch {
      // A failed native delete must not hide the original mesh error.
    }
    throw error
  }

  const candidate: CandidateRecord = {
    candidateId: `candidate-${context.epoch}-${id()}`,
    operationId: command.operationId,
    requestId: command.requestId,
    generation: command.generation,
    workerEpoch: context.epoch,
    modelId: command.modelId,
    parameters: generationParameters,
    shape,
    mesh,
    previewTiming: timing.snapshot(),
    createdAt: Date.now(),
  }

  const unregisterCandidate = timing.measureSync('candidate', () =>
    context.registerCandidate(candidate),
  )
  let meshSnapshot: ReturnType<typeof serializeMesh>
  try {
    meshSnapshot = timing.measureSync('serialization', () =>
      serializeMesh(mesh),
    )
    candidate.previewTiming = timing.snapshot()
  } catch (error) {
    unregisterCandidate()
    throw error
  }
  context.emit(
    {
      version: PROTOCOL_VERSION,
      kind: 'model.candidate-ready',
      requestId: id(),
      operationId: command.operationId,
      generation: command.generation,
      candidateId: candidate.candidateId,
      workerEpoch: context.epoch,
      modelId: candidate.modelId,
      parameters: candidate.parameters,
      mesh: meshSnapshot,
      previewTiming: candidate.previewTiming,
    },
    [meshSnapshot.positions, meshSnapshot.normals, meshSnapshot.indices],
  )
}

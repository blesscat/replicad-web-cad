import { type Shape3D } from 'replicad'
import {
  boundsForOpenGrid,
  normalizeOpenGridParameters,
  openGridScrewPositionsFor,
  type BoxBounds,
  type OpenGridParameters,
  type OpenGridScrewPosition,
  type OpenGridVariant,
} from '../../../cad-contract/units'
import {
  buildOpenGridBRepWithStrategy,
  type OpenGridAssemblyStrategy,
  type OpenGridBuildContext,
} from '../opengrid/builder'
import { OPENGRID_CONFIGURATION } from '../opengrid/profile'

export type {
  OpenGridChamferMode,
  OpenGridConnectorHoles,
  OpenGridConnectorSide,
  OpenGridCornerFlags,
  OpenGridParameters,
  OpenGridSideFlags,
  OpenGridScrewKind,
  OpenGridScrewMode,
  OpenGridScrewPosition,
  OpenGridVariant,
} from '../../../cad-contract/units'

export const OPENGRID_BENCHMARK_CONFIGURATION = OPENGRID_CONFIGURATION

export type OpenGridGeometryStrategy =
  'whole-profile' | 'row-block' | 'cell-balanced' | 'prototype-template'

const OPEN_GRID_ASSEMBLY_STRATEGIES: readonly OpenGridAssemblyStrategy[] = [
  'whole-profile',
  'row-block',
  'cell-balanced',
  'prototype-template',
]

export type OpenGridPreviewConfig = {
  tolerance: number
  angularTolerance: number
}

export type OpenGridBenchmarkRequest = OpenGridParameters & {
  previewConfig: OpenGridPreviewConfig
}

export type OpenGridBenchmarkBuildContext = {
  getOpenGridPrototype?: OpenGridBuildContext['getOpenGridPrototype']
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'cells' | 'batches' | 'steps'
  }) => void
  reportPhase?: (
    phase:
      | 'profile'
      | 'extrude'
      | 'prototype-build'
      | 'assembly-fuse'
      | 'boolean-cut',
    durationMs: number,
  ) => void
  reportPhaseStart?: (
    phase:
      | 'profile'
      | 'extrude'
      | 'prototype-build'
      | 'assembly-fuse'
      | 'boolean-cut',
  ) => void
}

export type OpenGridBoardConfiguration = {
  width: number
  depth: number
  height: number
}

function assertPreviewConfig(config: OpenGridPreviewConfig): void {
  if (
    !Number.isFinite(config.tolerance) ||
    config.tolerance <= 0 ||
    !Number.isFinite(config.angularTolerance) ||
    config.angularTolerance <= 0
  ) {
    throw new Error('OPENGRID_INVALID_PREVIEW_CONFIG')
  }
}

function assertGenerationCurrent(context: OpenGridBenchmarkBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

export function normalizeOpenGridBenchmarkRequest(
  request: OpenGridBenchmarkRequest,
): OpenGridBenchmarkRequest {
  assertPreviewConfig(request.previewConfig)
  const { previewConfig, ...rawParameters } = request
  const parameters = normalizeOpenGridParameters(rawParameters)
  return {
    ...parameters,
    previewConfig: { ...previewConfig },
  }
}

export function openGridBoardConfiguration(
  request: Pick<OpenGridBenchmarkRequest, 'variant' | 'rows' | 'columns'>,
): OpenGridBoardConfiguration {
  const board = boundsForOpenGrid(request)
  return {
    width: board.max[0] - board.min[0],
    depth: board.max[1] - board.min[1],
    height: board.max[2] - board.min[2],
  }
}

export function expectedOpenGridBounds(
  request: Pick<OpenGridBenchmarkRequest, 'variant' | 'rows' | 'columns'>,
): BoxBounds {
  return boundsForOpenGrid(request)
}

export function screwPositionsForRequest(
  request: OpenGridBenchmarkRequest,
): OpenGridScrewPosition[] {
  return openGridScrewPositionsFor(normalizeOpenGridBenchmarkRequest(request))
}

export async function buildOpenGridBenchmarkShape(
  inputRequest: OpenGridBenchmarkRequest,
  strategy: OpenGridGeometryStrategy,
  context: OpenGridBenchmarkBuildContext = {},
): Promise<Shape3D> {
  const request = normalizeOpenGridBenchmarkRequest(inputRequest)
  if (!OPEN_GRID_ASSEMBLY_STRATEGIES.includes(strategy)) {
    throw new Error('OPENGRID_BENCHMARK_STRATEGY_INVALID')
  }
  assertGenerationCurrent(context)
  context.reportPhaseStart?.('profile')
  const startedAt = performance.now()
  const shape = await buildOpenGridBRepWithStrategy(request, strategy, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    getOpenGridPrototype: context.getOpenGridPrototype,
    reportProgress: context.reportProgress,
    reportPhase: (phase, durationMs) => {
      if (phase === 'prototype-build' || phase === 'assembly-fuse') {
        context.reportPhase?.(phase, durationMs)
      }
    },
  })
  context.reportPhase?.('profile', performance.now() - startedAt)
  context.reportPhase?.('extrude', 0)
  context.reportPhase?.('boolean-cut', 0)
  return shape
}

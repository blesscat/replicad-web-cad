import type { Shape3D } from 'replicad'
import type { ProgressUnit } from '../../cad-contract/messages'
import {
  isBoxNormalParameters,
  isBoxParameters,
  isHexagonalColumnParameters,
  isHswCellParameters,
  isModularGridBaseParameters,
  isOpenGridParameters,
  isOpenGridSnapParameters,
  validateOpenGridGenerationSupport,
  validateModelParameters,
  type ModelId,
  type ModelParameterValues,
  type OpenGridVariant,
  type OpenGridSnapVariant,
} from '../../cad-contract/units'
import { buildBoxBRep } from '../components/box/builder'
import {
  buildBoxNormal,
  type BoxNormalOperationCounts,
} from '../components/box-normal/builder'
import { buildHswCell } from '../components/hsw-cell/builder'
import { buildHexagonalColumn } from '../components/hexagonal-column/builder'
import { buildModularGridBase } from '../components/modular-grid-base/builder'
import { buildOpenGridBRep } from '../components/opengrid/builder'
import { buildOpenGridSnap } from '../components/opengrid-snap/builder'

export type KernelBuildContext = {
  getModularGridBaseTemplate: () => Promise<Shape3D>
  getHswCellTemplate: () => Promise<Shape3D>
  getBoxNormalReference?: () => Promise<Shape3D>
  getHexagonalColumnReference?: () => Promise<Shape3D>
  getOpenGridPrototype?: (variant: OpenGridVariant) => Promise<Shape3D>
  getOpenGridSnapReference?: (variant: OpenGridSnapVariant) => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: ProgressUnit
  }) => void
  reportPhase?: (phase: KernelBuildPhase, durationMs: number) => void
  reportOperationCounts?: (counts: BoxNormalOperationCounts) => void
}

export type KernelBuildPhase =
  | 'clone-translate'
  | 'assembly-fuse'
  | 'fillet'
  | 'prototype-build'
  | 'clone-translate-compound'

export type KernelModelDefinition = {
  id: ModelId
  build: (
    parameters: ModelParameterValues,
    context: KernelBuildContext,
  ) => Shape3D | Promise<Shape3D>
}

function buildBoxModel(
  parameters: ModelParameterValues,
  _context: KernelBuildContext,
): Shape3D {
  if (!isBoxParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:box')
  }
  return buildBoxBRep(parameters)
}

async function buildBoxNormalModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isBoxNormalParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:box-normal')
  }
  if (!context.getBoxNormalReference) {
    throw new Error('MODEL_ASSET_INVALID:box-normal-reference-missing')
  }
  const reference = await context.getBoxNormalReference()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildBoxNormal(parameters, reference, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    reportProgress: context.reportProgress,
    reportPhase: context.reportPhase,
    reportOperationCounts: context.reportOperationCounts,
  })
}

async function buildModularGridBaseModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isModularGridBaseParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:modular-grid-base')
  }
  const template = await context.getModularGridBaseTemplate()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildModularGridBase(parameters, template, context)
}

async function buildHswCellModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isHswCellParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hsw-cell')
  }
  const template = await context.getHswCellTemplate()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildHswCell(parameters, template, context)
}

async function buildHexagonalColumnModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isHexagonalColumnParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:hexagonal-column')
  }
  if (!context.getHexagonalColumnReference) {
    throw new Error('MODEL_ASSET_INVALID:hexagonal-column-reference-missing')
  }
  const reference = await context.getHexagonalColumnReference()
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
  return buildHexagonalColumn(parameters, {
    reference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    reportProgress: context.reportProgress,
    reportPhase: context.reportPhase,
  })
}

async function buildOpenGridModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid')
  }
  const support = validateOpenGridGenerationSupport(parameters)
  if (!support.valid) {
    throw new Error('OPENGRID_UNSUPPORTED_CONFIGURATION')
  }
  return buildOpenGridBRep(parameters, {
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
    getOpenGridPrototype: context.getOpenGridPrototype,
    reportProgress: context.reportProgress,
    reportPhase: (phase, durationMs) => {
      if (phase === 'assembly-fuse' || phase === 'prototype-build') {
        context.reportPhase?.(phase, durationMs)
      }
    },
  })
}

async function buildOpenGridSnapModel(
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-snap')
  }
  return buildOpenGridSnap(parameters, {
    getOpenGridSnapReference: context.getOpenGridSnapReference,
    yieldToEventLoop: context.yieldToEventLoop,
    isGenerationCurrent: context.isGenerationCurrent,
  })
}

export const boxKernelDefinition: KernelModelDefinition = {
  id: 'box',
  build: buildBoxModel,
}

export const boxNormalKernelDefinition: KernelModelDefinition = {
  id: 'box-normal',
  build: buildBoxNormalModel,
}

export const modularGridBaseKernelDefinition: KernelModelDefinition = {
  id: 'modular-grid-base',
  build: buildModularGridBaseModel,
}

export const hswCellKernelDefinition: KernelModelDefinition = {
  id: 'hsw-cell',
  build: buildHswCellModel,
}

export const hexagonalColumnKernelDefinition: KernelModelDefinition = {
  id: 'hexagonal-column',
  build: buildHexagonalColumnModel,
}

export const opengridKernelDefinition: KernelModelDefinition = {
  id: 'opengrid',
  build: buildOpenGridModel,
}

export const opengridSnapKernelDefinition: KernelModelDefinition = {
  id: 'opengrid-snap',
  build: buildOpenGridSnapModel,
}

export const kernelModelDefinitions: ReadonlyArray<KernelModelDefinition> = [
  boxKernelDefinition,
  boxNormalKernelDefinition,
  modularGridBaseKernelDefinition,
  hswCellKernelDefinition,
  hexagonalColumnKernelDefinition,
  opengridKernelDefinition,
  opengridSnapKernelDefinition,
]

export function getKernelModelDefinition(
  modelId: ModelId,
): KernelModelDefinition | undefined {
  return kernelModelDefinitions.find((definition) => definition.id === modelId)
}

export async function buildModelBRep(
  modelId: ModelId,
  parameters: ModelParameterValues,
  context: KernelBuildContext,
): Promise<Shape3D> {
  const validation = validateModelParameters(modelId, parameters)
  if (!validation.valid) throw new Error('MODEL_PARAMETERS_INVALID')

  const definition = getKernelModelDefinition(modelId)
  if (!definition) throw new Error(`MODEL_DEFINITION_MISSING:${modelId}`)
  return definition.build(parameters, context)
}

import type { Shape3D } from 'replicad'
import type { ProgressUnit } from '../../cad-contract/messages'
import {
  isBoxParameters,
  isModularGridBaseParameters,
  validateModelParameters,
  type ModelId,
  type ModelParameterValues,
} from '../../cad-contract/units'
import { buildBoxBRep } from '../components/box/builder'
import { buildModularGridBase } from '../components/modular-grid-base/builder'

export type KernelBuildContext = {
  getModularGridBaseTemplate: () => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: ProgressUnit
  }) => void
  reportPhase?: (phase: KernelBuildPhase, durationMs: number) => void
}

export type KernelBuildPhase = 'clone-translate' | 'assembly-fuse' | 'fillet'

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

export const boxKernelDefinition: KernelModelDefinition = {
  id: 'box',
  build: buildBoxModel,
}

export const modularGridBaseKernelDefinition: KernelModelDefinition = {
  id: 'modular-grid-base',
  build: buildModularGridBaseModel,
}

export const kernelModelDefinitions: ReadonlyArray<KernelModelDefinition> = [
  boxKernelDefinition,
  modularGridBaseKernelDefinition,
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

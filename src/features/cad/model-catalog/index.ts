import type { ModelId } from '../../../cad-contract/units'
import { boxDefinition } from './components/box'
import { modularGridBaseDefinition } from './components/modular-grid-base'
import type { ModelDefinition } from './types'

export type { ModelDefinition, ParameterField } from './types'
export { boxDefinition } from './components/box'
export { modularGridBaseDefinition } from './components/modular-grid-base'

export const modelDefinitions: ReadonlyArray<ModelDefinition> = [
  boxDefinition,
  modularGridBaseDefinition,
]

export function getModelDefinition(
  modelId: ModelId,
): ModelDefinition | undefined {
  return modelDefinitions.find((definition) => definition.id === modelId)
}

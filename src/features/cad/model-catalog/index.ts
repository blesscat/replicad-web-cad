import type { ModelId } from '../../../cad-contract/units'
import { boxDefinition } from './components/box'
import { boxNormalDefinition } from './components/box-normal'
import { hexagonalColumnDefinition } from './components/hexagonal-column'
import { hswCellDefinition } from './components/hsw-cell'
import { modularGridBaseDefinition } from './components/modular-grid-base'
import { opengridDefinition } from './components/opengrid'
import type { ModelDefinition } from './types'

export { displayParameterLabel } from './labels'
export type { ModelDefinition, ParameterField } from './types'
export { boxDefinition } from './components/box'
export { boxNormalDefinition } from './components/box-normal'
export { hexagonalColumnDefinition } from './components/hexagonal-column'
export { hswCellDefinition } from './components/hsw-cell'
export { modularGridBaseDefinition } from './components/modular-grid-base'
export { opengridDefinition } from './components/opengrid'

export const modelDefinitions: ReadonlyArray<ModelDefinition> = [
  boxDefinition,
  boxNormalDefinition,
  modularGridBaseDefinition,
  hswCellDefinition,
  hexagonalColumnDefinition,
  opengridDefinition,
]

export function getModelDefinition(
  modelId: ModelId,
): ModelDefinition | undefined {
  return modelDefinitions.find((definition) => definition.id === modelId)
}

export function cadPathForModel(modelId: ModelId): string {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
  return `/cad/${definition.id}`
}

export function modelIdForCadPath(pathname: string): ModelId | undefined {
  const normalizedPath = pathname.replace(/\/+$/, '')
  const prefix = '/cad/'
  if (!normalizedPath.startsWith(prefix)) return undefined

  const slug = normalizedPath.slice(prefix.length)
  if (!slug || slug.includes('/')) return undefined

  return modelDefinitions.find((definition) => definition.id === slug)?.id
}

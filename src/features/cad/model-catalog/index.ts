import type { ModelId } from '../../../cad-contract/units'
import {
  systemContextQuery,
  systemContextLabelKey,
  type OpenGridSystemContext,
} from '../system-entry-context'
import { boxDefinition } from './components/box'
import { hexagonalColumnDefinition } from './components/hexagonal-column'
import { hswCellDefinition } from './components/hsw-cell'
import { modularGridBaseDefinition } from './components/modular-grid-base'
import { opengridDefinition } from './components/opengrid'
import { opengridDividerDefinition } from './components/opengrid-divider'
import { opengridOrganizerBoxDefinition } from './components/opengrid-organizer-box'
import { opengridStackableBoxDefinition } from './components/opengrid-stackable-box'
import { opengridStackableCylinderDefinition } from './components/opengrid-stackable-cylinder'
import { opengridSnapDefinition } from './components/opengrid-snap'
import { openGridSnapRemoverDefinition } from './components/opengrid-snap-remover'
import { opengridPillarDefinition } from './components/opengrid-pillar'
import { opengridOpenShelfDefinition } from './components/opengrid-open-shelf'
import type {
  ModelDefinition,
  ModelFamily,
  ModelFamilyGroup,
  ModelFamilyMetadata,
  ModelSelectionSubgroup,
} from './types'

export { displayParameterLabel } from './labels'
export { unitLabelFor } from './labels'
export type {
  ModelDefinition,
  ModelFamily,
  ModelFamilyGroup,
  ModelFamilyMetadata,
  ModelPreviewImage,
  ModelSelectionSubgroup,
  ParameterField,
  FixedStepDownload,
} from './types'
export type { OpenGridSystemContext } from '../system-entry-context'
export { boxDefinition } from './components/box'
export { hexagonalColumnDefinition } from './components/hexagonal-column'
export { hswCellDefinition } from './components/hsw-cell'
export { modularGridBaseDefinition } from './components/modular-grid-base'
export { opengridDefinition } from './components/opengrid'
export { opengridDividerDefinition } from './components/opengrid-divider'
export { opengridOrganizerBoxDefinition } from './components/opengrid-organizer-box'
export { opengridStackableBoxDefinition } from './components/opengrid-stackable-box'
export { opengridStackableCylinderDefinition } from './components/opengrid-stackable-cylinder'
export { opengridSnapDefinition } from './components/opengrid-snap'
export { openGridSnapRemoverDefinition } from './components/opengrid-snap-remover'
export { opengridPillarDefinition } from './components/opengrid-pillar'
export { opengridOpenShelfDefinition } from './components/opengrid-open-shelf'

export const modelDefinitions: ReadonlyArray<ModelDefinition> = [
  boxDefinition,
  modularGridBaseDefinition,
  hswCellDefinition,
  hexagonalColumnDefinition,
  opengridDefinition,
  opengridSnapDefinition,
  opengridPillarDefinition,
  opengridDividerDefinition,
  opengridOrganizerBoxDefinition,
  opengridStackableBoxDefinition,
  opengridStackableCylinderDefinition,
  openGridSnapRemoverDefinition,
  opengridOpenShelfDefinition,
]

export const modelFamilyOrder: ReadonlyArray<ModelFamily> = ['opengrid', 'hsw']

export const modelFamilyMetadata: Readonly<
  Record<ModelFamily, ModelFamilyMetadata>
> = {
  hsw: {
    key: 'hsw',
    label: 'models.family.hsw',
    description: 'models.family.hswDescription',
  },
  opengrid: {
    key: 'opengrid',
    label: 'models.family.opengrid',
    description: 'models.family.opengridDescription',
  },
  other: {
    key: 'other',
    label: 'models.family.other',
    description: 'models.family.otherDescription',
  },
}

function contextPreviewFor(
  definition: ModelDefinition,
  context: OpenGridSystemContext,
) {
  if (!definition.previewImage) return undefined
  return {
    ...definition.previewImage,
    src: `/model-previews/${definition.id}-${context}.png`,
    alt: definition.previewImage.alt,
  }
}

function entryForContext(
  definition: ModelDefinition,
  context: OpenGridSystemContext,
): ModelDefinition {
  return {
    ...definition,
    systemContext: context,
    previewImage: contextPreviewFor(definition, context),
  }
}

function openGridSubgroups(
  definitions: ReadonlyArray<ModelDefinition>,
): ReadonlyArray<ModelSelectionSubgroup> {
  const openGridDefinitions = definitions.filter(
    (definition) => definition.family === 'opengrid',
  )
  const desk = openGridDefinitions.map((definition) =>
    entryForContext(definition, 'desk'),
  )
  const wall = openGridDefinitions
    .filter(
      (definition) =>
        definition.id === 'opengrid' || definition.id === 'opengrid-snap',
    )
    .map((definition) => entryForContext(definition, 'wall'))
  return [
    {
      key: 'desk',
      label: 'models.context.desk',
      definitions: desk,
    },
    {
      key: 'wall',
      label: 'models.context.wall',
      definitions: wall,
    },
  ]
}

export function groupModelDefinitions(
  definitions: ReadonlyArray<ModelDefinition> = modelDefinitions,
): ReadonlyArray<ModelFamilyGroup> {
  return modelFamilyOrder.map((family) => {
    if (family === 'opengrid') {
      const subgroups = openGridSubgroups(definitions)
      return {
        ...modelFamilyMetadata[family],
        definitions: subgroups.flatMap((subgroup) => subgroup.definitions),
        subgroups,
      }
    }
    return {
      ...modelFamilyMetadata[family],
      definitions: definitions.filter(
        (definition) => definition.family === family,
      ),
    }
  })
}

export function modelSelectionLabelFor(definition: ModelDefinition): string {
  return definition.selectionLabel ?? definition.displayName
}

export function getModelDefinition(
  modelId: ModelId,
): ModelDefinition | undefined {
  return modelDefinitions.find((definition) => definition.id === modelId)
}

export function cadPathForModel(
  modelId: ModelId,
  systemContext?: OpenGridSystemContext,
): string {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
  return `/cad/${definition.id}${systemContextQuery(systemContext)}`
}

export function modelIdForCadPath(pathname: string): ModelId | undefined {
  const normalizedPath = pathname.replace(/\/+$/, '')
  const prefix = '/cad/'
  if (!normalizedPath.startsWith(prefix)) return undefined

  const slug = normalizedPath.slice(prefix.length)
  if (!slug || slug.includes('/')) return undefined

  return modelDefinitions.find((definition) => definition.id === slug)?.id
}

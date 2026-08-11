import {
  OPENGRID_CONFIGURATION,
  type ModelId,
  type ModelParameterValues,
  type OpenGridSnapParameters,
} from '../../../cad-contract/units'

export type OpenGridSystemContext = 'desk' | 'wall'

export const OPEN_GRID_SYSTEM_CONTEXTS: readonly OpenGridSystemContext[] = [
  'desk',
  'wall',
]

const SYSTEM_CONTEXT_LABELS: Record<OpenGridSystemContext, string> = {
  desk: 'Desk System',
  wall: 'Wall Related',
}

export function systemContextLabel(context: OpenGridSystemContext): string {
  return SYSTEM_CONTEXT_LABELS[context]
}

export function parseSystemContext(
  search: string,
): OpenGridSystemContext | undefined {
  const value = new URLSearchParams(search).get('system')
  if (value === 'desk' || value === 'wall') return value
  return undefined
}

export function systemContextForModel(
  modelId: ModelId,
  context: OpenGridSystemContext | undefined,
): OpenGridSystemContext | undefined {
  if (!context) return undefined
  const isOpenGridModel =
    modelId === 'opengrid' ||
    modelId === 'opengrid-snap' ||
    modelId === 'opengrid-pillar' ||
    modelId === 'opengrid-divider' ||
    modelId === 'opengrid-stackable-box' ||
    modelId === 'opengrid-stackable-cylinder' ||
    modelId === 'opengrid-snap-remover'
  if (!isOpenGridModel) return undefined
  if (
    context === 'wall' &&
    modelId !== 'opengrid' &&
    modelId !== 'opengrid-snap'
  ) {
    return undefined
  }
  return context
}

export function cloneModelParameters(
  parameters: ModelParameterValues,
): ModelParameterValues {
  if ('customScrewPositions' in parameters && 'chamferCorners' in parameters) {
    return {
      ...parameters,
      chamferCorners: { ...parameters.chamferCorners },
      connectorSides: { ...parameters.connectorSides },
      customScrewPositions: parameters.customScrewPositions.map((position) => ({
        ...position,
      })),
    }
  }
  return { ...parameters }
}

function snapPresetFor(context: OpenGridSystemContext): OpenGridSnapParameters {
  return {
    variant: context === 'desk' ? 'Lite' : 'Full',
    profile: 'Standard',
    offset: context === 'desk' ? 0.3 : 0,
    footprint: 'full',
    fourCornerLocatingHoles: context === 'desk',
    centerRemoverHole: context === 'desk',
  }
}

export function getSystemPreset(
  modelId: ModelId,
  context: OpenGridSystemContext,
): ModelParameterValues | undefined {
  if (modelId === 'opengrid-snap') return snapPresetFor(context)
  if (modelId === 'opengrid') {
    return cloneModelParameters({
      ...OPENGRID_CONFIGURATION.defaultParameters,
      customScrewPositions: [],
    })
  }
  return undefined
}

export function systemContextQuery(
  context: OpenGridSystemContext | undefined,
): string {
  return context ? `?system=${context}` : ''
}

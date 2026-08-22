import {
  OPENGRID_CONFIGURATION,
  OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
  type ModelId,
  type ModelParameterValues,
  type OpenGridParameters,
  type OpenGridSnapParameters,
} from '../../../cad-contract/units'

export type OpenGridSystemContext = 'desk' | 'wall'

export const OPEN_GRID_SYSTEM_CONTEXTS: readonly OpenGridSystemContext[] = [
  'desk',
  'wall',
]

const SYSTEM_CONTEXT_LABEL_KEYS: Record<OpenGridSystemContext, string> = {
  desk: 'models.context.desk',
  wall: 'models.context.wall',
}

export function systemContextLabelKey(context: OpenGridSystemContext): string {
  return SYSTEM_CONTEXT_LABEL_KEYS[context]
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
    modelId === 'opengrid-organizer-box' ||
    modelId === 'opengrid-stackable-box' ||
    modelId === 'opengrid-stackable-cylinder' ||
    modelId === 'opengrid-snap-remover' ||
    modelId === 'opengrid-open-shelf'
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
    offset: context === 'desk' ? 0.25 : 0,
    footprint: 'full',
    fourCornerLocatingHoles: context === 'desk',
    centerRemoverHole: context === 'desk',
    magnetHoleShape: 'none',
    magnetHoleLength: 0,
    magnetHoleWidth: 0,
    magnetHoleDiameter: 0,
    magnetHoleThickness: 0,
  }
}

export function getSystemPreset(
  modelId: ModelId,
  context: OpenGridSystemContext,
): ModelParameterValues | undefined {
  if (modelId === 'opengrid-snap') return snapPresetFor(context)
  if (modelId === 'opengrid-pillar' && context === 'desk') {
    return { mode: 'thin-shell', offset: 0 }
  }
  if (modelId === 'opengrid') {
    const boardParameters: OpenGridParameters = {
      ...OPENGRID_CONFIGURATION.defaultParameters,
      customScrewPositions: [],
    }
    if (context === 'desk') {
      boardParameters.rows = 4
      boardParameters.columns = 4
      boardParameters.chamfers = 'none'
      boardParameters.screwMode = 'none'
    }
    return cloneModelParameters(boardParameters)
  }
  if (context === 'desk' && modelId === 'opengrid-stackable-box') {
    return cloneModelParameters({
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 4,
      y: 2,
      height: 30,
      basePlateMode: false,
      thinShellMode: true,
    })
  }
  if (context === 'desk' && modelId === 'opengrid-organizer-box') {
    return cloneModelParameters({
      ...OPENGRID_ORGANIZER_BOX_DEFAULT_PARAMETERS,
      holeCountX: 2,
      holeCountY: 2,
      holeDepth: 30,
    })
  }
  if (context === 'desk' && modelId === 'opengrid-stackable-cylinder') {
    return cloneModelParameters({
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 60,
      height: 30,
      thinBottomMode: true,
      bottomPlateMode: false,
    })
  }
  return undefined
}

export function systemContextQuery(
  context: OpenGridSystemContext | undefined,
): string {
  return context ? `?system=${context}` : ''
}

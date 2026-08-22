import type { ModelId } from '../../cad-contract/units'
import { getModelDefinition } from '../cad/model-catalog'
import { localizedCadPathFor } from '../../i18n/routes'
import type { Locale } from '../../i18n'

export type DeskQuickStartRole =
  | 'board'
  | 'snap'
  | 'locating-post'
  | 'grid-box'
  | 'organizer-box'
  | 'round-box'

export type DeskQuickStartComponent = {
  readonly role: DeskQuickStartRole
  readonly modelId: ModelId
}

/**
 * The physical Desk workflow is intentionally kept separate from CAD
 * parameter schemas: a Snap and a locator describe how a container is used,
 * not just how an individual model is generated.
 */
export const deskQuickStartComponents = [
  { role: 'board', modelId: 'opengrid' },
  { role: 'snap', modelId: 'opengrid-snap' },
  { role: 'locating-post', modelId: 'opengrid-pillar' },
  { role: 'grid-box', modelId: 'opengrid-stackable-box' },
  { role: 'organizer-box', modelId: 'opengrid-organizer-box' },
  { role: 'round-box', modelId: 'opengrid-stackable-cylinder' },
] as const satisfies ReadonlyArray<DeskQuickStartComponent>

export type DeskQuickStartEntry = DeskQuickStartComponent & {
  readonly labelKey: string
  readonly descriptionKey: string
  readonly previewAltKey: string
  readonly previewPath: string
  readonly href: string
}

export function deskQuickStartEntries(
  locale: Locale,
): ReadonlyArray<DeskQuickStartEntry> {
  return deskQuickStartComponents.map((component) => {
    const definition = getModelDefinition(component.modelId)
    if (!definition) {
      throw new Error(`DESK_QUICK_START_MODEL_MISSING:${component.modelId}`)
    }

    return {
      ...component,
      labelKey: definition.selectionLabel ?? definition.displayName,
      descriptionKey: definition.selectionDescription,
      previewAltKey: definition.previewImage?.alt ?? definition.displayName,
      previewPath: `/model-previews/${component.modelId}-desk.png`,
      href: localizedCadPathFor(locale, component.modelId, 'desk'),
    }
  })
}

export function deskQuickStartEntryFor(
  locale: Locale,
  role: DeskQuickStartRole,
): DeskQuickStartEntry {
  const entry = deskQuickStartEntries(locale).find(
    (candidate) => candidate.role === role,
  )
  if (!entry) throw new Error(`DESK_QUICK_START_ROLE_MISSING:${role}`)
  return entry
}

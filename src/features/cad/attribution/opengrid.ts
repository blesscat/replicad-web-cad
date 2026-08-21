import type { ModelId } from '../../../cad-contract/units'

export const OPENGRID_SOURCE_REVISION =
  '61231295ea08c302eff32051769113c48cbda255'
export const OPENGRID_SOURCE_CODE_LICENSE_URL =
  'https://creativecommons.org/licenses/by-nc-sa/4.0/'
export const OPENGRID_DERIVED_PARTS_LICENSE_URL =
  'https://creativecommons.org/licenses/by/4.0/'
export const OPENGRID_DESIGNER_PROFILE_URL =
  'https://www.printables.com/@DavidD'

export type OpenGridAttributionAuthor = {
  label: string
  roleKey: string
  url?: string
}

export type OpenGridAttribution = {
  sourceUrl: string
  summaryKey: string
  creditsKey: string
  authors: readonly OpenGridAttributionAuthor[]
  modificationKey?: string
}

const DAVID_D_AUTHOR = {
  label: 'David D',
  roleKey: 'cad.attribution.author.designRole',
  url: OPENGRID_DESIGNER_PROFILE_URL,
} satisfies OpenGridAttributionAuthor

const OPENGRID_ATTRIBUTION_BY_MODEL_ID = {
  opengrid: {
    sourceUrl: `https://github.com/AndyLevesque/QuackWorks/blob/${OPENGRID_SOURCE_REVISION}/openGrid/openGrid.scad`,
    summaryKey: 'cad.attribution.opengrid.summary',
    creditsKey: 'cad.attribution.opengrid.credits',
    authors: [
      DAVID_D_AUTHOR,
      {
        label: 'BlackjackDuck (Andy)',
        roleKey: 'cad.attribution.author.openScadRole',
      },
    ],
  },
  'opengrid-snap': {
    sourceUrl: `https://github.com/AndyLevesque/QuackWorks/blob/${OPENGRID_SOURCE_REVISION}/openGrid/opengrid-snap.scad`,
    summaryKey: 'cad.attribution.snap.summary',
    creditsKey: 'cad.attribution.snap.credits',
    authors: [
      DAVID_D_AUTHOR,
      {
        label: 'metasyntactic',
        roleKey: 'cad.attribution.author.openScadRole',
      },
    ],
    modificationKey: 'cad.attribution.snap.modified',
  },
} satisfies Readonly<Record<'opengrid' | 'opengrid-snap', OpenGridAttribution>>

export function getOpenGridAttribution(
  modelId: ModelId,
): OpenGridAttribution | null {
  if (modelId !== 'opengrid' && modelId !== 'opengrid-snap') return null
  return OPENGRID_ATTRIBUTION_BY_MODEL_ID[modelId]
}

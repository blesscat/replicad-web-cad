import type { ModelId } from '../../../cad-contract/units'

export const OPENGRID_SOURCE_REVISION =
  '61231295ea08c302eff32051769113c48cbda255'
export const OPENGRID_SOURCE_CODE_LICENSE_URL =
  'https://creativecommons.org/licenses/by-nc-sa/4.0/'
export const OPENGRID_DERIVED_PARTS_LICENSE_URL =
  'https://creativecommons.org/licenses/by/4.0/'

export type OpenGridAttribution = {
  sourceUrl: string
  sourceRevision: string
  summaryKey: string
  creditsKey: string
  modificationKey?: string
}

const OPENGRID_ATTRIBUTION_BY_MODEL_ID = {
  opengrid: {
    sourceUrl: `https://github.com/AndyLevesque/QuackWorks/blob/${OPENGRID_SOURCE_REVISION}/openGrid/openGrid.scad`,
    sourceRevision: OPENGRID_SOURCE_REVISION,
    summaryKey: 'cad.attribution.opengrid.summary',
    creditsKey: 'cad.attribution.opengrid.credits',
  },
  'opengrid-snap': {
    sourceUrl: `https://github.com/AndyLevesque/QuackWorks/blob/${OPENGRID_SOURCE_REVISION}/openGrid/opengrid-snap.scad`,
    sourceRevision: OPENGRID_SOURCE_REVISION,
    summaryKey: 'cad.attribution.snap.summary',
    creditsKey: 'cad.attribution.snap.credits',
    modificationKey: 'cad.attribution.snap.modified',
  },
} satisfies Readonly<Record<'opengrid' | 'opengrid-snap', OpenGridAttribution>>

export function getOpenGridAttribution(
  modelId: ModelId,
): OpenGridAttribution | null {
  if (modelId !== 'opengrid' && modelId !== 'opengrid-snap') return null
  return OPENGRID_ATTRIBUTION_BY_MODEL_ID[modelId]
}

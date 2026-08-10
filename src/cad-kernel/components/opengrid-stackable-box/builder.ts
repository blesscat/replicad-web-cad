import { type Shape3D } from 'replicad'
import {
  validateOpenGridStackableBoxParameters,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  addMountingSockets,
  applyBasePlateMode,
  applyStackingProfile,
  addSideOpenings,
  makeBoxShell,
} from './geometry'
import {
  assertOpenGridStackableBoxGeometry,
  inspectOpenGridStackableBoxInterface,
} from './quality'
import {
  assertGenerationCurrent,
  type OpenGridStackableBoxBuildContext,
} from './shared'

export type { OpenGridStackableBoxBuildContext } from './shared'
export type { OpenGridStackableBoxBottomGridSeam } from './geometry'
export {
  assertOpenGridStackableBoxGeometry,
  inspectOpenGridStackableBoxInterface,
} from './quality'
export {
  assertOpenGridStackableBoxOpenings,
  inspectOpenGridStackableBoxOpenings,
} from './quality-openings'
export type { OpenGridStackableBoxOpeningQuality } from './quality-openings'
export type {
  OpenGridStackableBoxCaptiveSocketRecord,
  OpenGridStackableBoxInterfaceQualityReport,
  OpenGridStackableBoxMountingHoleProfile,
} from './quality'
export * from './snap-hold'

export function buildOpenGridStackableBox(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext = {},
): Shape3D {
  const validation = validateOpenGridStackableBoxParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  assertGenerationCurrent(context)

  let shape = makeBoxShell(parameters)
  assertGenerationCurrent(context)
  shape = applyStackingProfile(shape, parameters, context)
  shape = addMountingSockets(shape, parameters, context)
  shape = applyBasePlateMode(shape, parameters)
  shape = addSideOpenings(shape, parameters, context)
  assertGenerationCurrent(context)
  assertOpenGridStackableBoxGeometry(shape, parameters)
  return shape
}

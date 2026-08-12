import { makeCompound, type Shape3D } from 'replicad'
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
  deleteShape,
  type OpenGridStackableBoxBuildContext,
} from './shared'
import {
  makeOpenGridStackableBoxBottomHoneycombCutters,
  makeOpenGridStackableBoxSideHoneycombCutters,
} from '../../lattice/opengrid-honeycomb'
import { measureBooleanInScope } from '../../boolean-progress'

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
export { inspectOpenGridStackableBoxThinShell } from './quality-thin'
export type { OpenGridStackableBoxThinShellQualityReport } from './quality-thin'
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
  const normalizedParameters = validation.value
  assertGenerationCurrent(context)

  let shape = makeBoxShell(normalizedParameters, context.booleanOperations)
  assertGenerationCurrent(context)
  shape = applyStackingProfile(shape, normalizedParameters, context)
  if (
    normalizedParameters.basePlateMode &&
    normalizedParameters.cornerSeatMode === 'integrated'
  ) {
    shape = applyBasePlateMode(
      shape,
      normalizedParameters,
      context.booleanOperations,
    )
    shape = addMountingSockets(shape, normalizedParameters, context)
  } else {
    shape = addMountingSockets(shape, normalizedParameters, context)
    shape = applyBasePlateMode(
      shape,
      normalizedParameters,
      context.booleanOperations,
    )
  }
  shape = addSideOpenings(shape, normalizedParameters, context)
  shape = applyHoneycombMode(shape, normalizedParameters, context)
  assertGenerationCurrent(context)
  assertOpenGridStackableBoxGeometry(shape, normalizedParameters)
  return shape
}

function applyHoneycombMode(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  if (!parameters.honeycombMode) return shape
  assertGenerationCurrent(context)
  const cutters: Shape3D[] = []
  let cutter: Shape3D | null = null
  const scope = context.booleanOperations?.createScope(1)
  try {
    cutters.push(...makeOpenGridStackableBoxSideHoneycombCutters(parameters))
    assertGenerationCurrent(context)
    cutters.push(...makeOpenGridStackableBoxBottomHoneycombCutters(parameters))
    if (cutters.length === 0) return shape
    assertGenerationCurrent(context)
    cutter =
      cutters.length === 1
        ? (cutters[0] ?? null)
        : makeCompound(cutters).asShape3D()
    if (!cutter) throw new Error('OPENGRID_HONEYCOMB_CUTTER_EMPTY')
    const activeCutter = cutter
    const cut = measureBooleanInScope(scope, 'cut', () =>
      shape.cut(activeCutter),
    )
    deleteShape(shape)
    return cut
  } catch (error) {
    if (error instanceof Error && error.message === 'STALE_GENERATION') {
      throw error
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`OPENGRID_STACKABLE_BOX_HONEYCOMB_INVALID:${message}`)
  } finally {
    cutters.forEach(deleteShape)
    if (cutter !== cutters[0]) deleteShape(cutter)
  }
}

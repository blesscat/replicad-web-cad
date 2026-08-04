import { makeBox, type Solid } from 'replicad'
import { boundsForBox, type BoxParameters } from '../../../cad-contract/units'

export function buildBoxBRep(parameters: BoxParameters): Solid {
  const bounds = boundsForBox(parameters)
  return makeBox(bounds.min, bounds.max)
}

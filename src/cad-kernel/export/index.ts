import type { Shape3D } from 'replicad'
import { PROTOTYPE_CONFIGURATION } from '../../cad-contract/units'

export async function exportStepBytes(shape: Shape3D): Promise<ArrayBuffer> {
  const blob = shape.blobSTEP()
  const bytes = await blob.arrayBuffer()
  if (bytes.byteLength === 0) throw new Error('STEP_EMPTY')
  return bytes
}

export type StlExportOptions = {
  tolerance: number
  angularTolerance: number
}

export async function exportStlBytes(
  shape: Shape3D,
  options: StlExportOptions = {
    tolerance: PROTOTYPE_CONFIGURATION.stlTolerance,
    angularTolerance: PROTOTYPE_CONFIGURATION.stlAngularTolerance,
  },
): Promise<ArrayBuffer> {
  const blob = shape.blobSTL({ ...options, binary: true })
  const bytes = await blob.arrayBuffer()
  if (bytes.byteLength === 0) throw new Error('STL_EMPTY')
  return bytes
}

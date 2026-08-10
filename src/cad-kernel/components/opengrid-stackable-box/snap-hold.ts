import { importSTEP, type Shape3D } from 'replicad'
import {
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import { deleteShape, readBounds, type Bounds } from './shared'

export const OPEN_GRID_SNAP_HOLD_REFERENCE_URL = new URL(
  '../opengrid-snap/assets/opengrid-bare-lite-snap.step',
  import.meta.url,
)

function assertReferenceBounds(shape: Shape3D): void {
  const [[minX, minY, minZ], [maxX, maxY, maxZ]] = readBounds(shape)
  const dimensions = [maxX - minX, maxY - minY, maxZ - minZ]
  if (
    dimensions.some(
      (dimension) => !Number.isFinite(dimension) || dimension <= 0,
    ) ||
    minZ < -0.01
  ) {
    throw new Error('OPENGRID_SNAP_HOLD_REFERENCE_INVALID')
  }
}

export type OpenGridSnapHoldCylindricalInterface = {
  diameter: number
  center: [number, number]
  zRange: [number, number]
}

export type OpenGridSnapHoldCompatibilityReport = {
  referenceBounds: Bounds
  nominalInterfaces: OpenGridSnapHoldCylindricalInterface[]
  expectedSocketCenters: [number, number][]
  maximumCenterError: number
  minimumAxialSpan: number
}

function cylindricalInterfacesFor(
  reference: Shape3D,
): OpenGridSnapHoldCylindricalInterface[] {
  const interfaces: OpenGridSnapHoldCylindricalInterface[] = []
  for (const face of reference.faces) {
    try {
      if (face.surface.surfaceType !== 'CYLINDRE') continue
      const bounds = face.boundingBox
      try {
        const [[minX, minY, minZ], [maxX, maxY, maxZ]] = bounds.bounds as [
          [number, number, number],
          [number, number, number],
        ]
        const xSpan = maxX - minX
        const ySpan = maxY - minY
        const diameter = Math.max(xSpan, ySpan)
        if (
          Math.abs(
            diameter - OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter,
          ) <= 0.25 &&
          Math.abs(xSpan - ySpan) <= 0.1
        ) {
          interfaces.push({
            diameter,
            center: [(minX + maxX) / 2, (minY + maxY) / 2],
            zRange: [minZ, maxZ],
          })
        }
      } finally {
        bounds.delete()
      }
    } finally {
      face.delete()
    }
  }
  return interfaces
}

function maximumCenterError(
  expected: readonly [number, number][],
  actual: readonly OpenGridSnapHoldCylindricalInterface[],
): number {
  const remaining = [...actual]
  let maximumError = 0
  for (const expectedCenter of expected) {
    let closestIndex = -1
    let closestDistance = Number.POSITIVE_INFINITY
    for (let index = 0; index < remaining.length; index += 1) {
      const interfaceRecord = remaining[index]
      if (!interfaceRecord) continue
      const distance = Math.hypot(
        expectedCenter[0] - interfaceRecord.center[0],
        expectedCenter[1] - interfaceRecord.center[1],
      )
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    }
    if (closestIndex < 0) return Number.POSITIVE_INFINITY
    remaining.splice(closestIndex, 1)
    maximumError = Math.max(maximumError, closestDistance)
  }
  return maximumError
}

export function inspectOpenGridSnapHoldCompatibility(
  reference: Shape3D,
  parameters: OpenGridStackableBoxParameters = {
    x: 1,
    y: 1,
    height: 10,
    cornerBottomHoles: true,
    fullBottomHoleGrid: false,
  },
): OpenGridSnapHoldCompatibilityReport {
  assertReferenceBounds(reference)
  const nominalInterfaces = cylindricalInterfacesFor(reference)
  const expectedSocketCenters = openGridStackableBoxSocketCentersFor(parameters)
  if (nominalInterfaces.length < expectedSocketCenters.length) {
    throw new Error('OPENGRID_SNAP_HOLD_INTERFACE_DIAMETER_MISMATCH')
  }
  const centerError = maximumCenterError(
    expectedSocketCenters,
    nominalInterfaces,
  )
  const minimumAxialSpan = Math.min(
    ...nominalInterfaces.map((interfaceRecord) => {
      const [minZ, maxZ] = interfaceRecord.zRange
      return maxZ - minZ
    }),
  )
  return {
    referenceBounds: readBounds(reference),
    nominalInterfaces,
    expectedSocketCenters,
    maximumCenterError: centerError,
    minimumAxialSpan,
  }
}

export async function importOpenGridSnapHoldReference(
  blob: Blob,
): Promise<Shape3D> {
  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('OPENGRID_SNAP_HOLD_REFERENCE_INVALID')
  }
  try {
    assertReferenceBounds(imported)
    return imported
  } catch (error) {
    deleteShape(imported)
    throw error
  }
}

export async function loadOpenGridSnapHoldReference(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPEN_GRID_SNAP_HOLD_REFERENCE_URL)
  if (!response.ok) throw new Error('OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED')
  return importOpenGridSnapHoldReference(await response.blob())
}

export function assertOpenGridSnapHoldCompatibility(
  reference: Shape3D,
  parameters: OpenGridStackableBoxParameters = {
    x: 1,
    y: 1,
    height: 10,
    cornerBottomHoles: true,
    fullBottomHoleGrid: false,
  },
): void {
  const report = inspectOpenGridSnapHoldCompatibility(reference, parameters)
  if (
    report.maximumCenterError >
    OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleClearance
  ) {
    throw new Error('OPENGRID_SNAP_HOLD_INTERFACE_POSITION_MISMATCH')
  }

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const interfaceDiameterIsCompatible = report.nominalInterfaces.every(
    (interfaceRecord) =>
      interfaceRecord.diameter >= configuration.baseHoleDiameter - 0.05 &&
      interfaceRecord.diameter <=
        configuration.baseHoleDiameter + configuration.baseHoleClearance + 0.05,
  )
  if (!interfaceDiameterIsCompatible) {
    throw new Error('OPENGRID_SNAP_HOLD_INTERFACE_DIAMETER_MISMATCH')
  }
  if (
    report.minimumAxialSpan <
    configuration.baseShaftExposure - configuration.baseHoleClearance
  ) {
    throw new Error('OPENGRID_SNAP_HOLD_INSERTION_ENVELOPE_MISMATCH')
  }
}

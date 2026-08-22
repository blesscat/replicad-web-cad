import { importSTEP, makeCylinder, measureVolume, type Shape3D } from 'replicad'
import { OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION } from '../../../cad-contract/units'
import {
  countSolids,
  isBRepValid,
} from '../opengrid-stackable-box/quality-metrics'

export const OPEN_GRID_DETACHABLE_CORNER_SEAT_REFERENCE_URL = new URL(
  './assets/detachable-corner-seat.step',
  import.meta.url,
)

export const OPEN_GRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_URL = new URL(
  './assets/detachable-corner-seat-holder.step',
  import.meta.url,
)

type ReferenceKind = 'male' | 'female'

type ReferenceInspection = {
  bounds: number[][]
  volume: number
  solidCount: number
  valid: boolean
}

export type OpenGridDetachableCornerSeatCompatibilityReport = {
  male: ReferenceInspection
  female: ReferenceInspection
  intersectionVolume: number
}

export type OpenGridDetachableCornerSeatSocketPlacement = {
  center: [number, number]
  rotationDegrees: 0 | 90 | 180 | 270
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not replace the primary geometry diagnostic.
  }
}

function readBounds(shape: Shape3D): number[][] {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as number[][]
  } finally {
    boundingBox.delete()
  }
}

function inspectReference(shape: Shape3D): ReferenceInspection {
  return {
    bounds: readBounds(shape),
    volume: measureVolume(shape),
    solidCount: countSolids(shape),
    valid: isBRepValid(shape),
  }
}

function expectedReference(kind: ReferenceKind) {
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  return kind === 'male' ? configuration.male : configuration.female
}

function boundsMatch(
  actual: readonly (readonly number[])[],
  expected: { min: readonly number[]; max: readonly number[] },
): boolean {
  const expectedPoints = [expected.min, expected.max]
  const tolerance =
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.geometryTolerance
  return expectedPoints.every((expectedPoint, pointIndex) =>
    expectedPoint.every(
      (coordinate, coordinateIndex) =>
        Math.abs(
          (actual[pointIndex]?.[coordinateIndex] ?? Number.NaN) - coordinate,
        ) <= tolerance,
    ),
  )
}

function assertReference(shape: Shape3D, kind: ReferenceKind): void {
  const inspection = inspectReference(shape)
  const expected = expectedReference(kind)
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION
  const volumeMatches =
    Math.abs(inspection.volume - expected.nominalVolume) <=
    configuration.volumeTolerance
  if (
    inspection.solidCount !== 1 ||
    !inspection.valid ||
    !boundsMatch(inspection.bounds, expected.bounds) ||
    !volumeMatches
  ) {
    throw new Error(
      `OPENGRID_DETACHABLE_CORNER_SEAT_${kind.toUpperCase()}_REFERENCE_INVALID`,
    )
  }
}

export function assertOpenGridDetachableCornerSeatReference(
  shape: Shape3D,
): void {
  assertReference(shape, 'male')
}

export function assertOpenGridDetachableCornerSeatHolderReference(
  shape: Shape3D,
): void {
  assertReference(shape, 'female')
}

async function importReference(
  blob: Blob,
  kind: ReferenceKind,
): Promise<Shape3D> {
  let imported: Shape3D | null = null
  try {
    imported = (await importSTEP(blob)).asShape3D()
    assertReference(imported, kind)
    return imported
  } catch (error) {
    deleteShape(imported)
    if (
      error instanceof Error &&
      error.message.startsWith('OPENGRID_DETACHABLE_CORNER_SEAT_')
    ) {
      throw error
    }
    throw new Error(
      `OPENGRID_DETACHABLE_CORNER_SEAT_${kind.toUpperCase()}_REFERENCE_INVALID`,
      { cause: error },
    )
  }
}

export function importOpenGridDetachableCornerSeatReference(
  blob: Blob,
): Promise<Shape3D> {
  return importReference(blob, 'male')
}

export function importOpenGridDetachableCornerSeatHolderReference(
  blob: Blob,
): Promise<Shape3D> {
  return importReference(blob, 'female')
}

export async function loadOpenGridDetachableCornerSeatReference(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPEN_GRID_DETACHABLE_CORNER_SEAT_REFERENCE_URL)
  if (!response.ok) {
    throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_REFERENCE_LOAD_FAILED')
  }
  return importOpenGridDetachableCornerSeatReference(await response.blob())
}

export async function loadOpenGridDetachableCornerSeatHolderReference(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(
    OPEN_GRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_URL,
  )
  if (!response.ok) {
    throw new Error(
      'OPENGRID_DETACHABLE_CORNER_SEAT_HOLDER_REFERENCE_LOAD_FAILED',
    )
  }
  return importOpenGridDetachableCornerSeatHolderReference(
    await response.blob(),
  )
}

export function inspectOpenGridDetachableCornerSeatCompatibility(
  male: Shape3D,
  female: Shape3D,
): OpenGridDetachableCornerSeatCompatibilityReport {
  const intersection = male.intersect(female)
  try {
    return {
      male: inspectReference(male),
      female: inspectReference(female),
      intersectionVolume: measureVolume(intersection),
    }
  } finally {
    deleteShape(intersection)
  }
}

export function assertOpenGridDetachableCornerSeatCompatibility(
  male: Shape3D,
  female: Shape3D,
): OpenGridDetachableCornerSeatCompatibilityReport {
  assertReference(male, 'male')
  assertReference(female, 'female')
  const report = inspectOpenGridDetachableCornerSeatCompatibility(male, female)
  if (
    report.intersectionVolume >
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.intersectionVolumeTolerance
  ) {
    throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_REFERENCE_COLLISION')
  }
  return report
}

export function buildOpenGridDetachableCornerSeatSocketVoid(
  holderReference: Shape3D,
): Shape3D {
  assertReference(holderReference, 'female')
  const configuration = OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female
  const envelope = makeCylinder(
    configuration.outerDiameter / 2,
    configuration.depth,
    [0, 0, configuration.sourceMinZ],
  )
  const holder = holderReference.clone()
  try {
    const socketVoid = envelope.cut(holder)
    const volume = measureVolume(socketVoid)
    if (!Number.isFinite(volume) || volume <= 0 || !isBRepValid(socketVoid)) {
      deleteShape(socketVoid)
      throw new Error('OPENGRID_DETACHABLE_CORNER_SEAT_SOCKET_VOID_INVALID')
    }
    return socketVoid
  } finally {
    deleteShape(holder)
    deleteShape(envelope)
  }
}

function replaceOwnedShape(current: Shape3D, next: Shape3D): Shape3D {
  if (next !== current) deleteShape(current)
  return next
}

export function placeOpenGridDetachableCornerSeatSocketShape(
  source: Shape3D,
  placement: OpenGridDetachableCornerSeatSocketPlacement,
): Shape3D {
  const sourceMinZ =
    OPENGRID_DETACHABLE_CORNER_SEAT_CONFIGURATION.female.sourceMinZ
  let placed: Shape3D | null = null
  try {
    placed = source.clone()
    placed = replaceOwnedShape(placed, placed.translateZ(-sourceMinZ))
    if (placement.rotationDegrees !== 0) {
      placed = replaceOwnedShape(
        placed,
        placed.rotate(placement.rotationDegrees, [0, 0, 0], [0, 0, 1]),
      )
    }
    placed = replaceOwnedShape(
      placed,
      placed.translate(placement.center[0], placement.center[1], 0),
    )
    const result = placed
    placed = null
    return result
  } catch (error) {
    deleteShape(placed)
    throw error
  }
}

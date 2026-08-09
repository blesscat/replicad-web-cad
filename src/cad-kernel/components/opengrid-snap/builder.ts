import {
  deserializeShape,
  getOC,
  importSTEP,
  makeBox,
  makeCompound,
  measureVolume,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridSnap,
  isOpenGridSnapParameters,
  OPENGRID_SNAP_CONFIGURATION,
  type ModelBounds,
  type OpenGridSnapParameters,
  type OpenGridSnapVariant,
} from '../../../cad-contract/units'

export const OPENGRID_SNAP_REFERENCE_URLS: Readonly<
  Record<OpenGridSnapVariant, URL>
> = {
  Full: new URL('./assets/opengrid-hole-snap-full.step', import.meta.url),
  Lite: new URL('./assets/opengrid-bare-lite-snap.step', import.meta.url),
}

const ASSET_TOLERANCE = 0.01
const OUTER_TOUCH_TOLERANCE = 0.02
// OCC expands the Lite holder envelope by a deterministic tolerance while
// meshing the reassembled nine-solid compound. Pre-compensate the operation
// so the preview and exported B-Rep retain the requested outer dimensions.
const LITE_MESH_BOUNDARY_MARGIN = 0.135
const FULL_TRIM_BOUNDARY_MARGIN = 0.055
const HALF_TRIM_BOUNDARY_MARGIN = 0.14

type PointTuple = [number, number, number]
type BoundsTuple = [PointTuple, PointTuple]

export type OpenGridSnapBuildContext = {
  getOpenGridSnapReference?: (variant: OpenGridSnapVariant) => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
}

export type OpenGridSnapReferenceReport = {
  variant: OpenGridSnapVariant
  bounds: ModelBounds
  solidCount: number
  height: number
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the original import or geometry error.
  }
}

function assertGenerationCurrent(context: OpenGridSnapBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

function readBounds(shape: Shape3D): ModelBounds {
  const boundingBox = shape.boundingBox
  try {
    const [min, max] = boundingBox.bounds as BoundsTuple
    return { min: [...min], max: [...max] }
  } finally {
    boundingBox.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= ASSET_TOLERANCE
}

function boundsMatch(actual: ModelBounds, expected: ModelBounds): boolean {
  return [...actual.min, ...actual.max].every((coordinate, index) => {
    const expectedCoordinate = [...expected.min, ...expected.max][index]
    return isClose(coordinate, expectedCoordinate)
  })
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

function assertMillimetreStepUnits(source: string): void {
  const compactSource = source.replace(/\s+/g, '')
  if (
    !compactSource.includes(
      'LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.)',
    )
  ) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_UNITS')
  }
}

function expectedReferenceBounds(variant: OpenGridSnapVariant): ModelBounds {
  return {
    min: [
      -OPENGRID_SNAP_CONFIGURATION.nominalWidth / 2,
      -OPENGRID_SNAP_CONFIGURATION.nominalDepth / 2,
      0,
    ],
    max: [
      OPENGRID_SNAP_CONFIGURATION.nominalWidth / 2,
      OPENGRID_SNAP_CONFIGURATION.nominalDepth / 2,
      OPENGRID_SNAP_CONFIGURATION.variantHeights[variant],
    ],
  }
}

function assertReferenceGeometry(
  shape: Shape3D,
  variant: OpenGridSnapVariant,
): OpenGridSnapReferenceReport {
  const bounds = readBounds(shape)
  const expected = expectedReferenceBounds(variant)
  if (!boundsMatch(bounds, expected)) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_BOUNDS')
  }

  const solidCount = countSolids(shape)
  if (solidCount !== 9) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_SOLID_COUNT')
  }
  if (!isClose(bounds.min[0], -bounds.max[0])) {
    throw new Error('OPENGRID_SNAP_ASSET_NOT_CENTERED_X')
  }
  if (!isClose(bounds.min[1], -bounds.max[1])) {
    throw new Error('OPENGRID_SNAP_ASSET_NOT_CENTERED_Y')
  }
  if (!isClose(bounds.min[2], 0)) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_BASE_Z')
  }

  return {
    variant,
    bounds,
    solidCount,
    height: bounds.max[2] - bounds.min[2],
  }
}

function extractSolids(shape: Shape3D): Solid[] {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, solidType, shapeType)
  const solids: Solid[] = []
  try {
    while (explorer.More()) {
      solids.push(new Solid(oc.TopoDS.Solid_1(explorer.Current())))
      explorer.Next()
    }
    return solids
  } catch (error) {
    for (const solid of solids) deleteShape(solid)
    throw error
  } finally {
    explorer.delete()
  }
}

function centralSolidIndex(solids: readonly Solid[]): number {
  let centralIndex = -1
  let centralVolume = -Infinity
  for (let index = 0; index < solids.length; index += 1) {
    const volume = measureVolume(solids[index])
    if (volume > centralVolume) {
      centralVolume = volume
      centralIndex = index
    }
  }
  if (centralIndex < 0) throw new Error('OPENGRID_SNAP_CENTRAL_SOLID_MISSING')
  return centralIndex
}

function touchesMinimum(value: number, source: number): boolean {
  return Math.abs(value - source) <= OUTER_TOUCH_TOLERANCE
}

function touchesMaximum(value: number, source: number): boolean {
  return Math.abs(value - source) <= OUTER_TOUCH_TOLERANCE
}

function fuseExtension(
  current: Shape3D,
  extension: Shape3D,
  owned: Set<Shape3D>,
): Shape3D {
  try {
    const fused = current.fuse(extension, { optimisation: 'none' })
    if (fused !== current) {
      owned.delete(current)
      deleteShape(current)
      owned.add(fused)
    }
    return fused
  } finally {
    deleteShape(extension)
  }
}

function extendOuterHolder(
  solid: Solid,
  sourceBounds: ModelBounds,
  targetBounds: ModelBounds,
  owned: Set<Shape3D>,
): Shape3D {
  let result: Shape3D = solid
  const currentBounds = readBounds(solid)
  const zMin = currentBounds.min[2] + OUTER_TOUCH_TOLERANCE * 10
  const zMax = currentBounds.max[2] - OUTER_TOUCH_TOLERANCE * 10
  if (zMax <= zMin) {
    throw new Error('OPENGRID_SNAP_OUTER_SOLID_TOO_THIN')
  }

  if (
    targetBounds.min[0] < sourceBounds.min[0] &&
    touchesMinimum(currentBounds.min[0], sourceBounds.min[0])
  ) {
    result = fuseExtension(
      result,
      makeBox(
        [targetBounds.min[0], currentBounds.min[1], zMin],
        [
          currentBounds.min[0] + OUTER_TOUCH_TOLERANCE,
          currentBounds.max[1],
          zMax,
        ],
      ),
      owned,
    )
  }
  if (
    targetBounds.max[0] > sourceBounds.max[0] &&
    touchesMaximum(currentBounds.max[0], sourceBounds.max[0])
  ) {
    result = fuseExtension(
      result,
      makeBox(
        [
          currentBounds.max[0] - OUTER_TOUCH_TOLERANCE,
          currentBounds.min[1],
          zMin,
        ],
        [targetBounds.max[0], currentBounds.max[1], zMax],
      ),
      owned,
    )
  }
  if (
    targetBounds.min[1] < sourceBounds.min[1] &&
    touchesMinimum(currentBounds.min[1], sourceBounds.min[1])
  ) {
    result = fuseExtension(
      result,
      makeBox(
        [currentBounds.min[0], targetBounds.min[1], zMin],
        [
          currentBounds.max[0],
          currentBounds.min[1] + OUTER_TOUCH_TOLERANCE,
          zMax,
        ],
      ),
      owned,
    )
  }
  if (
    targetBounds.max[1] > sourceBounds.max[1] &&
    touchesMaximum(currentBounds.max[1], sourceBounds.max[1])
  ) {
    result = fuseExtension(
      result,
      makeBox(
        [
          currentBounds.min[0],
          currentBounds.max[1] - OUTER_TOUCH_TOLERANCE,
          zMin,
        ],
        [currentBounds.max[0], targetBounds.max[1], zMax],
      ),
      owned,
    )
  }

  const shrinksX =
    targetBounds.min[0] > sourceBounds.min[0] ||
    targetBounds.max[0] < sourceBounds.max[0]
  const shrinksY =
    targetBounds.min[1] > sourceBounds.min[1] ||
    targetBounds.max[1] < sourceBounds.max[1]
  if (shrinksX || shrinksY) {
    const clippingBox = makeBox(
      [targetBounds.min[0], targetBounds.min[1], sourceBounds.min[2]],
      [targetBounds.max[0], targetBounds.max[1], sourceBounds.max[2]],
    )
    let clipped: Shape3D
    try {
      clipped = result.intersect(clippingBox)
    } finally {
      deleteShape(clippingBox)
    }
    if (clipped !== result) {
      owned.delete(result)
      deleteShape(result)
      owned.add(clipped)
    }
    result = clipped
  }

  return result
}

function translateOuterHolder(
  solid: Solid,
  sourceBounds: ModelBounds,
  targetBounds: ModelBounds,
  owned: Set<Shape3D>,
): Shape3D {
  const currentBounds = readBounds(solid)
  let xDistance = 0
  let yDistance = 0

  if (touchesMinimum(currentBounds.min[0], sourceBounds.min[0])) {
    xDistance = targetBounds.min[0] - sourceBounds.min[0]
  } else if (touchesMaximum(currentBounds.max[0], sourceBounds.max[0])) {
    xDistance = targetBounds.max[0] - sourceBounds.max[0]
  }
  if (touchesMinimum(currentBounds.min[1], sourceBounds.min[1])) {
    yDistance = targetBounds.min[1] - sourceBounds.min[1]
  } else if (touchesMaximum(currentBounds.max[1], sourceBounds.max[1])) {
    yDistance = targetBounds.max[1] - sourceBounds.max[1]
  }

  if (xDistance === 0 && yDistance === 0) return solid
  const translated = solid.translate(xDistance, yDistance, 0)
  if (translated !== solid) {
    owned.delete(solid)
    deleteShape(solid)
    owned.add(translated)
  }
  return translated
}

function cloneImportedAssembly(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
}

type SnapHalfCellClip = {
  bounds: ModelBounds
  translation: [number, number]
}

function snapHalfCellClip(
  sourceBounds: ModelBounds,
  parameters: OpenGridSnapParameters,
): SnapHalfCellClip {
  const clipMinX =
    parameters.halfCellX === 'right'
      ? 0
      : sourceBounds.min[0] + HALF_TRIM_BOUNDARY_MARGIN
  const clipMaxX =
    parameters.halfCellX === 'left'
      ? 0
      : sourceBounds.max[0] - HALF_TRIM_BOUNDARY_MARGIN
  const clipMinY =
    parameters.halfCellY === 'top'
      ? 0
      : sourceBounds.min[1] + HALF_TRIM_BOUNDARY_MARGIN
  const clipMaxY =
    parameters.halfCellY === 'bottom'
      ? 0
      : sourceBounds.max[1] - HALF_TRIM_BOUNDARY_MARGIN

  return {
    bounds: {
      min: [clipMinX, clipMinY, sourceBounds.min[2]],
      max: [clipMaxX, clipMaxY, sourceBounds.max[2]],
    },
    translation: [-(clipMinX + clipMaxX) / 2, -(clipMinY + clipMaxY) / 2],
  }
}

function halfCellSupportShapes(targetBounds: ModelBounds): Shape3D[] {
  const supportWidth = 0.2
  const zMin = targetBounds.min[2]
  const zMax = targetBounds.max[2]
  return [
    makeBox(
      [targetBounds.min[0], targetBounds.min[1], zMin],
      [targetBounds.min[0] + supportWidth, targetBounds.max[1], zMax],
    ),
    makeBox(
      [targetBounds.max[0] - supportWidth, targetBounds.min[1], zMin],
      [targetBounds.max[0], targetBounds.max[1], zMax],
    ),
    makeBox(
      [targetBounds.min[0], targetBounds.min[1], zMin],
      [targetBounds.max[0], targetBounds.min[1] + supportWidth, zMax],
    ),
    makeBox(
      [targetBounds.min[0], targetBounds.max[1] - supportWidth, zMin],
      [targetBounds.max[0], targetBounds.max[1], zMax],
    ),
  ]
}

async function buildHalfCellSnapAssembly(
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
  context: OpenGridSnapBuildContext,
): Promise<Shape3D> {
  const sourceBounds = readBounds(reference)
  const targetBounds = boundsForOpenGridSnap(parameters)
  const clip = snapHalfCellClip(sourceBounds, parameters)
  const clippingBox = makeBox(clip.bounds.min, clip.bounds.max)
  const sourceSolids = extractSolids(reference)
  const owned = new Set<Shape3D>(sourceSolids)
  const output: Shape3D[] = []

  try {
    for (const solid of sourceSolids) {
      assertGenerationCurrent(context)
      let generated: Shape3D = solid
      const clipped = generated.intersect(clippingBox)
      if (clipped !== generated) {
        owned.delete(generated)
        deleteShape(generated)
        generated = clipped
        owned.add(generated)
      }
      if (measureVolume(generated) <= ASSET_TOLERANCE) {
        owned.delete(generated)
        deleteShape(generated)
        continue
      }
      const translated = generated.translate(
        clip.translation[0],
        clip.translation[1],
        0,
      )
      if (translated !== generated) {
        owned.delete(generated)
        deleteShape(generated)
        generated = translated
        owned.add(generated)
      }
      output.push(generated)
      await context.yieldToEventLoop?.()
      assertGenerationCurrent(context)
    }

    if (output.length === 0) {
      throw new Error('OPENGRID_SNAP_HALF_ASSEMBLY_EMPTY')
    }

    for (const support of halfCellSupportShapes(targetBounds)) {
      output.push(support)
      owned.add(support)
    }
    assertGenerationCurrent(context)
    const compound = makeCompound(output)
    try {
      const result = compound.asShape3D()
      owned.clear()
      return result
    } catch (error) {
      deleteShape(compound)
      throw error
    }
  } catch (error) {
    for (const shape of owned) deleteShape(shape)
    throw error
  } finally {
    deleteShape(clippingBox)
  }
}

export async function importOpenGridSnapReference(
  blob: Blob,
  variant: OpenGridSnapVariant,
): Promise<Shape3D> {
  let source: string
  try {
    source = await blob.text()
  } catch {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID')
  }
  assertMillimetreStepUnits(source)

  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID')
  }

  try {
    assertReferenceGeometry(imported, variant)
    return imported
  } catch (error) {
    deleteShape(imported)
    throw error
  }
}

export async function loadOpenGridSnapReference(
  variant: OpenGridSnapVariant,
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPENGRID_SNAP_REFERENCE_URLS[variant])
  if (!response.ok) throw new Error('OPENGRID_SNAP_ASSET_LOAD_FAILED')
  return importOpenGridSnapReference(await response.blob(), variant)
}

export function inspectOpenGridSnapReference(
  shape: Shape3D,
  variant: OpenGridSnapVariant,
): OpenGridSnapReferenceReport {
  return assertReferenceGeometry(shape, variant)
}

export async function buildOpenGridSnap(
  parameters: OpenGridSnapParameters,
  context: OpenGridSnapBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridSnapParameters(parameters)) {
    throw new Error('OPENGRID_SNAP_PARAMETERS_INVALID')
  }
  if (!context.getOpenGridSnapReference) {
    throw new Error('OPENGRID_SNAP_ASSET_REFERENCE_MISSING')
  }

  assertGenerationCurrent(context)
  const reference = await context.getOpenGridSnapReference(parameters.variant)
  assertGenerationCurrent(context)

  const hasHalfCell =
    parameters.halfCellX !== 'none' || parameters.halfCellY !== 'none'
  if (parameters.offset === 0 && !hasHalfCell) {
    return cloneImportedAssembly(reference)
  }
  if (hasHalfCell) {
    return buildHalfCellSnapAssembly(reference, parameters, context)
  }

  const sourceBounds = readBounds(reference)
  const targetBounds = boundsForOpenGridSnap(parameters)
  let operationMinX = targetBounds.min[0]
  let operationMinY = targetBounds.min[1]
  let operationMaxX = targetBounds.max[0]
  let operationMaxY = targetBounds.max[1]
  if (parameters.variant === 'Lite') {
    operationMinX += LITE_MESH_BOUNDARY_MARGIN
    operationMaxX -= LITE_MESH_BOUNDARY_MARGIN
    operationMinY += LITE_MESH_BOUNDARY_MARGIN
    operationMaxY -= LITE_MESH_BOUNDARY_MARGIN
  }
  if (parameters.variant === 'Full') {
    if (parameters.offset < 0) {
      operationMinX += FULL_TRIM_BOUNDARY_MARGIN
      operationMaxX -= FULL_TRIM_BOUNDARY_MARGIN
      operationMinY += FULL_TRIM_BOUNDARY_MARGIN
      operationMaxY -= FULL_TRIM_BOUNDARY_MARGIN
    }
  }
  const operationBounds: ModelBounds = {
    min: [operationMinX, operationMinY, targetBounds.min[2]],
    max: [operationMaxX, operationMaxY, targetBounds.max[2]],
  }
  const sourceSolids = extractSolids(reference)
  if (sourceSolids.length !== 9) {
    for (const solid of sourceSolids) deleteShape(solid)
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_SOLID_COUNT')
  }

  const owned = new Set<Shape3D>(sourceSolids)
  let centralIndex: number
  try {
    centralIndex = centralSolidIndex(sourceSolids)
  } catch (error) {
    for (const solid of sourceSolids) deleteShape(solid)
    throw error
  }
  const output: Shape3D[] = []

  try {
    for (let index = 0; index < sourceSolids.length; index += 1) {
      assertGenerationCurrent(context)
      const solid = sourceSolids[index]
      if (!solid) throw new Error('OPENGRID_SNAP_SOLID_MISSING')
      let generated: Shape3D
      if (index === centralIndex) {
        generated = solid
      } else if (parameters.variant === 'Lite') {
        generated = translateOuterHolder(
          solid,
          sourceBounds,
          operationBounds,
          owned,
        )
      } else {
        generated = extendOuterHolder(
          solid,
          sourceBounds,
          operationBounds,
          owned,
        )
      }
      output.push(generated)
      await context.yieldToEventLoop?.()
    }

    assertGenerationCurrent(context)
    const result = makeCompound(output).asShape3D()
    owned.clear()
    return result
  } catch (error) {
    for (const shape of owned) deleteShape(shape)
    throw error
  }
}

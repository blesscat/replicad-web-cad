import {
  deserializeShape,
  getOC,
  importSTEP,
  makeBox,
  makeCompound,
  makeCylinder,
  measureVolume,
  Sketcher,
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
  type OpenGridSnapProfile,
  type OpenGridSnapVariant,
} from '../../../cad-contract/units'
import {
  openGridSnapLocatingHoleCentersFor,
  openGridSnapProfileFor,
  type OpenGridSnapProfileDefinition,
} from './profile'

export const OPENGRID_SNAP_REFERENCE_URLS: Readonly<
  Record<OpenGridSnapProfile, Record<OpenGridSnapVariant, URL>>
> = {
  Standard: {
    Full: openGridSnapProfileFor('Standard', 'Full').assetUrl,
    Lite: openGridSnapProfileFor('Standard', 'Lite').assetUrl,
  },
  Directional: {
    Full: openGridSnapProfileFor('Directional', 'Full').assetUrl,
    Lite: openGridSnapProfileFor('Directional', 'Lite').assetUrl,
  },
}

const ASSET_TOLERANCE = 0.05
const OUTER_TOUCH_TOLERANCE = 0.02
const HALF_BOUNDARY_LOCK_CORNER = 0.8
const HALF_BOUNDARY_LOCK_CHAMFER = 0.4
const FEATURE_CUTTER_MARGIN = 0.2

type PointTuple = [number, number, number]
type BoundsTuple = [PointTuple, PointTuple]

export type OpenGridSnapBuildContext = {
  getOpenGridSnapReference?: (
    variant: OpenGridSnapVariant,
    profile: OpenGridSnapProfile,
  ) => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
}

export type OpenGridSnapReferenceReport = {
  variant: OpenGridSnapVariant
  profile: OpenGridSnapProfile
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

function assertReferenceGeometry(
  shape: Shape3D,
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile,
): OpenGridSnapReferenceReport {
  const definition = openGridSnapProfileFor(profile, variant)
  const bounds = readBounds(shape)
  if (!boundsMatch(bounds, definition.expectedBounds)) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_BOUNDS')
  }

  const solidCount = countSolids(shape)
  if (solidCount !== definition.expectedSolidCount) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_SOLID_COUNT')
  }
  if (profile === 'Standard') {
    if (!isClose(bounds.min[0], -bounds.max[0])) {
      throw new Error('OPENGRID_SNAP_ASSET_NOT_CENTERED_X')
    }
    if (!isClose(bounds.min[1], -bounds.max[1])) {
      throw new Error('OPENGRID_SNAP_ASSET_NOT_CENTERED_Y')
    }
  }
  if (!isClose(bounds.min[2], definition.expectedBounds.min[2])) {
    throw new Error('OPENGRID_SNAP_ASSET_INVALID_BASE_Z')
  }

  return {
    variant,
    profile,
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
    const solid = solids[index]
    if (!solid) continue
    const volume = measureVolume(solid)
    if (volume > centralVolume) {
      centralVolume = volume
      centralIndex = index
    }
  }
  if (centralIndex < 0) throw new Error('OPENGRID_SNAP_CENTRAL_SOLID_MISSING')
  return centralIndex
}

function cloneImportedAssembly(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
}

function cutShape(source: Shape3D, cutter: Shape3D): Shape3D {
  const result = source.cut(cutter)
  if (result !== source) deleteShape(source)
  deleteShape(cutter)
  return result
}

function featureCutterHeight(
  definition: OpenGridSnapProfileDefinition,
): number {
  return definition.expectedBounds.max[2] - definition.expectedBounds.min[2] + 2
}

function makeCenterRemoverCutter(
  definition: OpenGridSnapProfileDefinition,
): Shape3D {
  const baseZ = definition.expectedBounds.min[2] - 1
  const topZ = definition.expectedBounds.max[2] + 1
  const lower = makeBox(
    [
      -definition.centerRemoverLowerHalfWidth,
      -definition.centerRemoverHalfDepth,
      baseZ,
    ],
    [
      definition.centerRemoverLowerHalfWidth,
      definition.centerRemoverHalfDepth,
      definition.centerRemoverStepZ,
    ],
  )
  const upper = makeBox(
    [
      -definition.centerRemoverUpperHalfWidth,
      -definition.centerRemoverHalfDepth,
      definition.centerRemoverStepZ,
    ],
    [
      definition.centerRemoverUpperHalfWidth,
      definition.centerRemoverHalfDepth,
      topZ,
    ],
  )
  const cutter = lower.fuse(upper)
  if (cutter !== lower) deleteShape(lower)
  deleteShape(upper)
  return cutter
}

function applyBodyFeatures(
  body: Shape3D,
  parameters: OpenGridSnapParameters,
  definition: OpenGridSnapProfileDefinition,
): Shape3D {
  const supportsCornerHoles = definition.optionalFeatures.includes(
    'fourCornerLocatingHoles',
  )
  const supportsCenterRemover =
    definition.optionalFeatures.includes('centerRemoverHole')
  if (
    parameters.fourCornerLocatingHoles &&
    (!supportsCornerHoles ||
      definition.intrinsicFeatures.includes('fourCornerLocatingHoles'))
  ) {
    throw new Error('OPENGRID_SNAP_OPTIONAL_FEATURE_DUPLICATE')
  }
  if (
    parameters.centerRemoverHole &&
    (!supportsCenterRemover ||
      definition.intrinsicFeatures.includes('centerRemoverHole'))
  ) {
    throw new Error('OPENGRID_SNAP_OPTIONAL_FEATURE_DUPLICATE')
  }

  let result = body
  const height = featureCutterHeight(definition)
  const baseZ = definition.expectedBounds.min[2] - 1

  if (parameters.fourCornerLocatingHoles) {
    for (const [x, y] of openGridSnapLocatingHoleCentersFor(definition)) {
      const cutter = makeCylinder(definition.locatingHoleRadius, height, [
        x,
        y,
        baseZ,
      ])
      result = cutShape(result, cutter)
    }
  }

  if (parameters.centerRemoverHole) {
    result = cutShape(result, makeCenterRemoverCutter(definition))
  }

  return result
}

type StandardAssemblyParts = {
  body: Solid
  sideHolders: Solid[]
  snaps: Solid[]
}

function buildStandardAssemblyParts(
  reference: Shape3D,
  definition: OpenGridSnapProfileDefinition,
): StandardAssemblyParts {
  const assembly = cloneImportedAssembly(reference)
  const solids = extractSolids(assembly)
  try {
    if (solids.length !== definition.expectedSolidCount) {
      throw new Error('OPENGRID_SNAP_STANDARD_ASSEMBLY_INVALID')
    }
    const centralIndex = centralSolidIndex(solids)
    const body = solids[centralIndex]
    if (!body) throw new Error('OPENGRID_SNAP_SOLID_MISSING')
    const outerSolids = solids.filter((_, index) => index !== centralIndex)
    const snaps = outerSolids.filter((solid) => {
      const bounds = readBounds(solid)
      return bounds.min[2] >= definition.snapLayerMinZ - ASSET_TOLERANCE
    })
    const sideHolders = outerSolids.filter((solid) => {
      const bounds = readBounds(solid)
      return (
        !snaps.includes(solid) &&
        bounds.min[2] >= definition.sideHolderLayerMinZ - ASSET_TOLERANCE
      )
    })
    if (sideHolders.length !== 4 || snaps.length !== 4) {
      throw new Error('OPENGRID_SNAP_STANDARD_ASSEMBLY_PARTS_INVALID')
    }
    deleteShape(assembly)
    return { body, sideHolders, snaps }
  } catch (error) {
    deleteShape(assembly)
    for (const solid of solids) deleteShape(solid)
    throw error
  }
}

function composeStandardAssembly(
  parts: StandardAssemblyParts,
  parameters: OpenGridSnapParameters,
  definition: OpenGridSnapProfileDefinition,
): Shape3D {
  const body = applyBodyFeatures(parts.body, parameters, definition)
  const output: Shape3D[] = [body, ...parts.sideHolders, ...parts.snaps]
  try {
    return makeCompound(output).asShape3D()
  } catch (error) {
    for (const shape of output) deleteShape(shape)
    throw error
  }
}

function buildDirectionalAssembly(
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
  definition: OpenGridSnapProfileDefinition,
): Shape3D {
  const assembly = cloneImportedAssembly(reference)
  if (!parameters.fourCornerLocatingHoles && !parameters.centerRemoverHole) {
    return assembly
  }

  const solids = extractSolids(assembly)
  if (solids.length !== definition.expectedSolidCount) {
    deleteShape(assembly)
    for (const solid of solids) deleteShape(solid)
    throw new Error('OPENGRID_SNAP_DIRECTIONAL_ASSEMBLY_INVALID')
  }
  const solid = solids[0]
  if (!solid) {
    deleteShape(assembly)
    throw new Error('OPENGRID_SNAP_SOLID_MISSING')
  }
  deleteShape(assembly)
  return applyBodyFeatures(solid, parameters, definition)
}

function buildFeatureAssembly(
  reference: Shape3D,
  parameters: OpenGridSnapParameters,
): Shape3D {
  const definition = openGridSnapProfileFor(
    parameters.profile,
    parameters.variant,
  )
  if (parameters.profile === 'Directional') {
    return buildDirectionalAssembly(reference, parameters, definition)
  }

  const parts = buildStandardAssemblyParts(reference, definition)
  return composeStandardAssembly(parts, parameters, definition)
}

function touchesMinimum(value: number, source: number): boolean {
  return Math.abs(value - source) <= OUTER_TOUCH_TOLERANCE
}

function touchesMaximum(value: number, source: number): boolean {
  return Math.abs(value - source) <= OUTER_TOUCH_TOLERANCE
}

function fuseExtension(current: Shape3D, extension: Shape3D): Shape3D {
  const fused = current.fuse(extension, { optimisation: 'none' })
  if (fused !== current) deleteShape(current)
  deleteShape(extension)
  return fused
}

function extendOuterSolid(
  solid: Solid,
  sourceBounds: ModelBounds,
  targetBounds: ModelBounds,
): Shape3D {
  let result: Shape3D = solid
  const currentBounds = readBounds(solid)
  const zMin = currentBounds.min[2] + OUTER_TOUCH_TOLERANCE
  const zMax = currentBounds.max[2] - OUTER_TOUCH_TOLERANCE
  if (zMax <= zMin) return result

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
    )
  }
  return result
}

function extendDirectionalAssembly(
  assembly: Shape3D,
  sourceBounds: ModelBounds,
  targetBounds: ModelBounds,
): Shape3D {
  let result = assembly
  const zMin = sourceBounds.min[2]
  const zMax = sourceBounds.max[2]
  if (targetBounds.min[0] < sourceBounds.min[0]) {
    result = fuseExtension(
      result,
      makeBox(
        [targetBounds.min[0], sourceBounds.min[1], zMin],
        [
          sourceBounds.min[0] + FEATURE_CUTTER_MARGIN,
          sourceBounds.max[1],
          zMax,
        ],
      ),
    )
  }
  if (targetBounds.max[0] > sourceBounds.max[0]) {
    result = fuseExtension(
      result,
      makeBox(
        [
          sourceBounds.max[0] - FEATURE_CUTTER_MARGIN,
          sourceBounds.min[1],
          zMin,
        ],
        [targetBounds.max[0], sourceBounds.max[1], zMax],
      ),
    )
  }
  if (targetBounds.min[1] < sourceBounds.min[1]) {
    result = fuseExtension(
      result,
      makeBox(
        [sourceBounds.min[0], targetBounds.min[1], zMin],
        [
          sourceBounds.max[0],
          sourceBounds.min[1] + FEATURE_CUTTER_MARGIN,
          zMax,
        ],
      ),
    )
  }
  if (targetBounds.max[1] > sourceBounds.max[1]) {
    result = fuseExtension(
      result,
      makeBox(
        [
          sourceBounds.min[0],
          sourceBounds.max[1] - FEATURE_CUTTER_MARGIN,
          zMin,
        ],
        [sourceBounds.max[0], targetBounds.max[1], zMax],
      ),
    )
  }
  return result
}

function resizeAssembly(
  assembly: Shape3D,
  parameters: OpenGridSnapParameters,
  targetBounds: ModelBounds = boundsForOpenGridSnap(parameters),
): Shape3D {
  if (parameters.offset === 0) return assembly

  const sourceBounds = readBounds(assembly)
  if (parameters.profile === 'Directional') {
    return extendDirectionalAssembly(assembly, sourceBounds, targetBounds)
  }

  const solids = extractSolids(assembly)
  const centralIndex = centralSolidIndex(solids)
  const output: Shape3D[] = []
  try {
    for (let index = 0; index < solids.length; index += 1) {
      const solid = solids[index]
      if (!solid) throw new Error('OPENGRID_SNAP_SOLID_MISSING')
      output.push(
        index === centralIndex
          ? solid
          : extendOuterSolid(solid, sourceBounds, targetBounds),
      )
    }
    const result = makeCompound(output).asShape3D()
    deleteShape(assembly)
    return result
  } catch (error) {
    deleteShape(assembly)
    for (const shape of output) deleteShape(shape)
    for (const solid of solids) deleteShape(solid)
    throw error
  }
}

function fullAssemblyBoundsBeforeFootprint(
  parameters: OpenGridSnapParameters,
): ModelBounds {
  const fullCellParameters = {
    variant: parameters.variant,
    profile: parameters.profile,
    offset: parameters.offset,
    halfCellX: 'none' as const,
    halfCellY: 'none' as const,
  }
  const fullBounds = boundsForOpenGridSnap(fullCellParameters)
  const selectedAxisExtraX =
    parameters.halfCellX === 'none' ? 0 : parameters.offset / 2
  const selectedAxisExtraY =
    parameters.halfCellY === 'none' ? 0 : parameters.offset / 2

  return {
    min: [
      fullBounds.min[0] - selectedAxisExtraX,
      fullBounds.min[1] - selectedAxisExtraY,
      fullBounds.min[2],
    ],
    max: [
      fullBounds.max[0] + selectedAxisExtraX,
      fullBounds.max[1] + selectedAxisExtraY,
      fullBounds.max[2],
    ],
  }
}

function footprintClipBounds(
  sourceBounds: ModelBounds,
  parameters: OpenGridSnapParameters,
): ModelBounds {
  let minX = sourceBounds.min[0]
  let maxX = sourceBounds.max[0]
  let minY = sourceBounds.min[1]
  let maxY = sourceBounds.max[1]

  if (parameters.halfCellX === 'left') maxX = 0
  if (parameters.halfCellX === 'right') minX = 0
  if (parameters.halfCellY === 'bottom') maxY = 0
  if (parameters.halfCellY === 'top') minY = 0

  return {
    min: [minX, minY, sourceBounds.min[2]],
    max: [maxX, maxY, sourceBounds.max[2]],
  }
}

/**
 * Build the shared OpenGrid locking cutter. The octagonal XY profile leaves
 * diagonal locking corners on every selected cut side; the second chamfer
 * adds the insertion bevel along the top and bottom of that same cut face.
 */
function hostLockingPrism(bounds: ModelBounds): Shape3D {
  const corner = Math.min(
    HALF_BOUNDARY_LOCK_CORNER,
    (bounds.max[0] - bounds.min[0]) / 4,
    (bounds.max[1] - bounds.min[1]) / 4,
  )
  const points: Array<[number, number]> = [
    [bounds.min[0] + corner, bounds.min[1]],
    [bounds.max[0] - corner, bounds.min[1]],
    [bounds.max[0], bounds.min[1] + corner],
    [bounds.max[0], bounds.max[1] - corner],
    [bounds.max[0] - corner, bounds.max[1]],
    [bounds.min[0] + corner, bounds.max[1]],
    [bounds.min[0], bounds.max[1] - corner],
    [bounds.min[0], bounds.min[1] + corner],
  ]
  const sketcher = new Sketcher('XY', [0, 0, bounds.min[2] - 0.1])
  let sketch: ReturnType<Sketcher['close']> | null = null
  let prism: Shape3D | null = null
  try {
    const first = points[0]
    if (!first) throw new Error('OPENGRID_SNAP_CLIP_PROFILE_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    prism = sketch.extrude(bounds.max[2] - bounds.min[2] + 0.2)
    const zMin = bounds.min[2] - 0.1
    const zMax = bounds.max[2] + 0.1
    const chamfered = prism.chamfer(HALF_BOUNDARY_LOCK_CHAMFER, (finder) =>
      finder.when(
        ({ element }) => edgeIsAtZ(element, zMin) || edgeIsAtZ(element, zMax),
      ),
    )
    if (chamfered !== prism) {
      deleteShape(prism)
    }
    prism = null
    return chamfered
  } finally {
    deleteShape(sketch)
    if (prism) deleteShape(prism)
    sketcher.delete()
  }
}

type EdgePoint = {
  x?: number
  y?: number
  z?: number
  delete: () => void
}

function edgeIsAtZ(
  edge: { startPoint: EdgePoint; endPoint: EdgePoint },
  z: number,
): boolean {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return (
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.z - z) <= ASSET_TOLERANCE &&
      Math.abs(end.z - z) <= ASSET_TOLERANCE
    )
  } finally {
    start.delete()
    end.delete()
  }
}

async function clipAssemblyToFootprint(
  assembly: Shape3D,
  parameters: OpenGridSnapParameters,
  context: OpenGridSnapBuildContext,
): Promise<Shape3D> {
  const sourceBounds = readBounds(assembly)
  const clipBounds = footprintClipBounds(sourceBounds, parameters)
  const translation: [number, number] = [
    -(clipBounds.min[0] + clipBounds.max[0]) / 2,
    -(clipBounds.min[1] + clipBounds.max[1]) / 2,
  ]
  const clippingProfile = hostLockingPrism(clipBounds)
  const finalProfile = hostLockingPrism(boundsForOpenGridSnap(parameters))
  const source = cloneImportedAssembly(assembly)
  const sourceSolids = extractSolids(source)
  const output: Shape3D[] = []

  try {
    for (const solid of sourceSolids) {
      assertGenerationCurrent(context)
      const clipped = solid.intersect(clippingProfile)
      if (clipped !== solid) deleteShape(solid)
      if (measureVolume(clipped) <= ASSET_TOLERANCE) {
        deleteShape(clipped)
        continue
      }
      const translated = clipped.translate(translation[0], translation[1], 0)
      if (translated !== clipped) deleteShape(clipped)
      const bounded = translated.intersect(finalProfile)
      if (bounded !== translated) deleteShape(translated)
      if (measureVolume(bounded) <= ASSET_TOLERANCE) {
        deleteShape(bounded)
        continue
      }
      output.push(bounded)
      await context.yieldToEventLoop?.()
    }

    if (output.length === 0) {
      throw new Error('OPENGRID_SNAP_HALF_ASSEMBLY_EMPTY')
    }
    if (output.length === 1) {
      const only = output[0]
      if (!only) throw new Error('OPENGRID_SNAP_HALF_ASSEMBLY_EMPTY')
      return only
    }
    return makeCompound(output).asShape3D()
  } finally {
    deleteShape(clippingProfile)
    deleteShape(finalProfile)
    deleteShape(source)
    for (const solid of sourceSolids) deleteShape(solid)
  }
}

export async function importOpenGridSnapReference(
  blob: Blob,
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile = 'Standard',
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
    assertReferenceGeometry(imported, variant, profile)
    return imported
  } catch (error) {
    deleteShape(imported)
    throw error
  }
}

export async function loadOpenGridSnapReference(
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile = 'Standard',
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(OPENGRID_SNAP_REFERENCE_URLS[profile][variant])
  if (!response.ok) throw new Error('OPENGRID_SNAP_ASSET_LOAD_FAILED')
  return importOpenGridSnapReference(await response.blob(), variant, profile)
}

export function inspectOpenGridSnapReference(
  shape: Shape3D,
  variant: OpenGridSnapVariant,
  profile: OpenGridSnapProfile = 'Standard',
): OpenGridSnapReferenceReport {
  return assertReferenceGeometry(shape, variant, profile)
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
  const reference = await context.getOpenGridSnapReference(
    parameters.variant,
    parameters.profile,
  )
  assertGenerationCurrent(context)

  let assembly = buildFeatureAssembly(reference, parameters)
  if (parameters.offset > 0) {
    assembly = resizeAssembly(
      assembly,
      parameters,
      fullAssemblyBoundsBeforeFootprint(parameters),
    )
  }

  const hasHalfCell =
    parameters.halfCellX !== 'none' || parameters.halfCellY !== 'none'
  if (!hasHalfCell) return assembly

  const clipped = await clipAssemblyToFootprint(assembly, parameters, context)
  deleteShape(assembly)
  return clipped
}

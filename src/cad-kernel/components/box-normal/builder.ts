import {
  getOC,
  importSTEP,
  isShape3D,
  makeBox,
  makePolygon,
  makeSolid,
  sketchRoundedRectangle,
  Solid,
  type Shape3D,
  type Face,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  BOX_NORMAL_CONFIGURATION,
  boxNormalPostCentersFor,
  boundsForBoxNormal,
  validateBoxNormalParameters,
  type BoxNormalParameters,
} from '../../../cad-contract/units'
import { buildHexagonalColumnPrototype } from '../hexagonal-column/builder'

export const boxNormalReferenceUrl = new URL(
  './box-normal.step',
  import.meta.url,
)

export const BOX_NORMAL_PROFILE_CHECKPOINTS = {
  outerCornerRadius: BOX_NORMAL_CONFIGURATION.outerCornerRadius,
  wallThickness: BOX_NORMAL_CONFIGURATION.wallThickness,
  floorThickness: BOX_NORMAL_CONFIGURATION.floorThickness,
  innerOpening: [
    BOX_NORMAL_CONFIGURATION.canonicalWidth -
      2 * BOX_NORMAL_CONFIGURATION.wallThickness,
    BOX_NORMAL_CONFIGURATION.canonicalDepth -
      2 * BOX_NORMAL_CONFIGURATION.wallThickness,
  ] as const,
  // These stations are measured in millimetres from box-normal.step.
  bottomOuterChamfer: 0.5,
  topOpeningChamfer: 0.6,
} as const

const ASSET_TOLERANCE = 0.01
const CONNECTOR_SIZE = 1
const CONNECTOR_OVERLAP = 0.25
const validatedReferences = new WeakSet<Shape3D>()

type PointTuple = [number, number, number]
type BoundsTuple = [PointTuple, PointTuple]

export type BoxNormalOperationCounts = {
  bodyPrototype: number
  postInstances: number
  placements: number
  assemblyFuses: number
  gridCellBuilds: number
}

export type BoxNormalBuildContext = {
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'steps'
  }) => void
  reportPhase?: (phase: 'prototype-build', durationMs: number) => void
  reportOperationCounts?: (counts: BoxNormalOperationCounts) => void
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

class OwnedShapeGroup {
  private readonly shapes = new Set<Shape3D>()

  add(shape: Shape3D): void {
    this.shapes.add(shape)
  }

  remove(shape: Shape3D): void {
    this.shapes.delete(shape)
  }

  release(shape: Shape3D): void {
    if (!this.shapes.delete(shape)) return
    deleteShape(shape)
  }

  dispose(): void {
    for (const shape of this.shapes) deleteShape(shape)
    this.shapes.clear()
  }
}

function assertGenerationCurrent(context: BoxNormalBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: BoxNormalBuildContext,
): Promise<void> {
  await context.yieldToEventLoop?.()
}

function readShapeBounds(shape: Shape3D): BoundsTuple {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as BoundsTuple
  } finally {
    boundingBox.delete()
  }
}

function isClose(first: number, second: number): boolean {
  return Math.abs(first - second) <= ASSET_TOLERANCE
}

function hasBounds(shape: Shape3D, expected: BoundsTuple): boolean {
  const [actualMin, actualMax] = readShapeBounds(shape)
  return (
    actualMin.every((value, index) => isClose(value, expected[0][index])) &&
    actualMax.every((value, index) => isClose(value, expected[1][index]))
  )
}

function assertMillimetreStepUnits(source: string): void {
  const compactSource = source.replace(/\s+/g, '')
  if (
    !compactSource.includes(
      'LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.)',
    )
  ) {
    throw new Error('BOX_NORMAL_ASSET_INVALID_UNITS')
  }
}

function hasPoint(shape: Shape3D, expected: PointTuple): boolean {
  for (const edge of shape.edges) {
    const start = edge.startPoint
    let end: typeof start | null = null
    try {
      end = edge.endPoint
      for (const point of [start, end]) {
        if (
          point &&
          point.x !== undefined &&
          isClose(point.x, expected[0]) &&
          isClose(point.y, expected[1]) &&
          isClose(point.z, expected[2])
        ) {
          return true
        }
      }
    } finally {
      start.delete()
      end?.delete()
      edge.delete()
    }
  }
  return false
}

function hasOpenTopFace(shape: Shape3D): boolean {
  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const normal = face.normalAt()
      const boundingBox = face.boundingBox
      try {
        const [min, max] = boundingBox.bounds as BoundsTuple
        const isTopFace =
          min[2] >=
            BOX_NORMAL_CONFIGURATION.canonicalHeight - ASSET_TOLERANCE &&
          max[2] <=
            BOX_NORMAL_CONFIGURATION.canonicalHeight + ASSET_TOLERANCE &&
          normal.z >= 1 - ASSET_TOLERANCE
        if (!isTopFace) continue

        const innerWires = face.innerWires()
        try {
          if (innerWires.length > 0) return true
        } finally {
          for (const wire of innerWires) deleteShape(wire)
        }
      } finally {
        boundingBox.delete()
        normal.delete()
      }
    } finally {
      deleteShape(face)
    }
  }
  return false
}

type FaceRecord = {
  geomType: string
  min: PointTuple
  max: PointTuple
  normal: PointTuple | null
}

function readFaceRecords(shape: Shape3D): FaceRecord[] {
  const records: FaceRecord[] = []
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    let normal: ReturnType<Face['normalAt']> | null = null
    try {
      if (face.geomType === 'PLANE') normal = face.normalAt()
      const [min, max] = boundingBox.bounds as BoundsTuple
      records.push({
        geomType: face.geomType,
        min: [min[0], min[1], min[2]],
        max: [max[0], max[1], max[2]],
        normal: normal ? [normal.x, normal.y, normal.z] : null,
      })
    } finally {
      boundingBox.delete()
      normal?.delete()
      face.delete()
    }
  }
  return records
}

function faceSpan(record: FaceRecord, axis: number): number {
  return record.max[axis] - record.min[axis]
}

function faceCoordinate(record: FaceRecord, axis: number): number {
  return (record.min[axis] + record.max[axis]) / 2
}

function isHorizontalPlane(record: FaceRecord): boolean {
  return (
    record.geomType === 'PLANE' &&
    record.normal !== null &&
    Math.abs(Math.abs(record.normal[2]) - 1) <= ASSET_TOLERANCE
  )
}

function isDiagonalTransitionPlane(record: FaceRecord): boolean {
  return (
    record.geomType === 'PLANE' &&
    record.normal !== null &&
    Math.abs(Math.abs(record.normal[2]) - Math.SQRT1_2) <= ASSET_TOLERANCE
  )
}

function verticalPlaneStations(
  records: readonly FaceRecord[],
  axis: 0 | 1,
  height: number,
): number[] {
  return records
    .filter(
      (record) =>
        record.geomType === 'PLANE' &&
        record.normal !== null &&
        Math.abs(Math.abs(record.normal[axis]) - 1) <= ASSET_TOLERANCE &&
        faceSpan(record, axis) <= ASSET_TOLERANCE &&
        faceSpan(record, 2) > height / 2,
    )
    .map((record) => Math.abs(faceCoordinate(record, axis)))
}

function distinctMeasurements(values: readonly number[]): number[] {
  return values.filter(
    (value, index) =>
      values.findIndex((candidate) => isClose(candidate, value)) === index,
  )
}

function assertReferenceProfileDimensions(shape: Shape3D): void {
  const halfOuterWidth = BOX_NORMAL_CONFIGURATION.canonicalWidth / 2
  const halfOuterDepth = BOX_NORMAL_CONFIGURATION.canonicalDepth / 2
  const halfInnerWidth = BOX_NORMAL_PROFILE_CHECKPOINTS.innerOpening[0] / 2
  const halfInnerDepth = BOX_NORMAL_PROFILE_CHECKPOINTS.innerOpening[1] / 2
  const {
    outerCornerRadius,
    wallThickness,
    floorThickness,
    bottomOuterChamfer,
    topOpeningChamfer,
  } = BOX_NORMAL_PROFILE_CHECKPOINTS
  const height = BOX_NORMAL_CONFIGURATION.canonicalHeight
  const faces = readFaceRecords(shape)

  const bottomFace = faces.find(
    (record) =>
      isHorizontalPlane(record) &&
      isClose(record.min[2], 0) &&
      faceSpan(record, 0) > halfOuterWidth,
  )
  const floorFace = faces.find(
    (record) =>
      isHorizontalPlane(record) &&
      isClose(record.min[2], floorThickness) &&
      faceSpan(record, 0) > halfInnerWidth,
  )
  if (!bottomFace || !floorFace) {
    throw new Error('BOX_NORMAL_ASSET_INVALID_PROFILE')
  }

  const measuredOpening = [faceSpan(floorFace, 0), faceSpan(floorFace, 1)]
  const measuredFloorThickness = floorFace.min[2] - bottomFace.min[2]
  const measuredBottomChamfers = [
    (BOX_NORMAL_CONFIGURATION.canonicalWidth - faceSpan(bottomFace, 0)) / 2,
    (BOX_NORMAL_CONFIGURATION.canonicalDepth - faceSpan(bottomFace, 1)) / 2,
  ]

  const xStations = distinctMeasurements(
    verticalPlaneStations(faces, 0, height),
  ).sort((first, second) => second - first)
  const yStations = distinctMeasurements(
    verticalPlaneStations(faces, 1, height),
  ).sort((first, second) => second - first)
  const measuredWall = [
    xStations[0] - xStations[1],
    yStations[0] - yStations[1],
  ]

  const bottomTransitionFaces = faces.filter(
    (record) =>
      isDiagonalTransitionPlane(record) &&
      isClose(record.min[2], 0) &&
      isClose(faceSpan(record, 2), bottomOuterChamfer) &&
      [faceSpan(record, 0), faceSpan(record, 1)].some((span) =>
        isClose(span, bottomOuterChamfer),
      ),
  )
  const topTransitionFaces = faces.filter(
    (record) =>
      isDiagonalTransitionPlane(record) &&
      isClose(record.max[2], height) &&
      isClose(faceSpan(record, 2), topOpeningChamfer) &&
      [faceSpan(record, 0), faceSpan(record, 1)].some((span) =>
        isClose(span, topOpeningChamfer),
      ),
  )

  const outerCornerFaces = faces.filter((record) => {
    if (!record.geomType.startsWith('CYLINDRE')) return false
    const xNear = Math.min(Math.abs(record.min[0]), Math.abs(record.max[0]))
    const xFar = Math.max(Math.abs(record.min[0]), Math.abs(record.max[0]))
    const yNear = Math.min(Math.abs(record.min[1]), Math.abs(record.max[1]))
    const yFar = Math.max(Math.abs(record.min[1]), Math.abs(record.max[1]))
    return (
      isClose(faceSpan(record, 0), outerCornerRadius) &&
      isClose(faceSpan(record, 1), outerCornerRadius) &&
      isClose(xNear, halfOuterWidth - outerCornerRadius) &&
      isClose(xFar, halfOuterWidth) &&
      isClose(yNear, halfOuterDepth - outerCornerRadius) &&
      isClose(yFar, halfOuterDepth)
    )
  })

  const bottomOuterPoint: PointTuple = [
    halfOuterWidth - bottomOuterChamfer,
    halfOuterDepth - bottomOuterChamfer,
    0,
  ]
  const outerSidePoint: PointTuple = [
    halfOuterWidth,
    halfOuterDepth - outerCornerRadius,
    bottomOuterChamfer,
  ]
  const innerFloorPoint: PointTuple = [
    halfInnerWidth,
    halfInnerDepth,
    floorThickness,
  ]
  const innerWallTopPoint: PointTuple = [
    halfInnerWidth,
    halfInnerDepth,
    height - topOpeningChamfer,
  ]
  const openingTopPoint: PointTuple = [
    halfInnerWidth + topOpeningChamfer,
    halfInnerDepth + topOpeningChamfer,
    height,
  ]
  const roundedCornerCenter = [
    halfOuterWidth - outerCornerRadius,
    halfOuterDepth - outerCornerRadius,
  ]
  const roundedCornerPoint: PointTuple = [
    roundedCornerCenter[0] + outerCornerRadius / Math.SQRT2,
    roundedCornerCenter[1] + outerCornerRadius / Math.SQRT2,
    bottomOuterChamfer - outerCornerRadius * (1 - 1 / Math.SQRT2),
  ]

  const hasProfileCheckpoints = [
    bottomOuterPoint,
    outerSidePoint,
    innerFloorPoint,
    innerWallTopPoint,
    openingTopPoint,
    roundedCornerPoint,
  ].every((point) => hasPoint(shape, point))
  if (!hasProfileCheckpoints) {
    throw new Error('BOX_NORMAL_ASSET_INVALID_PROFILE')
  }

  const expectedOpening = [
    BOX_NORMAL_CONFIGURATION.canonicalWidth - 2 * wallThickness,
    BOX_NORMAL_CONFIGURATION.canonicalDepth - 2 * wallThickness,
  ]

  if (
    xStations.length < 2 ||
    yStations.length < 2 ||
    !measuredWall.every((value) => isClose(value, wallThickness)) ||
    !measuredOpening.every((value, index) =>
      isClose(value, expectedOpening[index]),
    ) ||
    !isClose(measuredFloorThickness, floorThickness) ||
    !measuredBottomChamfers.every((value) =>
      isClose(value, bottomOuterChamfer),
    ) ||
    bottomTransitionFaces.length !== 4 ||
    topTransitionFaces.length !== 4 ||
    !bottomTransitionFaces.every((record) =>
      isClose(faceSpan(record, 2), bottomOuterChamfer),
    ) ||
    !topTransitionFaces.every((record) =>
      isClose(faceSpan(record, 2), topOpeningChamfer),
    ) ||
    outerCornerFaces.length !== 4
  ) {
    throw new Error('BOX_NORMAL_ASSET_INVALID_PROFILE')
  }
}

function edgeIsAtZ(
  edge: {
    startPoint: { z?: number; delete: () => void }
    endPoint: { z?: number; delete: () => void }
  },
  z: number,
): boolean {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return (
      start.z !== undefined &&
      end.z !== undefined &&
      isClose(start.z, z) &&
      isClose(end.z, z)
    )
  } finally {
    start.delete()
    end.delete()
  }
}

function applyBottomOuterChamfer(shape: Shape3D): Shape3D {
  const chamfered = shape.chamfer(
    BOX_NORMAL_PROFILE_CHECKPOINTS.bottomOuterChamfer,
    (finder) => finder.when(({ element }) => edgeIsAtZ(element, 0)),
  )
  deleteShape(shape)
  return chamfered
}

function rectangleProfile(
  width: number,
  depth: number,
  z: number,
): PointTuple[] {
  const halfWidth = width / 2
  const halfDepth = depth / 2
  return [
    [-halfWidth, -halfDepth, z],
    [halfWidth, -halfDepth, z],
    [halfWidth, halfDepth, z],
    [-halfWidth, halfDepth, z],
  ]
}

function buildBoxNormalCavity(
  innerWidth: number,
  innerDepth: number,
  topOpeningWidth: number,
  topOpeningDepth: number,
  floorZ: number,
  openingStartZ: number,
  topZ: number,
): Shape3D {
  const floor = rectangleProfile(innerWidth, innerDepth, floorZ)
  const openingStart = rectangleProfile(innerWidth, innerDepth, openingStartZ)
  const openingTop = rectangleProfile(topOpeningWidth, topOpeningDepth, topZ)
  const faces: Face[] = []

  function addFace(points: PointTuple[]): void {
    faces.push(makePolygon(points))
  }

  addFace([...floor].reverse())
  for (let index = 0; index < floor.length; index += 1) {
    const next = (index + 1) % floor.length
    addFace([
      floor[index],
      floor[next],
      openingStart[next],
      openingStart[index],
    ])
    addFace([
      openingStart[index],
      openingStart[next],
      openingTop[next],
      openingTop[index],
    ])
  }
  addFace(openingTop)

  let cavity: Shape3D | null = null
  try {
    const built = makeSolid(faces)
    if (!isShape3D(built)) throw new Error('BOX_NORMAL_CAVITY_NOT_3D')
    cavity = built
    return cavity
  } catch (error) {
    deleteShape(cavity)
    throw error
  } finally {
    for (const face of faces) deleteShape(face)
  }
}

function asSingleSolid(shape: Shape3D): Solid {
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
  } finally {
    explorer.delete()
  }

  if (solids.length !== 1) {
    for (const solid of solids) deleteShape(solid)
    throw new Error('BOX_NORMAL_ASSET_NOT_SINGLE_SOLID')
  }
  return solids[0]
}

function assertReferenceGeometry(shape: Shape3D): void {
  const expected: BoundsTuple = [
    [
      -BOX_NORMAL_CONFIGURATION.canonicalWidth / 2,
      -BOX_NORMAL_CONFIGURATION.canonicalDepth / 2,
      0,
    ],
    [
      BOX_NORMAL_CONFIGURATION.canonicalWidth / 2,
      BOX_NORMAL_CONFIGURATION.canonicalDepth / 2,
      BOX_NORMAL_CONFIGURATION.canonicalHeight,
    ],
  ]
  if (!hasBounds(shape, expected)) {
    throw new Error('BOX_NORMAL_ASSET_INVALID_BOUNDS')
  }

  if (!hasOpenTopFace(shape)) {
    throw new Error('BOX_NORMAL_ASSET_INVALID_OPENING')
  }

  assertReferenceProfileDimensions(shape)
}

function buildBoxNormalBody(parameters: BoxNormalParameters): Shape3D {
  const [nominalWidth, nominalDepth] = [
    parameters.x * BOX_NORMAL_CONFIGURATION.gridX,
    parameters.y * BOX_NORMAL_CONFIGURATION.gridY,
  ]
  const width = nominalWidth - BOX_NORMAL_CONFIGURATION.clearanceTotal
  const depth = nominalDepth - BOX_NORMAL_CONFIGURATION.clearanceTotal
  const bodyBaseZ = parameters.cornerPosts
    ? BOX_NORMAL_CONFIGURATION.cornerPostHeight
    : 0

  let outer = sketchRoundedRectangle(
    width,
    depth,
    BOX_NORMAL_PROFILE_CHECKPOINTS.outerCornerRadius,
  ).extrude(parameters.height)
  outer = applyBottomOuterChamfer(outer)
  outer = outer.translateZ(bodyBaseZ)

  const innerWidth = width - 2 * BOX_NORMAL_PROFILE_CHECKPOINTS.wallThickness
  const innerDepth = depth - 2 * BOX_NORMAL_PROFILE_CHECKPOINTS.wallThickness
  const floorZ = bodyBaseZ + BOX_NORMAL_PROFILE_CHECKPOINTS.floorThickness
  const openingStartZ =
    bodyBaseZ +
    parameters.height -
    BOX_NORMAL_PROFILE_CHECKPOINTS.topOpeningChamfer
  const topOpeningWidth =
    innerWidth + 2 * BOX_NORMAL_PROFILE_CHECKPOINTS.topOpeningChamfer
  const topOpeningDepth =
    innerDepth + 2 * BOX_NORMAL_PROFILE_CHECKPOINTS.topOpeningChamfer
  const cavity = buildBoxNormalCavity(
    innerWidth,
    innerDepth,
    topOpeningWidth,
    topOpeningDepth,
    floorZ,
    openingStartZ,
    bodyBaseZ + parameters.height,
  )

  return outer.cut(cavity)
}

function makePostConnector(x: number, y: number): Shape3D {
  const postHeight = BOX_NORMAL_CONFIGURATION.cornerPostHeight
  const halfSize = CONNECTOR_SIZE / 2
  return makeBox(
    [x - halfSize, y - halfSize, postHeight - CONNECTOR_OVERLAP],
    [x + halfSize, y + halfSize, postHeight + CONNECTOR_OVERLAP],
  )
}

function reportCounts(
  context: BoxNormalBuildContext,
  counts: BoxNormalOperationCounts,
): void {
  context.reportOperationCounts?.({ ...counts })
}

export async function buildBoxNormal(
  parameters: BoxNormalParameters,
  reference: Shape3D,
  context: BoxNormalBuildContext = {},
): Promise<Shape3D> {
  const validation = validateBoxNormalParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  if (!validatedReferences.has(reference)) {
    throw new Error('BOX_NORMAL_ASSET_INVALID')
  }

  const counts: BoxNormalOperationCounts = {
    bodyPrototype: 1,
    postInstances: 0,
    placements: 0,
    assemblyFuses: 0,
    gridCellBuilds: 0,
  }
  const owned = new OwnedShapeGroup()
  let body: Shape3D | null = null
  let postPrototype: Shape3D | null = null
  let combined: Shape3D | null = null
  let result: Solid | null = null

  try {
    assertGenerationCurrent(context)
    const prototypeStartedAt = performance.now()
    body = buildBoxNormalBody(parameters)
    context.reportPhase?.(
      'prototype-build',
      performance.now() - prototypeStartedAt,
    )
    owned.add(body)
    combined = body
    assertGenerationCurrent(context)

    if (!parameters.cornerPosts) {
      result = asSingleSolid(combined)
      owned.remove(combined)
      reportCounts(context, counts)
      return result
    }

    postPrototype = buildHexagonalColumnPrototype(
      BOX_NORMAL_CONFIGURATION.cornerPostHeight,
      'standing',
      {
        crossSectionRotationDegrees:
          BOX_NORMAL_CONFIGURATION.cornerPostCrossSectionRotationDegrees,
        endTransitionLength:
          BOX_NORMAL_CONFIGURATION.cornerPostAttachmentTransitionLength,
      },
    )
    owned.add(postPrototype)
    const centers = boxNormalPostCentersFor(parameters)
    context.reportProgress?.({
      stage: 'building',
      completed: 0,
      total: centers.length,
      unit: 'steps',
    })

    for (const [x, y] of centers) {
      assertGenerationCurrent(context)
      const clone = postPrototype.clone()
      owned.add(clone)
      const translated = clone.translate(x, y, 0)
      owned.release(clone)
      owned.add(translated)

      const connector = makePostConnector(x, y)
      owned.add(connector)
      const reinforcedPost = translated.fuse(connector)
      owned.release(translated)
      owned.release(connector)
      owned.add(reinforcedPost)

      if (!combined) throw new Error('BOX_NORMAL_BODY_EMPTY')
      const fused: Shape3D = combined.fuse(reinforcedPost)
      owned.release(combined)
      owned.release(reinforcedPost)
      owned.add(fused)
      combined = fused

      counts.postInstances += 1
      counts.placements += 1
      counts.assemblyFuses += 1
      context.reportProgress?.({
        stage: 'building',
        completed: counts.postInstances,
        total: centers.length,
        unit: 'steps',
      })
      await yieldAtSafeBoundary(context)
      assertGenerationCurrent(context)
    }

    if (!combined) throw new Error('BOX_NORMAL_BODY_EMPTY')
    result = asSingleSolid(combined)
    owned.remove(combined)
    reportCounts(context, counts)
    return result
  } finally {
    if (result !== body) deleteShape(body)
    if (result !== postPrototype) deleteShape(postPrototype)
    if (result !== combined) deleteShape(combined)
    owned.dispose()
  }
}

export async function importBoxNormalReference(blob: Blob): Promise<Shape3D> {
  let source: string
  try {
    source = await blob.text()
  } catch {
    throw new Error('BOX_NORMAL_ASSET_INVALID')
  }
  assertMillimetreStepUnits(source)

  let imported: Shape3D
  try {
    imported = (await importSTEP(blob)).asShape3D()
  } catch {
    throw new Error('BOX_NORMAL_ASSET_INVALID')
  }

  let solid: Solid | null = null
  try {
    solid = asSingleSolid(imported)
    assertReferenceGeometry(solid)
    validatedReferences.add(solid)
    return solid
  } catch (error) {
    deleteShape(solid)
    throw error
  } finally {
    if (solid !== imported) deleteShape(imported)
  }
}

export async function loadBoxNormalReference(
  fetcher: typeof fetch = fetch,
): Promise<Shape3D> {
  const response = await fetcher(boxNormalReferenceUrl)
  if (!response.ok) throw new Error('BOX_NORMAL_ASSET_LOAD_FAILED')
  return importBoxNormalReference(await response.blob())
}

export function boxNormalBoundsFor(
  parameters: BoxNormalParameters,
): BoundsTuple {
  const bounds = boundsForBoxNormal(parameters)
  return [bounds.min, bounds.max]
}

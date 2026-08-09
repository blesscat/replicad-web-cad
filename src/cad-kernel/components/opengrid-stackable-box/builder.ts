import {
  getOC,
  importSTEP,
  makeBox,
  makeCylinder,
  measureVolume,
  sketchRoundedRectangle,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  boundsForOpenGridStackableBox,
  isOpenGridStackableBoxParameters,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  validateOpenGridStackableBoxParameters,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'

export const OPEN_GRID_SNAP_HOLD_PUBLIC_PATH =
  '/openGrid Bare Lite Snap hold.step'

export type OpenGridStackableBoxBuildContext = {
  isGenerationCurrent?: () => boolean
}

type Bounds = [[number, number, number], [number, number, number]]

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function assertGenerationCurrent(
  context: OpenGridStackableBoxBuildContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

function roundedPrism(
  width: number,
  depth: number,
  height: number,
  z: number,
  radius: number,
): Shape3D {
  const prism = sketchRoundedRectangle(width, depth, radius).extrude(height)
  if (z === 0) return prism
  return prism.translateZ(z)
}

function edgeIsNearZ(
  edge: {
    startPoint: { z?: number; delete: () => void }
    endPoint: { z?: number; delete: () => void }
  },
  z: number,
  tolerance = 0.02,
): boolean {
  const start = edge.startPoint
  const end = edge.endPoint
  try {
    return (
      start.z !== undefined &&
      end.z !== undefined &&
      Math.abs(start.z - z) <= tolerance &&
      Math.abs(end.z - z) <= tolerance
    )
  } finally {
    start.delete()
    end.delete()
  }
}

function makeRoundedRing(
  outerWidth: number,
  outerDepth: number,
  innerWidth: number,
  innerDepth: number,
  height: number,
  z: number,
  outerRadius: number,
  innerRadius: number,
): Shape3D {
  const outer = roundedPrism(outerWidth, outerDepth, height, z, outerRadius)
  const inner = roundedPrism(
    innerWidth,
    innerDepth,
    height + 0.02,
    z - 0.01,
    innerRadius,
  )
  const ring = outer.cut(inner)
  deleteShape(outer)
  deleteShape(inner)
  return ring
}

function chamferEdgesNearZ(
  shape: Shape3D,
  z: number,
  distance: number,
): Shape3D {
  const chamfered = shape.chamfer(distance, (finder) =>
    finder.when(({ element }) => edgeIsNearZ(element, z)),
  )
  deleteShape(shape)
  return chamfered
}

function makeBoxShell(parameters: OpenGridStackableBoxParameters): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const outer = roundedPrism(
    width,
    depth,
    parameters.height,
    0,
    configuration.outerCornerRadius,
  )
  const innerWidth = width - 2 * configuration.wallThickness
  const innerDepth = depth - 2 * configuration.wallThickness
  const cavity = roundedPrism(
    innerWidth,
    innerDepth,
    parameters.height - configuration.floorThickness + 0.02,
    configuration.floorThickness,
    Math.max(
      configuration.outerCornerRadius - configuration.wallThickness,
      0.2,
    ),
  )
  return outer.cut(cavity)
}

function addTopGuideRail(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const railOuterWidth = width - 0.2
  const railOuterDepth = depth - 0.2
  const railInnerWidth = railOuterWidth - 2 * configuration.topRailWidth
  const railInnerDepth = railOuterDepth - 2 * configuration.topRailWidth
  const rail = makeRoundedRing(
    railOuterWidth,
    railOuterDepth,
    railInnerWidth,
    railInnerDepth,
    configuration.topRailHeight,
    parameters.height - configuration.topRailHeight,
    configuration.outerCornerRadius,
    Math.max(configuration.outerCornerRadius - configuration.topRailWidth, 0.2),
  )
  const chamferedRail = chamferEdgesNearZ(
    chamferEdgesNearZ(
      rail,
      parameters.height,
      configuration.topRailWidth * 0.35,
    ),
    parameters.height - configuration.topRailHeight,
    configuration.topRailBottomChamfer,
  )
  const fused = shape.fuse(chamferedRail)
  deleteShape(shape)
  deleteShape(chamferedRail)
  return fused
}

function addBottomGuideGroove(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const outerWidth = width - 0.2
  const outerDepth = depth - 0.2
  const innerWidth = outerWidth - 2 * configuration.bottomGrooveWidth
  const innerDepth = outerDepth - 2 * configuration.bottomGrooveWidth
  const groove = makeRoundedRing(
    outerWidth + 2 * configuration.stackingLeadIn,
    outerDepth + 2 * configuration.stackingLeadIn,
    innerWidth - 2 * configuration.stackingLeadIn,
    innerDepth - 2 * configuration.stackingLeadIn,
    configuration.bottomGrooveDepth,
    -0.01,
    configuration.outerCornerRadius,
    Math.max(
      configuration.outerCornerRadius - configuration.bottomGrooveWidth,
      0.2,
    ),
  )
  const chamferedGroove = chamferEdgesNearZ(
    groove,
    -0.01 + configuration.bottomGrooveDepth,
    configuration.stackingLeadIn,
  )
  const cut = shape.cut(chamferedGroove)
  deleteShape(shape)
  deleteShape(chamferedGroove)
  return cut
}

function addInternalSeamRelief(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  let current = shape
  const reliefWidth = configuration.bottomGrooveWidth * 2 + 0.4
  const reliefDepth = configuration.bottomGrooveDepth + 0.04
  const reliefCenters: Array<[number, number, number, number]> = []

  for (let index = 1; index < Math.ceil(parameters.x); index += 1) {
    const x = -width / 2 + index * configuration.gridPitch
    reliefCenters.push([x, 0, reliefWidth, depth])
  }
  for (let index = 1; index < Math.ceil(parameters.y); index += 1) {
    const y = -depth / 2 + index * configuration.gridPitch
    reliefCenters.push([0, y, width, reliefWidth])
  }

  for (const [x, y, reliefX, reliefY] of reliefCenters) {
    const cutter = makeBox(
      [x - reliefX / 2, y - reliefY / 2, -0.02],
      [x + reliefX / 2, y + reliefY / 2, reliefDepth],
    )
    const cut = current.cut(cutter)
    deleteShape(current)
    deleteShape(cutter)
    current = cut
  }

  return current
}

function makeMountingHoleCutter(): Shape3D {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const innerOpening = makeCylinder(
    configuration.baseHoleTopOpeningDiameter / 2,
    configuration.floorThickness + 0.02,
    [0, 0, 0],
  )
  const chamferedOpening = chamferEdgesNearZ(
    innerOpening,
    0,
    configuration.baseHoleChamferDepth,
  )
  const bottomExtension = makeCylinder(
    configuration.baseHoleBottomOpeningDiameter / 2,
    0.12,
    [0, 0, -0.1],
  )
  const cutter = bottomExtension.fuse(chamferedOpening)
  deleteShape(bottomExtension)
  deleteShape(chamferedOpening)
  return cutter
}

function addMountingSockets(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  let current = shape
  const centers = openGridStackableBoxSocketCentersFor(parameters)
  for (const [x, y] of centers) {
    const shaftCutter = makeMountingHoleCutter().translate(x, y, 0)
    const cut = current.cut(shaftCutter)
    deleteShape(current)
    deleteShape(shaftCutter)
    current = cut
  }
  return current
}

function readBounds(shape: Shape3D): Bounds {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as Bounds
  } finally {
    boundingBox.delete()
  }
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

function isBRepValid(shape: Shape3D): boolean {
  const oc = getOC()
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, true, true)
  try {
    return analyzer.IsValid_2()
  } finally {
    analyzer.delete()
  }
}

function closeEnough(first: number, second: number, tolerance = 0.02): boolean {
  return Math.abs(first - second) <= tolerance
}

type InterfaceQualityRecord = {
  seatedIntersectionVolume: number
  loweredIntersectionVolume: number
  bottomOpeningBoundaryVolume: number
  shaftBounds: Bounds
}

export type OpenGridStackableBoxInterfaceQualityReport = {
  topRailVolumes: number[]
  bottomGrooveVolumes: number[]
  topRailLeadInFaceCount: number
  topRailBottomChamferFaceCount: number
  topRailBottomResidualVolumes: number[]
  bottomGrooveLeadInFaceCount: number
  mountingHoleChamferFaceCount: number
  captiveSocketRecords: InterfaceQualityRecord[]
}

type FaceQualityRecord = {
  surfaceType: string
  min: [number, number, number]
  max: [number, number, number]
  normal: [number, number, number] | null
}

function volumeInBox(
  shape: Shape3D,
  min: [number, number, number],
  max: [number, number, number],
): number {
  const probe = makeBox(min, max)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) deleteShape(intersection)
    deleteShape(probe)
  }
}

function edgeBandBounds(
  width: number,
  depth: number,
  axis: 'x' | 'y',
  sign: -1 | 1,
  innerDistance: number,
  outerDistance: number,
  zMin: number,
  zMax: number,
): Bounds {
  const axisHalfExtent = axis === 'x' ? width / 2 : depth / 2
  const crossHalfExtent = axis === 'x' ? depth / 2 : width / 2
  const crossHalfLength = Math.min(2, crossHalfExtent / 2)
  const positiveMin = axisHalfExtent - innerDistance
  const positiveMax = axisHalfExtent - outerDistance
  const axisMin = sign > 0 ? positiveMin : -positiveMax
  const axisMax = sign > 0 ? positiveMax : -positiveMin

  if (axis === 'x') {
    return [
      [axisMin, -crossHalfLength, zMin],
      [axisMax, crossHalfLength, zMax],
    ]
  }

  return [
    [-crossHalfLength, axisMin, zMin],
    [crossHalfLength, axisMax, zMax],
  ]
}

function edgeBandVolumes(
  shape: Shape3D,
  width: number,
  depth: number,
  innerDistance: number,
  outerDistance: number,
  zMin: number,
  zMax: number,
): number[] {
  const volumes: number[] = []
  for (const axis of ['x', 'y'] as const) {
    for (const sign of [-1, 1] as const) {
      const [min, max] = edgeBandBounds(
        width,
        depth,
        axis,
        sign,
        innerDistance,
        outerDistance,
        zMin,
        zMax,
      )
      volumes.push(volumeInBox(shape, min, max))
    }
  }
  return volumes
}

function readFaceQualityRecords(shape: Shape3D): FaceQualityRecord[] {
  const records: FaceQualityRecord[] = []
  for (const face of shape.faces) {
    const boundingBox = face.boundingBox
    let normal: ReturnType<typeof face.normalAt> | null = null
    try {
      if (face.surface.surfaceType === 'PLANE') normal = face.normalAt()
      const [min, max] = boundingBox.bounds as Bounds
      records.push({
        surfaceType: face.surface.surfaceType,
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

function countFortyFiveDegreeFaces(
  shape: Shape3D,
  zMin: number,
  zMax: number,
  expectedSpan: number,
  normalZSign: -1 | 1,
): number {
  const records = readFaceQualityRecords(shape)
  const expectedNormalZ = Math.SQRT1_2
  let count = 0
  for (const record of records) {
    if (record.surfaceType !== 'PLANE' || record.normal === null) continue
    const faceMinZ = record.min[2]
    const faceMaxZ = record.max[2]
    const span = faceMaxZ - faceMinZ
    const normalZ = record.normal[2]
    const spanIsExpected =
      span >= expectedSpan * 0.7 && span <= expectedSpan * 1.3
    const zRangeIsExpected = faceMinZ >= zMin - 0.03 && faceMaxZ <= zMax + 0.03
    const normalIsExpected =
      normalZ * normalZSign > 0 &&
      closeEnough(Math.abs(normalZ), expectedNormalZ, 0.12)
    if (spanIsExpected && zRangeIsExpected && normalIsExpected) count += 1
  }
  return count
}

function countMountingHoleChamferFaces(shape: Shape3D): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const records = readFaceQualityRecords(shape)
  return records.filter((record) => {
    if (record.surfaceType !== 'CONE') return false
    const zSpan = record.max[2] - record.min[2]
    const xDiameter = record.max[0] - record.min[0]
    const yDiameter = record.max[1] - record.min[1]
    const zRangeIsExpected =
      record.min[2] >= -0.03 &&
      record.max[2] <= configuration.baseHoleChamferDepth + 0.03
    return (
      zRangeIsExpected &&
      closeEnough(zSpan, configuration.baseHoleChamferDepth) &&
      closeEnough(xDiameter, configuration.baseHoleTopOpeningDiameter) &&
      closeEnough(yDiameter, configuration.baseHoleTopOpeningDiameter)
    )
  }).length
}

function makeFlangedSocketInsert(center: [number, number]): Shape3D {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const shaft = makeCylinder(
    configuration.baseHoleDiameter / 2,
    configuration.floorThickness + configuration.baseShaftExposure,
    [center[0], center[1], -configuration.baseShaftExposure],
  )
  const flange = makeCylinder(
    configuration.baseFlangeDiameter / 2,
    configuration.baseFlangeThickness,
    [
      center[0],
      center[1],
      configuration.floorThickness - configuration.baseFlangeThickness,
    ],
  )
  const insert = shaft.fuse(flange)
  deleteShape(shaft)
  deleteShape(flange)
  return insert
}

function volumeAtBottomOpeningBoundary(
  shape: Shape3D,
  center: [number, number],
): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const outer = makeCylinder(
    configuration.baseHoleBottomOpeningDiameter / 2 + 0.2,
    0.1,
    [center[0], center[1], -0.02],
  )
  const inner = makeCylinder(
    configuration.baseHoleBottomOpeningDiameter / 2 + 0.1,
    0.1,
    [center[0], center[1], -0.02],
  )
  const ring = outer.cut(inner)
  deleteShape(outer)
  deleteShape(inner)
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(ring)
    return measureVolume(intersection)
  } finally {
    if (intersection && intersection !== shape) deleteShape(intersection)
    deleteShape(ring)
  }
}

function inspectCaptiveSocketInterface(
  shape: Shape3D,
  center: [number, number],
): InterfaceQualityRecord {
  const insert = makeFlangedSocketInsert(center)
  let seatedIntersection: Shape3D | null = null
  let loweredInsert: Shape3D | null = null
  let loweredIntersection: Shape3D | null = null
  try {
    seatedIntersection = shape.intersect(insert)
    loweredInsert = insert.clone().translateZ(-0.2)
    loweredIntersection = shape.intersect(loweredInsert)
    return {
      seatedIntersectionVolume: measureVolume(seatedIntersection),
      loweredIntersectionVolume: measureVolume(loweredIntersection),
      bottomOpeningBoundaryVolume: volumeAtBottomOpeningBoundary(shape, center),
      shaftBounds: readBounds(insert),
    }
  } finally {
    if (seatedIntersection && seatedIntersection !== shape) {
      deleteShape(seatedIntersection)
    }
    if (loweredIntersection && loweredIntersection !== shape) {
      deleteShape(loweredIntersection)
    }
    deleteShape(loweredInsert)
    deleteShape(insert)
  }
}

export function inspectOpenGridStackableBoxInterface(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxInterfaceQualityReport {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const topRailChamfer = configuration.topRailWidth * 0.35
  const topRailVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    configuration.topRailWidth - 0.05,
    configuration.wallThickness + 0.05,
    parameters.height - configuration.topRailHeight + 0.1,
    parameters.height - 0.1,
  )
  const bottomGrooveVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    configuration.bottomGrooveWidth - 0.1,
    0.1,
    0.05,
    Math.min(configuration.bottomGrooveDepth * 0.45, 0.35),
  )
  const topRailLeadInFaceCount = countFortyFiveDegreeFaces(
    shape,
    parameters.height - topRailChamfer - 0.03,
    parameters.height + 0.03,
    topRailChamfer,
    1,
  )
  const topRailBottomChamferFaceCount = countFortyFiveDegreeFaces(
    shape,
    parameters.height - configuration.topRailHeight - 0.03,
    parameters.height -
      configuration.topRailHeight +
      configuration.topRailBottomChamfer +
      0.03,
    configuration.topRailBottomChamfer,
    -1,
  )
  const lowerTransitionBaseZ = parameters.height - configuration.topRailHeight
  const alignmentProbeMinZ = lowerTransitionBaseZ + 0.01
  const alignmentProbeMaxZ = lowerTransitionBaseZ + 0.04
  const topRailBottomResidualVolumes = edgeBandVolumes(
    shape,
    width,
    depth,
    configuration.wallThickness + 0.08,
    configuration.wallThickness + 0.01,
    alignmentProbeMinZ,
    alignmentProbeMaxZ,
  )
  const grooveTopZ = -0.01 + configuration.bottomGrooveDepth
  const bottomGrooveLeadInFaceCount = countFortyFiveDegreeFaces(
    shape,
    grooveTopZ - configuration.stackingLeadIn - 0.03,
    grooveTopZ + 0.03,
    configuration.stackingLeadIn,
    -1,
  )
  const mountingHoleChamferFaceCount = countMountingHoleChamferFaces(shape)
  const captiveSocketRecords = openGridStackableBoxSocketCentersFor(
    parameters,
  ).map((center) => inspectCaptiveSocketInterface(shape, center))

  return {
    topRailVolumes,
    bottomGrooveVolumes,
    topRailLeadInFaceCount,
    topRailBottomChamferFaceCount,
    topRailBottomResidualVolumes,
    bottomGrooveLeadInFaceCount,
    mountingHoleChamferFaceCount,
    captiveSocketRecords,
  }
}

export function assertOpenGridStackableBoxGeometry(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
): void {
  const actual = readBounds(shape)
  const expected = boundsForOpenGridStackableBox(parameters)
  const matches = actual.every((point, pointIndex) => {
    const expectedPoint = pointIndex === 0 ? expected.min : expected.max
    return point.every((value, axis) => closeEnough(value, expectedPoint[axis]))
  })
  if (!matches) throw new Error('OPENGRID_STACKABLE_BOX_INVALID_BOUNDS')

  if (openGridStackableBoxSocketCentersFor(parameters).length === 0) {
    throw new Error('OPENGRID_STACKABLE_BOX_SOCKET_LAYOUT_INVALID')
  }

  const socketCenters = openGridStackableBoxSocketCentersFor(parameters)
  for (let firstIndex = 0; firstIndex < socketCenters.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < socketCenters.length;
      secondIndex += 1
    ) {
      const first = socketCenters[firstIndex]
      const second = socketCenters[secondIndex]
      if (!first || !second) continue
      if (
        Math.hypot(first[0] - second[0], first[1] - second[1]) <
        Math.max(
          OPENGRID_STACKABLE_BOX_CONFIGURATION.baseFlangeDiameter +
            OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleClearance,
          OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter,
        )
      ) {
        throw new Error('OPENGRID_STACKABLE_BOX_SOCKET_OVERLAP')
      }
    }
  }

  try {
    if (!(measureVolume(shape) > 0)) {
      throw new Error('OPENGRID_STACKABLE_BOX_VOLUME_INVALID')
    }
    if (countSolids(shape) !== 1) {
      throw new Error('OPENGRID_STACKABLE_BOX_SOLID_COUNT_INVALID')
    }
    if (!isBRepValid(shape)) {
      throw new Error('OPENGRID_STACKABLE_BOX_BREP_INVALID')
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('OPENGRID_')) {
      throw error
    }
    throw new Error('OPENGRID_STACKABLE_BOX_GEOMETRY_INVALID')
  }

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  if (
    configuration.baseFlangeThickness > configuration.floorThickness ||
    configuration.baseShaftExposure <= 0 ||
    configuration.topRailHeight <= 0 ||
    configuration.topRailBottomChamfer <= 0 ||
    configuration.topRailBottomChamfer >= configuration.topRailHeight ||
    configuration.bottomGrooveDepth <= 0
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_INTERFACE_CONSTANTS_INVALID')
  }

  let interfaceQuality: OpenGridStackableBoxInterfaceQualityReport
  try {
    interfaceQuality = inspectOpenGridStackableBoxInterface(shape, parameters)
  } catch {
    throw new Error('OPENGRID_STACKABLE_BOX_INTERFACE_GEOMETRY_INVALID')
  }

  if (
    interfaceQuality.topRailVolumes.some((volume) => volume <= 0.01) ||
    interfaceQuality.topRailLeadInFaceCount < 4 ||
    interfaceQuality.topRailBottomChamferFaceCount < 4 ||
    interfaceQuality.topRailBottomResidualVolumes.some(
      (volume) => volume > 0.0025,
    )
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_TOP_RAIL_INVALID')
  }
  if (
    interfaceQuality.bottomGrooveVolumes.some((volume) => volume > 0.01) ||
    interfaceQuality.bottomGrooveLeadInFaceCount < 4
  ) {
    throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_GROOVE_INVALID')
  }
  if (interfaceQuality.mountingHoleChamferFaceCount < 1) {
    throw new Error('OPENGRID_STACKABLE_BOX_MOUNTING_HOLE_CHAMFER_INVALID')
  }

  for (const record of interfaceQuality.captiveSocketRecords) {
    if (record.bottomOpeningBoundaryVolume <= 0.001) {
      throw new Error('OPENGRID_STACKABLE_BOX_BOTTOM_OPENING_INVALID')
    }
    if (record.seatedIntersectionVolume > 0.01) {
      throw new Error('OPENGRID_STACKABLE_BOX_FLANGE_NOT_FLUSH')
    }
    if (record.loweredIntersectionVolume <= 0.001) {
      throw new Error('OPENGRID_STACKABLE_BOX_FLANGE_NOT_RETAINED')
    }
    const [shaftMin, shaftMax] = record.shaftBounds
    if (
      !closeEnough(shaftMin[2], -configuration.baseShaftExposure) ||
      !closeEnough(shaftMax[2], configuration.floorThickness)
    ) {
      throw new Error('OPENGRID_STACKABLE_BOX_SHAFT_EXPOSURE_INVALID')
    }
  }
}

export function buildOpenGridStackableBox(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext = {},
): Shape3D {
  const validation = validateOpenGridStackableBoxParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  assertGenerationCurrent(context)

  let shape = makeBoxShell(parameters)
  assertGenerationCurrent(context)
  shape = addTopGuideRail(shape, parameters)
  shape = addBottomGuideGroove(shape, parameters)
  shape = addInternalSeamRelief(shape, parameters)
  shape = addMountingSockets(shape, parameters)
  assertGenerationCurrent(context)
  assertOpenGridStackableBoxGeometry(shape, parameters)
  return shape
}

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
  parameters: OpenGridStackableBoxParameters = { x: 1, y: 1, height: 10 },
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
  const response = await fetcher(OPEN_GRID_SNAP_HOLD_PUBLIC_PATH)
  if (!response.ok) throw new Error('OPENGRID_SNAP_HOLD_REFERENCE_LOAD_FAILED')
  return importOpenGridSnapHoldReference(await response.blob())
}

export function assertOpenGridSnapHoldCompatibility(
  reference: Shape3D,
  parameters: OpenGridStackableBoxParameters = { x: 1, y: 1, height: 10 },
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

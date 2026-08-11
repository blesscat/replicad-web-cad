import {
  makeBox,
  loft,
  makeCompound,
  makeCylinder,
  Sketcher,
  sketchRoundedRectangle,
  type Wire,
  type Shape3D,
} from 'replicad'
import {
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxDerivedGeometryFor,
  openGridStackableBoxUpperInnerRimZFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxOpeningDirection,
  type OpenGridStackableBoxDerivedOpening,
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
import {
  measureBooleanInScope,
  type BooleanOperationScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  assertGenerationCurrent,
  deleteShape,
  type OpenGridStackableBoxBuildContext,
} from './shared'

type RoundedRectangleSection = {
  width: number
  depth: number
  radius: number
  z: number
}

function roundedSectionWire(section: RoundedRectangleSection): Wire {
  const sketch = sketchRoundedRectangle(
    section.width,
    section.depth,
    section.radius,
  )
  const wire = sketch.wire.clone()
  deleteShape(sketch)
  if (section.z === 0) return wire
  return wire.translateZ(section.z)
}

function loftRoundedSections(
  sections: readonly RoundedRectangleSection[],
): Shape3D {
  const wires = sections.map(roundedSectionWire)
  try {
    return loft(wires, { ruled: true })
  } finally {
    wires.forEach(deleteShape)
  }
}

function insetSection(
  width: number,
  depth: number,
  outerRadius: number,
  inset: number,
  z: number,
): RoundedRectangleSection {
  return {
    width: width - 2 * inset,
    depth: depth - 2 * inset,
    radius: outerRadius - inset,
    z,
  }
}

function innerCavitySections(
  parameters: OpenGridStackableBoxParameters,
): RoundedRectangleSection[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const upperInnerRimZ = configuration.bottomAssemblyHeight + parameters.height
  const firstTransitionZ = upperInnerRimZ + configuration.topRailInnerChamfer
  const firstVerticalTopZ =
    firstTransitionZ + configuration.topRailInnerVerticalHeight
  const secondTransitionZ =
    firstVerticalTopZ + configuration.topRailMiddleChamfer
  const secondVerticalTopZ =
    secondTransitionZ + configuration.topRailOuterVerticalHeight
  const externalHeight = upperInnerRimZ + configuration.topRailHeight
  const finalInset =
    configuration.wallThickness +
    configuration.topRailInnerChamfer -
    configuration.topRailMiddleChamfer -
    configuration.topRailOuterChamfer

  return [
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness,
      configuration.bottomAssemblyHeight,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness,
      upperInnerRimZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness + configuration.topRailInnerChamfer,
      firstTransitionZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness + configuration.topRailInnerChamfer,
      firstVerticalTopZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness +
        configuration.topRailInnerChamfer -
        configuration.topRailMiddleChamfer,
      secondTransitionZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      configuration.wallThickness +
        configuration.topRailInnerChamfer -
        configuration.topRailMiddleChamfer,
      secondVerticalTopZ,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      finalInset,
      externalHeight,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      finalInset,
      externalHeight + 0.02,
    ),
  ]
}

function outerEnvelopeSections(
  parameters: OpenGridStackableBoxParameters,
): RoundedRectangleSection[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const externalHeight =
    configuration.bottomAssemblyHeight +
    parameters.height +
    configuration.topRailHeight
  const supportInset = bottomGuideSupportInset()
  const footInset = supportInset + configuration.bottomFootChamferHeight
  const supportTop = bottomStackingSupportTopZ()
  const transitionTop = bottomGuideTransitionTopZ()

  return [
    insetSection(width, depth, configuration.outerCornerRadius, footInset, 0),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      supportInset,
      configuration.bottomFootChamferHeight,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      supportInset,
      supportTop,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      0,
      transitionTop,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      0,
      configuration.bottomAssemblyHeight,
    ),
    insetSection(
      width,
      depth,
      configuration.outerCornerRadius,
      0,
      externalHeight,
    ),
  ]
}

export function makeBoxShell(
  parameters: OpenGridStackableBoxParameters,
  reporter: BooleanOperationReporter | undefined = undefined,
): Shape3D {
  const outer = loftRoundedSections(outerEnvelopeSections(parameters))
  let cavity: Shape3D | null = null
  try {
    cavity = loftRoundedSections(innerCavitySections(parameters))
    const activeCavity = cavity
    const cutScope = reporter?.createScope(1)
    const shell = measureBooleanInScope(cutScope, 'cut', () =>
      outer.cut(activeCavity),
    )
    deleteShape(outer)
    deleteShape(cavity)
    return shell
  } catch (error) {
    deleteShape(outer)
    deleteShape(cavity)
    throw error
  }
}

function originalExternalHeight(
  parameters: OpenGridStackableBoxParameters,
): number {
  return (
    openGridStackableBoxUpperInnerRimZFor(parameters) +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight
  )
}

export function applyBasePlateMode(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  reporter: BooleanOperationReporter | undefined = undefined,
): Shape3D {
  if (!parameters.basePlateMode) return shape

  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const cutoffHeight = configuration.basePlateCutoffHeight
  const clippingBox = makeBox(
    [-width / 2 - 1, -depth / 2 - 1, cutoffHeight],
    [width / 2 + 1, depth / 2 + 1, originalExternalHeight(parameters) + 1],
  )
  let clipped: Shape3D | null = null
  try {
    const intersectScope = reporter?.createScope(1)
    clipped = measureBooleanInScope(intersectScope, 'intersect', () =>
      shape.intersect(clippingBox),
    )
    deleteShape(shape)
    const result = clipped.translateZ(-cutoffHeight)
    clipped = null
    return result
  } catch (error) {
    deleteShape(clipped)
    throw error
  } finally {
    deleteShape(clippingBox)
  }
}

export function bottomStackingSupportTopZ(): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    configuration.bottomFootChamferHeight +
    configuration.bottomSupportBandHeight
  )
}

export function bottomStackingProfileTopZ(): number {
  return (
    bottomStackingSupportTopZ() +
    OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn
  )
}

export function bottomGridSeamApexTopZ(): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    bottomStackingProfileTopZ() + configuration.bottomGridSeamOpeningWidth / 2
  )
}

export function bottomGuideSupportInset(): number {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return (
    configuration.wallThickness +
    configuration.topRailInnerChamfer -
    configuration.topRailMiddleChamfer
  )
}

export function bottomGuideTransitionTopZ(): number {
  return bottomStackingSupportTopZ() + bottomGuideSupportInset()
}

function extrudeProfile(
  plane: 'YZ' | 'XZ',
  origin: [number, number, number],
  profile: readonly [number, number][],
  distance: number,
  direction: [number, number, number],
): Shape3D {
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = profile[0]
    if (!first) throw new Error('OPENGRID_PROFILE_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of profile.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(distance, { extrusionDirection: direction })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function extrudeSideOpeningProfile(
  plane: 'YZ' | 'XZ',
  origin: [number, number, number],
  opening: OpenGridStackableBoxDerivedOpening,
  topZ: number,
  distance: number,
  direction: [number, number, number],
): Shape3D {
  const halfBottomLength = opening.bottomLength / 2
  const cornerRadius = opening.arcRadius
  const angleRadians = (opening.angle * Math.PI) / 180
  const bottomZ = opening.bottomZ
  const rightBottom: [number, number] = [halfBottomLength, bottomZ]
  const rightTransition: [number, number] = [
    halfBottomLength + opening.cornerRun,
    bottomZ + opening.cornerRise,
  ]
  const leftTransition: [number, number] = [
    -rightTransition[0],
    rightTransition[1],
  ]
  const leftBottom: [number, number] = [-halfBottomLength, bottomZ]
  const rightTopArcStart: [number, number] = [
    rightTransition[0] + opening.straightSideRun,
    topZ - opening.cornerRise,
  ]
  const leftTopArcStart: [number, number] = [
    -rightTopArcStart[0],
    rightTopArcStart[1],
  ]
  const rightTopEdge: [number, number] = [
    rightTopArcStart[0] + opening.cornerRun,
    topZ,
  ]
  const leftTopEdge: [number, number] = [-rightTopEdge[0], topZ]
  const rightBottomMidpoint: [number, number] = [
    halfBottomLength + cornerRadius * Math.sin(angleRadians / 2),
    bottomZ + cornerRadius * (1 - Math.cos(angleRadians / 2)),
  ]
  const leftBottomMidpoint: [number, number] = [
    -rightBottomMidpoint[0],
    rightBottomMidpoint[1],
  ]
  const rightTopMidpoint: [number, number] = [
    rightTopArcStart[0] +
      cornerRadius * (Math.sin(angleRadians) - Math.sin(angleRadians / 2)),
    rightTopArcStart[1] +
      cornerRadius * (Math.cos(angleRadians / 2) - Math.cos(angleRadians)),
  ]
  const leftTopMidpoint: [number, number] = [
    -rightTopMidpoint[0],
    rightTopMidpoint[1],
  ]
  const topExtension = 0.04
  const rightTopOuter: [number, number] = [rightTopEdge[0] + topExtension, topZ]
  const leftTopOuter: [number, number] = [-rightTopOuter[0], topZ]
  const rightTopOuterAbove: [number, number] = [
    rightTopOuter[0],
    topZ + topExtension,
  ]
  const leftTopOuterAbove: [number, number] = [
    leftTopOuter[0],
    topZ + topExtension,
  ]
  const sketcher = new Sketcher(plane, origin)
  let sketch: ReturnType<Sketcher['close']> | null = null
  let current: Shape3D | null = null
  try {
    sketcher.movePointerTo(leftBottom)
    if (halfBottomLength > 0) sketcher.lineTo(rightBottom)
    sketcher.threePointsArcTo(rightTransition, rightBottomMidpoint)
    sketcher.lineTo(rightTopArcStart)
    sketcher.threePointsArcTo(rightTopEdge, rightTopMidpoint)
    sketcher.lineTo(rightTopOuter)
    sketcher.lineTo(rightTopOuterAbove)
    sketcher.lineTo(leftTopOuterAbove)
    sketcher.lineTo(leftTopOuter)
    sketcher.lineTo(leftTopEdge)
    sketcher.threePointsArcTo(leftTopArcStart, leftTopMidpoint)
    sketcher.lineTo(leftTransition)
    sketcher.threePointsArcTo(leftBottom, leftBottomMidpoint)
    sketch = sketcher.close()
    current = sketch.extrude(distance, { extrusionDirection: direction })
    const result = current
    current = null
    return result
  } finally {
    deleteShape(current)
    deleteShape(sketch)
    sketcher.delete()
  }
}

function fuseSideOpeningCutterParts(
  plane: 'YZ' | 'XZ',
  wallOrigin: [number, number, number],
  railOrigin: [number, number, number],
  opening: OpenGridStackableBoxDerivedOpening,
  topZ: number,
  railStartZ: number,
  width: number,
  depth: number,
  wallDistance: number,
  railDistance: number,
  direction: [number, number, number],
  scopes: {
    fuse?: BooleanOperationScope
    intersect?: BooleanOperationScope
  },
): Shape3D {
  const wallCutter = extrudeSideOpeningProfile(
    plane,
    wallOrigin,
    opening,
    topZ,
    wallDistance,
    direction,
  )
  let railCutter: Shape3D | null = extrudeSideOpeningProfile(
    plane,
    railOrigin,
    opening,
    topZ,
    railDistance,
    direction,
  )
  let railClip: Shape3D | null = makeBox(
    [-width / 2 - 0.04, -depth / 2 - 0.04, railStartZ],
    [width / 2 + 0.04, depth / 2 + 0.04, topZ + 0.04],
  )
  let clippedRailCutter: Shape3D | null = null
  try {
    const activeRailCutter = railCutter
    const activeRailClip = railClip
    clippedRailCutter = measureBooleanInScope(
      scopes.intersect,
      'intersect',
      () => activeRailCutter.intersect(activeRailClip),
    )
    deleteShape(railCutter)
    railCutter = null
    deleteShape(railClip)
    railClip = null
    const activeClippedRailCutter = clippedRailCutter
    const result = measureBooleanInScope(scopes.fuse, 'fuse', () =>
      wallCutter.fuse(activeClippedRailCutter),
    )
    deleteShape(wallCutter)
    deleteShape(clippedRailCutter)
    clippedRailCutter = null
    return result
  } catch (error) {
    deleteShape(wallCutter)
    deleteShape(railCutter)
    deleteShape(railClip)
    deleteShape(clippedRailCutter)
    throw error
  }
}

function makeSideOpeningCutter(
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
  scopes: {
    fuse?: BooleanOperationScope
    intersect?: BooleanOperationScope
  },
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const opening = derived.openings[direction]
  const margin = 0.04
  const upperRailInnerInset =
    configuration.wallThickness + configuration.topRailInnerChamfer
  const wallStart = configuration.wallThickness - margin
  const topZ = derived.activeUpperOuterEdgeZ
  const railStartZ = derived.activeUpperInnerRimZ - margin
  const wallDistance = configuration.wallThickness + 2 * margin
  const railDistance = upperRailInnerInset + 2 * margin
  const railNormalInset = upperRailInnerInset + margin

  if (direction === '+X') {
    return fuseSideOpeningCutterParts(
      'YZ',
      [width / 2 - wallStart, 0, 0],
      [width / 2 - railNormalInset, 0, 0],
      opening,
      topZ,
      railStartZ,
      width,
      depth,
      wallDistance,
      railDistance,
      [1, 0, 0],
      scopes,
    )
  }
  if (direction === '-X') {
    return fuseSideOpeningCutterParts(
      'YZ',
      [-width / 2 - margin, 0, 0],
      [-width / 2 - margin, 0, 0],
      opening,
      topZ,
      railStartZ,
      width,
      depth,
      wallDistance,
      railDistance,
      [1, 0, 0],
      scopes,
    )
  }
  if (direction === '+Y') {
    return fuseSideOpeningCutterParts(
      'XZ',
      [0, depth / 2 - wallStart, 0],
      [0, depth / 2 - railNormalInset, 0],
      opening,
      topZ,
      railStartZ,
      width,
      depth,
      wallDistance,
      railDistance,
      [0, 1, 0],
      scopes,
    )
  }
  return fuseSideOpeningCutterParts(
    'XZ',
    [0, -depth / 2 - margin, 0],
    [0, -depth / 2 - margin, 0],
    opening,
    topZ,
    railStartZ,
    width,
    depth,
    wallDistance,
    railDistance,
    [0, 1, 0],
    scopes,
  )
}

export function addSideOpenings(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  let current = shape
  const directions = OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS.filter(
    (direction) => derived.openings[direction].enabled,
  )
  const cutScope = context.booleanOperations?.createScope(directions.length)
  const cutterScopes = {
    fuse: context.booleanOperations?.createScope(directions.length),
    intersect: context.booleanOperations?.createScope(directions.length),
  }

  for (const direction of directions) {
    assertGenerationCurrent(context)
    const cutter = makeSideOpeningCutter(parameters, direction, cutterScopes)
    try {
      const cut = measureBooleanInScope(cutScope, 'cut', () =>
        current.cut(cutter),
      )
      deleteShape(current)
      current = cut
    } finally {
      deleteShape(cutter)
    }
    assertGenerationCurrent(context)
  }

  return current
}

export type OpenGridStackableBoxBottomGridSeam = {
  axis: 'x' | 'y'
  position: number
}

export function bottomGridSeamsFor(
  parameters: OpenGridStackableBoxParameters,
): OpenGridStackableBoxBottomGridSeam[] {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const seams: OpenGridStackableBoxBottomGridSeam[] = []

  for (let index = 1; index < Math.ceil(parameters.x); index += 1) {
    seams.push({
      axis: 'x',
      position: -width / 2 + index * configuration.gridPitch,
    })
  }
  for (let index = 1; index < Math.ceil(parameters.y); index += 1) {
    seams.push({
      axis: 'y',
      position: -depth / 2 + index * configuration.gridPitch,
    })
  }
  return seams
}

function makeBottomGridSeamCutter(
  seam: OpenGridStackableBoxBottomGridSeam,
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  const [width, footprintDepth] =
    nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const footChamferHeight = configuration.bottomFootChamferHeight
  const supportTop = bottomStackingSupportTopZ()
  const transitionTop = bottomStackingProfileTopZ()
  const bedHalfOpening = configuration.bottomGridSeamBedOpeningWidth / 2
  const supportHalfOpening = configuration.bottomGridSeamSupportOpeningWidth / 2
  const transitionHalfOpening = configuration.bottomGridSeamOpeningWidth / 2
  const transitionApexTop = bottomGridSeamApexTopZ()
  const margin = 0.02
  const profile: readonly [number, number][] = [
    [-bedHalfOpening, -margin],
    [bedHalfOpening, -margin],
    [supportHalfOpening, footChamferHeight],
    [supportHalfOpening, supportTop],
    [transitionHalfOpening, transitionTop],
    [0, transitionApexTop],
    [-transitionHalfOpening, transitionTop],
    [-supportHalfOpening, supportTop],
    [-supportHalfOpening, footChamferHeight],
  ]

  if (seam.axis === 'x') {
    return extrudeProfile(
      'XZ',
      [seam.position, -footprintDepth / 2 - margin, 0],
      profile,
      footprintDepth + 2 * margin,
      [0, 1, 0],
    )
  }

  return extrudeProfile(
    'YZ',
    [-width / 2 - margin, seam.position, 0],
    profile,
    width + 2 * margin,
    [1, 0, 0],
  )
}

function makeBottomGridSeamTools(
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
  axis: OpenGridStackableBoxBottomGridSeam['axis'],
): Shape3D[] {
  const seams = bottomGridSeamsFor(parameters).filter(
    (seam) => seam.axis === axis,
  )
  const cutters: Shape3D[] = []
  try {
    for (const seam of seams) {
      assertGenerationCurrent(context)
      cutters.push(makeBottomGridSeamCutter(seam, parameters))
    }
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

function cutWithToolBatch(
  shape: Shape3D,
  tools: Shape3D[],
  scope: BooleanOperationScope | undefined,
): Shape3D {
  if (tools.length === 0) return shape

  const tool = tools.length === 1 ? tools[0] : makeCompound(tools).asShape3D()
  if (!tool) return shape

  try {
    const cut = measureBooleanInScope(scope, 'cut', () => shape.cut(tool))
    deleteShape(shape)
    return cut
  } finally {
    deleteShape(tool)
  }
}

function addIntegratedStackingProfile(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  let current = shape
  const seams = bottomGridSeamsFor(parameters)
  const cutTotal = (['x', 'y'] as const).filter((axis) =>
    seams.some((seam) => seam.axis === axis),
  ).length
  const cutScope =
    cutTotal > 0 ? context.booleanOperations?.createScope(cutTotal) : undefined
  for (const axis of ['x', 'y'] as const) {
    const cutters = makeBottomGridSeamTools(parameters, context, axis)
    if (cutters.length === 0) continue

    assertGenerationCurrent(context)
    current = cutWithToolBatch(current, cutters, cutScope)
  }
  return current
}

function makeStandardMountingHoleCutter(
  scope: BooleanOperationScope | undefined,
): Shape3D {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const bottomSection = makeCylinder(
    configuration.baseHoleBottomOpeningDiameter / 2,
    configuration.baseHoleStepHeight + 0.02,
    [0, 0, -0.01],
  )
  const upperSection = makeCylinder(
    configuration.baseHoleTopOpeningDiameter / 2,
    configuration.bottomAssemblyHeight -
      configuration.baseHoleStepHeight +
      0.02,
    [0, 0, configuration.baseHoleStepHeight],
  )
  const cutter = measureBooleanInScope(scope, 'fuse', () =>
    bottomSection.fuse(upperSection),
  )
  deleteShape(bottomSection)
  deleteShape(upperSection)
  return cutter
}

function makeBasePlateMountingHoleCutter(
  scope: BooleanOperationScope | undefined,
): Shape3D {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const lowerSection = makeCylinder(
    configuration.baseHoleBottomOpeningDiameter / 2,
    configuration.basePlateHoleBottomDepth + 0.02,
    [0, 0, configuration.basePlateCutoffHeight - 0.01],
  )
  const upperSection = makeCylinder(
    configuration.baseHoleTopOpeningDiameter / 2,
    configuration.basePlateHoleTopDepth + 0.02,
    [
      0,
      0,
      configuration.basePlateCutoffHeight +
        configuration.basePlateHoleBottomDepth,
    ],
  )
  const cutter = measureBooleanInScope(scope, 'fuse', () =>
    lowerSection.fuse(upperSection),
  )
  deleteShape(lowerSection)
  deleteShape(upperSection)
  return cutter
}

function makeMountingHoleCutter(
  parameters: OpenGridStackableBoxParameters,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  if (parameters.basePlateMode) {
    return makeBasePlateMountingHoleCutter(scope)
  }
  return makeStandardMountingHoleCutter(scope)
}

function makeOrdinaryBottomHoleCutter(): Shape3D {
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  return makeCylinder(
    configuration.bottomGridHoleDiameter / 2,
    configuration.bottomAssemblyHeight + 0.12,
    [0, 0, -0.1],
  )
}

export function addMountingSockets(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  const centers = openGridStackableBoxSocketCentersFor(parameters)
  const fuseScope =
    centers.length > 0
      ? context.booleanOperations?.createScope(centers.length)
      : undefined
  const socketCutters = centers.map(([x, y]) =>
    makeMountingHoleCutter(parameters, fuseScope).translate(x, y, 0),
  )
  const ordinaryCenters =
    openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
  const cutTotal =
    Number(socketCutters.length > 0) + Number(ordinaryCenters.length > 0)
  const cutScope =
    cutTotal > 0 ? context.booleanOperations?.createScope(cutTotal) : undefined
  assertGenerationCurrent(context)
  let current = cutWithToolBatch(shape, socketCutters, cutScope)

  const ordinaryCutters = ordinaryCenters.map(([x, y]) =>
    makeOrdinaryBottomHoleCutter().translate(x, y, 0),
  )
  assertGenerationCurrent(context)
  current = cutWithToolBatch(current, ordinaryCutters, cutScope)

  return current
}

export function applyStackingProfile(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  return addIntegratedStackingProfile(shape, parameters, context)
}

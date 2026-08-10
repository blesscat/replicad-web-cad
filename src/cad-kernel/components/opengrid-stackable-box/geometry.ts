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
  type OpenGridStackableBoxParameters,
} from '../../../cad-contract/units'
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
): Shape3D {
  const outer = loftRoundedSections(outerEnvelopeSections(parameters))
  let cavity: Shape3D | null = null
  try {
    cavity = loftRoundedSections(innerCavitySections(parameters))
    const shell = outer.cut(cavity)
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
    clipped = shape.intersect(clippingBox)
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

function sideOpeningProfile(
  bottomZ: number,
  upperZ: number,
  bottomLength: number,
  upperWidth: number,
): readonly [number, number][] {
  const bottomHalfLength = bottomLength / 2
  const upperHalfWidth = upperWidth / 2
  return [
    [-bottomHalfLength, bottomZ],
    [bottomHalfLength, bottomZ],
    [upperHalfWidth, upperZ],
    [-upperHalfWidth, upperZ],
  ]
}

function makeSideOpeningCutter(
  parameters: OpenGridStackableBoxParameters,
  direction: OpenGridStackableBoxOpeningDirection,
): Shape3D {
  const [width, depth] = nominalOpenGridStackableBoxFootprintFor(parameters)
  const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  const opening = derived.openings[direction]
  const upperZ = derived.activeUpperInnerRimZ + 0.04
  const profile = sideOpeningProfile(
    opening.bottomZ,
    upperZ,
    opening.bottomLength,
    opening.upperWidth,
  )
  const margin = 0.04
  const wallStart = configuration.wallThickness - margin

  if (direction === '+X') {
    return extrudeProfile(
      'YZ',
      [width / 2 - wallStart, 0, 0],
      profile,
      configuration.wallThickness + 2 * margin,
      [1, 0, 0],
    )
  }
  if (direction === '-X') {
    return extrudeProfile(
      'YZ',
      [-width / 2 - margin, 0, 0],
      profile,
      configuration.wallThickness + 2 * margin,
      [1, 0, 0],
    )
  }
  if (direction === '+Y') {
    return extrudeProfile(
      'XZ',
      [0, depth / 2 - wallStart, 0],
      profile,
      configuration.wallThickness + 2 * margin,
      [0, 1, 0],
    )
  }
  return extrudeProfile(
    'XZ',
    [0, -depth / 2 - margin, 0],
    profile,
    configuration.wallThickness + 2 * margin,
    [0, 1, 0],
  )
}

export function addSideOpenings(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  const derived = openGridStackableBoxDerivedGeometryFor(parameters)
  let current = shape

  for (const direction of OPENGRID_STACKABLE_BOX_OPENING_DIRECTIONS) {
    if (!derived.openings[direction].enabled) continue
    assertGenerationCurrent(context)
    const cutter = makeSideOpeningCutter(parameters, direction)
    try {
      const cut = current.cut(cutter)
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

function cutWithToolBatch(shape: Shape3D, tools: Shape3D[]): Shape3D {
  if (tools.length === 0) return shape

  const tool = tools.length === 1 ? tools[0] : makeCompound(tools).asShape3D()
  if (!tool) return shape

  try {
    const cut = shape.cut(tool)
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
  for (const axis of ['x', 'y'] as const) {
    const cutters = makeBottomGridSeamTools(parameters, context, axis)
    if (cutters.length === 0) continue

    assertGenerationCurrent(context)
    current = cutWithToolBatch(current, cutters)
  }
  return current
}

function makeStandardMountingHoleCutter(): Shape3D {
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
  const cutter = bottomSection.fuse(upperSection)
  deleteShape(bottomSection)
  deleteShape(upperSection)
  return cutter
}

function makeBasePlateMountingHoleCutter(): Shape3D {
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
  const cutter = lowerSection.fuse(upperSection)
  deleteShape(lowerSection)
  deleteShape(upperSection)
  return cutter
}

function makeMountingHoleCutter(
  parameters: OpenGridStackableBoxParameters,
): Shape3D {
  if (parameters.basePlateMode) return makeBasePlateMountingHoleCutter()
  return makeStandardMountingHoleCutter()
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
  const socketCutters = centers.map(([x, y]) =>
    makeMountingHoleCutter(parameters).translate(x, y, 0),
  )
  assertGenerationCurrent(context)
  let current = cutWithToolBatch(shape, socketCutters)

  const ordinaryCenters =
    openGridStackableBoxOrdinaryBottomHoleCentersFor(parameters)
  const ordinaryCutters = ordinaryCenters.map(([x, y]) =>
    makeOrdinaryBottomHoleCutter().translate(x, y, 0),
  )
  assertGenerationCurrent(context)
  current = cutWithToolBatch(current, ordinaryCutters)

  return current
}

export function applyStackingProfile(
  shape: Shape3D,
  parameters: OpenGridStackableBoxParameters,
  context: OpenGridStackableBoxBuildContext,
): Shape3D {
  return addIntegratedStackingProfile(shape, parameters, context)
}

import {
  getOC,
  makeBox,
  makeCompound,
  makeCylinder,
  Sketcher,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  openGridOpenConnectOrganizerLayoutFor,
  openGridOpenConnectOrganizerPolygonPointsFor,
  openGridOpenConnectOrganizerSlotOriginsFor,
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION,
  validateOpenGridOpenConnectOrganizerParameters,
  type OpenGridOpenConnectOrganizerParameters,
} from '../../../cad-contract/units'
import {
  measureBooleanInScope,
  type BooleanOperationReporter,
} from '../../boolean-progress'
import {
  loadOpenGridOpenConnectShelfLockedSlot,
  placeOpenGridOpenConnectShelfLockedSlot,
} from '../opengrid-openconnect-shelf/slot'

type Point2D = [number, number]

export type OpenGridOpenConnectOrganizerBuildContext = {
  getLockedSlot?: () => Promise<Shape3D>
  yieldToEventLoop?: () => Promise<void>
  isGenerationCurrent?: () => boolean
  reportProgress?: (progress: {
    stage: 'building'
    completed?: number
    total?: number
    unit?: 'steps'
  }) => void
  booleanOperations?: BooleanOperationReporter
}

const CAVITY_BOOLEAN_BATCH_SIZE = 16
const SLOT_BOOLEAN_BATCH_SIZE = 16
const CAVITY_TOP_OVERLAP = 0.02
const FUSION_OVERLAP =
  OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.fusionOverlap

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

function assertGenerationCurrent(
  context: OpenGridOpenConnectOrganizerBuildContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

async function yieldAtSafeBoundary(
  context: OpenGridOpenConnectOrganizerBuildContext,
): Promise<void> {
  assertGenerationCurrent(context)
  await context.yieldToEventLoop?.()
  assertGenerationCurrent(context)
}

function reportProgress(
  context: OpenGridOpenConnectOrganizerBuildContext,
  completed: number,
  total: number,
): void {
  context.reportProgress?.({
    stage: 'building',
    completed,
    total,
    unit: 'steps',
  })
}

function replaceOwnedShape(current: Shape3D, replacement: Shape3D): Shape3D {
  if (replacement !== current) deleteShape(current)
  return replacement
}

export function applyOpenGridOpenConnectOrganizerOwnedTransforms(
  shape: Shape3D,
  transforms: readonly ((current: Shape3D) => Shape3D)[],
): Shape3D {
  let current = shape
  try {
    for (const transform of transforms) {
      current = replaceOwnedShape(current, transform(current))
    }
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  }
}

function polygonCavityCutter(
  parameters: OpenGridOpenConnectOrganizerParameters,
  center: Point2D,
  height: number,
): Shape3D {
  if (parameters.holeShape === 'circle') {
    throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_POLYGON_EXPECTED')
  }
  const points = openGridOpenConnectOrganizerPolygonPointsFor(
    parameters.holeShape,
    parameters.holeDiameter,
  )
  const sketcher = new Sketcher('XY', [
    center[0],
    center[1],
    parameters.bottomThickness,
  ])
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = points[0]
    if (!first) {
      throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_POLYGON_EMPTY')
    }
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(height, { extrusionDirection: [0, 0, 1] })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function cavityCutterFor(
  parameters: OpenGridOpenConnectOrganizerParameters,
  center: Point2D,
): Shape3D {
  const height = parameters.holeDepth + CAVITY_TOP_OVERLAP
  if (parameters.holeShape === 'circle') {
    return makeCylinder(parameters.holeDiameter / 2, height, [
      center[0],
      center[1],
      parameters.bottomThickness,
    ])
  }
  return polygonCavityCutter(parameters, center, height)
}

export function createOpenGridOpenConnectOrganizerOwnedCavityCutters(
  parameters: OpenGridOpenConnectOrganizerParameters,
  centers: readonly Point2D[],
  factory: (
    parameters: OpenGridOpenConnectOrganizerParameters,
    center: Point2D,
  ) => Shape3D = cavityCutterFor,
): Shape3D[] {
  const cutters: Shape3D[] = []
  try {
    for (const center of centers) cutters.push(factory(parameters, center))
    return cutters
  } catch (error) {
    cutters.forEach(deleteShape)
    throw error
  }
}

async function cutCavities(
  body: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
  context: OpenGridOpenConnectOrganizerBuildContext,
): Promise<Shape3D> {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  const printCenters = layout.cavityCenters.map(
    ([x, y]) => [x, y - layout.bodyDepth / 2] as Point2D,
  )
  let current = body
  try {
    for (
      let start = 0;
      start < printCenters.length;
      start += CAVITY_BOOLEAN_BATCH_SIZE
    ) {
      assertGenerationCurrent(context)
      const cutters = createOpenGridOpenConnectOrganizerOwnedCavityCutters(
        parameters,
        printCenters.slice(start, start + CAVITY_BOOLEAN_BATCH_SIZE),
      )
      let compound: Shape3D | null = null
      try {
        compound =
          cutters.length === 1 ? cutters[0]! : makeCompound(cutters).asShape3D()
        const cut = measureBooleanInScope(
          context.booleanOperations?.createScope(cutters.length),
          'cut',
          () => current.cut(compound!),
        )
        current = replaceOwnedShape(current, cut)
      } finally {
        if (compound && compound !== cutters[0]) deleteShape(compound)
        cutters.forEach(deleteShape)
      }
      await yieldAtSafeBoundary(context)
    }
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  }
}

function makeTransition(
  parameters: OpenGridOpenConnectOrganizerParameters,
): Shape3D {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  const radians = (parameters.tiltAngle * Math.PI) / 180
  const upperY = -layout.bodyThickness * Math.sin(radians)
  const upperZ =
    layout.installedBodyPivotZ + layout.bodyThickness * Math.cos(radians)
  const lowerZ = layout.installedBodyPivotZ
  const plateTopZ = Math.max(upperZ, FUSION_OVERLAP)
  const rearThickness =
    OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION.rearThickness
  const sketcher = new Sketcher('YZ', [-layout.bodyWidth / 2, 0, 0])
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    sketcher.movePointerTo([0, lowerZ])
    sketcher.lineTo([rearThickness, 0])
    sketcher.lineTo([rearThickness, plateTopZ])
    sketcher.lineTo([upperY - FUSION_OVERLAP, upperZ])
    sketch = sketcher.close()
    return sketch.extrude(layout.bodyWidth, {
      extrusionDirection: [1, 0, 0],
    })
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

export function fuseOpenGridOpenConnectOrganizerOwnedShapes(
  first: Shape3D,
  second: Shape3D,
  reporter: BooleanOperationReporter | undefined,
  fuse: (first: Shape3D, second: Shape3D) => Shape3D = (first, second) =>
    first.fuse(second),
): Shape3D {
  let result: Shape3D | null = null
  try {
    result = measureBooleanInScope(reporter?.createScope(1), 'fuse', () =>
      fuse(first, second),
    )
    if (result !== first) deleteShape(first)
    if (result !== second) deleteShape(second)
    return result
  } catch (error) {
    if (result && result !== first && result !== second) deleteShape(result)
    if (second !== first) deleteShape(second)
    throw error
  }
}

function placeBodyInInstalledCoordinates(
  body: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
): Shape3D {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  return applyOpenGridOpenConnectOrganizerOwnedTransforms(body, [
    (current) => current.rotate(parameters.tiltAngle, [0, 0, 0], [1, 0, 0]),
    (current) => current.translate(0, 0, layout.installedBodyPivotZ),
  ])
}

async function cutLockedSlots(
  body: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
  context: OpenGridOpenConnectOrganizerBuildContext,
): Promise<Shape3D> {
  const ownsSource = !context.getLockedSlot
  const source = context.getLockedSlot
    ? await context.getLockedSlot()
    : await loadOpenGridOpenConnectShelfLockedSlot()
  const origins = openGridOpenConnectOrganizerSlotOriginsFor(parameters)
  let current = body
  try {
    for (
      let start = 0;
      start < origins.length;
      start += SLOT_BOOLEAN_BATCH_SIZE
    ) {
      assertGenerationCurrent(context)
      const cutters: Shape3D[] = []
      let compound: Shape3D | null = null
      try {
        for (const origin of origins.slice(
          start,
          start + SLOT_BOOLEAN_BATCH_SIZE,
        )) {
          cutters.push(placeOpenGridOpenConnectShelfLockedSlot(source, origin))
        }
        compound =
          cutters.length === 1 ? cutters[0]! : makeCompound(cutters).asShape3D()
        const cut = measureBooleanInScope(
          context.booleanOperations?.createScope(cutters.length),
          'cut',
          () => current.cut(compound!),
        )
        current = replaceOwnedShape(current, cut)
      } finally {
        if (compound && compound !== cutters[0]) deleteShape(compound)
        cutters.forEach(deleteShape)
      }
      await yieldAtSafeBoundary(context)
    }
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  } finally {
    if (ownsSource) deleteShape(source)
  }
}

function orientForPrint(
  shape: Shape3D,
  parameters: OpenGridOpenConnectOrganizerParameters,
): Shape3D {
  const layout = openGridOpenConnectOrganizerLayoutFor(parameters)
  return applyOpenGridOpenConnectOrganizerOwnedTransforms(shape, [
    (current) => current.translate(0, 0, -layout.installedBodyPivotZ),
    (current) => current.rotate(-parameters.tiltAngle, [0, 0, 0], [1, 0, 0]),
  ])
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
  } catch (error) {
    solids.forEach(deleteShape)
    throw error
  } finally {
    explorer.delete()
  }
  if (solids.length !== 1) {
    solids.forEach(deleteShape)
    throw new Error('OPENGRID_OPENCONNECT_ORGANIZER_NOT_SINGLE_SOLID')
  }
  return solids[0]!
}

export async function buildOpenGridOpenConnectOrganizer(
  parameters: OpenGridOpenConnectOrganizerParameters,
  context: OpenGridOpenConnectOrganizerBuildContext = {},
): Promise<Solid> {
  const validation = validateOpenGridOpenConnectOrganizerParameters(parameters)
  if (!validation.valid) throw new Error('INVALID_INPUT')
  const normalized = validation.value
  const layout = openGridOpenConnectOrganizerLayoutFor(normalized)
  assertGenerationCurrent(context)

  const cavityBatches = Math.ceil(
    layout.cavityCenters.length / CAVITY_BOOLEAN_BATCH_SIZE,
  )
  const totalSteps = cavityBatches + 6
  let completed = 0
  let current: Shape3D | null = makeBox(
    [-layout.bodyWidth / 2, -layout.bodyDepth, 0],
    [layout.bodyWidth / 2, 0, layout.bodyThickness],
  )
  try {
    current = await cutCavities(current, normalized, context)
    completed += cavityBatches
    reportProgress(context, completed, totalSteps)

    current = placeBodyInInstalledCoordinates(current, normalized)
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    const configuration = OPENGRID_OPENCONNECT_ORGANIZER_CONFIGURATION
    const rearInterface = makeBox(
      [-layout.rearInterfaceWidth / 2, 0, 0],
      [
        layout.rearInterfaceWidth / 2,
        configuration.rearThickness,
        layout.rearInterfaceHeight,
      ],
    )
    current = fuseOpenGridOpenConnectOrganizerOwnedShapes(
      current,
      rearInterface,
      context.booleanOperations,
    )
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    current = fuseOpenGridOpenConnectOrganizerOwnedShapes(
      current,
      makeTransition(normalized),
      context.booleanOperations,
    )
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    current = await cutLockedSlots(current, normalized, context)
    completed += 1
    reportProgress(context, completed, totalSteps)
    await yieldAtSafeBoundary(context)

    current = orientForPrint(current, normalized)
    completed += 1
    reportProgress(context, completed, totalSteps)
    assertGenerationCurrent(context)

    const result = asSingleSolid(current)
    deleteShape(current)
    current = null
    completed += 1
    reportProgress(context, completed, totalSteps)
    return result
  } finally {
    deleteShape(current)
  }
}

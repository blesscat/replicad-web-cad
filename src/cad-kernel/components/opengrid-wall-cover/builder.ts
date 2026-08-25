import {
  deserializeShape,
  getOC,
  makeCompound,
  measureVolume,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import {
  isOpenGridWallCoverParameters,
  OPENGRID_SNAP_CONFIGURATION,
  type OpenGridWallCoverParameters,
} from '../../../cad-contract/units'
import {
  buildOpenGridSnap,
  type OpenGridSnapBuildContext,
} from '../opengrid-snap/builder'
import { makeOpenGridWallCoverTextShape } from './flat-text'
import type { BooleanOperationScope } from '../../boolean-progress'
import { measureBooleanInScope } from '../../boolean-progress'

export {
  importOpenGridSnapReference,
  loadOpenGridSnapReference,
  OPENGRID_SNAP_REFERENCE_URLS,
} from '../opengrid-snap/builder'

export type OpenGridWallCoverBuildContext = OpenGridSnapBuildContext & {
  getOpenGridWallCoverReference?: () => Promise<Shape3D>
}

export type OpenGridWallCoverNativePart = {
  name: 'body' | 'text'
  shape: Shape3D
}

export type OpenGridWallCoverMultipartBuild = {
  shape: Shape3D
  qualityShape: Shape3D
  parts: OpenGridWallCoverNativePart[]
}

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the primary geometry error.
  }
}

function deleteDistinctShapes(shapes: Array<Shape3D | null | undefined>): void {
  const deleted = new Set<Shape3D>()
  for (const shape of shapes) {
    if (!shape || deleted.has(shape)) continue
    deleted.add(shape)
    deleteShape(shape)
  }
}

function assertGenerationCurrent(context: OpenGridWallCoverBuildContext): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

function cloneShape(shape: Shape3D): Shape3D {
  return deserializeShape(shape.serialize()).asShape3D()
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
    deleteDistinctShapes(solids)
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
  if (centralIndex < 0) {
    throw new Error('OPENGRID_WALL_COVER_BODY_MISSING')
  }
  return centralIndex
}

function cutShape(
  source: Shape3D,
  cutter: Shape3D,
  scope: BooleanOperationScope | undefined,
): Shape3D {
  try {
    const result = measureBooleanInScope(scope, 'cut', () => source.cut(cutter))
    if (result !== source) deleteShape(source)
    deleteShape(cutter)
    return result
  } catch (error) {
    deleteShape(cutter)
    throw error
  }
}

async function buildPlaceholderBody(
  context: OpenGridWallCoverBuildContext,
): Promise<Shape3D> {
  if (context.getOpenGridWallCoverReference) {
    const reference = await context.getOpenGridWallCoverReference()
    assertGenerationCurrent(context)
    return cloneShape(reference)
  }

  if (!context.getOpenGridSnapReference) {
    throw new Error('OPENGRID_WALL_COVER_ASSET_REFERENCE_MISSING')
  }

  return buildOpenGridSnap(
    {
      ...OPENGRID_SNAP_CONFIGURATION.defaultParameters,
      variant: 'Lite',
      profile: 'Standard',
      offset: 0,
      footprint: 'full',
      fourCornerLocatingHoles: false,
      centerRemoverHole: false,
      openConnect: false,
      topText: 'none',
      magnetHoleShape: 'none',
      magnetHoleLength: 0,
      magnetHoleWidth: 0,
      magnetHoleDiameter: 0,
      magnetHoleThickness: 0,
    },
    context,
  )
}

export async function buildOpenGridWallCoverWithFlatText(
  context: OpenGridWallCoverBuildContext,
): Promise<OpenGridWallCoverMultipartBuild> {
  assertGenerationCurrent(context)
  const baseAssembly = await buildPlaceholderBody(context)
  let qualityShape: Shape3D | null = cloneShape(baseAssembly)
  let sourceSolids: Solid[] = []
  let textPart: Shape3D | null = null
  let bodyPart: Shape3D | null = null
  let previewShape: Shape3D | null = null

  try {
    sourceSolids = extractSolids(baseAssembly)
    if (sourceSolids.length !== 9) {
      throw new Error('OPENGRID_WALL_COVER_PLACEHOLDER_INVALID')
    }
    const bodyIndex = centralSolidIndex(sourceSolids)
    const body = sourceSolids[bodyIndex]
    if (!body) throw new Error('OPENGRID_WALL_COVER_BODY_MISSING')

    textPart = makeOpenGridWallCoverTextShape()
    const bodyWithCavity = cutShape(
      body,
      cloneShape(textPart),
      context.booleanOperations?.createScope(1),
    )
    sourceSolids[bodyIndex] = bodyWithCavity

    bodyPart = makeCompound(
      sourceSolids.map((solid) => cloneShape(solid)),
    ).asShape3D()
    deleteDistinctShapes(sourceSolids)
    sourceSolids = []
    deleteShape(baseAssembly)

    previewShape = makeCompound([
      cloneShape(bodyPart),
      cloneShape(textPart),
    ]).asShape3D()

    const completedPreviewShape = previewShape
    const completedQualityShape = qualityShape
    const completedBodyPart = bodyPart
    const completedTextPart = textPart
    previewShape = null
    qualityShape = null
    bodyPart = null
    textPart = null
    return {
      shape: completedPreviewShape,
      qualityShape: completedQualityShape,
      parts: [
        { name: 'body', shape: completedBodyPart },
        { name: 'text', shape: completedTextPart },
      ],
    }
  } catch (error) {
    deleteDistinctShapes([
      baseAssembly,
      qualityShape,
      ...sourceSolids,
      textPart,
      bodyPart,
      previewShape,
    ])
    throw error
  }
}

export async function buildOpenGridWallCover(
  parameters: OpenGridWallCoverParameters,
  context: OpenGridWallCoverBuildContext,
): Promise<Shape3D> {
  if (!isOpenGridWallCoverParameters(parameters)) {
    throw new Error('MODEL_PARAMETERS_MISMATCH:opengrid-wall-cover')
  }
  const result = await buildOpenGridWallCoverWithFlatText(context)
  for (const part of result.parts) deleteShape(part.shape)
  deleteShape(result.qualityShape)
  return result.shape
}

import {
  CompSolid,
  Compound,
  getOC,
  Shell,
  Solid,
  type Shape3D,
} from 'replicad'
import type {
  TopoDS_Face,
  TopoDS_Shape,
  TopoDS_Solid,
  TopAbs_ShapeEnum,
} from 'replicad-opencascadejs'

export type XYScaleTransform = {
  scaleX: number
  scaleY: number
  centerX: number
  centerY: number
}

function isPlanarFace(face: TopoDS_Face): boolean {
  const oc = getOC()
  const adaptor = new oc.BRepAdaptor_Surface_2(face, false)
  try {
    return adaptor.GetType() === oc.GeomAbs_SurfaceType.GeomAbs_Plane
  } finally {
    adaptor.delete()
  }
}

function rebuildPlanarFace(face: TopoDS_Face): TopoDS_Face {
  const oc = getOC()
  const wireType = oc.TopAbs_ShapeEnum
    .TopAbs_WIRE as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const outerWire = oc.BRepTools.OuterWire(face)
  const wires = new oc.TopExp_Explorer_2(face, wireType, shapeType)
  let maker: InstanceType<typeof oc.BRepBuilderAPI_MakeFace_15> | null = null

  try {
    if (outerWire.IsNull()) {
      throw new Error('CAD_GENERAL_TRANSFORM_PLANAR_FACE_REBUILD_FAILED')
    }
    maker = new oc.BRepBuilderAPI_MakeFace_15(outerWire, true)
    let wireCount = 0
    while (wires.More()) {
      const wire = oc.TopoDS.Wire_1(wires.Current())
      if (maker && !wire.IsSame(outerWire)) {
        maker.Add(wire)
      }
      wireCount += 1
      wires.Next()
    }

    if (wireCount === 0 || !maker || !maker.IsDone()) {
      throw new Error('CAD_GENERAL_TRANSFORM_PLANAR_FACE_REBUILD_FAILED')
    }
    return maker.Face()
  } finally {
    maker?.delete()
    outerWire.delete()
    wires.delete()
  }
}

function reshapeTransformedPlanarFaces(
  source: TopoDS_Shape,
  transformed: TopoDS_Shape,
): TopoDS_Shape {
  const oc = getOC()
  if (typeof oc.BRepTools_ReShape !== 'function') {
    throw new Error('CAD_GENERAL_TRANSFORM_RESHAPE_UNAVAILABLE')
  }
  const faceType = oc.TopAbs_ShapeEnum
    .TopAbs_FACE as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const sourceFaces = new oc.TopExp_Explorer_2(source, faceType, shapeType)
  const transformedFaces = new oc.TopExp_Explorer_2(
    transformed,
    faceType,
    shapeType,
  )
  const reshaper = new oc.BRepTools_ReShape()

  try {
    while (sourceFaces.More() && transformedFaces.More()) {
      const sourceFace = oc.TopoDS.Face_1(sourceFaces.Current())
      const transformedFace = oc.TopoDS.Face_1(transformedFaces.Current())
      if (isPlanarFace(sourceFace)) {
        const replacement = rebuildPlanarFace(transformedFace)
        try {
          reshaper.Replace(transformedFace, replacement)
        } finally {
          replacement.delete()
        }
      }
      sourceFaces.Next()
      transformedFaces.Next()
    }

    if (sourceFaces.More() || transformedFaces.More()) {
      throw new Error('CAD_GENERAL_TRANSFORM_FACE_COUNT_MISMATCH')
    }

    const reshaped = reshaper.Apply(transformed, shapeType)
    if (reshaped.IsNull()) {
      throw new Error('CAD_GENERAL_TRANSFORM_RESHAPE_FAILED')
    }
    return reshaped
  } finally {
    reshaper.delete()
    sourceFaces.delete()
    transformedFaces.delete()
  }
}

function repairTransformedPlanarFaces(
  source: TopoDS_Solid,
  transformed: TopoDS_Solid,
): Solid {
  const oc = getOC()
  const reshaped = reshapeTransformedPlanarFaces(source, transformed)
  try {
    return new Solid(oc.TopoDS.Solid_1(reshaped))
  } finally {
    reshaped.delete()
  }
}

function repairTransformedCompound(
  source: TopoDS_Shape,
  transformed: TopoDS_Shape,
): Compound {
  const oc = getOC()
  const solidType = oc.TopAbs_ShapeEnum
    .TopAbs_SOLID as unknown as TopAbs_ShapeEnum
  const shapeType = oc.TopAbs_ShapeEnum
    .TopAbs_SHAPE as unknown as TopAbs_ShapeEnum
  const sourceSolids = new oc.TopExp_Explorer_2(source, solidType, shapeType)
  const transformedSolids = new oc.TopExp_Explorer_2(
    transformed,
    solidType,
    shapeType,
  )
  const compound = new oc.TopoDS_Compound()
  const topology = new oc.TopoDS_Builder()
  topology.MakeCompound(compound)

  try {
    while (sourceSolids.More() && transformedSolids.More()) {
      const sourceSolid = oc.TopoDS.Solid_1(sourceSolids.Current())
      const transformedSolid = oc.TopoDS.Solid_1(transformedSolids.Current())
      const repaired = repairTransformedPlanarFaces(
        sourceSolid,
        transformedSolid,
      )
      topology.Add(compound, repaired.wrapped)
      repaired.delete()
      sourceSolids.Next()
      transformedSolids.Next()
    }

    if (sourceSolids.More() || transformedSolids.More()) {
      throw new Error('CAD_GENERAL_TRANSFORM_SOLID_COUNT_MISMATCH')
    }

    return new Compound(compound)
  } finally {
    topology.delete()
    sourceSolids.delete()
    transformedSolids.delete()
  }
}

function transformedShape3D(source: Shape3D, shape: TopoDS_Shape): Shape3D {
  const oc = getOC()
  const shapeType = shape.ShapeType()

  if (shapeType === oc.TopAbs_ShapeEnum.TopAbs_SOLID) {
    const transformedSolid = oc.TopoDS.Solid_1(shape)
    if (source.wrapped.ShapeType() === oc.TopAbs_ShapeEnum.TopAbs_SOLID) {
      return repairTransformedPlanarFaces(
        oc.TopoDS.Solid_1(source.wrapped),
        transformedSolid,
      )
    }
    return new Solid(transformedSolid)
  }
  if (
    shapeType === oc.TopAbs_ShapeEnum.TopAbs_COMPOUND &&
    source.wrapped.ShapeType() === oc.TopAbs_ShapeEnum.TopAbs_COMPOUND
  ) {
    return repairTransformedCompound(source.wrapped, shape)
  }
  if (shapeType === oc.TopAbs_ShapeEnum.TopAbs_COMPSOLID) {
    return new CompSolid(oc.TopoDS.CompSolid_1(shape))
  }
  if (shapeType === oc.TopAbs_ShapeEnum.TopAbs_SHELL) {
    return new Shell(oc.TopoDS.Shell_1(shape))
  }
  if (shapeType === oc.TopAbs_ShapeEnum.TopAbs_COMPOUND) {
    return new Compound(oc.TopoDS.Compound_1(shape))
  }

  throw new Error('CAD_GENERAL_TRANSFORM_RESULT_NOT_3D')
}

function translationForScale(transform: XYScaleTransform): [number, number] {
  return [
    transform.centerX * (1 - transform.scaleX),
    transform.centerY * (1 - transform.scaleY),
  ]
}

export function transformShapeXY(
  source: Solid,
  transform: XYScaleTransform,
): Solid
export function transformShapeXY(
  source: Shape3D,
  transform: XYScaleTransform,
): Shape3D
export function transformShapeXY(
  source: Shape3D,
  transform: XYScaleTransform,
): Shape3D {
  const oc = getOC()
  if (typeof oc.BRepBuilderAPI_GTransform_1 !== 'function') {
    throw new Error('CAD_GENERAL_TRANSFORM_UNAVAILABLE')
  }

  const generalTransform = new oc.gp_GTrsf_1()
  const [translationX, translationY] = translationForScale(transform)
  const translation = new oc.gp_XYZ_2(translationX, translationY, 0)

  try {
    generalTransform.SetValue(1, 1, transform.scaleX)
    generalTransform.SetValue(1, 2, 0)
    generalTransform.SetValue(1, 3, 0)
    generalTransform.SetValue(2, 1, 0)
    generalTransform.SetValue(2, 2, transform.scaleY)
    generalTransform.SetValue(2, 3, 0)
    generalTransform.SetValue(3, 1, 0)
    generalTransform.SetValue(3, 2, 0)
    generalTransform.SetValue(3, 3, 1)
    generalTransform.SetTranslationPart(translation)
    const builder = new oc.BRepBuilderAPI_GTransform_1(generalTransform)
    try {
      builder.Perform(source.wrapped, true)
      if (!builder.IsDone()) {
        throw new Error('CAD_GENERAL_TRANSFORM_FAILED')
      }

      return transformedShape3D(source, builder.Shape())
    } finally {
      builder.delete()
    }
  } finally {
    translation.delete()
    generalTransform.delete()
  }
}

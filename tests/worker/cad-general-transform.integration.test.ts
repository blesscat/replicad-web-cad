import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  getOC,
  importSTEP,
  makeBox,
  measureVolume,
  Solid,
  type Shape3D,
} from 'replicad'
import type { TopoDS_Shape, TopoDS_Solid } from 'replicad-opencascadejs'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import { transformShapeXY } from '../../src/cad-kernel/transform'

const require = createRequire(import.meta.url)
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

type GeneralTransform = {
  SetValue(row: number, column: number, value: number): void
  SetTranslationPart(translation: unknown): void
  delete(): void
}

type GeneralTransformBuilder = {
  Perform(source: TopoDS_Shape, copy: boolean): void
  Shape(): TopoDS_Shape
  IsDone(): boolean
  delete(): void
}

type RuntimeCadApi = {
  gp_GTrsf_1: new () => GeneralTransform
  gp_XYZ_2: new (
    x: number,
    y: number,
    z: number,
  ) => {
    delete(): void
  }
  BRepBuilderAPI_GTransform_1: new (
    transform: GeneralTransform,
  ) => GeneralTransformBuilder
  TopoDS: {
    Solid_1(shape: TopoDS_Shape): TopoDS_Solid
  }
}

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('CAD general transform capability', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
  })

  it('applies non-uniform XY scaling around a chosen center while preserving Z', () => {
    const oc = getOC() as unknown as RuntimeCadApi
    const source = makeBox([0, 0, 0], [10, 8, 4])
    const transform = new oc.gp_GTrsf_1()
    const translation = new oc.gp_XYZ_2(-1, 0.75, 0)
    transform.SetValue(1, 1, 1.5)
    transform.SetValue(2, 2, 0.75)
    transform.SetValue(3, 3, 1)
    transform.SetTranslationPart(translation)
    const builder = new oc.BRepBuilderAPI_GTransform_1(transform)

    try {
      builder.Perform(source.wrapped, true)

      const rawResult = builder.Shape()
      const result = new Solid(oc.TopoDS.Solid_1(rawResult))
      try {
        const bounds = shapeBounds(result)
        expect(bounds[0]?.[0]).toBeCloseTo(-1, 5)
        expect(bounds[0]?.[1]).toBeCloseTo(0.75, 5)
        expect(bounds[0]?.[2]).toBeCloseTo(0, 5)
        expect(bounds[1]?.[0]).toBeCloseTo(14, 5)
        expect(bounds[1]?.[1]).toBeCloseTo(6.75, 5)
        expect(bounds[1]?.[2]).toBeCloseTo(4, 5)
        expect(measureVolume(result)).toBeCloseTo(360, 6)
      } finally {
        result.delete()
      }
    } finally {
      builder.delete()
      translation.delete()
      transform.delete()
      source.delete()
    }
  })

  it('exposes the same behavior through the shared Replicad shape helper', () => {
    const source = makeBox([0, 0, 0], [10, 8, 4])
    const result = transformShapeXY(source, {
      scaleX: 1.5,
      scaleY: 0.75,
      centerX: 2,
      centerY: 3,
    })

    try {
      const bounds = shapeBounds(result)
      expect(bounds[0]?.[0]).toBeCloseTo(-1, 5)
      expect(bounds[0]?.[1]).toBeCloseTo(0.75, 5)
      expect(bounds[0]?.[2]).toBeCloseTo(0, 5)
      expect(bounds[1]?.[0]).toBeCloseTo(14, 5)
      expect(bounds[1]?.[1]).toBeCloseTo(6.75, 5)
      expect(bounds[1]?.[2]).toBeCloseTo(4, 5)
      expect(measureVolume(result)).toBeCloseTo(360, 6)
    } finally {
      result.delete()
      source.delete()
    }
  })

  it('keeps transformed OpenGrid planar profiles inside the affine envelope', async () => {
    const asset = new URL(
      '../../src/cad-kernel/components/opengrid-snap/assets/opengrid-bare-standard-lite-snap.step',
      import.meta.url,
    )
    const source = (
      await importSTEP(new Blob([await readFile(asset)]))
    ).asShape3D()
    const result = transformShapeXY(source, {
      scaleX: 1.0078125,
      scaleY: 1.0078125,
      centerX: 0,
      centerY: 0,
    })

    try {
      const bounds = shapeBounds(result)
      expect(bounds[0]?.[0]).toBeCloseTo(-12.9, 3)
      expect(bounds[0]?.[1]).toBeCloseTo(-12.9, 3)
      expect(bounds[0]?.[2]).toBeCloseTo(0, 3)
      expect(bounds[1]?.[0]).toBeCloseTo(12.9, 3)
      expect(bounds[1]?.[1]).toBeCloseTo(12.9, 3)
      expect(bounds[1]?.[2]).toBeCloseTo(3.4, 3)
      const oc = getOC()
      expect(measureVolume(result)).toBeGreaterThan(0)
      const analyzer = new oc.BRepCheck_Analyzer(result.wrapped, true, true)
      try {
        expect(analyzer.IsValid_2()).toBe(true)
      } finally {
        analyzer.delete()
      }
    } finally {
      result.delete()
      source.delete()
    }
  })

  it('publishes the same general-transform WASM to the browser Worker', async () => {
    const browserWasm = await readFile(
      new URL('../../public/replicad_single.wasm', import.meta.url),
    )
    const packageWasm = await readFile(WASM_PATH)

    expect(sha256(browserWasm)).toBe(sha256(packageWasm))
  })
})

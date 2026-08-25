import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getOC, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  buildOpenGridWallCoverWithFlatText,
  importOpenGridSnapReference,
  OPENGRID_SNAP_REFERENCE_URLS,
} from '../../src/cad-kernel/components/opengrid-wall-cover/builder'
import { assertOpenGridWallCoverShapeQuality } from '../../src/cad-kernel/components/opengrid-wall-cover/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'
import { OPENGRID_WALL_COVER_TEXT_CONFIGURATION } from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
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

describe('OpenGrid Wall Cover placeholder', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
  })

  afterAll(() => undefined)

  it('keeps placeholder text coplanar while retaining separate body/text parts', async () => {
    const reference = await importOpenGridSnapReference(
      new Blob([
        readFileSync(fileURLToPath(OPENGRID_SNAP_REFERENCE_URLS.Standard.Lite)),
      ]),
      'Lite',
      'Standard',
    )
    const generated = await buildOpenGridWallCoverWithFlatText({
      getOpenGridSnapReference: async () => reference,
    })
    try {
      const bodyPart = generated.parts.find((part) => part.name === 'body')
      const textPart = generated.parts.find((part) => part.name === 'text')
      if (!bodyPart || !textPart) throw new Error('wall-cover-parts-missing')

      const bodyBounds = shapeBounds(bodyPart.shape)
      const textBounds = shapeBounds(textPart.shape)
      const expectedTop = 3.4
      const expectedBottom =
        expectedTop - OPENGRID_WALL_COVER_TEXT_CONFIGURATION.depth

      expect(countSolids(bodyPart.shape)).toBe(9)
      expect(countSolids(textPart.shape)).toBeGreaterThan(0)
      expect(textBounds[0]?.[2]).toBeCloseTo(expectedBottom, 2)
      expect(textBounds[1]?.[2]).toBeCloseTo(expectedTop, 2)
      expect(bodyBounds[1]?.[2]).toBeCloseTo(expectedTop, 2)
      expect(shapeBounds(generated.shape)[1]?.[2]).toBeCloseTo(expectedTop, 2)

      const bodyMesh = meshBRep(bodyPart.shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const textMesh = meshBRep(textPart.shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      expect(() =>
        assertOpenGridWallCoverShapeQuality(
          generated.qualityShape,
          bodyPart.shape,
          textPart.shape,
          bodyMesh,
          textMesh,
          reference,
        ),
      ).not.toThrow()
    } finally {
      generated.shape.delete()
      generated.qualityShape.delete()
      for (const part of generated.parts) part.shape.delete()
      reference.delete()
    }
  })
})

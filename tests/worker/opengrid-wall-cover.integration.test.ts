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
  importOpenGridWallCoverReference,
  loadOpenGridWallCoverReference,
  OPEN_GRID_WALL_COVER_REFERENCE_URL,
} from '../../src/cad-kernel/components/opengrid-wall-cover/builder'
import { assertOpenGridWallCoverShapeQuality } from '../../src/cad-kernel/components/opengrid-wall-cover/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  exportThreeMfBytes,
  isThreeMfPackage,
} from '../../src/cad-kernel/export'
import {
  loadOpenGridWallCoverFont,
  makeOpenGridWallCoverTextGlyphShape,
  OPEN_GRID_WALL_COVER_FONT_URL,
  OPENGRID_WALL_COVER_TEXT_CONFIGURATION,
} from '../../src/cad-kernel/components/opengrid-wall-cover/flat-text'

const wallCoverTextCases = [
  { text: 'A', coverCount: 1 },
  { text: 'IAN', coverCount: 3 },
  { text: '收納', coverCount: 2 },
  { text: 'ABCDEFGH', coverCount: 8 },
] as const

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

function threeMfVertexBounds(xml: string): number[][] {
  const vertices = [
    ...xml.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g),
  ].map((match) => [Number(match[1]), Number(match[2]), Number(match[3])])
  if (vertices.length === 0) throw new Error('3mf-vertices-missing')
  return [
    [
      Math.min(...vertices.map((vertex) => vertex[0]!)),
      Math.min(...vertices.map((vertex) => vertex[1]!)),
      Math.min(...vertices.map((vertex) => vertex[2]!)),
    ],
    [
      Math.max(...vertices.map((vertex) => vertex[0]!)),
      Math.max(...vertices.map((vertex) => vertex[1]!)),
      Math.max(...vertices.map((vertex) => vertex[2]!)),
    ],
  ]
}

describe('OpenGrid Wall Cover supplied STEP', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
    await loadOpenGridWallCoverFont(
      readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_FONT_URL)),
    )
  })

  afterAll(() => undefined)

  it('loads the supplied cover STEP as a nine-solid Lite reference', async () => {
    const reference = await loadOpenGridWallCoverReference(
      async () =>
        new Response(
          readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
          { status: 200 },
        ),
    )
    try {
      const bounds = shapeBounds(reference)
      expect(countSolids(reference)).toBe(9)
      expect(bounds[0]?.[0]).toBeCloseTo(-12.8, 2)
      expect(bounds[0]?.[1]).toBeCloseTo(-12.8, 2)
      expect(bounds[0]?.[2]).toBeCloseTo(0, 2)
      expect(bounds[1]?.[0]).toBeCloseTo(12.8, 2)
      expect(bounds[1]?.[1]).toBeCloseTo(12.8, 2)
      expect(bounds[1]?.[2]).toBeCloseTo(3.4, 2)
      expect(OPEN_GRID_WALL_COVER_REFERENCE_URL.pathname).toContain(
        'opengrid-snap-cover.step',
      )
    } finally {
      reference.delete()
    }
  })

  it('keeps cover text coplanar while retaining separate body/text parts', async () => {
    const reference = await importOpenGridWallCoverReference(
      new Blob([
        readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
      ]),
    )
    const generated = await buildOpenGridWallCoverWithFlatText(
      { text: 'A' },
      { getOpenGridWallCoverReference: async () => reference },
    )
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
          { text: 'A' },
        ),
      ).not.toThrow()
    } finally {
      generated.shape.delete()
      generated.qualityShape.delete()
      for (const part of generated.parts) part.shape.delete()
      reference.delete()
    }
  })

  it.each(wallCoverTextCases)(
    'builds one independent cover for each character in $text',
    async ({ text: value, coverCount }) => {
      const reference = await importOpenGridWallCoverReference(
        new Blob([
          readFileSync(fileURLToPath(OPEN_GRID_WALL_COVER_REFERENCE_URL)),
        ]),
      )
      const generated = await buildOpenGridWallCoverWithFlatText(
        { text: value },
        { getOpenGridWallCoverReference: async () => reference },
      )
      try {
        const bodyPart = generated.parts.find((part) => part.name === 'body')
        const textPart = generated.parts.find((part) => part.name === 'text')
        if (!bodyPart || !textPart) throw new Error('wall-cover-parts-missing')

        const bounds = shapeBounds(generated.shape)
        const expectedWidth = coverCount * 25.6 + (coverCount - 1) * 3
        expect(bounds[0]?.[0]).toBeCloseTo(-expectedWidth / 2, 2)
        expect(bounds[1]?.[0]).toBeCloseTo(expectedWidth / 2, 2)
        expect(bounds[0]?.[1]).toBeCloseTo(-12.8, 2)
        expect(bounds[1]?.[1]).toBeCloseTo(12.8, 2)
        expect(countSolids(bodyPart.shape)).toBe(9 * coverCount)
        expect(countSolids(generated.qualityShape)).toBe(9 * coverCount)
        expect(shapeBounds(textPart.shape)[0]?.[2]).toBeCloseTo(3.0, 2)
        expect(shapeBounds(textPart.shape)[1]?.[2]).toBeCloseTo(3.4, 2)

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
            { text: value },
          ),
        ).not.toThrow()

        if (coverCount === 1 || coverCount === 3 || coverCount === 8) {
          const threeMf = await exportThreeMfBytes([
            { name: 'body', shape: bodyPart.shape },
            { name: 'text', shape: textPart.shape },
          ])
          const threeMfText = new TextDecoder().decode(new Uint8Array(threeMf))
          const packageBounds = threeMfVertexBounds(threeMfText)
          expect(isThreeMfPackage(threeMf)).toBe(true)
          expect(threeMfText.match(/<item objectid="3"/g)).toHaveLength(1)
          expect(threeMfText.match(/<part id="1"/g)).toHaveLength(1)
          expect(threeMfText.match(/<part id="2"/g)).toHaveLength(1)
          expect(threeMfText).toContain('key="filament_maps" value="1 2"')
          expect(packageBounds[0]?.[0]).toBeCloseTo(bounds[0]?.[0] ?? 0, 1)
          expect(packageBounds[1]?.[0]).toBeCloseTo(bounds[1]?.[0] ?? 0, 1)
          expect(packageBounds[0]?.[1]).toBeCloseTo(bounds[0]?.[1] ?? 0, 1)
          expect(packageBounds[1]?.[1]).toBeCloseTo(bounds[1]?.[1] ?? 0, 1)
          expect(packageBounds[0]?.[2]).toBeCloseTo(0, 1)
          expect(packageBounds[1]?.[2]).toBeCloseTo(3.4, 1)
        }
      } finally {
        generated.shape.delete()
        generated.qualityShape.delete()
        for (const part of generated.parts) part.shape.delete()
        reference.delete()
      }
    },
    60000,
  )
})

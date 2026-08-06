import { createRequire } from 'node:module'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import {
  hswCellTemplateUrl,
  importHswCellTemplate,
} from '../../src/cad-kernel/components/hsw-cell/builder'
import { HSW_CELL_CONFIGURATION } from '../../src/cad-contract/units'

const sourceAssetPath = fileURLToPath(hswCellTemplateUrl)
const productionAssetDirectory = fileURLToPath(
  new URL('../../dist/_astro/', import.meta.url),
)

function productionAssetPath(): string | undefined {
  if (!existsSync(productionAssetDirectory)) return undefined
  const fileName = readdirSync(productionAssetDirectory).find((name) =>
    /^hsw-cell-.*\.step$/.test(name),
  )
  if (!fileName) return undefined
  return `${productionAssetDirectory}/${fileName}`
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not replace the primary asset assertion.
  }
}

describe('hsw-cell asset packaging', () => {
  it('keeps the canonical HSW asset available through its component-local URL', () => {
    const bytes = readFileSync(sourceAssetPath)

    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(hswCellTemplateUrl.pathname).toContain('/hsw-cell/hsw-cell.step')
  })

  it.skipIf(!productionAssetPath())(
    'copies the canonical asset into the production build output',
    () => {
      const builtPath = productionAssetPath()
      if (!builtPath) throw new Error('HSW production asset was not emitted')

      expect(readFileSync(builtPath)).toEqual(readFileSync(sourceAssetPath))
    },
  )
})

const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

describe.skipIf(!productionAssetPath())(
  'hsw-cell production asset structure',
  () => {
    beforeAll(async () => {
      const openCascade = await initialiseOpenCascade({
        locateFile: () => WASM_PATH,
      })
      setOC(openCascade as Parameters<typeof setOC>[0])
    })

    it('imports the built URL as the canonical single solid with Z=0 bounds', async () => {
      const builtPath = productionAssetPath()
      if (!builtPath) throw new Error('HSW production asset was not emitted')

      const shape = await importHswCellTemplate(
        new Blob([readFileSync(builtPath)]),
      )
      try {
        expect(shape.constructor.name).toBe('Solid')
        const boundingBox = shape.boundingBox
        try {
          const bounds = boundingBox.bounds as number[][]
          expect(bounds[0]?.[0]).toBeCloseTo(
            -HSW_CELL_CONFIGURATION.outerWidth / 2,
            2,
          )
          expect(bounds[0]?.[1]).toBeCloseTo(
            -HSW_CELL_CONFIGURATION.outerDepth / 2,
            2,
          )
          expect(bounds[0]?.[2]).toBeCloseTo(0, 2)
          expect(bounds[1]?.[0]).toBeCloseTo(
            HSW_CELL_CONFIGURATION.outerWidth / 2,
            2,
          )
          expect(bounds[1]?.[1]).toBeCloseTo(
            HSW_CELL_CONFIGURATION.outerDepth / 2,
            2,
          )
          expect(bounds[1]?.[2]).toBeCloseTo(
            HSW_CELL_CONFIGURATION.outerHeight,
            2,
          )
        } finally {
          boundingBox.delete()
        }
      } finally {
        deleteShape(shape)
      }
    })
  },
)

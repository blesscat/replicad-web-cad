import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import { boundsForOpenGridSnapRemover } from '../../src/cad-contract/units'
import {
  buildOpenGridSnapRemover,
  importOpenGridSnapRemoverAsset,
  openGridSnapRemoverAssetUrl,
} from '../../src/cad-kernel/components/opengrid-snap-remover/builder'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not hide the primary geometry assertion.
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

let source: Shape3D

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
  source = await importOpenGridSnapRemoverAsset(
    new Blob([readFileSync(fileURLToPath(openGridSnapRemoverAssetUrl))]),
  )
})

afterAll(() => {
  deleteShape(source)
})

describe('OpenGrid Snap Remover B-Rep integration', () => {
  it('imports a non-empty component-local STEP shape with the recorded bounds', () => {
    expect(source.isNull).toBe(false)
    expect(measureVolume(source)).toBeGreaterThan(0)

    const actual = shapeBounds(source)
    const expected = boundsForOpenGridSnapRemover({})
    for (const index of [0, 1, 2]) {
      expect(actual[0]?.[index]).toBeCloseTo(expected.min[index], 3)
      expect(actual[1]?.[index]).toBeCloseTo(expected.max[index], 3)
    }
  })

  it('clones the imported source without changing its bounds', () => {
    const clone = buildOpenGridSnapRemover(source)
    try {
      expect(shapeBounds(clone)).toEqual(shapeBounds(source))
    } finally {
      deleteShape(clone)
    }
  })
})

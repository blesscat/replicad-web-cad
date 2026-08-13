import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import { buildOpenGridStackableBox } from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import { buildOpenGridStackableCylinder } from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'

const createdShapes: Shape3D[] = []

const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const initialiseOpenCascade = require('replicad-opencascadejs')
  .default as (options: { locateFile: () => string }) => Promise<unknown>
const wasmPath =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => wasmPath,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function remember<T extends Shape3D>(shape: T): T {
  createdShapes.push(shape)
  return shape
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

afterEach(() => {
  for (const shape of createdShapes.splice(0)) shape.delete()
})

describe('OpenGrid honeycomb container outputs', () => {
  it('reduces box volume while keeping the original exported envelope', () => {
    const baseline = remember(
      buildOpenGridStackableBox(OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS),
    )
    const honeycomb = remember(
      buildOpenGridStackableBox({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        honeycombMode: true,
      }),
    )

    expect(measureVolume(honeycomb)).toBeLessThan(measureVolume(baseline))
    expect(boundsOf(honeycomb)).toEqual(
      boundsOf(baseline).map((bound) =>
        bound.map((value) => expect.closeTo(value, 4)),
      ),
    )
  }, 120_000)

  it('reduces round-box volume without changing its circular envelope', () => {
    const baseline = remember(
      buildOpenGridStackableCylinder(
        OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      ),
    )
    const honeycomb = remember(
      buildOpenGridStackableCylinder({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        honeycombMode: true,
      }),
    )

    expect(measureVolume(honeycomb)).toBeLessThan(measureVolume(baseline))
    expect(boundsOf(honeycomb)).toEqual(
      boundsOf(baseline).map((bound) =>
        bound.map((value) => expect.closeTo(value, 4)),
      ),
    )
  }, 120_000)
})

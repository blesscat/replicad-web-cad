import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import { OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'
import {
  buildOpenGridStackableBox,
  inspectOpenGridStackableBoxInterface,
  inspectOpenGridStackableBoxOpenings,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'

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

afterEach(() => {
  for (const shape of createdShapes.splice(0)) shape.delete()
})

describe('OpenGrid box honeycomb interfaces', () => {
  it('preserves box holes and side openings in honeycomb geometry', () => {
    const input = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      height: 30,
      fullBottomHoleGrid: true,
      openingPlusXDepth: 6,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 90,
      honeycombMode: true,
    }
    const baselineInput = { ...input, honeycombMode: false }
    const baseline = remember(buildOpenGridStackableBox(baselineInput))
    const honeycomb = remember(buildOpenGridStackableBox(input))
    const baselineReport = inspectOpenGridStackableBoxInterface(
      baseline,
      baselineInput,
    )
    const honeycombReport = inspectOpenGridStackableBoxInterface(
      honeycomb,
      input,
    )
    const openings = inspectOpenGridStackableBoxOpenings(honeycomb, input)

    expect(honeycombReport.honeycombMode).toBe(true)
    expect(honeycombReport.honeycombCellCount).toBeGreaterThan(0)
    expect(honeycombReport.mountingHoleProfiles).toEqual(
      baselineReport.mountingHoleProfiles,
    )
    expect(honeycombReport.captiveSocketRecords).toEqual(
      baselineReport.captiveSocketRecords,
    )
    expect(honeycombReport.ordinaryBottomHoleCount).toBe(
      baselineReport.ordinaryBottomHoleCount,
    )
    expect(openings).toHaveLength(1)
    expect(openings[0]).toMatchObject({
      cutProbeVolume: expect.closeTo(0, 2),
      topEdgeProbeVolume: expect.closeTo(0, 2),
      topRailProbeVolume: expect.closeTo(0, 2),
    })
  }, 120_000)
})

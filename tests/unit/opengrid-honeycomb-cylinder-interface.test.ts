import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setOC, type Shape3D } from 'replicad'
import { OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS } from '../../src/cad-contract/units'
import {
  buildOpenGridStackableCylinder,
  inspectOpenGridStackableCylinderInterface,
} from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import { openGridStackableCylinderBottomHoneycombCellCountFor } from '../../src/cad-kernel/lattice/opengrid-honeycomb'

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

describe('OpenGrid cylinder honeycomb interfaces', () => {
  it('preserves cylinder holes and side openings in honeycomb geometry', () => {
    const input = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      height: 30,
      bottomSeatMode: 'none' as const,
      openingPlusXDepth: 12,
      openingPlusXBottomLength: 12,
      openingPlusXAngle: 90,
      honeycombMode: true,
    }
    const baselineInput = { ...input, honeycombMode: false }
    const baseline = remember(buildOpenGridStackableCylinder(baselineInput))
    const honeycomb = remember(buildOpenGridStackableCylinder(input))
    const baselineReport = inspectOpenGridStackableCylinderInterface(
      baseline,
      baselineInput,
    )
    const honeycombReport = inspectOpenGridStackableCylinderInterface(
      honeycomb,
      input,
    )
    const opening = honeycombReport.openings.find(
      (record) => record.direction === '+X',
    )

    expect(honeycombReport.honeycombMode).toBe(true)
    expect(honeycombReport.honeycombCellCount).toBeGreaterThan(0)
    expect(honeycombReport.brepValid).toBe(true)
    expect(honeycombReport.solidCount).toBe(1)
    expect(honeycombReport.holeRecordCount).toBe(baselineReport.holeRecordCount)
    expect(honeycombReport.holes).toEqual(baselineReport.holes)
    expect(honeycombReport.bottomProtrusionVolume).toBeGreaterThan(0)
    expect(honeycombReport.bottomProtrusionVolume).toBeLessThan(
      baselineReport.bottomProtrusionVolume,
    )
    expect(honeycombReport.bottomGrooveResidualVolume).toBeCloseTo(
      baselineReport.bottomGrooveResidualVolume,
      4,
    )
    expect(honeycombReport.bottomMatingClearance).toBeCloseTo(
      baselineReport.bottomMatingClearance,
      4,
    )
    expect(honeycombReport.bottomMatingBoundaryProbeCount).toBe(
      baselineReport.bottomMatingBoundaryProbeCount,
    )
    expect(honeycombReport.matingIntersectionVolume).toBeCloseTo(
      baselineReport.matingIntersectionVolume,
      4,
    )
    expect(opening).toMatchObject({
      enabled: true,
      bottomLength: 12,
      valid: true,
    })

    const noHoleInput = { ...input, bottomSeatMode: 'none' as const }
    const noHoleShape = remember(buildOpenGridStackableCylinder(noHoleInput))
    const noHoleReport = inspectOpenGridStackableCylinderInterface(
      noHoleShape,
      noHoleInput,
    )
    expect(noHoleReport.holeRecordCount).toBe(0)
    expect(noHoleReport.honeycombCellCount).toBeGreaterThan(0)
    expect(
      openGridStackableCylinderBottomHoneycombCellCountFor(noHoleInput),
    ).toBeGreaterThan(0)
    const noHoleBaselineInput = { ...noHoleInput, honeycombMode: false }
    const noHoleBaseline = remember(
      buildOpenGridStackableCylinder(noHoleBaselineInput),
    )
    const noHoleBaselineReport = inspectOpenGridStackableCylinderInterface(
      noHoleBaseline,
      noHoleBaselineInput,
    )
    expect(noHoleReport.bottomProtrusionVolume).toBeGreaterThan(0)
    expect(noHoleReport.bottomProtrusionVolume).toBeLessThan(
      noHoleBaselineReport.bottomProtrusionVolume,
    )
    expect(noHoleReport.bottomMatingBoundaryProbeCount).toBe(
      noHoleBaselineReport.bottomMatingBoundaryProbeCount,
    )
  }, 180_000)
})

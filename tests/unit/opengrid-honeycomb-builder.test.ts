import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { beforeAll } from 'vitest'
import { measureVolume, setOC, type Shape3D } from 'replicad'
import {
  OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
  OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
} from '../../src/cad-contract/units'
import {
  openGridStackableCylinderBottomHoneycombCellCountFor,
  openGridStackableBoxHoneycombCellCountFor,
  openGridStackableCylinderHoneycombCellCountFor,
} from '../../src/cad-kernel/lattice/opengrid-honeycomb'
import {
  buildOpenGridStackableBox,
  inspectOpenGridStackableBoxInterface,
  inspectOpenGridStackableBoxOpenings,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  buildOpenGridStackableCylinder,
  inspectOpenGridStackableCylinderInterface,
} from '../../src/cad-kernel/components/opengrid-stackable-cylinder/builder'
import { exportStepBytes, exportStlBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'

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

describe('OpenGrid honeycomb material-saving builders', () => {
  it('anchors safe cells deterministically and falls back on small panels', () => {
    const box = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
      honeycombMode: true,
    }
    const cylinder = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 100,
      height: 60,
      honeycombMode: true,
    }
    const smallBox = {
      ...box,
      x: 0.5,
      y: 0.5,
      height: 10,
    }
    const smallCylinder = {
      ...cylinder,
      diameter: 20,
      height: 10,
    }

    const boxCellCount = openGridStackableBoxHoneycombCellCountFor(box)
    const cylinderCellCount =
      openGridStackableCylinderHoneycombCellCountFor(cylinder)
    expect(boxCellCount).toBeGreaterThan(0)
    expect(openGridStackableBoxHoneycombCellCountFor(box)).toBe(boxCellCount)
    expect(openGridStackableBoxHoneycombCellCountFor(smallBox)).toBe(0)
    expect(cylinderCellCount).toBeGreaterThan(0)
    expect(openGridStackableCylinderHoneycombCellCountFor(smallCylinder)).toBe(
      0,
    )

    const smallBoxShape = remember(buildOpenGridStackableBox(smallBox))
    const smallCylinderShape = remember(
      buildOpenGridStackableCylinder(smallCylinder),
    )
    expect(measureVolume(smallBoxShape)).toBeGreaterThan(0)
    expect(measureVolume(smallCylinderShape)).toBeGreaterThan(0)
  }, 30000)

  it('honors stale-generation cancellation before honeycomb output is returned', () => {
    expect(() =>
      buildOpenGridStackableBox(
        {
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          x: 3,
          y: 3,
          height: 60,
          honeycombMode: true,
        },
        { isGenerationCurrent: () => false },
      ),
    ).toThrow('STALE_GENERATION')
    expect(() =>
      buildOpenGridStackableCylinder(
        {
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          diameter: 100,
          height: 60,
          honeycombMode: true,
        },
        { isGenerationCurrent: () => false },
      ),
    ).toThrow('STALE_GENERATION')
  })

  it('reduces box volume while keeping the original exported envelope', () => {
    const baseline = remember(
      buildOpenGridStackableBox({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: 3,
        y: 3,
        height: 60,
      }),
    )
    const honeycomb = remember(
      buildOpenGridStackableBox({
        ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
        x: 3,
        y: 3,
        height: 60,
        honeycombMode: true,
      }),
    )

    expect(measureVolume(honeycomb)).toBeLessThan(measureVolume(baseline))
    expect(boundsOf(honeycomb)).toEqual(
      boundsOf(baseline).map((bound) =>
        bound.map((value) => expect.closeTo(value, 4)),
      ),
    )
  }, 30000)

  it('preserves box holes and side openings while exporting honeycomb geometry', async () => {
    const input = {
      ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
      x: 3,
      y: 3,
      height: 60,
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

    const mesh = meshBRep(honeycomb, {
      tolerance: 0.05,
      angularTolerance: 0.1,
    })
    expect(mesh.triangleCount).toBeGreaterThan(0)
    const [step, stl] = await Promise.all([
      exportStepBytes(honeycomb),
      exportStlBytes(honeycomb, { tolerance: 0.01, angularTolerance: 0.1 }),
    ])
    expect(step.byteLength).toBeGreaterThan(0)
    expect(stl.byteLength).toBeGreaterThan(84)
  }, 120000)

  it('reduces round-box volume without changing its circular envelope', () => {
    const baseline = remember(
      buildOpenGridStackableCylinder({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        diameter: 100,
        height: 60,
      }),
    )
    const honeycomb = remember(
      buildOpenGridStackableCylinder({
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        diameter: 100,
        height: 60,
        honeycombMode: true,
      }),
    )

    expect(measureVolume(honeycomb)).toBeLessThan(measureVolume(baseline))
    expect(boundsOf(honeycomb)).toEqual(
      boundsOf(baseline).map((bound) =>
        bound.map((value) => expect.closeTo(value, 4)),
      ),
    )
  }, 30000)

  it('preserves cylinder holes and side openings while exporting honeycomb geometry', async () => {
    const input = {
      ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
      diameter: 100,
      height: 60,
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
    expect(honeycombReport.bottomProtrusionVolume).toBeCloseTo(
      baselineReport.bottomProtrusionVolume,
      4,
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

    const noHoleInput = { ...input, bottomHolesEnabled: false }
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
    expect(noHoleReport.bottomProtrusionVolume).toBeCloseTo(
      noHoleBaselineReport.bottomProtrusionVolume,
      4,
    )
    expect(noHoleReport.bottomMatingBoundaryProbeCount).toBe(
      noHoleBaselineReport.bottomMatingBoundaryProbeCount,
    )

    const mesh = meshBRep(honeycomb, {
      tolerance: 0.05,
      angularTolerance: 0.1,
    })
    expect(mesh.triangleCount).toBeGreaterThan(0)
    const [step, stl] = await Promise.all([
      exportStepBytes(honeycomb),
      exportStlBytes(honeycomb, { tolerance: 0.01, angularTolerance: 0.1 }),
    ])
    expect(step.byteLength).toBeGreaterThan(0)
    expect(stl.byteLength).toBeGreaterThan(84)
  }, 120000)

  it.each([
    { name: 'box base-plate', model: 'box-base-plate' as const },
    { name: 'box thin-shell', model: 'box-thin-shell' as const },
  ])(
    'keeps $name honeycomb geometry valid',
    ({ model }) => {
      const shape = remember(
        buildOpenGridStackableBox({
          ...OPENGRID_STACKABLE_BOX_DEFAULT_PARAMETERS,
          x: 3,
          y: 3,
          height: 60,
          basePlateMode: model === 'box-base-plate',
          thinShellMode: model === 'box-thin-shell',
          honeycombMode: true,
        }),
      )

      expect(measureVolume(shape)).toBeGreaterThan(0)
    },
    30000,
  )

  it.each([
    { name: 'cylinder thin', thinBottomMode: true, bottomPlateMode: false },
    {
      name: 'cylinder bottom-plate',
      thinBottomMode: false,
      bottomPlateMode: true,
    },
  ])(
    'keeps $name honeycomb geometry valid',
    ({ thinBottomMode, bottomPlateMode }) => {
      const shape = remember(
        buildOpenGridStackableCylinder({
          ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
          diameter: 100,
          height: 60,
          thinBottomMode,
          bottomPlateMode,
          honeycombMode: true,
        }),
      )

      expect(measureVolume(shape)).toBeGreaterThan(0)
    },
    30000,
  )

  it.each([
    { name: 'cylinder default', thinBottomMode: false, bottomPlateMode: false },
    { name: 'cylinder thin', thinBottomMode: true, bottomPlateMode: false },
    {
      name: 'cylinder bottom-plate',
      thinBottomMode: false,
      bottomPlateMode: true,
    },
  ])(
    'keeps $name bottom mating skin while adding bottom honeycomb cells',
    ({ thinBottomMode, bottomPlateMode }) => {
      const input = {
        ...OPENGRID_STACKABLE_CYLINDER_DEFAULT_PARAMETERS,
        diameter: 100,
        height: 60,
        thinBottomMode,
        bottomPlateMode,
        bottomHolesEnabled: false,
        honeycombMode: true,
      }
      const baselineInput = { ...input, honeycombMode: false }
      const honeycomb = remember(buildOpenGridStackableCylinder(input))
      const baseline = remember(buildOpenGridStackableCylinder(baselineInput))
      const honeycombReport = inspectOpenGridStackableCylinderInterface(
        honeycomb,
        input,
      )
      const baselineReport = inspectOpenGridStackableCylinderInterface(
        baseline,
        baselineInput,
      )

      if (thinBottomMode) {
        expect(
          openGridStackableCylinderBottomHoneycombCellCountFor(input),
        ).toBe(0)
      } else {
        expect(
          openGridStackableCylinderBottomHoneycombCellCountFor(input),
        ).toBeGreaterThan(0)
      }
      expect(honeycombReport.bottomProtrusionVolume).toBeCloseTo(
        baselineReport.bottomProtrusionVolume,
        4,
      )
      expect(honeycombReport.bottomMatingBoundaryProbeCount).toBe(
        baselineReport.bottomMatingBoundaryProbeCount,
      )
      expect(honeycombReport.bottomFootChamferFaceCount).toBe(
        baselineReport.bottomFootChamferFaceCount,
      )
      expect(honeycombReport.bottomFootChamferHeight).toBeCloseTo(
        baselineReport.bottomFootChamferHeight,
        4,
      )
      expect(honeycombReport.bottomOuterChamferFaceCount).toBe(
        baselineReport.bottomOuterChamferFaceCount,
      )
      expect(honeycombReport.bottomOuterChamferHeight).toBeCloseTo(
        baselineReport.bottomOuterChamferHeight,
        4,
      )
      expect(honeycombReport.lowerUnexpectedConicalFaceCount).toBe(
        baselineReport.lowerUnexpectedConicalFaceCount,
      )
      expect(measureVolume(honeycomb)).toBeLessThan(measureVolume(baseline))
    },
    60000,
  )
})

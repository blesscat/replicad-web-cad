import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  getOC,
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  buildOpenGridStackableBox,
  importOpenGridSnapHoldReference,
  assertOpenGridSnapHoldCompatibility,
  inspectOpenGridStackableBoxInterface,
  inspectOpenGridSnapHoldCompatibility,
} from '../../src/cad-kernel/components/opengrid-stackable-box/builder'
import {
  boundsForOpenGridStackableBox,
  openGridStackableBoxSocketCentersFor,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  type OpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'

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
const SNAP_REFERENCE_PATH = new URL(
  '../../public/openGrid Bare Lite Snap hold.step',
  import.meta.url,
)

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function parameters(
  overrides: Partial<OpenGridStackableBoxParameters> = {},
): OpenGridStackableBoxParameters {
  return { x: 2, y: 2, height: 10, ...overrides }
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function cylindricalFaceCount(shape: Shape3D): number {
  let count = 0
  for (const face of shape.faces) {
    try {
      if (face.surface.surfaceType === 'CYLINDRE') count += 1
    } finally {
      face.delete()
    }
  }
  return count
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Keep cleanup failures from hiding the geometry assertion.
  }
}

describe('OpenGrid stackable-box B-Rep', () => {
  it.each([
    { x: 1, y: 1 },
    { x: 1, y: 4 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0.5 },
  ])(
    'builds a valid $x×$y centered box',
    ({ x, y }) => {
      const input = parameters({ x, y })
      const shape = buildOpenGridStackableBox(input)
      try {
        const actual = boundsOf(shape)
        const expected = boundsForOpenGridStackableBox(input)
        expect(actual[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.min[0], 3),
            expect.closeTo(expected.min[1], 3),
            expect.closeTo(expected.min[2], 3),
          ]),
        )
        expect(actual[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.max[0], 3),
            expect.closeTo(expected.max[1], 3),
            expect.closeTo(expected.max[2], 3),
          ]),
        )
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(cylindricalFaceCount(shape)).toBeGreaterThanOrEqual(
          openGridStackableBoxSocketCentersFor(input).length,
        )
      } finally {
        deleteShape(shape)
      }
    },
    120_000,
  )

  it('keeps the top rail and underside groove as continuous non-post interfaces', () => {
    const input = parameters({ x: 1, y: 4 })
    const shape = buildOpenGridStackableBox(input)
    try {
      const interfaceQuality = inspectOpenGridStackableBoxInterface(
        shape,
        input,
      )
      expect(interfaceQuality.topRailVolumes).toHaveLength(4)
      expect(
        interfaceQuality.topRailVolumes.every((volume) => volume > 0.01),
      ).toBe(true)
      expect(interfaceQuality.bottomGrooveVolumes).toHaveLength(4)
      expect(
        interfaceQuality.bottomGrooveVolumes.every((volume) => volume <= 0.01),
      ).toBe(true)
      expect(interfaceQuality.topRailLeadInFaceCount).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailBottomChamferFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.topRailBottomResidualVolumes.every(
          (volume) => volume <= 0.0025,
        ),
      ).toBe(true)
      expect(
        interfaceQuality.bottomGrooveLeadInFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(
        interfaceQuality.mountingHoleChamferFaceCount,
      ).toBeGreaterThanOrEqual(4)
      expect(interfaceQuality.captiveSocketRecords).toHaveLength(4)
      expect(
        interfaceQuality.captiveSocketRecords.every(
          (record) => record.bottomOpeningBoundaryVolume > 0.001,
        ),
      ).toBe(true)
      const topProbe = makeCylinder(14, 0.2, [0, 0, 9.8])
      const grooveProbe = makeCylinder(14, 0.2, [0, 0, 0.1])
      try {
        expect(measureVolume(shape.intersect(topProbe))).toBeGreaterThan(0)
        expect(measureVolume(shape.intersect(grooveProbe))).toBeGreaterThan(0)
      } finally {
        topProbe.delete()
        grooveProbe.delete()
      }
      expect(shape.faces.length).toBeGreaterThan(0)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('allows a 1×1 upper box to slide along a 1×4 lower box', () => {
    const lower = buildOpenGridStackableBox(parameters({ x: 1, y: 4 }))
    const upper = buildOpenGridStackableBox(parameters({ x: 1, y: 1 }))
    try {
      for (const offset of [-42, -14, 14, 42]) {
        const positioned = upper.clone().translate(0, offset, 10)
        try {
          expect(measureVolume(lower.intersect(positioned))).toBeLessThan(0.01)
        } finally {
          deleteShape(positioned)
        }
      }
    } finally {
      deleteShape(lower)
      deleteShape(upper)
    }
  }, 120_000)

  it('lets a 2×2 upper box bridge two adjacent 1×2 lower boxes', () => {
    const left = buildOpenGridStackableBox(parameters({ x: 1, y: 2 }))
    const right = buildOpenGridStackableBox(parameters({ x: 1, y: 2 }))
    const upper = buildOpenGridStackableBox(parameters({ x: 2, y: 2 }))
    const leftPositioned = left.translate(-14, 0, 0)
    const rightPositioned = right.translate(14, 0, 0)
    const lowerPair = leftPositioned.fuse(rightPositioned)
    deleteShape(leftPositioned)
    deleteShape(rightPositioned)
    try {
      const positionedUpper = upper.clone().translate(0, 0, 10)
      try {
        expect(
          measureVolume(lowerPair.intersect(positionedUpper)),
        ).toBeLessThan(0.01)
      } finally {
        deleteShape(positionedUpper)
      }
    } finally {
      deleteShape(lowerPair)
      deleteShape(upper)
    }
  }, 120_000)

  it('retains a flanged Ø5 shaft flush with the interior floor', () => {
    const input = parameters({ x: 1, y: 1 })
    const box = buildOpenGridStackableBox(input)
    const [center] = openGridStackableBoxSocketCentersFor(input)
    if (!center) throw new Error('MISSING_SOCKET_CENTER')
    const shaft = makeCylinder(2.5, 4, [center[0], center[1], -3])
    const flange = makeCylinder(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseFlangeDiameter / 2,
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseFlangeThickness,
      [
        center[0],
        center[1],
        OPENGRID_STACKABLE_BOX_CONFIGURATION.floorThickness -
          OPENGRID_STACKABLE_BOX_CONFIGURATION.baseFlangeThickness,
      ],
    )
    const insert = shaft.fuse(flange)
    try {
      const insertBounds = boundsOf(insert)
      expect(insertBounds[0]?.[2]).toBeCloseTo(-3, 2)
      expect(insertBounds[1]?.[2]).toBeCloseTo(
        OPENGRID_STACKABLE_BOX_CONFIGURATION.floorThickness,
        2,
      )
      const seated = box.intersect(insert)
      try {
        expect(measureVolume(seated)).toBeLessThan(0.01)
      } finally {
        deleteShape(seated)
      }
      const loweredInsert = insert.clone().translateZ(-0.2)
      try {
        expect(measureVolume(box.intersect(loweredInsert))).toBeGreaterThan(0)
      } finally {
        deleteShape(loweredInsert)
      }
    } finally {
      deleteShape(shaft)
      deleteShape(flange)
      deleteShape(box)
      deleteShape(insert)
    }
  }, 120_000)

  it('exports successful full-cell geometry as STEP and STL', async () => {
    const shape = buildOpenGridStackableBox(parameters())
    try {
      const mesh = meshBRep(shape, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      expect(mesh.triangleCount).toBeGreaterThan(0)
      const [step, stl] = await Promise.all([
        exportStepBytes(shape),
        exportStlBytes(shape, { tolerance: 0.01, angularTolerance: 0.1 }),
      ])
      expect(step.byteLength).toBeGreaterThan(0)
      expect(stl.byteLength).toBeGreaterThan(84)
    } finally {
      deleteShape(shape)
    }
  }, 120_000)

  it('loads and validates the supplied Snap reference without using it as a body', async () => {
    const reference = await importOpenGridSnapHoldReference(
      new Blob([readFileSync(SNAP_REFERENCE_PATH)]),
    )
    try {
      expect(boundsOf(reference)[1]?.[0]).toBeGreaterThan(0)
      expect(cylindricalFaceCount(reference)).toBeGreaterThanOrEqual(4)
      const report = inspectOpenGridSnapHoldCompatibility(reference)
      expect(report.nominalInterfaces).toHaveLength(4)
      expect(report.minimumAxialSpan).toBeGreaterThanOrEqual(3)
      expect(report.nominalInterfaces.map((item) => item.diameter)).toEqual(
        expect.arrayContaining([
          expect.closeTo(
            OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter,
            5,
          ),
        ]),
      )
      expect(report.maximumCenterError).toBeLessThan(0.25)
      expect(() => assertOpenGridSnapHoldCompatibility(reference)).not.toThrow()
      const incompatible = makeBox([-1, -1, 0], [1, 1, 1])
      try {
        expect(() => assertOpenGridSnapHoldCompatibility(incompatible)).toThrow(
          'OPENGRID_SNAP_HOLD_INTERFACE_DIAMETER_MISMATCH',
        )
      } finally {
        incompatible.delete()
      }
      const shortReference = makeCylinder(2.5, 1, [0, 0, 0])
      try {
        expect(() =>
          assertOpenGridSnapHoldCompatibility(shortReference, {
            x: 0.5,
            y: 0.5,
            height: 10,
          }),
        ).toThrow('OPENGRID_SNAP_HOLD_INSERTION_ENVELOPE_MISMATCH')
      } finally {
        shortReference.delete()
      }
    } finally {
      deleteShape(reference)
    }
  }, 120_000)

  it('deduplicates half-cell socket positions without changing the footprint', () => {
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 0.5 })),
    ).toEqual([[0, 0]])
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 1 })),
    ).toHaveLength(2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleDiameter).toBe(5)
  })
})

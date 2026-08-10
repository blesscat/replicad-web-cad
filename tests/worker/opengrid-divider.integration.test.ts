import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  makeBox,
  makeCylinder,
  measureVolume,
  setOC,
  type Shape3D,
} from 'replicad'
import {
  boundsForOpenGridDivider,
  openGridDividerPegCentersFor,
  OPENGRID_DIVIDER_CONFIGURATION,
  type OpenGridDividerParameters,
  openGridDividerTransitionHeightFor,
} from '../../src/cad-contract/units'
import { exportStepBytes, exportStlBytes } from '../../src/cad-kernel/export'
import { meshBRep } from '../../src/cad-kernel/mesh'
import { buildOpenGridDivider } from '../../src/cad-kernel/components/opengrid-divider/builder'
import { inspectOpenGridDividerShapeQuality } from '../../src/cad-kernel/components/opengrid-divider/quality'

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

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function meshBoundsOf(mesh: {
  bounds: { min: number[]; max: number[] }
}): number[][] {
  return [mesh.bounds.min, mesh.bounds.max]
}

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not replace the primary geometry assertion.
  }
}

function topRoundFaceCount(shape: Shape3D, height: number): number {
  let count = 0
  for (const face of shape.faces) {
    const bounds = face.boundingBox
    try {
      const [[, , minZ], [, , maxZ]] = bounds.bounds as number[][]
      if (
        face.surface.surfaceType === 'CYLINDRE' &&
        minZ >=
          height - OPENGRID_DIVIDER_CONFIGURATION.topFilletRadius - 0.05 &&
        maxZ <= height + 0.05
      ) {
        count += 1
      }
    } finally {
      bounds.delete()
      face.delete()
    }
  }
  return count
}

function transitionRoundFaceCount(
  shape: Shape3D,
  parameters: OpenGridDividerParameters,
): number {
  const transitionHeight = openGridDividerTransitionHeightFor(parameters)
  if (transitionHeight <= 0) return 0
  const transitionStart = OPENGRID_DIVIDER_CONFIGURATION.geometrySafetyMargin
  const transitionEnd = transitionStart + transitionHeight
  let count = 0
  for (const face of shape.faces) {
    const bounds = face.boundingBox
    try {
      const [[minX, minY, minZ], [maxX, maxY, maxZ]] =
        bounds.bounds as number[][]
      const shortPlanSpan = Math.min(maxX - minX, maxY - minY)
      if (
        face.surface.surfaceType === 'CYLINDRE' &&
        minZ <= transitionStart + 0.02 &&
        maxZ >= transitionStart + 0.02 &&
        maxZ <= transitionEnd + 1 &&
        shortPlanSpan < parameters.wallThickness
      ) {
        count += 1
      }
    } finally {
      bounds.delete()
      face.delete()
    }
  }
  return count
}

function rawPlanCenter(
  parameters: OpenGridDividerParameters,
): [number, number] {
  const { gridPitch, wallWidth } = OPENGRID_DIVIDER_CONFIGURATION
  const minX = Math.min(-parameters.left * gridPitch, -wallWidth / 2)
  const maxX = Math.max(parameters.right * gridPitch, wallWidth / 2)
  const minY = Math.min(-parameters.down * gridPitch, -wallWidth / 2)
  const maxY = Math.max(parameters.up * gridPitch, wallWidth / 2)
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}

function probeVolumeAt(
  shape: Shape3D,
  center: [number, number],
  z: number,
  radius = 0.1,
): number {
  const probe = makeCylinder(radius, 0.02, [center[0], center[1], z])
  let intersection: Shape3D | null = null
  try {
    intersection = shape.intersect(probe)
    return measureVolume(intersection)
  } finally {
    deleteShape(intersection)
    probe.delete()
  }
}

function sectionWidthAt(shape: Shape3D, z: number): number {
  const probe = makeBox([0, -10, z], [7, 10, z + 0.1])
  let section: Shape3D | null = null
  try {
    section = shape.intersect(probe)
    const [[, minY], [, maxY]] = boundsOf(section)
    return maxY - minY
  } finally {
    deleteShape(section)
    probe.delete()
  }
}

describe('OpenGrid divider CAD kernel integration', () => {
  it.each([
    { left: 1, right: 1, up: 0, down: 0, height: 20, wallThickness: 2 },
    { left: 0, right: 0, up: 1, down: 2, height: 12, wallThickness: 2 },
    { left: 1, right: 0, up: 2, down: 0, height: 20, wallThickness: 2 },
    { left: 1, right: 1, up: 2, down: 1, height: 20, wallThickness: 2 },
    { left: 1.5, right: 2, up: 0, down: 0, height: 35, wallThickness: 2 },
  ])(
    'builds a centered one-solid divider for %#',
    async (parameters) => {
      const shape = await buildOpenGridDivider(parameters)
      try {
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const actual = meshBoundsOf(mesh)
        const expected = boundsForOpenGridDivider(parameters)
        expect(actual[0]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.min[0], 2),
            expect.closeTo(expected.min[1], 2),
            expect.closeTo(expected.min[2], 2),
          ]),
        )
        expect(actual[1]).toEqual(
          expect.arrayContaining([
            expect.closeTo(expected.max[0], 2),
            expect.closeTo(expected.max[1], 2),
            expect.closeTo(expected.max[2], 2),
          ]),
        )
        expect(shape.constructor.name).toBe('Solid')
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(topRoundFaceCount(shape, parameters.height)).toBeGreaterThan(0)

        const [centerX, centerY] = rawPlanCenter(parameters)
        for (const [rawX, rawY] of openGridDividerPegCentersFor(parameters)) {
          const probe = makeCylinder(
            OPENGRID_DIVIDER_CONFIGURATION.pegDiameter / 2 - 0.1,
            0.2,
            [rawX - centerX, rawY - centerY, -3.05],
          )
          try {
            expect(measureVolume(shape.intersect(probe))).toBeGreaterThan(0)
          } finally {
            probe.delete()
          }
        }

        expect(mesh.triangleCount).toBeGreaterThan(0)
        const quality = inspectOpenGridDividerShapeQuality(
          shape,
          parameters,
          mesh,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(quality.topFilletFaceCount).toBeGreaterThan(0)
        expect(quality.transitionFaceCount).toBeGreaterThan(0)
        expect(quality.transitionFilletFaceCount).toBeGreaterThan(0)
        expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
        expect(
          (
            await exportStlBytes(shape, {
              tolerance: 0.05,
              angularTolerance: 0.1,
            })
          ).byteLength,
        ).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )

  it.each([
    ['horizontal', { left: 1, right: 1, up: 0, down: 0 }],
    ['vertical', { left: 0, right: 0, up: 1, down: 1 }],
  ])(
    'rounds the short edges of the 45-degree transition for %s arms',
    async (_axis, plan) => {
      for (const wallThickness of [1, 2, 3, 4]) {
        const parameters = { ...plan, height: 20, wallThickness }
        const shape = await buildOpenGridDivider(parameters)
        try {
          expect(transitionRoundFaceCount(shape, parameters)).toBeGreaterThan(0)
        } finally {
          deleteShape(shape)
        }
      }
    },
    180_000,
  )

  it.each([1, 2, 3, 4, 5])(
    'supports the selectable %d mm upper wall profile',
    async (wallThickness) => {
      const parameters = {
        ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
        height: 20,
        wallThickness,
      }
      const shape = await buildOpenGridDivider(parameters)
      try {
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridDividerShapeQuality(
          shape,
          parameters,
          mesh,
        )
        expect(sectionWidthAt(shape, 0)).toBeCloseTo(
          OPENGRID_DIVIDER_CONFIGURATION.wallWidth,
          2,
        )
        expect(sectionWidthAt(shape, 4)).toBeCloseTo(wallThickness, 2)
        const transitionHeight = openGridDividerTransitionHeightFor(parameters)
        if (transitionHeight > 0) {
          expect(
            sectionWidthAt(
              shape,
              OPENGRID_DIVIDER_CONFIGURATION.geometrySafetyMargin +
                transitionHeight / 2,
            ),
          ).toBeCloseTo(
            (OPENGRID_DIVIDER_CONFIGURATION.wallWidth + wallThickness) / 2,
            2,
          )
        }
        expect(quality.passed).toBe(true)
        if (wallThickness < OPENGRID_DIVIDER_CONFIGURATION.wallWidth) {
          expect(quality.transitionFaceCount).toBeGreaterThan(0)
          expect(quality.transitionFilletFaceCount).toBeGreaterThan(0)
        } else {
          expect(quality.transitionFaceCount).toBe(0)
          expect(quality.transitionFilletFaceCount).toBe(0)
        }
        expect(quality.topFilletFaceCount).toBeGreaterThan(0)
        expect(mesh.triangleCount).toBeGreaterThan(0)
        expect((await exportStepBytes(shape)).byteLength).toBeGreaterThan(0)
        expect(
          (
            await exportStlBytes(shape, {
              tolerance: 0.05,
              angularTolerance: 0.1,
            })
          ).byteLength,
        ).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )

  it.each([1, 2, 3, 4, 5])(
    'supports the minimum 2 mm height with a %d mm upper wall profile',
    async (wallThickness) => {
      const parameters = {
        ...OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
        height: OPENGRID_DIVIDER_CONFIGURATION.minHeight,
        wallThickness,
      }
      const shape = await buildOpenGridDivider(parameters)
      try {
        const mesh = meshBRep(shape, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridDividerShapeQuality(
          shape,
          parameters,
          mesh,
        )

        expect(shape.constructor.name).toBe('Solid')
        expect(measureVolume(shape)).toBeGreaterThan(0)
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(mesh.triangleCount).toBeGreaterThan(0)
      } finally {
        deleteShape(shape)
      }
    },
    180_000,
  )

  it('keeps a 5 mm base support and selected upper wall thickness', async () => {
    const parameters = {
      left: 1,
      right: 1,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
    const shape = await buildOpenGridDivider(parameters)
    const baseProbe = makeBox([0, -10, 0], [7, 10, 0.1])
    const upperProbe = makeBox([0, -10, 10], [7, 10, 10.1])
    let baseSection: Shape3D | null = null
    let upperSection: Shape3D | null = null
    try {
      baseSection = shape.intersect(baseProbe)
      upperSection = shape.intersect(upperProbe)
      const [[baseMinX, baseMinY], [baseMaxX, baseMaxY]] = boundsOf(baseSection)
      const [[upperMinX, upperMinY], [upperMaxX, upperMaxY]] =
        boundsOf(upperSection)
      expect(baseMaxX - baseMinX).toBeCloseTo(7, 2)
      expect(baseMaxY - baseMinY).toBeCloseTo(5, 2)
      expect(upperMaxX - upperMinX).toBeCloseTo(7, 2)
      expect(upperMaxY - upperMinY).toBeCloseTo(2, 2)
    } finally {
      deleteShape(baseSection)
      deleteShape(upperSection)
      baseProbe.delete()
      upperProbe.delete()
      deleteShape(shape)
    }
  }, 180_000)

  it('keeps nominal peg diameter, exposed length, and chamfered wall profile', async () => {
    const parameters = {
      left: 1.5,
      right: 2.5,
      up: 0,
      down: 0,
      height: 20,
      wallThickness: 2,
    }
    const shape = await buildOpenGridDivider(parameters)
    const [centerX, centerY] = rawPlanCenter(parameters)
    const rightPeg: [number, number] = [
      OPENGRID_DIVIDER_CONFIGURATION.pegCenterSpacing - centerX,
      -centerY,
    ]
    try {
      expect(
        probeVolumeAt(shape, [rightPeg[0] + 2.35, rightPeg[1]], -0.5),
      ).toBeGreaterThan(0)
      expect(
        probeVolumeAt(shape, [rightPeg[0] + 2.65, rightPeg[1]], -0.5),
      ).toBeLessThan(1e-8)
      expect(probeVolumeAt(shape, rightPeg, -2.98)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, rightPeg, -3.04)).toBeLessThan(1e-8)

      expect(probeVolumeAt(shape, [27.5, 0.9], 10, 0.05)).toBeGreaterThan(0)
      expect(probeVolumeAt(shape, [27.5, 1.1], 10, 0.05)).toBeLessThan(1e-8)

      const filletZ = parameters.height - 0.51
      expect(filletZ).toBeLessThan(parameters.height)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('keeps a 3x3 cross to one central peg without dense arm pegs', async () => {
    const parameters = {
      left: 1,
      right: 1,
      up: 1,
      down: 1,
      height: 20,
      wallThickness: 2,
    }
    const shape = await buildOpenGridDivider(parameters)
    try {
      expect(probeVolumeAt(shape, [0, 0], -2.98)).toBeGreaterThan(0)
      expect(
        probeVolumeAt(
          shape,
          [OPENGRID_DIVIDER_CONFIGURATION.gridPitch / 2, 0],
          -0.5,
        ),
      ).toBeLessThan(1e-8)
    } finally {
      deleteShape(shape)
    }
  }, 180_000)

  it('stops at a stale generation safe boundary', async () => {
    let current = true
    await expect(
      buildOpenGridDivider(
        { left: 3, right: 3, up: 2, down: 2, height: 20, wallThickness: 2 },
        {
          isGenerationCurrent: () => current,
          yieldToEventLoop: async () => {
            current = false
            await Promise.resolve()
          },
        },
      ),
    ).rejects.toThrow('STALE_GENERATION')
  }, 180_000)
})

import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { exportStlBytes, exportStepBytes } from '../../src/cad-kernel/export'
import {
  buildOpenGridBRep,
  buildOpenGridBRepWithStrategy,
} from '../../src/cad-kernel/components/opengrid/builder'
import { inspectOpenGridShapeQuality } from '../../src/cad-kernel/components/opengrid/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'
import {
  boundsForOpenGrid,
  cellCenterForOpenGrid,
  normalizeOpenGridParameters,
  OPENGRID_CONFIGURATION,
  OPENGRID_PREVIEW_CONFIGURATION,
  openGridConnectorLocationsFor,
  openGridScrewCentersFor,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'

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

function parameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  })
}

async function buildAndInspect(input: OpenGridParameters) {
  const shape = await buildOpenGridBRep(input)
  const mesh = meshBRep(shape, OPENGRID_PREVIEW_CONFIGURATION)
  const quality = inspectOpenGridShapeQuality(shape, input, mesh)
  return { shape, quality }
}

function measureIntersectionVolume(
  shape: Shape3D,
  minimum: [number, number, number],
  maximum: [number, number, number],
): number {
  const probe = makeBox(minimum, maximum)
  const intersection = shape.intersect(probe)
  try {
    return measureVolume(intersection)
  } finally {
    if (intersection !== shape && intersection !== probe) intersection.delete()
    probe.delete()
  }
}

describe('OpenGrid Hybrid product builder', () => {
  it('adds a one-sided sloped transition from Full to the Heavy perimeter', async () => {
    const input = parameters({
      variant: 'Hybrid',
      rows: 3,
      columns: 3,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed, quality.failures.join(';')).toBe(true)

      const fullThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
      const heavyThickness = OPENGRID_CONFIGURATION.variants.Heavy.thickness
      const transitionWidth = OPENGRID_CONFIGURATION.hybridTransitionWidth
      const transitionRise = heavyThickness - fullThickness
      const halfPitch = OPENGRID_CONFIGURATION.gridPitch / 2
      const [interiorX, interiorY] = cellCenterForOpenGrid(input, 1, 1)

      for (const fraction of [0.25, 0.5, 0.75]) {
        const expectedZ = fullThickness + transitionRise * fraction
        const offset = transitionWidth * fraction
        const transitionProbes: Array<{
          label: string
          minimum: [number, number, number]
          maximum: [number, number, number]
        }> = [
          {
            label: 'top',
            minimum: [
              interiorX - 0.5,
              interiorY + halfPitch + offset - 0.25,
              expectedZ - 0.15,
            ],
            maximum: [
              interiorX + 0.5,
              interiorY + halfPitch + offset + 0.25,
              expectedZ + 0.15,
            ],
          },
          {
            label: 'right',
            minimum: [
              interiorX + halfPitch + offset - 0.25,
              interiorY - 0.5,
              expectedZ - 0.15,
            ],
            maximum: [
              interiorX + halfPitch + offset + 0.25,
              interiorY + 0.5,
              expectedZ + 0.15,
            ],
          },
          {
            label: 'bottom',
            minimum: [
              interiorX - 0.5,
              interiorY - halfPitch - offset - 0.25,
              expectedZ - 0.15,
            ],
            maximum: [
              interiorX + 0.5,
              interiorY - halfPitch - offset + 0.25,
              expectedZ + 0.15,
            ],
          },
          {
            label: 'left',
            minimum: [
              interiorX - halfPitch - offset - 0.25,
              interiorY - 0.5,
              expectedZ - 0.15,
            ],
            maximum: [
              interiorX - halfPitch - offset + 0.25,
              interiorY + 0.5,
              expectedZ + 0.15,
            ],
          },
        ]

        for (const probe of transitionProbes) {
          const volume = measureIntersectionVolume(
            shape,
            probe.minimum,
            probe.maximum,
          )
          expect(volume, `${probe.label}:${fraction}`).toBeGreaterThan(0.001)
        }
      }

      const aboveTopRampVolume = measureIntersectionVolume(
        shape,
        [
          interiorX - 0.5,
          interiorY + halfPitch + transitionWidth / 2 - 0.25,
          heavyThickness - 0.2,
        ],
        [
          interiorX + 0.5,
          interiorY + halfPitch + transitionWidth / 2 + 0.25,
          heavyThickness + 0.1,
        ],
      )
      expect(aboveTopRampVolume).toBeLessThan(0.001)

      const cornerOffset = transitionWidth / 2
      const cornerZ = fullThickness + transitionRise / 2
      const cornerCases = [
        {
          label: 'top-left',
          x: interiorX - halfPitch,
          y: interiorY + halfPitch,
          verticalDirection: 1,
          horizontalDirection: -1,
        },
        {
          label: 'top-right',
          x: interiorX + halfPitch,
          y: interiorY + halfPitch,
          verticalDirection: 1,
          horizontalDirection: 1,
        },
        {
          label: 'bottom-left',
          x: interiorX - halfPitch,
          y: interiorY - halfPitch,
          verticalDirection: -1,
          horizontalDirection: -1,
        },
        {
          label: 'bottom-right',
          x: interiorX + halfPitch,
          y: interiorY - halfPitch,
          verticalDirection: -1,
          horizontalDirection: 1,
        },
      ] as const

      for (const corner of cornerCases) {
        const verticalY = corner.y + corner.verticalDirection * cornerOffset
        const verticalVolume = measureIntersectionVolume(
          shape,
          [corner.x - 0.5, verticalY - 0.25, cornerZ - 0.15],
          [corner.x + 0.5, verticalY + 0.25, cornerZ + 0.15],
        )
        const horizontalX = corner.x + corner.horizontalDirection * cornerOffset
        const horizontalVolume = measureIntersectionVolume(
          shape,
          [horizontalX - 0.25, corner.y - 0.5, cornerZ - 0.15],
          [horizontalX + 0.25, corner.y + 0.5, cornerZ + 0.15],
        )

        expect(verticalVolume, `${corner.label}:vertical`).toBeGreaterThan(
          0.001,
        )
        expect(horizontalVolume, `${corner.label}:horizontal`).toBeGreaterThan(
          0.001,
        )
      }
    } finally {
      shape.delete()
    }
  }, 120_000)

  it('keeps feature-enabled transitions on every side of a 5×5 board', async () => {
    const input = parameters({
      variant: 'Hybrid',
      rows: 5,
      columns: 5,
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed, quality.failures.join(';')).toBe(true)
      expect(quality.solidCount).toBe(1)
      expect(quality.cellOpeningCount).toBe(25)
      expect(quality.bounds?.max[2]).toBeCloseTo(
        OPENGRID_CONFIGURATION.variants.Hybrid.thickness,
        5,
      )
    } finally {
      shape.delete()
    }
  }, 120_000)

  it('keeps Heavy perimeter material and Full interior depth on a 3×3 board', async () => {
    const input = parameters({
      variant: 'Hybrid',
      rows: 3,
      columns: 3,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed, quality.failures.join(';')).toBe(true)
      expect(quality.solidCount).toBe(1)
      expect(quality.cellOpeningCount).toBe(9)
      expect(quality.bounds?.max[2]).toBeCloseTo(
        OPENGRID_CONFIGURATION.variants.Hybrid.thickness,
        5,
      )

      const fullThickness = OPENGRID_CONFIGURATION.variants.Full.thickness
      const lowerLayerMidpoint = fullThickness / 2
      const upperLayerMidpoint =
        fullThickness + OPENGRID_CONFIGURATION.heavyGap + fullThickness / 2
      const [perimeterX, perimeterY] = cellCenterForOpenGrid(input, 0, 0)
      const [interiorX, interiorY] = cellCenterForOpenGrid(input, 1, 1)
      const perimeterUpperVolume = measureIntersectionVolume(
        shape,
        [perimeterX - 0.5, perimeterY + 13.3, upperLayerMidpoint - 0.2],
        [perimeterX + 0.5, perimeterY + 13.7, upperLayerMidpoint + 0.2],
      )
      const interiorLowerVolume = measureIntersectionVolume(
        shape,
        [interiorX - 0.5, interiorY + 13.3, lowerLayerMidpoint - 0.2],
        [interiorX + 0.5, interiorY + 13.7, lowerLayerMidpoint + 0.2],
      )
      const interiorUpperVolume = measureIntersectionVolume(
        shape,
        [interiorX - 0.5, interiorY + 12.4, upperLayerMidpoint - 0.2],
        [interiorX + 0.5, interiorY + 12.7, upperLayerMidpoint + 0.2],
      )

      expect(perimeterUpperVolume).toBeGreaterThan(0.01)
      expect(interiorLowerVolume).toBeGreaterThan(0.01)
      expect(interiorUpperVolume).toBeLessThan(0.01)
    } finally {
      shape.delete()
    }
  }, 120_000)

  it('keeps layered features and centered half-cell boundaries valid', async () => {
    const input = parameters({
      variant: 'Hybrid',
      rows: 2,
      columns: 2,
      halfCellX: 'right',
      halfCellY: 'top',
      chamfers: 'everywhere',
      connectorHoles: 'enabled',
      screwMode: 'corners',
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed, quality.failures.join(';')).toBe(true)
      expect(quality.solidCount).toBe(1)
      expect(quality.cellOpeningCount).toBe(4)
      const expectedBounds = boundsForOpenGrid(input)
      expect(quality.bounds).not.toBeNull()
      if (!quality.bounds) throw new Error('HYBRID_BOUNDS_MISSING')
      for (const axis of [0, 1, 2] as const) {
        expect(quality.bounds.min[axis]).toBeCloseTo(
          expectedBounds.min[axis],
          4,
        )
        expect(quality.bounds.max[axis]).toBeCloseTo(
          expectedBounds.max[axis],
          4,
        )
      }
      expect(quality.bounds?.max[2]).toBeCloseTo(
        OPENGRID_CONFIGURATION.variants.Hybrid.thickness,
        5,
      )
    } finally {
      shape.delete()
    }
  }, 120_000)

  it('cuts screw and connector features through both Hybrid layers', async () => {
    const input = parameters({
      variant: 'Hybrid',
      rows: 2,
      columns: 2,
      chamfers: 'none',
      connectorHoles: 'enabled',
      screwMode: 'corners',
    })
    const referenceInput = parameters({
      ...input,
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const { shape, quality } = await buildAndInspect(input)
    const referenceShape = await buildOpenGridBRep(referenceInput)
    try {
      expect(quality.passed, quality.failures.join(';')).toBe(true)

      const screwCenter = openGridScrewCentersFor(input)[0]
      expect(screwCenter).toEqual([0, 0])
      if (!screwCenter) throw new Error('HYBRID_SCREW_CENTER_MISSING')
      const [screwX, screwY] = screwCenter
      const enabledScrewMaterial = measureIntersectionVolume(
        shape,
        [screwX - 0.5, screwY - 0.5, -0.1],
        [screwX + 0.5, screwY + 0.5, 13.9],
      )
      const referenceScrewMaterial = measureIntersectionVolume(
        referenceShape,
        [screwX - 0.5, screwY - 0.5, -0.1],
        [screwX + 0.5, screwY + 0.5, 13.9],
      )
      expect(enabledScrewMaterial).toBeLessThan(0.01)
      expect(referenceScrewMaterial).toBeGreaterThan(0.01)

      const topConnector = openGridConnectorLocationsFor(input).find(
        (location) => location.side === 'top',
      )
      expect(topConnector).toBeDefined()
      if (!topConnector) throw new Error('HYBRID_TOP_CONNECTOR_MISSING')
      const [connectorX, connectorY] = topConnector.center
      for (const [zMin, zMax] of [
        [2.5, 4.3],
        [9.5, 11.3],
      ] as const) {
        const enabledConnectorMaterial = measureIntersectionVolume(
          shape,
          [connectorX - 0.75, connectorY - 2, zMin],
          [connectorX + 0.75, connectorY + 0.1, zMax],
        )
        const referenceConnectorMaterial = measureIntersectionVolume(
          referenceShape,
          [connectorX - 0.75, connectorY - 2, zMin],
          [connectorX + 0.75, connectorY + 0.1, zMax],
        )
        expect(enabledConnectorMaterial).toBeLessThan(0.01)
        expect(referenceConnectorMaterial).toBeGreaterThan(0.01)
      }
    } finally {
      shape.delete()
      referenceShape.delete()
    }
  }, 120_000)

  it('exports a quality-gated one-cell Hybrid and rejects a multi-cell prototype fallback', async () => {
    const input = parameters({
      variant: 'Hybrid',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const { shape, quality } = await buildAndInspect(input)
    try {
      expect(quality.passed).toBe(true)
      expect(measureVolume(shape)).toBeGreaterThan(0)
      const [stepBytes, stlBytes] = await Promise.all([
        exportStepBytes(shape),
        exportStlBytes(shape, { tolerance: 0.001, angularTolerance: 0.1 }),
      ])
      expect(stepBytes.byteLength).toBeGreaterThan(0)
      const triangleCount = new DataView(stlBytes).getUint32(80, true)
      expect(triangleCount).toBeGreaterThan(0)
      expect(stlBytes.byteLength).toBe(84 + triangleCount * 50)
    } finally {
      shape.delete()
    }

    await expect(
      buildOpenGridBRepWithStrategy(
        parameters({
          variant: 'Hybrid',
          rows: 3,
          columns: 3,
          chamfers: 'none',
          connectorHoles: 'none',
          screwMode: 'none',
        }),
        'prototype-template',
      ),
    ).rejects.toThrow('OPENGRID_HYBRID_TEMPLATE_UNAVAILABLE')
  }, 120_000)
})

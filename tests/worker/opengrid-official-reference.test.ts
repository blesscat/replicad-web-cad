import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { setOC } from 'replicad'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import { exportStlBytes } from '../../src/cad-kernel/export'
import {
  normalizeOpenGridParameters,
  OPENGRID_CONFIGURATION,
  type OpenGridParameters,
} from '../../src/cad-contract/units'

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
const referenceDirectory = process.env.OPENGRID_OFFICIAL_REFERENCE_DIR
const includeHybridReferenceFixtures =
  process.env.OPENGRID_HYBRID_REFERENCE_FIXTURES === '1'

type ReferenceFixture = {
  id: string
  variant: OpenGridParameters['variant']
  overrides: Partial<OpenGridParameters>
}

type Point3D = readonly [number, number, number]
type Triangle = readonly [Point3D, Point3D, Point3D]

type StlMetrics = {
  triangles: Triangle[]
  min: Point3D
  max: Point3D
  volume: number
}

const BASE_REFERENCE_FIXTURES: readonly ReferenceFixture[] = [
  ...(['Full', 'Lite', 'Heavy'] as const).map((variant) => ({
    id: `${variant.toLowerCase()}-1x1-none`,
    variant,
    overrides: {},
  })),
  ...(['Full', 'Lite', 'Heavy'] as const).map((variant) => ({
    id: `${variant.toLowerCase()}-1x1-screws`,
    variant,
    overrides: {
      screwMode: 'corners' as const,
    },
  })),
  ...(['Full', 'Lite', 'Heavy'] as const).flatMap((variant) => [
    {
      id: `${variant.toLowerCase()}-2x2-none`,
      variant,
      overrides: {
        rows: 2,
        columns: 2,
      },
    },
    {
      id: `${variant.toLowerCase()}-2x2-default`,
      variant,
      overrides: {
        rows: 2,
        columns: 2,
        chamfers: 'corners',
        connectorHoles: 'enabled',
        screwMode: 'corners',
      },
    },
    {
      id: `${variant.toLowerCase()}-2x2-screws`,
      variant,
      overrides: {
        rows: 2,
        columns: 2,
        screwMode: 'corners',
      },
    },
    {
      id: `${variant.toLowerCase()}-2x2-connectors`,
      variant,
      overrides: {
        rows: 2,
        columns: 2,
        connectorHoles: 'enabled',
      },
    },
    {
      id: `${variant.toLowerCase()}-2x2-chamfers`,
      variant,
      overrides: {
        rows: 2,
        columns: 2,
        chamfers: 'corners',
      },
    },
  ]),
]

const HYBRID_REFERENCE_FIXTURES: readonly ReferenceFixture[] = [
  {
    id: 'hybrid-6x6-none',
    variant: 'Hybrid',
    overrides: { rows: 6, columns: 6 },
  },
  {
    id: 'hybrid-12x12-none',
    variant: 'Hybrid',
    overrides: { rows: 12, columns: 12 },
  },
]

const REFERENCE_FIXTURES: readonly ReferenceFixture[] =
  includeHybridReferenceFixtures
    ? [...BASE_REFERENCE_FIXTURES, ...HYBRID_REFERENCE_FIXTURES]
    : BASE_REFERENCE_FIXTURES

function parameters(
  variant: OpenGridParameters['variant'],
  overrides: Partial<OpenGridParameters> = {},
) {
  return normalizeOpenGridParameters({
    ...OPENGRID_CONFIGURATION.defaultParameters,
    variant,
    rows: 1,
    columns: 1,
    chamfers: 'none',
    connectorHoles: 'none',
    screwMode: 'none',
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    ...overrides,
  })
}

function readBinaryStl(bytes: Uint8Array): StlMetrics {
  if (bytes.byteLength < 84) throw new Error('OPENGRID_REFERENCE_STL_INVALID')
  const triangleCount = new DataView(bytes.buffer, bytes.byteOffset).getUint32(
    80,
    true,
  )
  const expectedLength = 84 + triangleCount * 50
  if (bytes.byteLength < expectedLength) {
    throw new Error('OPENGRID_REFERENCE_STL_TRUNCATED')
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset)
  const triangles: Triangle[] = []
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  let signedVolume = 0

  for (let index = 0; index < triangleCount; index += 1) {
    const offset = 84 + index * 50
    const points = [0, 1, 2].map((pointIndex) => {
      const point: Point3D = [
        view.getFloat32(offset + 12 + pointIndex * 12, true),
        view.getFloat32(offset + 16 + pointIndex * 12, true),
        view.getFloat32(offset + 20 + pointIndex * 12, true),
      ]
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis]!, point[axis])
        max[axis] = Math.max(max[axis]!, point[axis])
      }
      return point
    }) as [Point3D, Point3D, Point3D]
    const [first, second, third] = points
    signedVolume +=
      (first[0] * (second[1] * third[2] - second[2] * third[1]) -
        first[1] * (second[0] * third[2] - second[2] * third[0]) +
        first[2] * (second[0] * third[1] - second[1] * third[0])) /
      6
    triangles.push(points)
  }

  return {
    triangles,
    min,
    max,
    volume: Math.abs(signedVolume),
  }
}

function rayIntersectsTriangle(triangle: Triangle, point: Point3D): boolean {
  const [first, second, third] = triangle
  const edge1: Point3D = [
    second[0] - first[0],
    second[1] - first[1],
    second[2] - first[2],
  ]
  const edge2: Point3D = [
    third[0] - first[0],
    third[1] - first[1],
    third[2] - first[2],
  ]
  const perpendicular: Point3D = [0, -edge2[2], edge2[1]]
  const determinant =
    edge1[0] * perpendicular[0] +
    edge1[1] * perpendicular[1] +
    edge1[2] * perpendicular[2]
  if (Math.abs(determinant) < 1e-9) return false

  const inverse = 1 / determinant
  const originToFirst: Point3D = [
    point[0] - first[0],
    point[1] - first[1],
    point[2] - first[2],
  ]
  const barycentricU =
    (originToFirst[0] * perpendicular[0] +
      originToFirst[1] * perpendicular[1] +
      originToFirst[2] * perpendicular[2]) *
    inverse
  if (barycentricU < -1e-8 || barycentricU > 1 + 1e-8) return false

  const cross: Point3D = [
    originToFirst[1] * edge1[2] - originToFirst[2] * edge1[1],
    originToFirst[2] * edge1[0] - originToFirst[0] * edge1[2],
    originToFirst[0] * edge1[1] - originToFirst[1] * edge1[0],
  ]
  const barycentricV = cross[0] * inverse
  if (barycentricV < -1e-8 || barycentricU + barycentricV > 1 + 1e-8) {
    return false
  }

  const distance =
    (edge2[0] * cross[0] + edge2[1] * cross[1] + edge2[2] * cross[2]) * inverse
  return distance > 1e-8
}

function stlContainsPoint(metrics: StlMetrics, point: Point3D): boolean {
  let intersections = 0
  for (const triangle of metrics.triangles) {
    if (
      Math.max(triangle[0][1], triangle[1][1], triangle[2][1]) < point[1] ||
      Math.min(triangle[0][1], triangle[1][1], triangle[2][1]) > point[1] ||
      Math.max(triangle[0][2], triangle[1][2], triangle[2][2]) < point[2] ||
      Math.min(triangle[0][2], triangle[1][2], triangle[2][2]) > point[2]
    ) {
      continue
    }
    if (rayIntersectsTriangle(triangle, point)) intersections += 1
  }
  return intersections % 2 === 1
}

function zPlanesForVariant(
  variant: OpenGridParameters['variant'],
): readonly number[] {
  if (variant === 'Lite') return [0.23, 1.37, 3.77]
  if (variant === 'Heavy' || variant === 'Hybrid') {
    return [0.23, 3.37, 6.87, 7.13, 10.37, 13.57]
  }
  return [0.23, 2.17, 4.17, 6.57]
}

function sectionMismatchCount(
  official: StlMetrics,
  candidate: StlMetrics,
  variant: OpenGridParameters['variant'],
): number {
  let mismatches = 0
  for (const z of zPlanesForVariant(variant)) {
    for (let y = -13.37; y <= 13.37; y += 0.97) {
      for (let x = -13.37; x <= 13.37; x += 0.97) {
        const point: Point3D = [x, y, z]
        if (
          stlContainsPoint(official, point) !==
          stlContainsPoint(candidate, point)
        ) {
          mismatches += 1
        }
      }
    }
  }
  return mismatches
}

function assertOfficialEquivalent(
  fixture: ReferenceFixture,
  candidateBytes: Uint8Array,
): void {
  const expectedPath = join(referenceDirectory!, `${fixture.id}.stl`)
  const legacyOneByOnePath = fixture.id.endsWith('-1x1-none')
    ? join(referenceDirectory!, `${fixture.id.replace(/-none$/, '')}.stl`)
    : null
  const officialPath = [expectedPath, legacyOneByOnePath].find(
    (candidatePath): candidatePath is string =>
      candidatePath !== null && existsSync(candidatePath),
  )
  if (!officialPath) {
    throw new Error(`OPENGRID_OFFICIAL_REFERENCE_MISSING:${expectedPath}`)
  }
  const official = readBinaryStl(new Uint8Array(readFileSync(officialPath)))
  const candidate = readBinaryStl(candidateBytes)
  const bounds = [...official.min, ...official.max]
  const candidateBounds = [...candidate.min, ...candidate.max]
  for (let index = 0; index < bounds.length; index += 1) {
    expect(
      Math.abs(candidateBounds[index]! - bounds[index]!),
    ).toBeLessThanOrEqual(0.01)
  }
  expect(Math.abs(candidate.volume - official.volume)).toBeLessThanOrEqual(0.5)
  expect(
    sectionMismatchCount(official, candidate, fixture.variant),
  ).toBeLessThanOrEqual(8)
}

describe.skipIf(!referenceDirectory)(
  'OpenGrid official reference export',
  () => {
    beforeAll(async () => {
      const openCascade = await initialiseOpenCascade({
        locateFile: () => WASM_PATH,
      })
      setOC(openCascade as Parameters<typeof setOC>[0])
      mkdirSync(referenceDirectory!, { recursive: true })
    })

    it.each(REFERENCE_FIXTURES)(
      'exports the Replicad $id reference candidate',
      async (fixture) => {
        const shape = await buildOpenGridBRep(
          parameters(fixture.variant, fixture.overrides),
        )
        try {
          const bytes = await exportStlBytes(shape, {
            tolerance: 0.001,
            angularTolerance: 0.1,
          })
          writeFileSync(
            join(referenceDirectory!, `replicad-${fixture.id}.stl`),
            new Uint8Array(bytes),
          )
          expect(bytes.byteLength).toBeGreaterThan(84)
          assertOfficialEquivalent(fixture, new Uint8Array(bytes))
        } finally {
          shape.delete()
        }
      },
      120_000,
    )
  },
)

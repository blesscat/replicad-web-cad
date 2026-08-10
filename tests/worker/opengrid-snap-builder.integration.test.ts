import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getOC, measureVolume, setOC, Solid, type Shape3D } from 'replicad'
import type { TopAbs_ShapeEnum } from 'replicad-opencascadejs'
import { initialiseCadKernel } from '../../src/cad-kernel/initialise'
import {
  buildOpenGridSnap,
  importOpenGridSnapReference,
  inspectOpenGridSnapReference,
  OPENGRID_SNAP_REFERENCE_URLS,
} from '../../src/cad-kernel/components/opengrid-snap/builder'
import {
  inspectOpenGridSnapShapeQuality,
  OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE,
} from '../../src/cad-kernel/components/opengrid-snap/quality'
import { meshBRep } from '../../src/cad-kernel/mesh'

;(globalThis as typeof globalThis & { __dirname?: string }).__dirname = dirname(
  fileURLToPath(import.meta.url),
)
const require = createRequire(import.meta.url)
;(globalThis as typeof globalThis & { require?: typeof require }).require =
  require
const WASM_PATH =
  require.resolve('replicad-opencascadejs/src/replicad_single.wasm')

function shapeBounds(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function expectBoundsNear(actual: number[][], expected: number[][]): void {
  for (let axis = 0; axis < 2; axis += 1) {
    for (let coordinate = 0; coordinate < 3; coordinate += 1) {
      expect(
        Math.abs(actual[axis]![coordinate]! - expected[axis]![coordinate]!),
      ).toBeLessThanOrEqual(OPENGRID_SNAP_GENERATED_ENVELOPE_TOLERANCE)
    }
  }
}

function assemblyBounds(shape: Shape3D): number[][] {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let bounds: number[][] | null = null
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        const solidBounds = shapeBounds(solid)
        if (!bounds) {
          bounds = solidBounds
        } else {
          bounds = [
            [
              Math.min(bounds[0][0], solidBounds[0][0]),
              Math.min(bounds[0][1], solidBounds[0][1]),
              Math.min(bounds[0][2], solidBounds[0][2]),
            ],
            [
              Math.max(bounds[1][0], solidBounds[1][0]),
              Math.max(bounds[1][1], solidBounds[1][1]),
              Math.max(bounds[1][2], solidBounds[1][2]),
            ],
          ]
        }
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (!bounds) throw new Error('assembly bounds missing')
  return bounds
}

function countSolids(shape: Shape3D): number {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let count = 0
  try {
    while (explorer.More()) {
      count += 1
      explorer.Next()
    }
    return count
  } finally {
    explorer.delete()
  }
}

type SolidDescriptor = {
  bounds: number[][]
  volume: number
}

function solidDescriptors(shape: Shape3D): SolidDescriptor[] {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  const descriptors: SolidDescriptor[] = []
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      try {
        descriptors.push({
          bounds: shapeBounds(solid),
          volume: measureVolume(solid),
        })
      } finally {
        solid.delete()
      }
      explorer.Next()
    }
    return descriptors
  } finally {
    explorer.delete()
  }
}

function countBoundaryChamferFaces(shape: Shape3D, height: number): number {
  let count = 0
  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const normal = face.normalAt()
      const bounds = face.boundingBox
      try {
        const [min, max] = bounds.bounds as number[][]
        const touchesBoundaryZ =
          Math.abs((min?.[2] ?? 0) - 0) <= 0.02 ||
          Math.abs((max?.[2] ?? 0) - height) <= 0.02
        const hasZSpan = (max?.[2] ?? 0) - (min?.[2] ?? 0) >= 0.05
        const isDiagonal = Math.abs(Math.abs(normal.z) - Math.SQRT1_2) <= 0.02
        if (touchesBoundaryZ && hasZSpan && isDiagonal) count += 1
      } finally {
        bounds.delete()
        normal.delete()
      }
    } finally {
      face.delete()
    }
  }
  return count
}

function hasPlanarFaceWithBounds(
  shape: Shape3D,
  expected: number[][],
  tolerance = 0.05,
): boolean {
  for (const face of shape.faces) {
    try {
      if (face.geomType !== 'PLANE') continue
      const bounds = face.boundingBox
      try {
        const actual = bounds.bounds as number[][]
        if (
          actual.every((point, pointIndex) =>
            point.every(
              (coordinate, coordinateIndex) =>
                Math.abs(
                  coordinate - expected[pointIndex]![coordinateIndex]!,
                ) <= tolerance,
            ),
          )
        ) {
          return true
        }
      } finally {
        bounds.delete()
      }
    } finally {
      face.delete()
    }
  }
  return false
}

function centralSolid(shape: Shape3D): Solid {
  const oc = getOC()
  const explorer = new oc.TopExp_Explorer_2(
    shape.wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID as unknown as TopAbs_ShapeEnum,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE as unknown as TopAbs_ShapeEnum,
  )
  let selected: Solid | null = null
  let selectedVolume = -Infinity
  try {
    while (explorer.More()) {
      const solid = new Solid(oc.TopoDS.Solid_1(explorer.Current()))
      const volume = measureVolume(solid)
      if (volume > selectedVolume) {
        selected?.delete()
        selected = solid
        selectedVolume = volume
      } else {
        solid.delete()
      }
      explorer.Next()
    }
  } finally {
    explorer.delete()
  }
  if (!selected) throw new Error('central solid missing')
  return selected
}

function assetBlob(
  variant: 'Full' | 'Lite',
  profile: 'Standard' | 'Directional' = 'Standard',
): Blob {
  return new Blob([
    readFileSync(fileURLToPath(OPENGRID_SNAP_REFERENCE_URLS[profile][variant])),
  ])
}

function snapParameters(
  variant: 'Full' | 'Lite',
  offset: number,
  halfCellX: 'none' | 'left' | 'right' = 'none',
  halfCellY: 'none' | 'top' | 'bottom' = 'none',
  overrides: Partial<{
    profile: 'Standard' | 'Directional'
    fourCornerLocatingHoles: boolean
    centerRemoverHole: boolean
  }> = {},
) {
  return {
    variant,
    profile: 'Standard' as const,
    offset,
    halfCellX,
    halfCellY,
    fourCornerLocatingHoles: false,
    centerRemoverHole: false,
    ...overrides,
  }
}

describe('OpenGrid Snap reference builder', () => {
  beforeAll(async () => {
    await initialiseCadKernel(WASM_PATH)
  })

  afterAll(() => {
    // OpenCascade is process-global in these integration tests.
  })

  it('imports complete Full and Lite nine-solid references with the expected envelope', async () => {
    for (const variant of ['Full', 'Lite'] as const) {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      try {
        const report = inspectOpenGridSnapReference(reference, variant)
        const descriptors = solidDescriptors(reference)
        const body = descriptors.find((descriptor) => descriptor.volume > 100)
        const snaps = descriptors.filter(
          (descriptor) => descriptor.volume > 5.8 && descriptor.volume < 100,
        )
        const holders = descriptors.filter(
          (descriptor) => descriptor.volume <= 5.8,
        )
        expect(report.solidCount).toBe(9)
        expect(body).toBeDefined()
        expect(snaps).toHaveLength(4)
        expect(holders).toHaveLength(4)
        expect(body?.volume).toBeCloseTo(
          variant === 'Full' ? 3670.486 : 1837.358,
          2,
        )
        expect(
          Math.min(...snaps.map((descriptor) => descriptor.bounds[0]![2]!)),
        ).toBeCloseTo(variant === 'Full' ? 5.3 : 1.9, 2)
        expect(
          Math.max(...snaps.map((descriptor) => descriptor.bounds[1]![2]!)),
        ).toBeCloseTo(variant === 'Full' ? 6.8 : 3.4, 2)
        expect(
          Math.min(...holders.map((descriptor) => descriptor.bounds[0]![2]!)),
        ).toBeCloseTo(variant === 'Full' ? 3.4 : 0.2, 2)
        expect(
          Math.max(...holders.map((descriptor) => descriptor.bounds[1]![2]!)),
        ).toBeCloseTo(variant === 'Full' ? 5.4 : 2, 2)
        expect(report.bounds.min[0]).toBeCloseTo(-12.8, 2)
        expect(report.bounds.max[0]).toBeCloseTo(12.8, 2)
        expect(report.bounds.min[1]).toBeCloseTo(-12.8, 2)
        expect(report.bounds.max[1]).toBeCloseTo(12.8, 2)
        expect(report.bounds.min[2]).toBeCloseTo(0, 2)
        expect(report.height).toBeCloseTo(variant === 'Full' ? 6.8 : 3.4, 2)
      } finally {
        reference.delete()
      }
    }
  }, 60_000)

  it.each(['Full', 'Lite'] as const)(
    'retains the complete zero-offset %s reference assembly',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const generated = await buildOpenGridSnap(snapParameters(variant, 0), {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        expect(countSolids(generated)).toBe(9)
        expect(shapeBounds(generated)).toEqual([
          [
            expect.closeTo(-12.8, 2),
            expect.closeTo(-12.8, 2),
            expect.closeTo(0, 2),
          ],
          [
            expect.closeTo(12.8, 2),
            expect.closeTo(12.8, 2),
            expect.closeTo(variant === 'Full' ? 6.8 : 3.4, 2),
          ],
        ])
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          snapParameters(variant, 0),
          meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
          reference,
        )
        expect(
          quality.passed,
          `${quality.failures.join(';')} bounds=${JSON.stringify(quality.bounds)}`,
        ).toBe(true)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'derives every single and dual half-cell direction for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const directions = [
        ['left', 'none'],
        ['right', 'none'],
        ['none', 'top'],
        ['none', 'bottom'],
        ['left', 'top'],
        ['left', 'bottom'],
        ['right', 'top'],
        ['right', 'bottom'],
      ] as const
      try {
        for (const [halfCellX, halfCellY] of directions) {
          const parameters = snapParameters(variant, 0, halfCellX, halfCellY)
          const generated = await buildOpenGridSnap(parameters, {
            getOpenGridSnapReference: async () => reference,
          })
          try {
            const mesh = meshBRep(generated, {
              tolerance: 0.05,
              angularTolerance: 0.1,
            })
            const quality = inspectOpenGridSnapShapeQuality(
              generated,
              parameters,
              mesh,
              reference,
            )
            const bounds = assemblyBounds(generated)
            const expectedX = halfCellX === 'none' ? 12.8 : 6.4
            const expectedY = halfCellY === 'none' ? 12.8 : 6.4
            expect(
              quality.passed,
              `${halfCellX}/${halfCellY}: ${quality.failures.join(';')} actual=${JSON.stringify(bounds)}`,
            ).toBe(true)
            expectBoundsNear(bounds, [
              [-expectedX, -expectedY, 0],
              [expectedX, expectedY, variant === 'Full' ? 6.8 : 3.4],
            ])
            expect(
              countBoundaryChamferFaces(
                generated,
                variant === 'Full' ? 6.8 : 3.4,
              ),
            ).toBeGreaterThan(0)
          } finally {
            generated.delete()
          }
        }
      } finally {
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'applies one positive offset symmetrically on the $variant envelope',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const generated = await buildOpenGridSnap(snapParameters(variant, 0.2), {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 })
        const bounds = assemblyBounds(generated)
        expect(Math.abs(bounds[0][0] + 12.9)).toBeLessThanOrEqual(0.1)
        expect(Math.abs(bounds[0][1] + 12.9)).toBeLessThanOrEqual(0.1)
        expect(Math.abs(bounds[1][0] - 12.9)).toBeLessThanOrEqual(0.1)
        expect(Math.abs(bounds[1][1] - 12.9)).toBeLessThanOrEqual(0.1)
        expect(bounds[0][2]).toBeCloseTo(0, 2)
        expect(bounds[1][2]).toBeCloseTo(variant === 'Full' ? 6.8 : 3.4, 2)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'keeps a dual half-cell within both host pitches at maximum offset for $variant',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const parameters = snapParameters(variant, 1, 'right', 'bottom')
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const mesh = meshBRep(generated, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          parameters,
          mesh,
          reference,
        )
        expect(
          quality.passed,
          `${quality.failures.join(';')} bounds=${JSON.stringify(quality.bounds)}`,
        ).toBe(true)
        const bounds = assemblyBounds(generated)
        expectBoundsNear(bounds, [
          [-6.9, -6.9, 0],
          [6.9, 6.9, variant === 'Full' ? 6.8 : 3.4],
        ])
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it('changes only the requested centered outer envelope and keeps the central solid fixed', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Full'),
      'Full',
    )
    const generated = await buildOpenGridSnap(snapParameters('Full', 0.2), {
      getOpenGridSnapReference: async () => reference,
    })
    const referenceCore = centralSolid(reference)
    const generatedCore = centralSolid(generated)
    try {
      expect(countSolids(generated)).toBe(9)
      expect(shapeBounds(generated)).toEqual([
        [
          expect.closeTo(-12.9, 2),
          expect.closeTo(-12.9, 2),
          expect.closeTo(0, 2),
        ],
        [
          expect.closeTo(12.9, 2),
          expect.closeTo(12.9, 2),
          expect.closeTo(6.8, 2),
        ],
      ])
      const mesh = meshBRep(generated, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const quality = inspectOpenGridSnapShapeQuality(
        generated,
        snapParameters('Full', 0.2),
        mesh,
        reference,
      )
      expect(quality.passed, quality.failures.join(';')).toBe(true)
      expect(measureVolume(generatedCore)).toBeCloseTo(
        measureVolume(referenceCore),
        5,
      )
      expectBoundsNear(shapeBounds(generatedCore), shapeBounds(referenceCore))
    } finally {
      referenceCore.delete()
      generatedCore.delete()
      generated.delete()
      reference.delete()
    }
  }, 60_000)

  it('quality-gates the complete assembly and fixed internal probes', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Lite'),
      'Lite',
    )
    const generated = await buildOpenGridSnap(snapParameters('Lite', 0.2), {
      getOpenGridSnapReference: async () => reference,
    })
    try {
      const mesh = meshBRep(generated, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const quality = inspectOpenGridSnapShapeQuality(
        generated,
        snapParameters('Lite', 0.2),
        mesh,
        reference,
      )
      expect(quality.passed, quality.failures.join(';')).toBe(true)
      expect(quality.solidCount).toBe(9)
      expect(quality.internalProbeVolumes).toHaveLength(3)
    } finally {
      generated.delete()
      reference.delete()
    }
  }, 60_000)

  it.each(['Full', 'Lite'] as const)(
    'applies the two optional body features independently for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant),
        variant,
      )
      const solid = await buildOpenGridSnap(snapParameters(variant, 0), {
        getOpenGridSnapReference: async () => reference,
      })
      const corners = await buildOpenGridSnap(
        snapParameters(variant, 0, 'none', 'none', {
          fourCornerLocatingHoles: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      const offsetCorners = await buildOpenGridSnap(
        snapParameters(variant, 0.4, 'none', 'none', {
          fourCornerLocatingHoles: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      const center = await buildOpenGridSnap(
        snapParameters(variant, 0, 'none', 'none', {
          centerRemoverHole: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      const both = await buildOpenGridSnap(
        snapParameters(variant, 0, 'none', 'none', {
          fourCornerLocatingHoles: true,
          centerRemoverHole: true,
        }),
        { getOpenGridSnapReference: async () => reference },
      )
      try {
        const featureCases = [
          [solid, snapParameters(variant, 0)],
          [
            corners,
            snapParameters(variant, 0, 'none', 'none', {
              fourCornerLocatingHoles: true,
            }),
          ],
          [
            offsetCorners,
            snapParameters(variant, 0.4, 'none', 'none', {
              fourCornerLocatingHoles: true,
            }),
          ],
          [
            center,
            snapParameters(variant, 0, 'none', 'none', {
              centerRemoverHole: true,
            }),
          ],
          [
            both,
            snapParameters(variant, 0, 'none', 'none', {
              fourCornerLocatingHoles: true,
              centerRemoverHole: true,
            }),
          ],
        ] as const
        const volumes = featureCases.map(([shape]) => {
          const body = centralSolid(shape)
          const volume = measureVolume(body)
          body.delete()
          return volume
        })
        for (const [shape, parameters] of featureCases) {
          const quality = inspectOpenGridSnapShapeQuality(
            shape,
            parameters,
            meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
            reference,
          )
          expect(quality.passed, quality.failures.join(';')).toBe(true)
        }
        expect(volumes[1]).toBeLessThan(volumes[0]!)
        expect(volumes[2]).toBeCloseTo(volumes[1]!, 5)
        expect(volumes[3]).toBeLessThan(volumes[0]!)
        expect(volumes[4]).toBeLessThan(volumes[0]!)
        expect(volumes[4]).toBeLessThan(volumes[3]!)
        expect(volumes[4]).toBeLessThan(volumes[2]!)
        expect(volumes[0]! - volumes[1]!).toBeCloseTo(
          variant === 'Full' ? 1070.83 : 479.503,
          2,
        )
        expect(volumes[0]! - volumes[3]!).toBeCloseTo(
          variant === 'Full' ? 371.2 : 169.6,
          2,
        )

        const cornerBody = centralSolid(corners)
        try {
          const slotStepZ = variant === 'Full' ? 4.8 : 1.9
          expect(
            hasPlanarFaceWithBounds(cornerBody, [
              [-5, 5.5, 0],
              [5, 5.5, slotStepZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(cornerBody, [
              [5.5, -5, 0],
              [5.5, 5, slotStepZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(cornerBody, [
              [-5, 5.5, slotStepZ],
              [5, 8.5, slotStepZ],
            ]),
          ).toBe(true)
        } finally {
          cornerBody.delete()
        }

        const centerBody = centralSolid(center)
        try {
          const stepZ = variant === 'Full' ? 4.8 : 1.9
          const topZ = variant === 'Full' ? 6.8 : 3.4
          expect(
            hasPlanarFaceWithBounds(centerBody, [
              [4, -4, 0],
              [4, 4, stepZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(centerBody, [
              [2, -4, stepZ],
              [2, 4, topZ],
            ]),
          ).toBe(true)
          expect(
            hasPlanarFaceWithBounds(centerBody, [
              [2, -4, stepZ],
              [4, 4, stepZ],
            ]),
          ).toBe(true)
        } finally {
          centerBody.delete()
        }
      } finally {
        solid.delete()
        corners.delete()
        offsetCorners.delete()
        center.delete()
        both.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'loads the independent Directional %s profile',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const parameters = snapParameters(variant, 0, 'none', 'none', {
        profile: 'Directional',
      })
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const report = inspectOpenGridSnapReference(
          reference,
          variant,
          'Directional',
        )
        expect(report.solidCount).toBe(1)
        expect(countSolids(generated)).toBe(1)
        expect(assemblyBounds(generated)[1][1]).toBeGreaterThan(12.8)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'keeps Directional optional features independent for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const baseParameters = snapParameters(variant, 0, 'none', 'none', {
        profile: 'Directional',
      })
      const featureCases = [
        baseParameters,
        { ...baseParameters, fourCornerLocatingHoles: true },
        { ...baseParameters, centerRemoverHole: true },
        {
          ...baseParameters,
          fourCornerLocatingHoles: true,
          centerRemoverHole: true,
        },
      ]
      const generated: Shape3D[] = []
      try {
        for (const parameters of featureCases) {
          generated.push(
            await buildOpenGridSnap(parameters, {
              getOpenGridSnapReference: async () => reference,
            }),
          )
        }
        const volumes = generated.map((shape) => {
          const body = centralSolid(shape)
          const volume = measureVolume(body)
          body.delete()
          return volume
        })
        expect(volumes[1]).toBeLessThan(volumes[0]!)
        expect(volumes[2]).toBeLessThan(volumes[0]!)
        expect(volumes[3]).toBeLessThan(volumes[1]!)
        expect(volumes[3]).toBeLessThan(volumes[2]!)
        for (let index = 0; index < featureCases.length; index += 1) {
          const parameters = featureCases[index]
          const shape = generated[index]
          if (!shape) throw new Error('directional-feature-shape-missing')
          const quality = inspectOpenGridSnapShapeQuality(
            shape,
            parameters,
            meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
            reference,
          )
          expect(quality.passed, quality.failures.join(';')).toBe(true)
        }
      } finally {
        for (const shape of generated) shape.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'derives every Directional single and dual half-cell direction for %s',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const directions = [
        ['left', 'none'],
        ['right', 'none'],
        ['none', 'top'],
        ['none', 'bottom'],
        ['left', 'top'],
        ['left', 'bottom'],
        ['right', 'top'],
        ['right', 'bottom'],
      ] as const
      try {
        for (const [halfCellX, halfCellY] of directions) {
          const parameters = snapParameters(variant, 0, halfCellX, halfCellY, {
            profile: 'Directional',
          })
          const generated = await buildOpenGridSnap(parameters, {
            getOpenGridSnapReference: async () => reference,
          })
          try {
            const quality = inspectOpenGridSnapShapeQuality(
              generated,
              parameters,
              meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
              reference,
            )
            expect(
              quality.passed,
              `${halfCellX}/${halfCellY}: ${quality.failures.join(';')}`,
            ).toBe(true)
            expect(quality.solidCount).toBeGreaterThanOrEqual(1)
          } finally {
            generated.delete()
          }
        }
      } finally {
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'derives a Directional quarter-cell from the complete %s assembly',
    async (variant) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(variant, 'Directional'),
        variant,
        'Directional',
      )
      const parameters = snapParameters(variant, 0, 'right', 'bottom', {
        profile: 'Directional',
      })
      const generated = await buildOpenGridSnap(parameters, {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const mesh = meshBRep(generated, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          parameters,
          mesh,
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(quality.solidCount).toBeGreaterThanOrEqual(1)
        expectBoundsNear(assemblyBounds(generated), [
          [-6.4, -6.4, 0],
          [6.4, 6.4, variant === 'Full' ? 6.8 : 3.4],
        ])
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it.each(['Full', 'Lite'] as const)(
    'supports the maximum slider offset for $variant without moving the fixed core',
    async (parameters) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(parameters),
        parameters,
      )
      const generated = await buildOpenGridSnap(snapParameters(parameters, 1), {
        getOpenGridSnapReference: async () => reference,
      })
      try {
        const mesh = meshBRep(generated, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          snapParameters(parameters, 1),
          mesh,
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
        expect(
          Math.abs((quality.bounds?.min[0] ?? 0) + 13.3),
        ).toBeLessThanOrEqual(0.1)
        expect(
          Math.abs((quality.bounds?.max[0] ?? 0) - 13.3),
        ).toBeLessThanOrEqual(0.1)
      } finally {
        generated.delete()
        reference.delete()
      }
    },
  )

  it('keeps the cached reference usable after zero-offset preview meshing', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Full'),
      'Full',
    )
    const zeroOffset = await buildOpenGridSnap(snapParameters('Full', 0), {
      getOpenGridSnapReference: async () => reference,
    })
    meshBRep(zeroOffset, { tolerance: 0.05, angularTolerance: 0.1 })
    expect(countSolids(reference)).toBe(9)
    const generated = await buildOpenGridSnap(snapParameters('Full', 0.2), {
      getOpenGridSnapReference: async () => reference,
    })
    try {
      expect(countSolids(generated)).toBe(9)
    } finally {
      generated.delete()
      zeroOffset.delete()
      reference.delete()
    }
  }, 60_000)

  it('rejects an offset that cannot preserve the fixed central region', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Full'),
      'Full',
    )
    try {
      await expect(
        buildOpenGridSnap(snapParameters('Full', -0.05), {
          getOpenGridSnapReference: async () => reference,
        }),
      ).rejects.toThrow('OPENGRID_SNAP_PARAMETERS_INVALID')
    } finally {
      reference.delete()
    }
  }, 60_000)
})

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
import { inspectOpenGridSnapShapeQuality } from '../../src/cad-kernel/components/opengrid-snap/quality'
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

function assetBlob(variant: 'Full' | 'Lite'): Blob {
  return new Blob([
    readFileSync(fileURLToPath(OPENGRID_SNAP_REFERENCE_URLS[variant])),
  ])
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
        expect(report.solidCount).toBe(9)
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
      const generated = await buildOpenGridSnap(
        { variant, offset: 0 },
        { getOpenGridSnapReference: async () => reference },
      )
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
          { variant, offset: 0 },
          meshBRep(generated, { tolerance: 0.05, angularTolerance: 0.1 }),
          reference,
        )
        expect(quality.passed, quality.failures.join(';')).toBe(true)
      } finally {
        generated.delete()
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
      const generated = await buildOpenGridSnap(
        { variant, offset: 0.2 },
        { getOpenGridSnapReference: async () => reference },
      )
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

  it('changes only the requested centered outer envelope and keeps the central solid fixed', async () => {
    const reference = await importOpenGridSnapReference(
      assetBlob('Full'),
      'Full',
    )
    const generated = await buildOpenGridSnap(
      { variant: 'Full', offset: 0.2 },
      { getOpenGridSnapReference: async () => reference },
    )
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
        { variant: 'Full', offset: 0.2 },
        mesh,
        reference,
      )
      expect(quality.passed, quality.failures.join(';')).toBe(true)
      expect(measureVolume(generatedCore)).toBeCloseTo(
        measureVolume(referenceCore),
        5,
      )
      expect(shapeBounds(generatedCore)).toEqual(shapeBounds(referenceCore))
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
    const generated = await buildOpenGridSnap(
      { variant: 'Lite', offset: 0.2 },
      { getOpenGridSnapReference: async () => reference },
    )
    try {
      const mesh = meshBRep(generated, {
        tolerance: 0.05,
        angularTolerance: 0.1,
      })
      const quality = inspectOpenGridSnapShapeQuality(
        generated,
        { variant: 'Lite', offset: 0.2 },
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
    'supports the maximum slider offset for $variant without moving the fixed core',
    async (parameters) => {
      const reference = await importOpenGridSnapReference(
        assetBlob(parameters),
        parameters,
      )
      const generated = await buildOpenGridSnap(
        { variant: parameters, offset: 1 },
        {
          getOpenGridSnapReference: async () => reference,
        },
      )
      try {
        const mesh = meshBRep(generated, {
          tolerance: 0.05,
          angularTolerance: 0.1,
        })
        const quality = inspectOpenGridSnapShapeQuality(
          generated,
          { variant: parameters, offset: 1 },
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
    const zeroOffset = await buildOpenGridSnap(
      { variant: 'Full', offset: 0 },
      { getOpenGridSnapReference: async () => reference },
    )
    meshBRep(zeroOffset, { tolerance: 0.05, angularTolerance: 0.1 })
    expect(countSolids(reference)).toBe(9)
    const generated = await buildOpenGridSnap(
      { variant: 'Full', offset: 0.2 },
      { getOpenGridSnapReference: async () => reference },
    )
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
        buildOpenGridSnap(
          { variant: 'Full', offset: -0.05 },
          { getOpenGridSnapReference: async () => reference },
        ),
      ).rejects.toThrow('OPENGRID_SNAP_PARAMETERS_INVALID')
    } finally {
      reference.delete()
    }
  }, 60_000)
})

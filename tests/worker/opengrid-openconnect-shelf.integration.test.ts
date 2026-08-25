import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeBox, measureVolume, setOC, type Shape3D } from 'replicad'
import {
  boundsForOpenGridOpenConnectShelf,
  openGridOpenConnectShelfAngleRadiansFor,
  openGridOpenConnectShelfDepthFor,
  openGridOpenConnectShelfSlotOriginsFor,
  openGridOpenConnectShelfWidthFor,
  OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS,
  type OpenGridOpenConnectShelfParameters,
} from '../../src/cad-contract/units'
import {
  buildOpenGridOpenConnectShelf,
  openGridParametersForOpenConnectShelf,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/builder'
import { inspectOpenGridOpenConnectShelfShapeQuality } from '../../src/cad-kernel/components/opengrid-openconnect-shelf/quality'
import {
  importOpenGridOpenConnectShelfLockedSlot,
  openGridOpenConnectShelfLockedSlotAssetUrl,
  placeOpenGridOpenConnectShelfLockedSlot,
} from '../../src/cad-kernel/components/opengrid-openconnect-shelf/slot'
import { buildOpenGridBRep } from '../../src/cad-kernel/components/opengrid/builder'
import {
  importOpenGridSnapOpenConnectHead,
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_URL,
} from '../../src/cad-kernel/components/opengrid-snap/builder'
import {
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_AXIS,
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_DEGREES,
  OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_ORIGIN,
} from '../../src/cad-kernel/components/opengrid-snap/openconnect'
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

beforeAll(async () => {
  const openCascade = await initialiseOpenCascade({
    locateFile: () => WASM_PATH,
  })
  setOC(openCascade as Parameters<typeof setOC>[0])
})

function deleteShape(shape: Shape3D | null | undefined): void {
  try {
    shape?.delete()
  } catch {
    // Cleanup must not replace the primary geometry assertion.
  }
}

function boundsOf(shape: Shape3D): number[][] {
  const bounds = shape.boundingBox
  try {
    return bounds.bounds as number[][]
  } finally {
    bounds.delete()
  }
}

function expectBoundsClose(
  actual: number[][],
  expected: ReturnType<typeof boundsForOpenGridOpenConnectShelf>,
): void {
  for (let boundIndex = 0; boundIndex < 2; boundIndex += 1) {
    const expectedBound = boundIndex === 0 ? expected.min : expected.max
    for (let axis = 0; axis < 3; axis += 1) {
      expect(actual[boundIndex]?.[axis]).toBeCloseTo(expectedBound[axis]!, 2)
    }
  }
}

async function lockedSlotSource(): Promise<Shape3D> {
  return importOpenGridOpenConnectShelfLockedSlot(
    new Blob([
      readFileSync(fileURLToPath(openGridOpenConnectShelfLockedSlotAssetUrl)),
    ]),
  )
}

async function snapOpenConnectHeadSource(): Promise<Shape3D> {
  return importOpenGridSnapOpenConnectHead(
    new Blob([
      readFileSync(fileURLToPath(OPENGRID_SNAP_OPEN_CONNECT_HEAD_URL)),
    ]),
  )
}

function placeSnapOpenConnectHeadForShelf(
  source: Shape3D,
  origin: readonly [number, number, number],
): Shape3D {
  let current: Shape3D | null = source.clone()
  try {
    const assembled = current.rotate(
      OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_DEGREES,
      [...OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_ORIGIN],
      [...OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_AXIS],
    )
    if (assembled !== current) deleteShape(current)
    current = assembled

    const vertical = current.rotate(90, [0, 0, 0], [1, 0, 0])
    if (vertical !== current) deleteShape(current)
    current = vertical

    const placed = current.translate(origin[0], origin[1], origin[2])
    if (placed !== current) deleteShape(current)
    current = placed
    return current
  } catch (error) {
    deleteShape(current)
    throw error
  }
}

function rotateForPrint(shape: Shape3D, angle: number): Shape3D {
  const rotated = shape.rotate(angle, [0, 0, 0], [1, 0, 0])
  if (rotated !== shape) deleteShape(shape)
  return rotated
}

async function buildPrintOrientedFunctionalBoard(
  parameters: OpenGridOpenConnectShelfParameters,
): Promise<Shape3D> {
  const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
  const depth = openGridOpenConnectShelfDepthFor(parameters)
  const board = await buildOpenGridBRep(
    openGridParametersForOpenConnectShelf(parameters),
  )
  const placed = board.translate(
    0,
    -depth / 2,
    configuration.rearHeight - configuration.fullThickness,
  )
  if (placed !== board) deleteShape(board)
  return rotateForPrint(placed, parameters.angle)
}

describe('OpenGrid OpenConnect shelf CAD kernel integration', () => {
  it('imports the supplied locked negative as its authored valid solid', async () => {
    const source = await lockedSlotSource()
    try {
      const bounds = boundsOf(source)
      const expected = [
        [-13, -13.2, 0],
        [8.6, 9, 2.7],
      ]
      for (let boundIndex = 0; boundIndex < 2; boundIndex += 1) {
        for (let axis = 0; axis < 3; axis += 1) {
          expect(bounds[boundIndex]?.[axis]).toBeCloseTo(
            expected[boundIndex]![axis]!,
            5,
          )
        }
      }
      expect(measureVolume(source)).toBeCloseTo(1010.6805154, 4)
    } finally {
      source.delete()
    }
  })

  it('accepts the assembled Snap OpenConnect head in the locked socket direction', async () => {
    const slotSource = await lockedSlotSource()
    const headSource = await snapOpenConnectHeadSource()
    const origin = openGridOpenConnectShelfSlotOriginsFor({ columns: 1 })[0]!
    const slot = placeOpenGridOpenConnectShelfLockedSlot(slotSource, origin)
    const head = placeSnapOpenConnectHeadForShelf(headSource, origin)
    let residualHead: Shape3D | null = null
    try {
      residualHead = head.cut(slot)
      expect(measureVolume(residualHead)).toBeLessThan(0.01)
    } finally {
      if (residualHead !== head) deleteShape(residualHead)
      head.delete()
      slot.delete()
      headSource.delete()
      slotSource.delete()
    }
  })

  it('builds the default print-oriented one-solid shelf with every slot cut', async () => {
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      expect(measureVolume(shape)).toBeGreaterThan(0)
      expectBoundsClose(
        boundsOf(shape),
        boundsForOpenGridOpenConnectShelf(parameters),
      )
      const quality = inspectOpenGridOpenConnectShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
        source,
      )
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        slotCount: parameters.columns,
      })
      expect(quality.slotResidualVolumes).toHaveLength(parameters.columns)
      expect(quality.slotResidualVolumes.every((volume) => volume < 0.01)).toBe(
        true,
      )

      for (const origin of openGridOpenConnectShelfSlotOriginsFor(parameters)) {
        const installedCutter = placeOpenGridOpenConnectShelfLockedSlot(
          source,
          origin,
        )
        const printCutter = rotateForPrint(installedCutter, parameters.angle)
        let intersection: Shape3D | null = null
        try {
          intersection = shape.intersect(printCutter)
          expect(measureVolume(intersection)).toBeLessThan(0.01)
        } finally {
          deleteShape(intersection)
          printCutter.delete()
        }
      }
    } finally {
      shape.delete()
      source.delete()
    }
  }, 180_000)

  it('matches the complete canonical OpenGrid board at the rear edge', async () => {
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    const source = await lockedSlotSource()
    const expectedBoard = await buildPrintOrientedFunctionalBoard(parameters)
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    const width = openGridOpenConnectShelfWidthFor(parameters)
    const depth = openGridOpenConnectShelfDepthFor(parameters)
    const installedInteriorEnvelope = makeBox(
      [
        -width / 2,
        -depth,
        configuration.rearHeight - configuration.fullThickness + 0.1,
      ],
      [width / 2, -0.1, configuration.rearHeight - 0.1],
    )
    const printInteriorEnvelope = rotateForPrint(
      installedInteriorEnvelope,
      parameters.angle,
    )
    let missingBoard: Shape3D | null = null
    let shelfInsideInterface: Shape3D | null = null
    let unexpectedMaterial: Shape3D | null = null
    try {
      missingBoard = expectedBoard.cut(shape)
      expect(measureVolume(missingBoard)).toBeLessThan(0.01)

      shelfInsideInterface = shape.intersect(printInteriorEnvelope)
      unexpectedMaterial = shelfInsideInterface.cut(expectedBoard)
      expect(measureVolume(unexpectedMaterial)).toBeLessThan(0.01)
    } finally {
      deleteShape(unexpectedMaterial)
      deleteShape(shelfInsideInterface)
      deleteShape(missingBoard)
      printInteriorEnvelope.delete()
      shape.delete()
      expectedBoard.delete()
      source.delete()
    }
  }, 180_000)

  it('leaves every underside cell bay open instead of spanning it with a skin', async () => {
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    const radians = openGridOpenConnectShelfAngleRadiansFor(parameters.angle)
    const bayHalfWidth =
      configuration.gridPitch / 2 - configuration.supportThickness - 0.5
    const bayHalfDepth = configuration.gridPitch / 4
    let sealingSkin: Shape3D | null = null
    let sealedShape: Shape3D | null = null
    try {
      for (let row = 0; row < parameters.rows; row += 1) {
        const installedCenterY = -(row + 0.5) * configuration.gridPitch
        const printCenterY = installedCenterY / Math.cos(radians)
        for (let column = 0; column < parameters.columns; column += 1) {
          const centerX =
            (column - (parameters.columns - 1) / 2) * configuration.gridPitch
          const probe = makeBox(
            [centerX - bayHalfWidth, printCenterY - bayHalfDepth, 0.2],
            [
              centerX + bayHalfWidth,
              printCenterY + bayHalfDepth,
              configuration.supportThickness - 0.2,
            ],
          )
          let obstruction: Shape3D | null = null
          try {
            obstruction = shape.intersect(probe)
            expect(measureVolume(obstruction)).toBeLessThan(0.01)
          } finally {
            deleteShape(obstruction)
            probe.delete()
          }
        }
      }

      const middleColumn = Math.floor(parameters.columns / 2)
      const middleRow = Math.floor(parameters.rows / 2)
      const middleCenterX =
        (middleColumn - (parameters.columns - 1) / 2) * configuration.gridPitch
      const middleInstalledCenterY =
        -(middleRow + 0.5) * configuration.gridPitch
      const middlePrintCenterY = middleInstalledCenterY / Math.cos(radians)
      sealingSkin = makeBox(
        [
          middleCenterX - configuration.gridPitch / 2,
          middlePrintCenterY - bayHalfDepth,
          0,
        ],
        [
          middleCenterX + configuration.gridPitch / 2,
          middlePrintCenterY + bayHalfDepth,
          configuration.supportThickness,
        ],
      )
      sealedShape = shape.fuse(sealingSkin)
      const sealedQuality = inspectOpenGridOpenConnectShelfShapeQuality(
        sealedShape,
        parameters,
        meshBRep(sealedShape, { tolerance: 0.05, angularTolerance: 0.1 }),
        source,
      )
      expect(sealedQuality.validBRep).toBe(true)
      expect(sealedQuality.solidCount).toBe(1)
      expect(sealedQuality.failures).toContain('open-underside')
    } finally {
      deleteShape(sealedShape)
      deleteShape(sealingSkin)
      shape.delete()
      source.delete()
    }
  }, 180_000)

  it('grounds every internal row boundary with an X-direction rib', async () => {
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    const radians = openGridOpenConnectShelfAngleRadiansFor(parameters.angle)
    const bayHalfWidth =
      configuration.gridPitch / 2 - configuration.supportThickness - 0.5
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      for (
        let rowBoundary = 1;
        rowBoundary < parameters.rows;
        rowBoundary += 1
      ) {
        const installedBoundaryY = -rowBoundary * configuration.gridPitch
        const printBoundaryY = installedBoundaryY / Math.cos(radians)
        for (let column = 0; column < parameters.columns; column += 1) {
          const centerX =
            (column - (parameters.columns - 1) / 2) * configuration.gridPitch
          const probe = makeBox(
            [centerX - bayHalfWidth, printBoundaryY - 0.4, 0],
            [centerX + bayHalfWidth, printBoundaryY + 0.4, 0.5],
          )
          let groundedRib: Shape3D | null = null
          try {
            groundedRib = shape.intersect(probe)
            expect(measureVolume(groundedRib)).toBeGreaterThan(1)
          } finally {
            deleteShape(groundedRib)
            probe.delete()
          }
        }
      }
    } finally {
      shape.delete()
      source.delete()
    }
  }, 180_000)

  it('closes the low-angle front edge to the build plane across every column', async () => {
    const parameters: OpenGridOpenConnectShelfParameters = {
      columns: 3,
      rows: 3,
      angle: 1,
    }
    const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    const depth = openGridOpenConnectShelfDepthFor(parameters)
    const radians = openGridOpenConnectShelfAngleRadiansFor(parameters.angle)
    const printFrontY = -depth / Math.cos(radians)
    const bayHalfWidth =
      configuration.gridPitch / 2 - configuration.supportThickness - 0.5
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      for (let column = 0; column < parameters.columns; column += 1) {
        const centerX =
          (column - (parameters.columns - 1) / 2) * configuration.gridPitch
        const probe = makeBox(
          [centerX - bayHalfWidth, printFrontY + 0.2, 0],
          [centerX + bayHalfWidth, printFrontY + 0.8, 2],
        )
        let groundedFront: Shape3D | null = null
        try {
          groundedFront = shape.intersect(probe)
          expect(measureVolume(groundedFront)).toBeGreaterThan(10)
        } finally {
          deleteShape(groundedFront)
          probe.delete()
        }
      }

      const frontOpening = makeBox(
        [-bayHalfWidth, printFrontY - 0.1, -0.1],
        [bayHalfWidth, printFrontY + 1, 3],
      )
      let openedShape: Shape3D | null = null
      try {
        openedShape = shape.cut(frontOpening)
        const openedQuality = inspectOpenGridOpenConnectShelfShapeQuality(
          openedShape,
          parameters,
          meshBRep(openedShape, { tolerance: 0.05, angularTolerance: 0.1 }),
          source,
        )
        expect(openedQuality.failures).toContain('front-ground')
      } finally {
        if (openedShape !== shape) deleteShape(openedShape)
        frontOpening.delete()
      }
    } finally {
      shape.delete()
      source.delete()
    }
  }, 180_000)

  it('keeps the sloped build surface on Z=0 at the one-cell angle boundary', async () => {
    const parameters: OpenGridOpenConnectShelfParameters = {
      columns: 1,
      rows: 1,
      angle: 36,
    }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      const bounds = boundsOf(shape)
      expect(bounds[0]?.[2]).toBeCloseTo(0, 3)
      expectBoundsClose(bounds, boundsForOpenGridOpenConnectShelf(parameters))
      expect(
        inspectOpenGridOpenConnectShelfShapeQuality(
          shape,
          parameters,
          meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
          source,
        ).passed,
      ).toBe(true)
    } finally {
      shape.delete()
      source.delete()
    }
  }, 120_000)

  it('builds valid native geometry at a half-degree angle step', async () => {
    const parameters: OpenGridOpenConnectShelfParameters = {
      columns: 1,
      rows: 2,
      angle: 19.5,
    }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      expectBoundsClose(
        boundsOf(shape),
        boundsForOpenGridOpenConnectShelf(parameters),
      )
      expect(
        inspectOpenGridOpenConnectShelfShapeQuality(
          shape,
          parameters,
          meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
          source,
        ),
      ).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        slotCount: 1,
      })
    } finally {
      shape.delete()
      source.delete()
    }
  }, 120_000)

  it('rejects a shelf when one expected locked socket is filled back in', async () => {
    const parameters = { ...OPENGRID_OPENCONNECT_SHELF_DEFAULT_PARAMETERS }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    let installedFiller: Shape3D | null = null
    let printFiller: Shape3D | null = null
    let filled: Shape3D | null = null
    try {
      const slotOrigin = openGridOpenConnectShelfSlotOriginsFor(parameters)[1]!
      installedFiller = makeBox(
        [-12, slotOrigin[1] - 3.1, 11],
        [12, slotOrigin[1] - 0.1, 17],
      )
      printFiller = rotateForPrint(installedFiller, parameters.angle)
      installedFiller = null
      filled = shape.fuse(printFiller)

      const quality = inspectOpenGridOpenConnectShelfShapeQuality(
        filled,
        parameters,
        meshBRep(filled, { tolerance: 0.05, angularTolerance: 0.1 }),
        source,
      )
      expect(quality.validBRep).toBe(true)
      expect(quality.solidCount).toBe(1)
      expect(quality.failures).toContain('locked-slot-1')
      expect(quality.slotCount).toBe(2)
      expect(quality.slotResidualVolumes[1]).toBeGreaterThan(0.01)
    } finally {
      deleteShape(filled)
      deleteShape(printFiller)
      deleteShape(installedFiller)
      shape.delete()
      source.delete()
    }
  }, 180_000)

  it('builds ten native column sockets with valid upper-bound topology and bounds', async () => {
    const parameters: OpenGridOpenConnectShelfParameters = {
      columns: 10,
      rows: 1,
      angle: 36,
    }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      expectBoundsClose(
        boundsOf(shape),
        boundsForOpenGridOpenConnectShelf(parameters),
      )
      const quality = inspectOpenGridOpenConnectShelfShapeQuality(
        shape,
        parameters,
        meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
        source,
      )
      expect(quality).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        slotCount: 10,
      })
      expect(quality.slotResidualVolumes).toHaveLength(10)
      expect(quality.slotResidualVolumes.every((volume) => volume < 0.01)).toBe(
        true,
      )
    } finally {
      shape.delete()
      source.delete()
    }
  }, 240_000)

  it('keeps valid topology and analytic bounds at the ten-row depth limit', async () => {
    const parameters: OpenGridOpenConnectShelfParameters = {
      columns: 1,
      rows: 10,
      angle: 4,
    }
    const source = await lockedSlotSource()
    const shape = await buildOpenGridOpenConnectShelf(parameters, {
      getLockedSlot: async () => source,
    })
    try {
      expectBoundsClose(
        boundsOf(shape),
        boundsForOpenGridOpenConnectShelf(parameters),
      )
      expect(
        inspectOpenGridOpenConnectShelfShapeQuality(
          shape,
          parameters,
          meshBRep(shape, { tolerance: 0.05, angularTolerance: 0.1 }),
          source,
        ),
      ).toMatchObject({
        passed: true,
        failures: [],
        validBRep: true,
        solidCount: 1,
        slotCount: 1,
      })
    } finally {
      shape.delete()
      source.delete()
    }
  }, 240_000)
})

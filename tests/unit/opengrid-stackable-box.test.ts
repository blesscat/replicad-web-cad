import { describe, expect, it } from 'vitest'
import {
  boundsForModel,
  boundsForOpenGridStackableBox,
  externalOpenGridStackableBoxHeightFor,
  isOpenGridStackableBoxParameters,
  modelFileName,
  modelStlFileName,
  nominalOpenGridStackableBoxBottomGridAxisPositionsFor,
  nominalOpenGridStackableBoxBottomGridCentersFor,
  nominalOpenGridStackableBoxFootprintFor,
  openGridStackableBoxActiveFloorTopZFor,
  openGridStackableBoxActiveUpperInnerRimZFor,
  openGridStackableBoxDerivedGeometryFor,
  openGridStackableBoxOpeningBottomLengthMaximumFor,
  openGridStackableBoxOrdinaryBottomHoleCentersFor,
  openGridStackableBoxSocketCentersFor,
  openGridStackableBoxUpperInnerRimZFor,
  OPENGRID_GRID_CONFIGURATION,
  OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION,
  OPENGRID_STACKABLE_BOX_CONFIGURATION,
  validateModelParameters,
  validateOpenGridStackableBoxParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<Parameters<typeof boundsForOpenGridStackableBox>[0]> = {},
) {
  return {
    x: 1,
    y: 1,
    height: 10,
    cornerBottomHoles: true,
    fullBottomHoleGrid: false,
    basePlateMode: false,
    thinShellMode: false,
    openingPlusXDepth: 0,
    openingPlusXBottomLength: 1,
    openingPlusXAngle: 90,
    openingMinusXDepth: 0,
    openingMinusXBottomLength: 1,
    openingMinusXAngle: 90,
    openingPlusYDepth: 0,
    openingPlusYBottomLength: 1,
    openingPlusYAngle: 90,
    openingMinusYDepth: 0,
    openingMinusYBottomLength: 1,
    openingMinusYAngle: 90,
    ...overrides,
  }
}

describe('OpenGrid stackable-box contract', () => {
  it('keeps manual height at 500 mm while limiting the slider to 200 mm', () => {
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.heightSliderMax).toBe(200)
    expect(
      validateOpenGridStackableBoxParameters(parameters({ height: 500 })).valid,
    ).toBe(true)
    expect(
      validateOpenGridStackableBoxParameters(parameters({ height: 501 })).valid,
    ).toBe(false)
  })

  it('limits X and Y footprints to ten grid units', () => {
    expect(
      validateOpenGridStackableBoxParameters(parameters({ x: 10, y: 10 }))
        .valid,
    ).toBe(true)
    expect(
      validateOpenGridStackableBoxParameters(parameters({ x: 10.5 })).valid,
    ).toBe(false)
    expect(
      validateOpenGridStackableBoxParameters(parameters({ y: 10.5 })).valid,
    ).toBe(false)
  })

  it('controls corner sockets and the full bottom grid independently', () => {
    const parametersForHoleMode = (
      cornerBottomHoles: boolean,
      fullBottomHoleGrid: boolean,
    ) =>
      ({
        x: 1,
        y: 1,
        height: 10,
        cornerBottomHoles,
        fullBottomHoleGrid,
      }) as Parameters<typeof openGridStackableBoxSocketCentersFor>[0]

    const cornersOnly = parametersForHoleMode(true, false)
    expect(openGridStackableBoxSocketCentersFor(cornersOnly)).toHaveLength(4)
    expect(
      openGridStackableBoxOrdinaryBottomHoleCentersFor(cornersOnly),
    ).toHaveLength(0)

    const noBottomHoles = parametersForHoleMode(false, false)
    expect(openGridStackableBoxSocketCentersFor(noBottomHoles)).toEqual([])
    expect(
      openGridStackableBoxOrdinaryBottomHoleCentersFor(noBottomHoles),
    ).toEqual([])

    const fullGridWithoutCorners = parametersForHoleMode(false, true)
    expect(
      openGridStackableBoxSocketCentersFor(fullGridWithoutCorners),
    ).toEqual([])
    expect(
      openGridStackableBoxOrdinaryBottomHoleCentersFor(fullGridWithoutCorners),
    ).toHaveLength(4)
  })

  it('uses the printable thick-shell structural baseline', () => {
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.floorThickness).toBe(1.2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomAssemblyHeight).toBe(5)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.wallThickness).toBe(1.2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailHeight).toBe(7.55)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailWidth).toBe(2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailOuterInset).toBe(0.1)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.outerCornerRadius).toBe(3.75)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailInnerChamfer).toBe(1.75)
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailInnerVerticalHeight,
    ).toBe(1.2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailMiddleChamfer).toBe(0.8)
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailOuterVerticalHeight,
    ).toBe(1.8)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.topRailOuterChamfer).toBe(2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingLeadIn).toBe(1.75)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn).toBe(1.2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomFootChamferHeight).toBe(
      0.8,
    )
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomSupportBandHeight).toBe(
      1.8,
    )
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomFootChamferHeight +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomSupportBandHeight +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomStackingLeadIn +
        OPENGRID_STACKABLE_BOX_CONFIGURATION.floorThickness,
    ).toBe(5)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingClearance).toBe(0.25)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.stackingBearingLand).toBe(0.8)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGrooveDepth).toBe(1.2)
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomGridSeamOpeningWidth,
    ).toBe(1.6)
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleBottomOpeningDiameter,
    ).toBe(OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.shaftOpeningDiameter)
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleBottomOpeningDiameter,
    ).toBe(5)
    expect(
      OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleTopOpeningDiameter,
    ).toBe(OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.retainingOpeningDiameter)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.baseHoleStepHeight).toBe(3)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.basePlateThickness).toBe(3)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.basePlateCutoffHeight).toBe(2)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.basePlateHoleTopDepth).toBe(1)
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.basePlateHoleBottomDepth).toBe(
      2,
    )
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.defaultBasePlateMode).toBe(
      false,
    )
  })

  it('declares the fixed thin-shell profile without changing the thick baseline', () => {
    const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION

    expect(configuration.defaultThinShellMode).toBe(false)
    expect(configuration.thinShellFloorThickness).toBe(2)
    expect(configuration.thinShellWallThickness).toBe(1.6)
    expect(configuration.thinShellInnerFloorFilletRadius).toBe(2)
    expect(configuration.thinShellOuterBottomChamfer).toBe(1.5)
    expect(configuration.thinShellTopChamfer).toBe(1.6)
    expect(configuration.thinShellBottomHoleStepHeight).toBe(1)
    expect(configuration.thinShellBottomAssemblyHeight).toBe(2)
  })

  it('shortens the exported envelope when the base-plate mode is enabled', () => {
    const normal = parameters({ height: 20 })
    const basePlate = parameters({ height: 20, basePlateMode: true })

    expect(externalOpenGridStackableBoxHeightFor(normal)).toBeCloseTo(32.55, 3)
    expect(externalOpenGridStackableBoxHeightFor(basePlate)).toBeCloseTo(
      30.55,
      3,
    )
    expect(boundsForOpenGridStackableBox(basePlate)).toMatchObject({
      min: [-13.925, -13.925, 0],
      max: [13.925, 13.925, expect.closeTo(30.55, 5)],
    })
  })

  it('derives centered 28 mm footprints with total 0.15 mm clearance', () => {
    const value = parameters({ x: 1, y: 4, height: 25 })

    expect(nominalOpenGridStackableBoxFootprintFor(value)).toEqual([
      27.85, 111.85,
    ])
    expect(boundsForOpenGridStackableBox(value)).toEqual({
      min: [-13.925, -55.925, 0],
      max: [13.925, 55.925, 37.55],
    })
    expect(
      boundsForModel({ modelId: 'opengrid-stackable-box', parameters: value }),
    ).toEqual(boundsForOpenGridStackableBox(value))
  })

  it('accepts half-cell values and an explicit boolean without rounding', () => {
    const value = parameters({
      x: 0.5,
      y: 1.5,
      height: 10,
      fullBottomHoleGrid: true,
    })

    expect(validateOpenGridStackableBoxParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(validateModelParameters('opengrid-stackable-box', value)).toEqual({
      valid: true,
      value: { modelId: 'opengrid-stackable-box', parameters: value },
    })
    expect(isOpenGridStackableBoxParameters(value)).toBe(true)
    expect(
      isOpenGridStackableBoxParameters({
        x: 1,
        y: 1,
        height: 10,
        cornerBottomHoles: true,
        fullBottomHoleGrid: false,
        rows: 1,
      }),
    ).toBe(false)
  })

  it('normalizes a legacy box snapshot to disabled opening defaults', () => {
    const legacy = {
      x: 1,
      y: 1,
      height: 10,
      cornerBottomHoles: true,
      fullBottomHoleGrid: false,
      basePlateMode: false,
    }

    const validation = validateOpenGridStackableBoxParameters(legacy)

    expect(validation.valid).toBe(true)
    if (!validation.valid) return
    expect(validation.value.openingPlusXDepth).toBe(0)
    expect(validation.value.openingMinusYBottomLength).toBe(1)
    expect(validation.value.openingPlusYAngle).toBe(90)
    expect(validation.value.thinShellMode).toBe(false)
  })

  it('normalizes a pre-thin current snapshot without changing its openings', () => {
    const current = { ...parameters({ openingPlusXDepth: 4 }) }
    delete (current as Partial<typeof current>).thinShellMode

    const validation = validateOpenGridStackableBoxParameters(current)

    expect(validation).toEqual({
      valid: true,
      value: parameters({ openingPlusXDepth: 4 }),
    })
  })

  it('keeps four opening triples independent and validates their ranges', () => {
    const value = parameters({
      y: 2,
      openingPlusXDepth: 4,
      openingPlusXBottomLength: 3,
      openingPlusXAngle: 45,
      openingMinusYDepth: 6,
      openingMinusYBottomLength: 1,
      openingMinusYAngle: 90,
    })

    expect(validateOpenGridStackableBoxParameters(value)).toEqual({
      valid: true,
      value,
    })

    for (const [field, invalidValue] of [
      ['openingPlusXDepth', 4.5],
      ['openingMinusXBottomLength', -1],
      ['openingPlusYAngle', 0],
      ['openingMinusYAngle', 91],
    ] as const) {
      const validation = validateOpenGridStackableBoxParameters({
        ...value,
        [field]: invalidValue,
      })
      expect(validation.valid).toBe(false)
      if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
    }
  })

  it('derives final floor/rim datums and rectangular wall axes per direction', () => {
    const normal = parameters({ height: 20 })
    const basePlate = parameters({ height: 20, basePlateMode: true })
    const thin = parameters({ height: 20, thinShellMode: true })
    const sloped = parameters({
      y: 2,
      height: 20,
      openingPlusXDepth: 4,
      openingPlusXBottomLength: 8,
      openingPlusXAngle: 45,
    })

    expect(openGridStackableBoxActiveFloorTopZFor(normal)).toBe(5)
    expect(openGridStackableBoxActiveFloorTopZFor(basePlate)).toBe(3)
    expect(openGridStackableBoxActiveUpperInnerRimZFor(normal)).toBe(25)
    expect(openGridStackableBoxActiveUpperInnerRimZFor(basePlate)).toBe(23)
    expect(openGridStackableBoxActiveFloorTopZFor(thin)).toBe(2)
    expect(openGridStackableBoxUpperInnerRimZFor(thin)).toBe(22)
    expect(openGridStackableBoxActiveUpperInnerRimZFor(thin)).toBe(22)
    expect(externalOpenGridStackableBoxHeightFor(thin)).toBe(23.6)

    const opening =
      openGridStackableBoxDerivedGeometryFor(sloped).openings['+X']
    expect(opening).toMatchObject({
      normalAxis: 'x',
      tangentAxis: 'y',
      normalSign: 1,
      enabled: true,
      bottomZ: 21,
      arcRadius: expect.closeTo(2.5, 5),
      horizontalRun: expect.closeTo(13.621, 3),
      upperWidth: expect.closeTo(35.242, 3),
    })
    expect(
      openGridStackableBoxOpeningBottomLengthMaximumFor(sloped, '+X'),
    ).toBe(17)
  })

  it('rejects enabled openings that pass the floor or the corner bridge', () => {
    const belowFloor = validateOpenGridStackableBoxParameters(
      parameters({ openingPlusXDepth: 11 }),
    )
    expect(belowFloor.valid).toBe(false)
    if (!belowFloor.valid)
      expect(belowFloor.issues[0]?.field).toBe('openingPlusXDepth')

    const narrowSide = validateOpenGridStackableBoxParameters(
      parameters({
        x: 0.5,
        y: 0.5,
        openingPlusXDepth: 6,
        openingPlusXBottomLength: 3,
      }),
    )
    expect(narrowSide.valid).toBe(false)
    if (!narrowSide.valid) {
      expect(narrowSide.issues[0]?.field).toBe('openingPlusXBottomLength')
    }
  })

  it('derives deterministic names only for enabled openings', () => {
    const closed = {
      modelId: 'opengrid-stackable-box' as const,
      parameters: parameters({
        openingPlusXBottomLength: 20,
        openingPlusXAngle: 45,
      }),
    }
    const open = {
      ...closed,
      parameters: parameters({ openingPlusXDepth: 4 }),
    }

    expect(modelFileName(closed)).toBe('opengrid-stackable-box-1x1-h10.step')
    expect(modelStlFileName(closed)).toBe('opengrid-stackable-box-1x1-h10.stl')
    expect(modelFileName(open)).not.toBe(modelFileName(closed))
    expect(modelStlFileName(open)).not.toBe(modelStlFileName(closed))
    const changedInertValue = {
      ...open,
      parameters: parameters({
        openingPlusXDepth: 4,
        openingMinusYAngle: 45,
      }),
    }
    expect(modelFileName(changedInertValue)).not.toBe(modelFileName(open))
    expect(modelStlFileName(changedInertValue)).not.toBe(modelStlFileName(open))
  })

  it.each([
    [parameters({ x: 0.25 }), 'x'],
    [parameters({ y: 0 }), 'y'],
    [parameters({ height: 9 }), 'height'],
    [parameters({ x: 18 }), 'x'],
    [parameters({ height: 501 }), 'height'],
    [parameters({ cornerBottomHoles: 'true' as never }), 'cornerBottomHoles'],
    [parameters({ fullBottomHoleGrid: 'true' as never }), 'fullBottomHoleGrid'],
    [parameters({ basePlateMode: 'true' as never }), 'basePlateMode'],
    [parameters({ thinShellMode: 'true' as never }), 'thinShellMode'],
  ])(
    'rejects invalid %s values with a field-specific issue',
    (value, field) => {
      const validation = validateOpenGridStackableBoxParameters(value)

      expect(validation.valid).toBe(false)
      if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
    },
  )

  it('de-duplicates existing corner sockets only on half-cell axes', () => {
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 1, y: 1 })),
    ).toEqual([
      [-7, -7],
      [-7, 7],
      [7, -7],
      [7, 7],
    ])
    expect(openGridStackableBoxSocketCentersFor(parameters())).toHaveLength(4)
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 1 })),
    ).toEqual([
      [0, expect.closeTo(-7, 5)],
      [0, expect.closeTo(7, 5)],
    ])
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 0.5 })),
    ).toEqual([[0, 0]])
    expect(OPENGRID_STACKABLE_BOX_CONFIGURATION.gridPitch).toBe(
      OPENGRID_GRID_CONFIGURATION.fullPitch,
    )
  })

  it('rejects selecting thin-shell and base-plate modes together', () => {
    const validation = validateOpenGridStackableBoxParameters(
      parameters({ thinShellMode: true, basePlateMode: true }),
    )

    expect(validation.valid).toBe(false)
    if (!validation.valid)
      expect(validation.issues[0]?.field).toBe('thinShellMode')
  })

  it('keeps nominal de-duplication separate from the flange envelope', () => {
    const configuration = OPENGRID_STACKABLE_BOX_CONFIGURATION
    expect(configuration.socketDeduplicationDistance).toBe(
      OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION.nominalDiameter,
    )
    expect(
      configuration.baseFlangeDiameter + configuration.baseHoleClearance,
    ).toBeGreaterThan(configuration.socketDeduplicationDistance)
    expect(
      openGridStackableBoxSocketCentersFor(parameters({ x: 0.5, y: 1 })),
    ).toHaveLength(2)
  })

  it('builds full-hole coordinates from the nominal footprint before clearance', () => {
    const pitch = OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch
    const full = parameters({ fullBottomHoleGrid: true })

    expect(pitch).toBe(OPENGRID_GRID_CONFIGURATION.halfPitch)
    expect(nominalOpenGridStackableBoxBottomGridAxisPositionsFor(0.5)).toEqual([
      0,
    ])
    expect(nominalOpenGridStackableBoxBottomGridAxisPositionsFor(1)).toEqual([
      -pitch / 2,
      pitch / 2,
    ])
    expect(nominalOpenGridStackableBoxBottomGridAxisPositionsFor(1.5)).toEqual([
      -pitch,
      0,
      pitch,
    ])
    expect(nominalOpenGridStackableBoxBottomGridCentersFor(full)).toHaveLength(
      4,
    )
    expect(openGridStackableBoxSocketCentersFor(full)).toEqual([
      [-pitch / 2, -pitch / 2],
      [-pitch / 2, pitch / 2],
      [pitch / 2, -pitch / 2],
      [pitch / 2, pitch / 2],
    ])
    expect(openGridStackableBoxOrdinaryBottomHoleCentersFor(full)).toHaveLength(
      0,
    )
  })

  it('keeps the nominal full-hole grid at 14 mm for half-cell axes', () => {
    const full = parameters({ x: 0.5, y: 1.5, fullBottomHoleGrid: true })

    expect(nominalOpenGridStackableBoxBottomGridCentersFor(full)).toEqual([
      [0, -OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch],
      [0, 0],
      [0, OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch],
    ])
    expect(openGridStackableBoxSocketCentersFor(full)).toEqual([
      [0, -OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch],
      [0, OPENGRID_STACKABLE_BOX_CONFIGURATION.bottomHoleGridPitch],
    ])
    expect(openGridStackableBoxOrdinaryBottomHoleCentersFor(full)).toHaveLength(
      1,
    )
  })

  it('keeps stackable-box export names separate from official OpenGrid names', () => {
    const model = {
      modelId: 'opengrid-stackable-box' as const,
      parameters: parameters({
        x: 1.5,
        y: 2,
        height: 30,
        fullBottomHoleGrid: true,
      }),
    }

    expect(modelFileName(model)).toBe('opengrid-stackable-box-1.5x2-h30.step')
    expect(modelStlFileName(model)).toBe('opengrid-stackable-box-1.5x2-h30.stl')

    const basePlateModel = {
      modelId: 'opengrid-stackable-box' as const,
      parameters: parameters({
        x: 1.5,
        y: 2,
        height: 30,
        basePlateMode: true,
      }),
    }
    expect(modelFileName(basePlateModel)).toBe(
      'opengrid-stackable-box-1.5x2-h30-base-plate.step',
    )
    expect(modelStlFileName(basePlateModel)).toBe(
      'opengrid-stackable-box-1.5x2-h30-base-plate.stl',
    )

    const thinShellModel = {
      modelId: 'opengrid-stackable-box' as const,
      parameters: parameters({
        x: 1.5,
        y: 2,
        height: 30,
        thinShellMode: true,
      }),
    }
    expect(modelFileName(thinShellModel)).toBe(
      'opengrid-stackable-box-1.5x2-h30-thin-shell.step',
    )
    expect(modelStlFileName(thinShellModel)).toBe(
      'opengrid-stackable-box-1.5x2-h30-thin-shell.stl',
    )
  })
})

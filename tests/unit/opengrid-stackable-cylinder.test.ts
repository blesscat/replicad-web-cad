import { describe, expect, it } from 'vitest'
import {
  boundsForOpenGridStackableCylinder,
  boundsForModel,
  isOpenGridStackableCylinderParameters,
  openGridStackableCylinderDerivedGeometryFor,
  openGridStackableCylinderFileName,
  openGridStackableCylinderHoleCentersFor,
  openGridStackableCylinderOuterHoleIndexFor,
  openGridStackableCylinderStlFileName,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  validateOpenGridStackableCylinderParameters,
  modelFileName,
  modelStlFileName,
  validateModelParameters,
} from '../../src/cad-contract/units'

function parameters(
  overrides: Partial<
    Parameters<typeof boundsForOpenGridStackableCylinder>[0]
  > = {},
) {
  return {
    diameter: 56,
    height: 30,
    thinBottomMode: false,
    bottomPlateMode: false,
    bottomHolesEnabled: true,
    ...overrides,
  }
}

describe('OpenGrid stackable-cylinder contract', () => {
  it('accepts the exact typed outer-diameter and height snapshot', () => {
    const value = parameters()

    expect(validateOpenGridStackableCylinderParameters(value)).toEqual({
      valid: true,
      value,
    })
    expect(isOpenGridStackableCylinderParameters(value)).toBe(true)
    expect(
      isOpenGridStackableCylinderParameters({
        ...value,
        fullBottomHoleGrid: false,
      }),
    ).toBe(false)
  })

  it('normalizes legacy diameter and height snapshots to the default profile', () => {
    expect(
      validateOpenGridStackableCylinderParameters({ diameter: 56, height: 30 }),
    ).toEqual({
      valid: true,
      value: parameters(),
    })
  })

  it.each([
    [parameters({ diameter: 19 }), 'diameter'],
    [parameters({ diameter: 301 }), 'diameter'],
    [parameters({ diameter: 56.5 }), 'diameter'],
    [parameters({ height: 9 }), 'height'],
    [parameters({ height: 501 }), 'height'],
    [parameters({ height: 30.5 }), 'height'],
  ])(
    'rejects invalid %s values with a field-specific issue',
    (value, field) => {
      const validation = validateOpenGridStackableCylinderParameters(value)

      expect(validation.valid).toBe(false)
      if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
    },
  )

  it.each([
    ['thinBottomMode', 'true'],
    ['bottomPlateMode', 1],
    ['bottomHolesEnabled', 1],
  ] as const)('rejects a non-boolean %s flag', (field, value) => {
    const validation = validateOpenGridStackableCylinderParameters({
      ...parameters(),
      [field]: value,
    })

    expect(validation.valid).toBe(false)
    if (!validation.valid) expect(validation.issues[0]?.field).toBe(field)
  })

  it('rejects selecting thin and bottom-plate modes together', () => {
    const validation = validateOpenGridStackableCylinderParameters(
      parameters({ thinBottomMode: true, bottomPlateMode: true }),
    )

    expect(validation).toEqual({
      valid: false,
      issues: [
        {
          field: 'parameters',
          message: '薄底模式與底板模式不可同時開啟。',
        },
      ],
    })
  })

  it('derives centered bounds and deterministic export names', () => {
    const value = parameters()

    expect(boundsForOpenGridStackableCylinder(value)).toEqual({
      min: [-28, -28, 0],
      max: [28, 28, 30],
    })
    expect(openGridStackableCylinderFileName(value)).toBe(
      'opengrid-stackable-cylinder-d56-h30.step',
    )
    expect(openGridStackableCylinderStlFileName(value)).toBe(
      'opengrid-stackable-cylinder-d56-h30.stl',
    )
    const model = {
      modelId: 'opengrid-stackable-cylinder' as const,
      parameters: value,
    }
    expect(boundsForModel(model)).toEqual(
      boundsForOpenGridStackableCylinder(value),
    )
    expect(modelFileName(model)).toBe(
      'opengrid-stackable-cylinder-d56-h30.step',
    )
    expect(modelStlFileName(model)).toBe(
      'opengrid-stackable-cylinder-d56-h30.stl',
    )
    expect(validateModelParameters(model.modelId, value)).toEqual({
      valid: true,
      value: model,
    })
  })

  it('suffixes thin and no-hole exports without changing model identity', () => {
    const thin = parameters({ thinBottomMode: true })
    const noHoles = parameters({ bottomHolesEnabled: false })
    const thinNoHoles = {
      ...thin,
      bottomHolesEnabled: false,
    }

    expect(openGridStackableCylinderFileName(thin)).toBe(
      'opengrid-stackable-cylinder-d56-h30-thin.step',
    )
    expect(openGridStackableCylinderStlFileName(noHoles)).toBe(
      'opengrid-stackable-cylinder-d56-h30-no-holes.stl',
    )
    expect(openGridStackableCylinderFileName(thinNoHoles)).toBe(
      'opengrid-stackable-cylinder-d56-h30-thin-no-holes.step',
    )
    expect(
      openGridStackableCylinderFileName(parameters({ bottomPlateMode: true })),
    ).toBe('opengrid-stackable-cylinder-d56-h30-bottom-plate.step')
  })

  it('selects the center and four outer cardinal holes at the default diameter', () => {
    expect(openGridStackableCylinderHoleCentersFor(parameters())).toEqual([
      [0, 0],
      [14, 0],
      [-14, 0],
      [0, 14],
      [0, -14],
    ])
  })

  it('keeps only the center hole when the outer layer cannot clear the edge', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(parameters({ diameter: 20 })),
    ).toEqual([[0, 0]])
  })

  it.each([
    [39, 0],
    [40, 4],
    [47, 4],
    [48, 4],
  ])(
    'selects the first flat-floor-safe outer layer at diameter %s',
    (diameter, expectedOuterHoleCount) => {
      expect(
        openGridStackableCylinderHoleCentersFor(parameters({ diameter })),
      ).toHaveLength(expectedOuterHoleCount + 1)
    },
  )

  it('uses the maximum safe 14 mm layer at the largest diameter', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(parameters({ diameter: 300 })),
    ).toEqual([
      [0, 0],
      [140, 0],
      [-140, 0],
      [0, 140],
      [0, -140],
    ])
  })

  it.each([
    [39, 0],
    [40, 0],
    [47, 0],
    [48, 4],
  ])(
    'selects the thin-mode outer layer at diameter %s',
    (diameter, expectedOuterHoleCount) => {
      expect(
        openGridStackableCylinderHoleCentersFor(
          parameters({ diameter, thinBottomMode: true }),
        ),
      ).toHaveLength(expectedOuterHoleCount + 1)
    },
  )

  it('disables the complete bottom-hole group with one flag', () => {
    expect(
      openGridStackableCylinderHoleCentersFor(
        parameters({ bottomHolesEnabled: false }),
      ),
    ).toEqual([])
  })

  it('derives the default floor fillet and mating protrusion from fixed geometry', () => {
    const input = parameters({ diameter: 56 })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)
    const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION

    expect(derived.profile).toBe('default')
    expect(derived.flatFloorZ).toBe(configuration.defaultFloorThickness)
    expect(derived.innerRampEndRadius).toBe(derived.innerRadius)
    expect(derived.innerRampEndZ).toBeCloseTo(
      configuration.defaultFloorThickness +
        configuration.innerFloorFilletRadius,
      8,
    )
    expect(derived.flatFloorRadius).toBeCloseTo(
      derived.innerRadius - configuration.innerFloorFilletRadius,
      8,
    )
    expect(derived.matingProtrusionRadius).toBeCloseTo(
      derived.innerRadius - configuration.stackFitClearance,
      8,
    )
  })

  it('derives the thin floor ramp independently from the default profile', () => {
    const input = parameters({ diameter: 56, thinBottomMode: true })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)
    const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION

    expect(derived.profile).toBe('thin')
    expect(derived.flatFloorZ).toBe(configuration.thinFloorThickness)
    expect(derived.bottomHoleSectionDepth).toBe(
      configuration.thinBottomHoleSectionDepth,
    )
    expect(derived.innerRampEndZ).toBeCloseTo(
      configuration.bottomVerticalHeight +
        configuration.wallThickness * Math.SQRT2,
      8,
    )
    expect(derived.flatFloorRadius).toBeCloseTo(
      derived.innerRampEndRadius - (derived.innerRampEndZ - derived.flatFloorZ),
      8,
    )
  })

  it('derives the bottom-plate mode as a clipped outer profile', () => {
    const input = parameters({ bottomPlateMode: true })
    const derived = openGridStackableCylinderDerivedGeometryFor(input)

    expect(derived.profile).toBe('bottom-plate')
    expect(derived.floorThickness).toBe(3)
    expect(derived.bottomHoleSectionDepth).toBe(2)
    expect(derived.outerTransitionStartZ).toBe(0)
    expect(derived.outerTransitionStartRadius).toBeCloseTo(
      derived.matingProtrusionRadius,
      8,
    )
    expect(derived.lowerFootRadius).toBeCloseTo(
      derived.matingProtrusionRadius,
      8,
    )
    expect(derived.outerTransitionEndZ).toBeCloseTo(
      derived.outerTransitionEndRadius - derived.outerTransitionStartRadius,
      8,
    )
  })

  it('keeps the bottom-plate interior vertical and uses the default hole layout', () => {
    const defaultInput = parameters({ diameter: 47 })
    const bottomPlateInput = parameters({
      diameter: 47,
      bottomPlateMode: true,
    })
    const derived =
      openGridStackableCylinderDerivedGeometryFor(bottomPlateInput)
    const defaultDerived =
      openGridStackableCylinderDerivedGeometryFor(defaultInput)
    const configuration = OPENGRID_STACKABLE_CYLINDER_CONFIGURATION

    expect(derived.floorThickness).toBe(configuration.thinFloorThickness)
    expect(derived.innerFloorFilletRadius).toBe(
      configuration.innerFloorFilletRadius,
    )
    expect(derived.innerRampEndRadius).toBe(derived.innerRadius)
    expect(derived.innerRampEndZ).toBeCloseTo(
      derived.flatFloorZ + configuration.innerFloorFilletRadius,
      8,
    )
    expect(derived.flatFloorRadius).toBeCloseTo(
      derived.innerRadius - configuration.innerFloorFilletRadius,
      8,
    )
    expect(openGridStackableCylinderOuterHoleIndexFor(bottomPlateInput)).toBe(
      openGridStackableCylinderOuterHoleIndexFor(defaultInput),
    )
    expect(
      openGridStackableCylinderHoleCentersFor(bottomPlateInput),
    ).toHaveLength(openGridStackableCylinderHoleCentersFor(defaultInput).length)
    expect(defaultDerived.innerFloorFilletRadius).toBe(
      configuration.innerFloorFilletRadius,
    )
  })

  it('keeps the fixed geometry constants out of the user snapshot', () => {
    expect(OPENGRID_STACKABLE_CYLINDER_CONFIGURATION).toMatchObject({
      wallThickness: 2,
      defaultFloorThickness: 5,
      thinFloorThickness: 3,
      floorThickness: 3,
      bottomHoleDiameter: 5.05,
      innerHoleDiameter: 7.05,
      defaultBottomHoleSectionDepth: 4,
      thinBottomHoleSectionDepth: 2,
      bottomHoleSectionDepth: 2,
      innerHoleSectionDepth: 1,
      innerFloorFilletRadius: 0.6,
      holeGridPitch: 14,
      outerEdgeClearance: 2,
      flatFloorClearance: 2,
      bottomProtrusionInset: 2,
      stackFitClearance: 0.2,
      bottomFootBevel: 0.8,
      bottomVerticalHeight: 2.6,
      topInnerChamfer: 2,
      topInnerChamferLand: 0,
      bottomOuterChamfer: 2,
    })
  })
})

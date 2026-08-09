import { describe, expect, it } from 'vitest'
import {
  boundsForModel,
  boundsForOpenGridSnapRemover,
  isModelParameters,
  isOpenGridSnapRemoverParameters,
  modelFileName,
  modelStlFileName,
  openGridSnapRemoverFileName,
  openGridSnapRemoverStlFileName,
  validateModelParameters,
  validateOpenGridSnapRemoverParameters,
} from '../../src/cad-contract/units'

const EMPTY_PARAMETERS = {}

describe('OpenGrid Snap Remover contract', () => {
  it('accepts only the exact empty plain object', () => {
    expect(validateOpenGridSnapRemoverParameters(EMPTY_PARAMETERS)).toEqual({
      valid: true,
      value: EMPTY_PARAMETERS,
    })
    expect(isOpenGridSnapRemoverParameters(EMPTY_PARAMETERS)).toBe(true)
    expect(
      validateModelParameters('opengrid-snap-remover', EMPTY_PARAMETERS),
    ).toEqual({
      valid: true,
      value: {
        modelId: 'opengrid-snap-remover',
        parameters: EMPTY_PARAMETERS,
      },
    })
    expect(
      isModelParameters({
        modelId: 'opengrid-snap-remover',
        parameters: EMPTY_PARAMETERS,
      }),
    ).toBe(true)

    for (const invalid of [
      null,
      undefined,
      [],
      { offset: 0 },
      new Date(),
      Object.create({ inherited: true }),
    ]) {
      expect(validateOpenGridSnapRemoverParameters(invalid).valid).toBe(false)
    }
  })

  it('keeps the supplied geometry bounds and deterministic export names', () => {
    const expectedBounds = {
      min: [-17.202743248030416, -20.00551582963562, -5.005506125135993],
      max: [21.276570355137718, 20.00551582963562, 5.005506125135993],
    }

    expect(boundsForOpenGridSnapRemover(EMPTY_PARAMETERS)).toEqual(
      expectedBounds,
    )
    expect(
      boundsForModel({
        modelId: 'opengrid-snap-remover',
        parameters: EMPTY_PARAMETERS,
      }),
    ).toEqual(expectedBounds)
    expect(openGridSnapRemoverFileName(EMPTY_PARAMETERS)).toBe(
      'snap remover.step',
    )
    expect(openGridSnapRemoverStlFileName(EMPTY_PARAMETERS)).toBe(
      'snap remover.stl',
    )
    expect(
      modelFileName({
        modelId: 'opengrid-snap-remover',
        parameters: EMPTY_PARAMETERS,
      }),
    ).toBe('snap remover.step')
    expect(
      modelStlFileName({
        modelId: 'opengrid-snap-remover',
        parameters: EMPTY_PARAMETERS,
      }),
    ).toBe('snap remover.stl')
  })
})

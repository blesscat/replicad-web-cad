import { describe, expect, it } from 'vitest'
import {
  boundsForModularGridBase,
  modularGridBaseFileName,
  validateModularGridBaseParameters,
} from '../../src/cad-contract/units'

describe('modular-grid-base contract geometry metadata', () => {
  it('derives centered dimensions from rows and columns', () => {
    const parameters = { rows: 2, columns: 2 }
    const validation = validateModularGridBaseParameters(parameters)

    expect(validation).toEqual({ valid: true, value: parameters })
    expect(boundsForModularGridBase(parameters)).toEqual({
      min: [-20, -20, 0],
      max: [20, 20, 5],
    })
    expect(modularGridBaseFileName(parameters)).toBe(
      'modular-grid-base-2x2.step',
    )
  })

  it('keeps a one-cell plate at the fixed cell size and height', () => {
    expect(boundsForModularGridBase({ rows: 1, columns: 1 })).toEqual({
      min: [-10, -10, 0],
      max: [10, 10, 5],
    })
  })

  it('rejects invalid counts and derived dimensions beyond the workspace limit', () => {
    expect(
      validateModularGridBaseParameters({ rows: 0, columns: 1 }).valid,
    ).toBe(false)
    expect(
      validateModularGridBaseParameters({ rows: 1.5, columns: 1 }).valid,
    ).toBe(false)
    expect(
      validateModularGridBaseParameters({ rows: 1, columns: 26 }).valid,
    ).toBe(false)
    expect(
      validateModularGridBaseParameters({ rows: 1, columns: 21 }).valid,
    ).toBe(false)
    expect(
      validateModularGridBaseParameters({ rows: 1, columns: 1, width: 20 })
        .valid,
    ).toBe(false)
  })

  it('accepts the configured maximum of 20 rows and columns', () => {
    expect(
      validateModularGridBaseParameters({ rows: 20, columns: 20 }),
    ).toEqual({ valid: true, value: { rows: 20, columns: 20 } })
  })
})

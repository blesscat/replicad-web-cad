import { describe, expect, it } from 'vitest'
import { normalizeError } from '../../src/cad-contract/errors'
import {
  OPENGRID_CONFIGURATION,
  OPENGRID_DIVIDER_CONFIGURATION,
  OPENGRID_STACKABLE_CYLINDER_CONFIGURATION,
  type OpenGridParameters,
} from '../../src/cad-contract/units'
import { cadReducer, initialCadState } from '../../src/features/cad/state'

function opengridParameters(
  overrides: Partial<OpenGridParameters> = {},
): OpenGridParameters {
  return {
    ...OPENGRID_CONFIGURATION.defaultParameters,
    chamferCorners: {
      ...OPENGRID_CONFIGURATION.defaultParameters.chamferCorners,
    },
    connectorSides: {
      ...OPENGRID_CONFIGURATION.defaultParameters.connectorSides,
    },
    customScrewPositions: [],
    ...overrides,
  }
}

describe('CAD state machine', () => {
  it('keeps a committed model stale while a newer generation is being built', () => {
    const initial = initialCadState()
    const model = {
      revision: 'rev-1',
      workerEpoch: 'epoch-1',
      generation: 1,
      modelId: 'box' as const,
      parameters: { width: 20, depth: 30, height: 40 },
      mesh: {
        positions: new Float32Array([0, 0, 0]).buffer,
        normals: new Float32Array([0, 0, 1]).buffer,
        indices: new Uint32Array([0, 0, 0]).buffer,
        bounds: {
          min: [0, 0, 0] as [number, number, number],
          max: [0, 0, 0] as [number, number, number],
        },
        triangleCount: 1,
      },
    }
    const ready = cadReducer(initial, { type: 'model-ready', model })
    const stale = cadReducer(ready, {
      type: 'input-valid',
      modelId: 'box',
      input: { width: 21, depth: 30, height: 40 },
      generation: 2,
    })
    expect(ready.status).toBe('ready')
    expect(stale.status).toBe('generating')
    expect(stale.stale).toBe(true)
    expect(stale.committed?.revision).toBe('rev-1')
    expect(stale.exportStatus).toBe('disabled')
  })

  it('enters invalid-input without deleting the previous preview', () => {
    const state = cadReducer(initialCadState(), {
      type: 'input-invalid',
      modelId: 'box',
      input: { width: 20, depth: 30, height: 40 },
      generation: 1,
      error: normalizeError(new Error('bad input'), {
        stage: 'validation',
        code: 'INVALID_INPUT',
        userMessage: '輸入無效',
      }),
    })
    expect(state.status).toBe('invalid-input')
    expect(state.exportStatus).toBe('disabled')
  })

  it('clears old revisions after a worker restart while retaining current input', () => {
    const state = cadReducer(
      cadReducer(initialCadState(), {
        type: 'input-valid',
        modelId: 'box',
        input: { width: 21, depth: 30, height: 40 },
        generation: 2,
      }),
      { type: 'worker-restarted' },
    )
    expect(state.status).toBe('loading-engine')
    expect(state.input).toEqual({ width: 21, depth: 30, height: 40 })
    expect(state.committed).toBeNull()
    expect(state.workerEpoch).toBeNull()
  })

  it('tracks the selected component and its component-specific input', () => {
    const state = cadReducer(initialCadState(), {
      type: 'input-valid',
      modelId: 'modular-grid-base',
      input: { rows: 2, columns: 2 },
      generation: 1,
    })

    expect(state.modelId).toBe('modular-grid-base')
    expect(state.input).toEqual({ rows: 2, columns: 2 })
    expect(state.status).toBe('generating')
  })

  it('initializes the independent HSW component with slider counts', () => {
    const state = initialCadState('hsw-cell')

    expect(state.modelId).toBe('hsw-cell')
    expect(state.input).toEqual({ rows: 1, columns: 1 })
  })

  it('initializes the independent box-normal component with its defaults', () => {
    const state = initialCadState('box-normal')

    expect(state.modelId).toBe('box-normal')
    expect(state.input).toEqual({
      x: 2,
      y: 2,
      height: 10,
      cornerPosts: true,
    })
  })

  it('initializes the independent hexagonal-column defaults', () => {
    const state = initialCadState('hexagonal-column')

    expect(state.modelId).toBe('hexagonal-column')
    expect(state.input).toEqual({
      height: 8,
      count: 1,
      gap: 1,
      orientation: 'lying',
    })
  })

  it('initializes the independent OpenGrid stackable-box defaults', () => {
    const state = initialCadState('opengrid-stackable-box')

    expect(state.modelId).toBe('opengrid-stackable-box')
    expect(state.input).toEqual({
      x: 2,
      y: 2,
      height: 10,
      fullBottomHoleGrid: false,
    })
  })

  it('initializes the independent OpenGrid divider defaults', () => {
    const state = initialCadState('opengrid-divider')

    expect(state.modelId).toBe('opengrid-divider')
    expect(state.input).toEqual(
      OPENGRID_DIVIDER_CONFIGURATION.defaultParameters,
    )
  })

  it('initializes the pillar with a plain five-millimetre default', () => {
    const state = initialCadState('opengrid-pillar')

    expect(state.modelId).toBe('opengrid-pillar')
    expect(state.input).toEqual({ length: 5, baseConnection: false })
  })

  it('initializes the independent OpenGrid stackable-cylinder defaults', () => {
    const state = initialCadState('opengrid-stackable-cylinder')

    expect(state.modelId).toBe('opengrid-stackable-cylinder')
    expect(state.input).toEqual({
      diameter: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultDiameter,
      height: OPENGRID_STACKABLE_CYLINDER_CONFIGURATION.defaultHeight,
      thinBottomMode: false,
      bottomPlateMode: false,
      bottomHolesEnabled: true,
    })
  })

  it('retains OpenGrid committed metadata while marking a newer input stale', () => {
    const parameters = opengridParameters({
      variant: 'Full',
      rows: 1,
      columns: 1,
      chamfers: 'none',
      connectorHoles: 'none',
      screwMode: 'none',
    })
    const ready = cadReducer(initialCadState('opengrid', parameters), {
      type: 'model-ready',
      model: {
        revision: 'opengrid-revision-1',
        workerEpoch: 'epoch-opengrid',
        generation: 1,
        modelId: 'opengrid',
        parameters,
        mesh: {
          positions: new Float32Array([0, 0, 0]).buffer,
          normals: new Float32Array([0, 0, 1]).buffer,
          indices: new Uint32Array([0, 0, 0]).buffer,
          bounds: {
            min: [-14, -14, 0],
            max: [14, 14, 6.8],
          },
          triangleCount: 1,
        },
      },
    })
    const stale = cadReducer(ready, {
      type: 'input-valid',
      modelId: 'opengrid',
      input: { ...parameters, variant: 'Lite' },
      generation: 2,
    })

    expect(ready.committed).toMatchObject({
      modelId: 'opengrid',
      revision: 'opengrid-revision-1',
      parameters,
    })
    expect(stale.committed?.revision).toBe('opengrid-revision-1')
    expect(stale.stale).toBe(true)
    expect(stale.exportStatus).toBe('disabled')
  })
})

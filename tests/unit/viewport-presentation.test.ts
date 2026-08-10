import { describe, expect, it } from 'vitest'
import { viewportPresentationForSearch } from '../../src/features/cad/viewport/presentation'

describe('CAD viewport presentation', () => {
  it('selects the thumbnail presentation only for the capture query', () => {
    expect(viewportPresentationForSearch('?preview=thumbnail')).toBe(
      'thumbnail',
    )
    expect(viewportPresentationForSearch('?preview=workspace')).toBe(
      'workspace',
    )
    expect(viewportPresentationForSearch('')).toBe('workspace')
  })
})

import { describe, expect, it } from 'vitest'
import {
  viewportAppearanceForSearch,
  viewportPresentationForSearch,
} from '../../src/features/cad/viewport/presentation'

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

describe('CAD viewport appearance', () => {
  it('defaults to light and selects dark only for the dark query', () => {
    expect(viewportAppearanceForSearch('?preview=thumbnail')).toBe('light')
    expect(
      viewportAppearanceForSearch('?preview=thumbnail&appearance=dark'),
    ).toBe('dark')
    expect(viewportAppearanceForSearch('?appearance=dark')).toBe('dark')
    expect(
      viewportAppearanceForSearch('?preview=thumbnail&appearance=light'),
    ).toBe('light')
    expect(viewportAppearanceForSearch('')).toBe('light')
  })
})

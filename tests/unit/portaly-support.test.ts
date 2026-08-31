import { describe, expect, it } from 'vitest'
import { supportProvidersFor } from '../../src/features/support/config'
import { getValidSupportUrl } from '../../src/features/support/portaly'

describe('support URL configuration', () => {
  it('accepts and normalizes an absolute HTTPS URL', () => {
    expect(getValidSupportUrl('  https://portaly.example/support  ')).toBe(
      'https://portaly.example/support',
    )
  })

  it('returns no destination for missing or blank configuration', () => {
    expect(getValidSupportUrl(undefined)).toBeUndefined()
    expect(getValidSupportUrl('')).toBeUndefined()
    expect(getValidSupportUrl('   ')).toBeUndefined()
  })

  it('returns no destination for malformed configuration', () => {
    expect(getValidSupportUrl('https://')).toBeUndefined()
    expect(getValidSupportUrl('/support')).toBeUndefined()
  })

  it('returns no destination for non-HTTPS schemes', () => {
    expect(getValidSupportUrl('http://portaly.example/support')).toBe(undefined)
    expect(getValidSupportUrl('javascript:alert(1)')).toBeUndefined()
    expect(getValidSupportUrl('data:text/plain,support')).toBeUndefined()
  })

  it('keeps valid Portaly and Ko-fi destinations in provider order', () => {
    expect(
      supportProvidersFor({
        portaly: '  https://portaly.example/support  ',
        kofi: '  https://ko-fi.example/blesscat  ',
      }),
    ).toEqual([
      { id: 'portaly', url: 'https://portaly.example/support' },
      { id: 'kofi', url: 'https://ko-fi.example/blesscat' },
    ])
  })

  it('filters an invalid provider without removing the valid provider', () => {
    expect(
      supportProvidersFor({
        portaly: 'http://portaly.example/support',
        kofi: 'https://ko-fi.example/blesscat',
      }),
    ).toEqual([{ id: 'kofi', url: 'https://ko-fi.example/blesscat' }])
  })

  it('returns no providers when all provider destinations are invalid', () => {
    expect(
      supportProvidersFor({
        portaly: undefined,
        kofi: 'javascript:alert(1)',
      }),
    ).toEqual([])
  })
})

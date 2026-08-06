import { describe, expect, it } from 'vitest'
import { getValidPortalySupportUrl } from '../../src/features/support/portaly'

describe('Portaly support URL configuration', () => {
  it('accepts and normalizes an absolute HTTPS URL', () => {
    expect(
      getValidPortalySupportUrl('  https://portaly.example/support  '),
    ).toBe('https://portaly.example/support')
  })

  it('returns no destination for missing or blank configuration', () => {
    expect(getValidPortalySupportUrl(undefined)).toBeUndefined()
    expect(getValidPortalySupportUrl('')).toBeUndefined()
    expect(getValidPortalySupportUrl('   ')).toBeUndefined()
  })

  it('returns no destination for malformed configuration', () => {
    expect(getValidPortalySupportUrl('https://')).toBeUndefined()
    expect(getValidPortalySupportUrl('/support')).toBeUndefined()
  })

  it('returns no destination for non-HTTPS schemes', () => {
    expect(getValidPortalySupportUrl('http://portaly.example/support')).toBe(
      undefined,
    )
    expect(getValidPortalySupportUrl('javascript:alert(1)')).toBeUndefined()
    expect(getValidPortalySupportUrl('data:text/plain,support')).toBeUndefined()
  })
})

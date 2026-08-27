import { describe, expect, it } from 'vitest'
import {
  localeForPath,
  localizedCadPathFor,
  localizedPathFor,
  publicPathFor,
  switchLocalePath,
} from '../../src/i18n/routes'

describe('locale route helpers', () => {
  it('parses a supported locale from a path', () => {
    expect(localeForPath('/en/models')).toBe('en')
    expect(localeForPath('/zh-Hant/cad/box')).toBe('zh-Hant')
    expect(localeForPath('/models')).toBeUndefined()
  })

  it('adds a locale without changing the route or query string', () => {
    expect(localizedPathFor('en', '/cad/opengrid', '?system=desk')).toBe(
      '/en/cad/opengrid?system=desk',
    )
    expect(localizedPathFor('zh-Hant', '/', '')).toBe('/zh-Hant/')
  })

  it('switches the locale of the current path and preserves query parameters', () => {
    expect(
      switchLocalePath('/zh-Hant/cad/opengrid', '?system=wall', 'en'),
    ).toBe('/en/cad/opengrid?system=wall')
  })

  it('builds shared public and model paths without translating stable identifiers', () => {
    expect(publicPathFor('en', 'docs')).toBe('/en/docs/')
    expect(publicPathFor('en', 'about')).toBe('/en/about/')
    expect(localizedCadPathFor('zh-Hant', 'opengrid', 'desk')).toBe(
      '/zh-Hant/cad/opengrid?system=desk',
    )
  })
})

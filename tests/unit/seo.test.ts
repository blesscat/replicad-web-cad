import { describe, expect, it } from 'vitest'
import { modelDefinitions } from '../../src/features/cad/model-catalog'
import { absoluteUrlFor, localeAlternatesFor } from '../../src/i18n/seo'
import { sitemapUrlPaths } from '../../src/i18n/sitemap'

describe('localized SEO routes', () => {
  it('creates reciprocal alternates from the same unlocalized path', () => {
    expect(localeAlternatesFor('/en/cad/opengrid', '?system=desk')).toEqual([
      {
        locale: 'zh-Hant',
        path: '/zh-Hant/cad/opengrid?system=desk',
        url: 'http://localhost:3456/zh-Hant/cad/opengrid?system=desk',
      },
      {
        locale: 'en',
        path: '/en/cad/opengrid?system=desk',
        url: 'http://localhost:3456/en/cad/opengrid?system=desk',
      },
    ])
  })

  it('includes every canonical localized public page exactly once', () => {
    const expectedCount = 2 * (4 + modelDefinitions.length)
    const paths = sitemapUrlPaths()

    expect(paths).toHaveLength(expectedCount)
    expect(new Set(paths).size).toBe(expectedCount)
    expect(paths).toContain('/zh-Hant/')
    expect(paths).toContain('/en/docs/')
    expect(paths).toContain('/zh-Hant/about/')
    expect(paths).toContain('/zh-Hant/cad/opengrid')
    expect(paths).not.toContain('/cad/opengrid')
  })

  it('uses the configured-safe origin fallback for absolute metadata URLs', () => {
    expect(absoluteUrlFor('/en/models')).toBe('http://localhost:3456/en/models')
  })
})

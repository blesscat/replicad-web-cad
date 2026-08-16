import { modelDefinitions } from '../features/cad/model-catalog'
import { SUPPORTED_LOCALES } from './index'
import { localizedCadPathFor, publicPathFor } from './routes'
import { absoluteUrlFor } from './seo'

export function sitemapUrlPaths(): string[] {
  return SUPPORTED_LOCALES.flatMap((locale) => [
    publicPathFor(locale, 'home'),
    publicPathFor(locale, 'models'),
    publicPathFor(locale, 'docs'),
    ...modelDefinitions.map((definition) =>
      localizedCadPathFor(locale, definition.id),
    ),
  ])
}

export function sitemapUrls(siteOrigin?: string): string[] {
  return sitemapUrlPaths().map((path) => absoluteUrlFor(path, siteOrigin))
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function sitemapXml(siteOrigin?: string): string {
  const urls = sitemapUrls(siteOrigin)
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

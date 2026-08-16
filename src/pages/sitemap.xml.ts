import { sitemapXml } from '../i18n/sitemap'

export function GET({ url }: { url: URL }): Response {
  const configuredOrigin = import.meta.env.PUBLIC_SITE_URL?.trim()
  if (import.meta.env.PROD && !configuredOrigin) {
    throw new Error('PUBLIC_SITE_URL_REQUIRED_FOR_PRODUCTION_BUILD')
  }
  const siteOrigin = configuredOrigin || url.origin
  return new Response(sitemapXml(siteOrigin), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}

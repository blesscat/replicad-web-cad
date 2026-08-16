import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from './index'
import { localizedPathFor } from './routes'

export type LocaleAlternate = {
  locale: Locale
  path: string
  url: string
}

function configuredSiteOrigin(): string {
  const configured = import.meta.env.PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  if (import.meta.env.PROD) {
    throw new Error('PUBLIC_SITE_URL_REQUIRED_FOR_PRODUCTION_BUILD')
  }
  return 'http://localhost:3456'
}

export function absoluteUrlFor(
  pathname: string,
  siteOrigin = configuredSiteOrigin(),
): string {
  return new URL(pathname, `${siteOrigin.replace(/\/+$/, '')}/`).toString()
}

export function localeAlternatesFor(
  pathname: string,
  search = '',
): LocaleAlternate[] {
  return SUPPORTED_LOCALES.map((locale) => {
    const path = localizedPathFor(locale, pathname, search)
    return { locale, path, url: absoluteUrlFor(path) }
  })
}

export function defaultLocaleAlternateFor(
  pathname: string,
  search = '',
): LocaleAlternate {
  const path = localizedPathFor(DEFAULT_LOCALE, pathname, search)
  return {
    locale: DEFAULT_LOCALE,
    path,
    url: absoluteUrlFor(path),
  }
}

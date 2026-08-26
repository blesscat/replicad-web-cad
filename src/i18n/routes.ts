import { isLocale, type Locale } from './index'
import type { ModelId } from '../cad-contract/units'
import {
  systemContextQuery,
  type OpenGridSystemContext,
} from '../features/cad/system-entry-context'

export type PublicRouteName = 'home' | 'models' | 'docs' | 'about'

const PUBLIC_ROUTE_PATHS: Readonly<Record<PublicRouteName, string>> = {
  home: '/',
  models: '/models',
  docs: '/docs/',
  about: '/about/',
}

function normalizedPath(pathname: string): string {
  if (pathname === '') return '/'
  if (pathname.startsWith('/')) return pathname
  return `/${pathname}`
}

function pathWithoutLocale(pathname: string): string {
  const normalized = normalizedPath(pathname)
  const segments = normalized.split('/').filter(Boolean)
  const firstSegment = segments[0]
  if (!firstSegment || !isLocale(firstSegment)) return normalized

  const remainder = segments.slice(1)
  if (remainder.length === 0) return '/'
  const trailingSlash = normalized.endsWith('/') ? '/' : ''
  return `/${remainder.join('/')}${trailingSlash}`
}

export function unlocalizedPathFor(pathname: string): string {
  return pathWithoutLocale(pathname)
}

export function localeForPath(pathname: string): Locale | undefined {
  const firstSegment = normalizedPath(pathname).split('/').filter(Boolean)[0]
  if (!firstSegment || !isLocale(firstSegment)) return undefined
  return firstSegment
}

export function localizedPathFor(
  locale: Locale,
  pathname: string,
  search = '',
): string {
  const path = pathWithoutLocale(pathname)
  if (path === '/') {
    if (search === '') return `/${locale}/`
    return `/${locale}/${search}`
  }
  return `/${locale}${path}${search}`
}

export function switchLocalePath(
  pathname: string,
  search: string,
  locale: Locale,
): string {
  return localizedPathFor(locale, pathname, search)
}

export function publicPathFor(locale: Locale, route: PublicRouteName): string {
  return localizedPathFor(locale, PUBLIC_ROUTE_PATHS[route])
}

export function localizedCadPathFor(
  locale: Locale,
  modelId: ModelId,
  systemContext?: OpenGridSystemContext,
): string {
  return localizedPathFor(
    locale,
    `/cad/${modelId}`,
    systemContextQuery(systemContext),
  )
}

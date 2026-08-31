import { getValidSupportUrl } from './portaly'

export type SupportProviderId = 'portaly' | 'kofi'

export type SupportProvider = Readonly<{
  id: SupportProviderId
  url: string
}>

export type SupportProviderUrlConfig = Readonly<{
  portaly?: unknown
  kofi?: unknown
}>

export function supportProvidersFor(
  config: SupportProviderUrlConfig,
): SupportProvider[] {
  const providers: SupportProvider[] = []
  const portalyUrl = getValidSupportUrl(config.portaly)
  if (portalyUrl) providers.push({ id: 'portaly', url: portalyUrl })

  const kofiUrl = getValidSupportUrl(config.kofi)
  if (kofiUrl) providers.push({ id: 'kofi', url: kofiUrl })

  return providers
}

export const supportProviders = supportProvidersFor({
  portaly: import.meta.env?.PUBLIC_PORTALY_SUPPORT_URL,
  kofi: import.meta.env?.PUBLIC_KOFI_SUPPORT_URL,
})

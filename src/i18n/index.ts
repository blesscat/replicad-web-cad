import { enMessages, zhHantMessages, type MessageCatalog } from './catalog'

export { enMessages, zhHantMessages }
export type { MessageCatalog }

export const SUPPORTED_LOCALES = ['zh-Hant', 'en'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'zh-Hant'

export type MessageValues = Readonly<Record<string, string | number | boolean>>

const MESSAGE_CATALOGS: Readonly<Record<Locale, MessageCatalog>> = {
  'zh-Hant': zhHantMessages,
  en: enMessages,
}

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  )
}

function messageFor(locale: Locale, key: string): string | undefined {
  return MESSAGE_CATALOGS[locale][key]
}

function valueFor(values: MessageValues | undefined, name: string): string {
  if (!values || !(name in values)) return `⟦${name}⟧`
  return String(values[name])
}

export function translate(
  locale: Locale,
  key: string,
  values?: MessageValues,
): string {
  const message = messageFor(locale, key)
  if (message === undefined) return `⟦${key}⟧`

  return message.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_match, name: string) =>
    valueFor(values, name),
  )
}

export function missingMessageKeys(
  reference: MessageCatalog,
  candidate: MessageCatalog,
): string[] {
  return Object.keys(reference).filter((key) => {
    const value = candidate[key]
    return typeof value !== 'string' || value.length === 0
  })
}

export function missingLocaleMessageKeys(locale: Locale): string[] {
  return missingMessageKeys(zhHantMessages, MESSAGE_CATALOGS[locale])
}

export function messageCatalogFor(locale: Locale): MessageCatalog {
  return MESSAGE_CATALOGS[locale]
}

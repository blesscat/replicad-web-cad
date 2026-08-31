export function getValidSupportUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const trimmedValue = value.trim()
  if (!trimmedValue) return undefined

  try {
    const url = new URL(trimmedValue)
    if (url.protocol !== 'https:') return undefined
    return url.href
  } catch {
    return undefined
  }
}

export const getValidPortalySupportUrl = getValidSupportUrl

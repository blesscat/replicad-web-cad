import { getValidPortalySupportUrl } from './portaly'

export const portalySupportUrl = getValidPortalySupportUrl(
  import.meta.env.PUBLIC_PORTALY_SUPPORT_URL,
)

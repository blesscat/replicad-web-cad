/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CAD_WASM_URL?: string
  readonly PUBLIC_KOFI_SUPPORT_URL?: string
  readonly PUBLIC_PORTALY_SUPPORT_URL?: string
  readonly PUBLIC_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

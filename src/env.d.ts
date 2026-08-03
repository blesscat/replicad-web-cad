/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CAD_WASM_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

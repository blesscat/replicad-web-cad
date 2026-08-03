import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  integrations: [react()],
  server: {
    host: true,
    port: 3456,
  },
  preview: {
    host: true,
    port: 3456,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['local.blesscat.dev'],
      ws: {
        host: 'local.blesscat.dev',
        protocol: 'wss',
        clientPort: 443,
      },
    },
    preview: {
      allowedHosts: ['local.blesscat.dev'],
    },
  },
})

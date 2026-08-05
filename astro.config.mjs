import { defineConfig } from 'astro/config'
import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  integrations: [svelte()],
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
    optimizeDeps: {
      include: ['replicad', 'replicad-opencascadejs', 'three'],
    },
    server: {
      allowedHosts: ['localhost', '127.0.0.1', 'local.blesscat.dev'],
    },
    preview: {
      allowedHosts: ['localhost', '127.0.0.1', 'local.blesscat.dev'],
    },
  },
})

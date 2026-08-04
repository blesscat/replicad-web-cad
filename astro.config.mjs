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
    optimizeDeps: {
      include: ['@react-three/fiber', '@react-three/drei', 'three'],
    },
    server: {
      allowedHosts: ['localhost', '127.0.0.1', 'local.blesscat.dev'],
    },
    preview: {
      allowedHosts: ['localhost', '127.0.0.1', 'local.blesscat.dev'],
    },
  },
})

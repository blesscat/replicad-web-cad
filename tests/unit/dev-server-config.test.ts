import { describe, expect, it } from 'vitest'
import astroConfig from '../../astro.config.mjs'

describe('local Astro dev server', () => {
  it('uses Svelte as the interactive Astro renderer', () => {
    const isNamedIntegration = (value: unknown): value is { name: string } => {
      if (typeof value !== 'object' || value === null) return false
      return 'name' in value && typeof value.name === 'string'
    }
    const integrationNames = (astroConfig.integrations ?? [])
      .flatMap((integration) => {
        if (Array.isArray(integration)) return integration
        return [integration]
      })
      .map((integration) => {
        if (!isNamedIntegration(integration)) return ''
        return integration.name
      })

    expect(integrationNames).toContain('@astrojs/svelte')
    expect(integrationNames).not.toContain('@astrojs/react')
  })

  it('accepts both localhost and the local development hostname', () => {
    expect(astroConfig.vite?.server?.allowedHosts).toEqual(
      expect.arrayContaining(['localhost', 'local.blesscat.dev']),
    )
    expect(astroConfig.vite?.preview?.allowedHosts).toEqual(
      expect.arrayContaining(['localhost', 'local.blesscat.dev']),
    )
  })

  it('lets Vite derive the HMR endpoint from the page origin', () => {
    expect(astroConfig.vite?.server?.ws).toBeUndefined()
  })

  it('pre-bundles Three.js before Svelte viewport hydration', () => {
    expect(astroConfig.vite?.optimizeDeps?.include).toEqual(
      expect.arrayContaining(['three']),
    )
    expect(astroConfig.vite?.optimizeDeps?.include).not.toEqual(
      expect.arrayContaining(['@react-three/fiber', '@react-three/drei']),
    )
  })
})

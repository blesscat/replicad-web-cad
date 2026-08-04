import { describe, expect, it } from 'vitest'
import astroConfig from '../../astro.config.mjs'

describe('local Astro dev server', () => {
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

  it('pre-bundles the viewport dependencies before hydration', () => {
    expect(astroConfig.vite?.optimizeDeps?.include).toEqual(
      expect.arrayContaining([
        '@react-three/fiber',
        '@react-three/drei',
        'three',
      ]),
    )
  })
})

import { expect, test } from '@playwright/test'
import {
  CANONICAL_CAD_LIGHTING_VIEWS,
  expectCadLightingLuminance,
  isAstroDevToolbarError,
  orbitCadViewport,
  setCadLightingViewport,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

const REPRESENTATIVE_MODEL_ROUTES = [
  '/cad/box',
  '/cad/box-normal',
  '/cad/hsw-cell',
  '/cad/opengrid',
] as const

test('CAD viewport stays rendered through representative orbit views', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await setCadLightingViewport(page)

  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => {
    if (!isAstroDevToolbarError(error.message))
      runtimeErrors.push(error.message)
  })
  page.on('console', (message) => {
    if (message.type() === 'error' && !isAstroDevToolbarError(message.text())) {
      runtimeErrors.push(message.text())
    }
  })

  for (const route of REPRESENTATIVE_MODEL_ROUTES) {
    for (const view of CANONICAL_CAD_LIGHTING_VIEWS) {
      await page.goto(route)
      await waitForCadReady(page)
      await orbitCadViewport(page, view)

      const canvas = page.getByTestId('cad-viewport').locator('canvas')
      await expect(canvas).toHaveCount(1)
      await expect(canvas).toBeVisible()
      await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()
    }
  }

  expect(runtimeErrors).toEqual([])
})

test('CAD lighting keeps representative geometry views visually stable', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await setCadLightingViewport(page)

  for (const route of REPRESENTATIVE_MODEL_ROUTES) {
    const modelName = route.replace('/cad/', '')
    for (const view of CANONICAL_CAD_LIGHTING_VIEWS) {
      await page.goto(route)
      await waitForCadReady(page)
      await orbitCadViewport(page, view)

      const canvas = page.getByTestId('cad-viewport').locator('canvas')
      await expect(canvas).toHaveScreenshot(`${modelName}-${view}.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
      })
      if (route === '/cad/opengrid') {
        await expectCadLightingLuminance(page, canvas)
      }
    }
  }
})

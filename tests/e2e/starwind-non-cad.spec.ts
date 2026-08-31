import { expect, test } from '@playwright/test'

test('localized public Astro pages expose shared surfaces without CAD runtime', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })

  const pages = ['/en/', '/zh-Hant/models', '/en/docs/', '/zh-Hant/about/']
  const workerUrls: string[] = []
  const wasmRequests: string[] = []

  page.on('worker', (worker) => workerUrls.push(worker.url()))
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname.endsWith('.wasm')) wasmRequests.push(pathname)
  })

  for (const path of pages) {
    await page.goto(path)

    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('[data-sw-card]').first()).toBeVisible()
    await expect(page.locator('[data-sw-badge]').first()).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
  }

  expect(workerUrls).toEqual([])
  expect(wasmRequests).toEqual([])
})

import { expect, test, type Download } from '@playwright/test'

function skipHeadlessFirefoxWithoutWebGL(browserName: string): void {
  test.skip(
    browserName === 'firefox' && process.env.PW_HEADFUL !== '1',
    'The headless Firefox image used in this environment has no WebGL context; run with Xvfb and PW_HEADFUL=1 for the full Firefox gate.',
  )
}

const astroOptimizeDepError =
  'Failed to load resource: the server responded with a status of 504 (Outdated Optimize Dep)'
const astroDevToolbarEntrypoint =
  '/@id/astro/runtime/client/dev-toolbar/entrypoint.js'

function isAstroDevToolbarError(message: string): boolean {
  return (
    message === astroOptimizeDepError ||
    message.includes(astroDevToolbarEntrypoint)
  )
}

async function readBinaryStlByteLength(download: Download): Promise<number> {
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  for await (const chunk of stream ?? []) {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
    chunks.push(bytes)
    byteLength += bytes.byteLength
  }
  const payload = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    payload.set(chunk, offset)
    offset += chunk.byteLength
  }
  const triangleCount = new DataView(payload.buffer).getUint32(80, true)
  expect(triangleCount).toBeGreaterThan(0)
  expect(byteLength).toBe(84 + triangleCount * 50)
  return byteLength
}

test('home and docs are static Astro pages', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '用瀏覽器建立、調整並匯出 CAD 模型' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: '使用方塊' })).toHaveAttribute(
    'href',
    '/cad/box',
  )
  await expect(
    page.getByRole('link', { name: '使用模組化網格底板' }),
  ).toHaveAttribute('href', '/cad/modular-grid-base')
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  await page.goto('/docs/')
  await expect(
    page.getByRole('heading', { name: 'Prototype 文件' }),
  ).toBeVisible()
  await expect(page.getByText(/方塊與模組化網格底板/)).toBeVisible()
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

test('local development serves same-origin Vite HMR client', async ({
  page,
}) => {
  await page.goto('/')

  const response = await page.request.get('/@vite/client')
  expect(response.ok()).toBeTruthy()
  expect(await response.text()).not.toContain('local.blesscat.dev')
})

test('CAD root returns to the homepage model chooser', async ({ page }) => {
  await page.goto('/cad/')
  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('heading', {
      name: '用瀏覽器建立、調整並匯出 CAD 模型',
    }),
  ).toBeVisible()
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

test('unknown CAD model routes do not initialize the workspace', async ({
  page,
}) => {
  const response = await page.goto('/cad/unknown-model')
  expect(response?.status()).toBe(404)
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

test('box CAD route exposes fallback and locked parameter controls', async ({
  page,
}) => {
  await page.goto('/cad/box')
  await expect(
    page.getByRole('heading', { name: 'CAD workspace', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: /寬度/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /深度/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /高度/ })).toBeVisible()
  await expect(
    page.getByRole('combobox', { name: 'CAD component' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: '返回首頁選擇其他模型' }),
  ).toHaveAttribute('href', '/')
  await expect(page.locator('#cad-fallback')).toBeHidden()
})

test('CAD route shows the current loading stage', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.context().route('**/replicad_single.wasm', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })

  await page.goto('/cad/box')

  const progress = page.getByRole('progressbar', {
    name: '載入 CAD engine',
  })
  const viewport = page.getByTestId('cad-viewport')
  const fallback = page.getByText('尚未有可預覽的模型。')
  await Promise.all([
    expect(progress).toBeVisible(),
    expect(progress).toHaveAttribute('aria-valuenow', '1'),
    expect(page.getByTestId('cad-progress')).toContainText('載入 CAD engine'),
    expect(fallback).toBeVisible(),
  ])

  const viewportRect = () =>
    viewport.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { height: rect.height, top: rect.top }
    })
  const loadingViewport = await viewportRect()
  const viewportContentHeight = await viewport.evaluate(
    (element) => element.clientHeight,
  )
  const fallbackHeight = await fallback.evaluate(
    (element) => element.getBoundingClientRect().height,
  )
  expect(fallbackHeight).toBe(viewportContentHeight)

  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )
  const readyViewport = await viewportRect()

  expect(readyViewport).toEqual(loadingViewport)
})

test('CAD route keeps a readable static fallback when JavaScript is unavailable', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/cad/box')
  await expect(
    page.getByRole('heading', { name: 'CAD workspace', exact: true }),
  ).toBeVisible()
  await expect(page.locator('#cad-fallback')).toBeVisible()
  await expect(page.getByText(/需要 JavaScript、WebAssembly/)).toBeVisible()
  await expect(page.getByLabel(/^(寬度 X|深度 Y|高度 Z) \d+ mm$/)).toHaveCount(
    0,
  )
  await context.close()
})

test('CAD workspace preserves the responsive column boundary', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

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

  await page.context().route('**/replicad_single.wasm', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    await route.continue()
  })

  await page.setViewportSize({ width: 760, height: 720 })
  await page.goto('/cad/box')
  const workspace = page.getByTestId('cad-workspace')
  const viewport = page.getByTestId('cad-viewport')
  await expect(workspace).toBeVisible()
  await expect(
    page.getByRole('progressbar', { name: '載入 CAD engine' }),
  ).toBeVisible()

  const columnCount = () =>
    workspace.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
    )

  await expect.poll(columnCount).toBe(1)
  const loadingViewportHeight = await viewport.evaluate(
    (element) => element.getBoundingClientRect().height,
  )
  const hasHorizontalOverflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    )
  expect(await hasHorizontalOverflow()).toBeTruthy()

  await page.setViewportSize({ width: 761, height: 720 })
  await expect.poll(columnCount).toBe(2)
  await expect(page.getByTestId('cad-progress')).toBeVisible()
  await expect.poll(hasHorizontalOverflow).toBeTruthy()
  await expect
    .poll(() =>
      viewport.evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBe(loadingViewportHeight)
  expect(runtimeErrors).toEqual([])
})

test('CAD Worker builds the default box in a WebGL-enabled browser', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()
  await expect(page.getByTestId('cad-viewport').locator('canvas')).toHaveCount(
    1,
  )
  const viewport = page.getByTestId('cad-viewport')
  const viewportContentHeight = await viewport.evaluate(
    (element) => element.clientHeight,
  )
  const canvasHeight = await page
    .getByTestId('cad-viewport')
    .locator('canvas')
    .evaluate((element) => element.getBoundingClientRect().height)
  expect(canvasHeight).toBe(viewportContentHeight)
  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 30 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 40 mm')).toBeVisible()
})

test('CAD Worker exports one non-empty STEP download for the committed revision', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('box-20x30x40.step')
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  let byteLength = 0
  for await (const chunk of stream ?? []) byteLength += chunk.length
  expect(byteLength).toBeGreaterThan(0)
})

test('CAD Worker exports one non-empty STL download for the committed revision', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('box-20x30x40.stl')
  expect(await readBinaryStlByteLength(download)).toBeGreaterThan(84)
})

test('CAD workspace switches to the modular grid component and exports a 2x2 base', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/')
  await page.getByRole('link', { name: '使用模組化網格底板' }).click()
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )

  await expect(page).toHaveURL('/cad/modular-grid-base')
  await expect(
    page.getByRole('combobox', { name: 'CAD component' }),
  ).toHaveCount(0)
  const rows = page.getByRole('slider', { name: '行數（Y）' })
  const columns = page.getByRole('slider', { name: '列數（X）' })
  await expect(rows).toHaveAttribute('min', '1')
  await expect(rows).toHaveAttribute('max', '20')
  await expect(columns).toHaveAttribute('min', '1')
  await expect(columns).toHaveAttribute('max', '20')
  await expect(rows).toHaveValue('1')
  await expect(columns).toHaveValue('1')
  await rows.press('ArrowRight')
  await columns.press('ArrowRight')
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('2')

  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )
  await expect(page.getByLabel('寬度 X 40 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 40 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 5 mm')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('modular-grid-base-2x2.step')
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  let byteLength = 0
  for await (const chunk of stream ?? []) byteLength += chunk.length
  expect(byteLength).toBeGreaterThan(0)

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe('modular-grid-base-2x2.stl')
  expect(await readBinaryStlByteLength(stlDownload)).toBeGreaterThan(84)

  await page.getByRole('link', { name: '返回首頁選擇其他模型' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: '使用方塊' })).toBeVisible()
})

test('modular grid reports cell progress for a larger generation', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/')
  await page.getByRole('link', { name: '使用模組化網格底板' }).click()
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )

  const rows = page.getByRole('slider', { name: '行數（Y）' })
  const columns = page.getByRole('slider', { name: '列數（X）' })
  const viewport = page.getByTestId('cad-viewport')
  const viewportRect = () =>
    viewport.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { height: rect.height, top: rect.top }
    })
  const readyViewport = await viewportRect()
  for (let value = 1; value < 10; value += 1) {
    await rows.press('ArrowRight')
    await columns.press('ArrowRight')
  }

  const progress = page.getByRole('progressbar', { name: '建立 B-Rep' })
  await expect(progress).toBeVisible({ timeout: 30_000 })
  await expect(progress).toHaveAttribute('aria-valuemax', '100')
  await expect(progress).toHaveAttribute('aria-valuetext', /格/)
  expect(await viewportRect()).toEqual(readyViewport)
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 60_000 },
  )
})

test('parameter updates use the latest valid generation and preserve stale preview on invalid input', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )

  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )
  await expect(width).toHaveValue('25')
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()

  await width.fill('25.5')
  await expect(width).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('status')).toContainText('必須是有限的整數。')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
  await expect(page.getByText('目前預覽是上一個成功 revision。')).toBeVisible()
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
  await expect(page.getByLabel('寬度 X 25.5 mm')).toHaveCount(0)

  await width.fill('26')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )
  await expect(page.getByLabel('寬度 X 26 mm')).toBeVisible()
})

test('dimension annotations remain attached through viewport resize and orbit interaction', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP 或 STL。',
    { timeout: 30_000 },
  )

  const canvas = page.getByTestId('cad-viewport').locator('canvas')
  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await page.setViewportSize({ width: 900, height: 720 })
  await expect(canvas).toBeVisible()

  const bounds = await canvas.boundingBox()
  expect(bounds).not.toBeNull()
  if (bounds) {
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 80,
      bounds.y + bounds.height / 2 + 25,
    )
    await page.mouse.up()
  }

  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 30 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 40 mm')).toBeVisible()
})

import { expect, test } from '@playwright/test'

function skipHeadlessFirefoxWithoutWebGL(browserName: string): void {
  test.skip(
    browserName === 'firefox' && process.env.PW_HEADFUL !== '1',
    'The headless Firefox image used in this environment has no WebGL context; run with Xvfb and PW_HEADFUL=1 for the full Firefox gate.',
  )
}

test('home and docs are static Astro pages', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '用瀏覽器建立並匯出方塊模型' }),
  ).toBeVisible()
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  await page.goto('/docs/')
  await expect(
    page.getByRole('heading', { name: 'Prototype 文件' }),
  ).toBeVisible()
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

test('CAD route exposes fallback and parameter controls', async ({ page }) => {
  await page.goto('/cad/')
  await expect(
    page.getByRole('heading', { name: 'CAD workspace', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: /寬度/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /深度/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /高度/ })).toBeVisible()
  await expect(page.locator('#cad-fallback')).toBeHidden()
})

test('CAD route keeps a readable static fallback when JavaScript is unavailable', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/cad/')
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
}) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })

  await page.setViewportSize({ width: 760, height: 720 })
  await page.goto('/cad/')
  const workspace = page.getByTestId('cad-workspace')
  await expect(workspace).toBeVisible()

  const columnCount = () =>
    workspace.evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
    )

  await expect.poll(columnCount).toBe(1)

  await page.setViewportSize({ width: 761, height: 720 })
  await expect.poll(columnCount).toBe(2)
  expect(runtimeErrors).toEqual([])
})

test('CAD Worker builds the default box in a WebGL-enabled browser', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP。',
    { timeout: 30_000 },
  )
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
  await expect(page.getByTestId('cad-viewport').locator('canvas')).toHaveCount(
    1,
  )
  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 30 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 40 mm')).toBeVisible()
})

test('CAD Worker exports one non-empty STEP download for the committed revision', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP。',
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

test('CAD workspace switches to the modular grid component and exports a 2x2 base', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP。',
    { timeout: 30_000 },
  )

  await page
    .getByRole('combobox', { name: 'CAD component' })
    .selectOption('modular-grid-base')
  const rows = page.getByRole('slider', { name: '行數（Y）' })
  const columns = page.getByRole('slider', { name: '列數（X）' })
  await expect(rows).toHaveValue('1')
  await expect(columns).toHaveValue('1')
  await rows.press('ArrowRight')
  await columns.press('ArrowRight')
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('2')

  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP。',
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
})

test('parameter updates use the latest valid generation and preserve stale preview on invalid input', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP。',
    { timeout: 30_000 },
  )

  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP。',
    { timeout: 30_000 },
  )
  await expect(width).toHaveValue('25')
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()

  await width.fill('25.5')
  await expect(width).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('status')).toContainText('必須是有限的整數。')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByText('目前預覽是上一個成功 revision。')).toBeVisible()
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
  await expect(page.getByLabel('寬度 X 25.5 mm')).toHaveCount(0)

  await width.fill('26')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP。',
    { timeout: 30_000 },
  )
  await expect(page.getByLabel('寬度 X 26 mm')).toBeVisible()
})

test('dimension annotations remain attached through viewport resize and orbit interaction', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/')
  await expect(page.getByRole('status')).toContainText(
    '模型已就緒，可以下載 STEP。',
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

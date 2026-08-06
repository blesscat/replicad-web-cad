import { expect, test, type Download, type Page } from '@playwright/test'
import { getValidPortalySupportUrl } from '../../src/features/support/portaly'

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

const configuredPortalySupportUrl = getValidPortalySupportUrl(
  process.env.PUBLIC_PORTALY_SUPPORT_URL,
)

function supportLink(page: Page) {
  return page.getByRole('link', {
    name: '支持這個專案',
    exact: true,
  })
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

async function waitForCadReady(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 30_000,
  })
}

type DimensionAnnotationBox = {
  label: string
  x: number
  y: number
  width: number
  height: number
}

async function readDimensionAnnotationBoxes(
  page: Page,
): Promise<DimensionAnnotationBox[]> {
  return page
    .getByTestId('cad-viewport')
    .locator('[aria-label]')
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            label: element.getAttribute('aria-label') ?? '',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }
        })
        .filter((annotation) => /^(寬度|深度|高度)/.test(annotation.label))
        .sort((left, right) => left.label.localeCompare(right.label)),
    )
}

function expectDimensionAnnotationBoxesToStayStable(
  expected: readonly DimensionAnnotationBox[],
  actual: readonly DimensionAnnotationBox[],
  tolerance = 1,
): void {
  expect(actual).toHaveLength(expected.length)

  for (const [index, expectedBox] of expected.entries()) {
    const actualBox = actual[index]
    if (!actualBox) throw new Error(`Missing annotation at index ${index}`)

    expect(actualBox.label).toBe(expectedBox.label)
    expect(Math.abs(actualBox.x - expectedBox.x)).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(actualBox.y - expectedBox.y)).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(actualBox.width - expectedBox.width)).toBeLessThanOrEqual(
      tolerance,
    )
    expect(Math.abs(actualBox.height - expectedBox.height)).toBeLessThanOrEqual(
      tolerance,
    )
  }
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
  await expect(
    page.getByRole('link', { name: '使用HSW 六角蜂巢' }),
  ).toHaveAttribute('href', '/cad/hsw-cell')
  await expect(
    page.getByRole('link', { name: '使用可調六角柱' }),
  ).toHaveAttribute('href', '/cad/hexagonal-column')
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  await page.goto('/docs/')
  await expect(
    page.getByRole('heading', { name: 'Prototype 文件' }),
  ).toBeVisible()
  await expect(
    page.getByText(/方塊、模組化網格底板、獨立的 HSW 六角蜂巢，以及可調/),
  ).toBeVisible()
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

test('shared navigation exposes the configured support link contract', async ({
  page,
}) => {
  test.skip(
    !configuredPortalySupportUrl,
    'Set PUBLIC_PORTALY_SUPPORT_URL to run the configured-support route checks.',
  )

  for (const path of ['/', '/docs/', '/cad/box']) {
    await page.goto(path)
    const link = supportLink(page)

    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute(
      'href',
      configuredPortalySupportUrl ?? '',
    )
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }

  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/')
  await expect(supportLink(page)).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBeTruthy()

  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('Tab')
  }
  await expect(supportLink(page)).toBeFocused()
  const focusStyle = await supportLink(page).evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    }
  })
  expect(focusStyle.outlineStyle).not.toBe('none')
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0)

  await page.goto('/cad/box')
  const currentCadUrl = page.url()
  const supportOrigin = new URL(configuredPortalySupportUrl ?? '').origin
  await page.context().route(`${supportOrigin}/**`, async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Support fixture</title>',
    })
  })
  const popupPromise = page.waitForEvent('popup')
  await supportLink(page).click()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')
  await expect(popup).toHaveURL(configuredPortalySupportUrl ?? '')
  await expect(page).toHaveURL(currentCadUrl)
  await popup.close()
})

test('missing support configuration leaves primary routes usable', async ({
  page,
}) => {
  test.skip(
    Boolean(configuredPortalySupportUrl),
    'Run without PUBLIC_PORTALY_SUPPORT_URL to verify the missing-configuration fallback.',
  )

  for (const path of ['/', '/docs/', '/cad/box']) {
    await page.goto(path)
    await expect(supportLink(page)).toHaveCount(0)
  }
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

test('grid dimension calculators apply counts and preserve manual controls', async ({
  page,
}) => {
  const fixtures = [
    {
      path: '/cad/modular-grid-base',
      targetX: '59',
      targetY: '41',
      expectedColumns: '2',
      expectedRows: '2',
      expectedDimensions: 'X 40 mm、Y 40 mm',
      invalidX: '19',
      invalidMessage: '20 mm',
    },
    {
      path: '/cad/hsw-cell',
      targetX: '47.7',
      targetY: '59.1',
      expectedColumns: '2',
      expectedRows: '2',
      expectedDimensions: 'X 47.69 mm、Y 59 mm',
      invalidX: '20',
      invalidMessage: 'HSW',
    },
  ]

  for (const fixture of fixtures) {
    await page.goto(fixture.path)
    const calculator = page.getByTestId('grid-dimension-calculator')
    const targetX = calculator.getByRole('textbox', {
      name: '目標 X 尺寸（mm）',
    })
    const targetY = calculator.getByRole('textbox', {
      name: '目標 Y 尺寸（mm）',
    })
    const calculateButton = calculator.getByRole('button', {
      name: '計算格數',
    })

    await expect(targetX).toBeVisible()
    await expect(targetY).toBeVisible()
    await targetX.fill(fixture.targetX)
    await targetY.fill(fixture.targetY)
    await calculateButton.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('slider', { name: '列數（X）' })).toHaveValue(
      fixture.expectedColumns,
    )
    await expect(page.getByRole('slider', { name: '行數（Y）' })).toHaveValue(
      fixture.expectedRows,
    )
    await expect(page.getByTestId('grid-dimension-result')).toContainText(
      fixture.expectedDimensions,
    )

    await targetX.fill(fixture.invalidX)
    await calculateButton.click()
    await expect(targetX).toHaveAttribute('aria-invalid', 'true')
    await expect(targetX).toHaveAttribute(
      'aria-describedby',
      'grid-dimension-x-error',
    )
    await expect(calculator.getByRole('alert')).toContainText(
      fixture.invalidMessage,
    )
    await expect(page.getByRole('slider', { name: '列數（X）' })).toHaveValue(
      fixture.expectedColumns,
    )
    await expect(page.getByRole('slider', { name: '行數（Y）' })).toHaveValue(
      fixture.expectedRows,
    )
  }
})

test('grid dimension calculators remain usable on narrow viewports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })

  for (const path of ['/cad/modular-grid-base', '/cad/hsw-cell']) {
    await page.goto(path)
    const calculator = page.getByTestId('grid-dimension-calculator')
    await expect(calculator).toBeVisible()
    await expect(
      calculator.getByRole('textbox', { name: '目標 X 尺寸（mm）' }),
    ).toBeVisible()
    await expect(
      calculator.getByRole('textbox', { name: '目標 Y 尺寸（mm）' }),
    ).toBeVisible()
    await expect(
      calculator.getByRole('button', { name: '計算格數' }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBeTruthy()
  }
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

  await waitForCadReady(page)
  const readyViewport = await viewportRect()

  expect(readyViewport).toEqual(loadingViewport)
})

test('CAD progress floats above the workspace while loading', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.context().route('**/replicad_single.wasm', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })

  await page.goto('/cad/box')

  const progress = page.getByTestId('cad-progress')
  await expect(progress).toBeVisible()

  const layout = await progress.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      position: getComputedStyle(element).position,
      right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.bottom,
    }
  })

  expect(layout.position).toBe('fixed')
  expect(layout.right).toBeGreaterThanOrEqual(0)
  expect(layout.bottom).toBeGreaterThanOrEqual(0)
})

test('CAD workspace does not show a redundant status panel after loading', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')

  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 30_000,
  })
  await expect(page.getByRole('status')).toHaveCount(0)
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
  await waitForCadReady(page)
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

test('CAD workspaces restore valid parameters independently per component', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/cad/box')
  await waitForCadReady(page)
  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()

  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)
  const rows = page.getByRole('slider', { name: '行數（Y）' })
  const columns = page.getByRole('slider', { name: '列數（X）' })
  await expect(rows).toHaveValue('1')
  await expect(columns).toHaveValue('1')
  await rows.press('ArrowRight')
  await columns.press('ArrowRight')
  await columns.press('ArrowRight')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('3')

  await page.goto('/cad/hsw-cell')
  await waitForCadReady(page)
  const hswRows = page.getByRole('slider', { name: '行數（Y）' })
  const hswColumns = page.getByRole('slider', { name: '列數（X）' })
  await expect(hswRows).toHaveValue('1')
  await expect(hswColumns).toHaveValue('1')
  await hswRows.press('ArrowRight')
  await hswRows.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(hswRows).toHaveValue('3')
  await expect(hswColumns).toHaveValue('4')

  await page.goto('/cad/box')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
})

test('CAD Worker exports one non-empty STEP download for the committed revision', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)

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
  await waitForCadReady(page)

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
  await waitForCadReady(page)

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

  await waitForCadReady(page)
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

test('CAD workspace exposes the independent HSW honeycomb component and exports 2x2', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/')
  await page.getByRole('link', { name: '使用HSW 六角蜂巢' }).click()
  await waitForCadReady(page)

  await expect(page).toHaveURL('/cad/hsw-cell')
  await expect(page.getByText(/平頂六角單元/)).toBeVisible()
  await expect(page.getByText(/不套用額外圓角/)).toBeVisible()
  const rows = page.getByRole('slider', { name: '行數（Y）' })
  const columns = page.getByRole('slider', { name: '列數（X）' })
  await expect(rows).toHaveAttribute('min', '1')
  await expect(rows).toHaveAttribute('max', '20')
  await expect(rows).toHaveAttribute('step', '1')
  await expect(columns).toHaveAttribute('min', '1')
  await expect(columns).toHaveAttribute('max', '20')
  await expect(columns).toHaveAttribute('step', '1')
  await expect(rows).toHaveValue('1')
  await expect(columns).toHaveValue('1')

  await rows.press('ArrowRight')
  await columns.press('ArrowRight')
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('2')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 47.69 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 59 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 8 mm')).toBeVisible()

  await rows.press('ArrowRight')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
  await rows.press('ArrowLeft')
  await waitForCadReady(page)

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe('hsw-cell-2x2.step')
  const stepStream = await stepDownload.createReadStream()
  expect(stepStream).not.toBeNull()
  let stepByteLength = 0
  for await (const chunk of stepStream ?? []) stepByteLength += chunk.length
  expect(stepByteLength).toBeGreaterThan(0)

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe('hsw-cell-2x2.stl')
  expect(await readBinaryStlByteLength(stlDownload)).toBeGreaterThan(84)
})

test('CAD workspace exposes independent hexagonal-column parameters and exports 3 columns', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/')
  await page.getByRole('link', { name: '使用可調六角柱' }).click()
  await waitForCadReady(page)

  await expect(page).toHaveURL('/cad/hexagonal-column')
  await expect(page.getByText(/兩端固定 0.2 mm/)).toBeVisible()
  const height = page.getByRole('textbox', { name: '整體長度（X/Z）' })
  const heightSlider = page.getByRole('slider', { name: '整體長度（X/Z）' })
  const count = page.getByRole('slider', { name: '支數（Y）' })
  const gap = page.getByRole('textbox', { name: '柱間隙（Y）' })
  const gapSlider = page.getByRole('slider', { name: '柱間隙（Y）' })
  await expect(height).toHaveValue('8')
  await expect(height).toHaveAttribute('min', '1')
  await expect(height).toHaveAttribute('max', '999')
  await expect(heightSlider).toHaveAttribute('min', '1')
  await expect(heightSlider).toHaveAttribute('max', '200')
  await expect(heightSlider).toHaveValue('8')
  await expect(count).toHaveAttribute('min', '1')
  await expect(count).toHaveAttribute('max', '20')
  await expect(count).toHaveAttribute('step', '1')
  await expect(count).toHaveValue('1')
  await expect(gap).toHaveValue('1')
  await expect(gap).toHaveAttribute('min', '1')
  await expect(gap).toHaveAttribute('max', '99')
  await expect(gapSlider).toHaveAttribute('min', '1')
  await expect(gapSlider).toHaveAttribute('max', '10')
  await expect(gapSlider).toHaveValue('1')
  const orientation = page.getByRole('combobox', { name: '擺放方向' })
  await expect(orientation).toHaveValue('lying')
  await orientation.selectOption('standing')
  await expect(orientation).toHaveValue('standing')
  await waitForCadReady(page)
  await orientation.selectOption('lying')
  await expect(orientation).toHaveValue('lying')
  await waitForCadReady(page)

  await heightSlider.press('ArrowRight')
  await expect(height).toHaveValue('9')
  await height.fill('50')
  await expect(heightSlider).toHaveValue('50')
  await gapSlider.press('ArrowRight')
  await expect(gap).toHaveValue('2')
  await gap.fill('1')
  await expect(gapSlider).toHaveValue('1')

  await count.press('ArrowRight')
  await count.press('ArrowRight')
  await expect(count).toHaveValue('3')
  await waitForCadReady(page)

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe(
    'hexagonal-column-50x3-g1-lying.step',
  )
  const stepStream = await stepDownload.createReadStream()
  expect(stepStream).not.toBeNull()
  let stepByteLength = 0
  for await (const chunk of stepStream ?? []) stepByteLength += chunk.length
  expect(stepByteLength).toBeGreaterThan(0)

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe(
    'hexagonal-column-50x3-g1-lying.stl',
  )
  expect(await readBinaryStlByteLength(stlDownload)).toBeGreaterThan(84)
})

test('modular grid slider drag preserves committed viewport framing before replacement', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)

  const rows = page.getByRole('slider', { name: '行數（Y）' })
  const before = await readDimensionAnnotationBoxes(page)
  const sliderBox = await rows.boundingBox()
  expect(sliderBox).not.toBeNull()
  if (!sliderBox) return

  const y = sliderBox.y + sliderBox.height / 2
  await page.mouse.move(sliderBox.x + sliderBox.width * 0.18, y)
  await page.mouse.down()
  await page.mouse.move(sliderBox.x + sliderBox.width * 0.3, y, { steps: 3 })
  await page.waitForTimeout(100)

  await expect(page.getByText('預覽與目前輸入不同步')).toBeVisible()
  const duringInput = await readDimensionAnnotationBoxes(page)
  expectDimensionAnnotationBoxesToStayStable(before, duringInput)

  await page.mouse.up()
  const committedRows = Number(await rows.inputValue())
  await waitForCadReady(page)
  await expect(page.getByLabel(`深度 Y ${committedRows * 20} mm`)).toBeVisible()
})

test('keyboard slider input preserves viewport framing until the new revision commits', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)

  const rows = page.getByRole('slider', { name: '行數（Y）' })
  const before = await readDimensionAnnotationBoxes(page)
  await rows.press('ArrowRight')

  await expect(page.getByText('預覽與目前輸入不同步')).toBeVisible()
  const duringInput = await readDimensionAnnotationBoxes(page)
  expectDimensionAnnotationBoxesToStayStable(before, duringInput)

  await waitForCadReady(page)
  await expect(page.getByLabel('深度 Y 40 mm')).toBeVisible()
})

test('modular grid reports cell progress for a larger generation', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/')
  await page.getByRole('link', { name: '使用模組化網格底板' }).click()
  await waitForCadReady(page)

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
  await waitForCadReady(page)
})

test('parameter updates use the latest valid generation and preserve stale preview on invalid input', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await waitForCadReady(page)
  await expect(width).toHaveValue('25')
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()

  await width.fill('25.5')
  await expect(width).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toContainText('必須是有限的整數。')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
  await expect(page.getByLabel('寬度 X 25.5 mm')).toHaveCount(0)

  await width.fill('26')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 26 mm')).toBeVisible()
})

test('dimension annotations remain attached through viewport resize and orbit interaction', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)

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

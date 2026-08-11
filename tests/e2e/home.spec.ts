import { expect, test } from '@playwright/test'
import { configuredPortalySupportUrl, supportLink } from './helpers'

test('home, model selection, and docs are static Astro pages', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '常用模型，快速做出來' }),
  ).toBeVisible()
  await expect(
    page.getByTestId('homepage-hero').getByText('Shape Shortcut', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Shape Shortcut' }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('link', { name: '模型庫', exact: true }),
  ).not.toHaveAttribute('aria-current', 'page')
  const modelCta = page.getByRole('link', { name: /開始使用/ })
  await expect(modelCta).toHaveAttribute('href', '/models')
  const ctaBackground = await modelCta.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  const navigationBackground = await page
    .getByRole('navigation', { name: '主要導覽' })
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(ctaBackground).not.toBe(navigationBackground)
  await expect(
    page.getByRole('link', { name: '編輯 →', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  const showcase = page.getByTestId('homepage-showcase-slot')
  await expect(showcase).toBeVisible()
  await expect(showcase.locator('img')).toHaveCount(0)
  const showcaseBounds = await showcase.boundingBox()
  expect(showcaseBounds).not.toBeNull()
  if (!showcaseBounds) {
    throw new Error('Homepage showcase slot must have measurable dimensions')
  }
  expect(showcaseBounds.width / showcaseBounds.height).toBeCloseTo(4 / 3, 1)

  const useCases = page.getByTestId('homepage-use-cases')
  const expectedUseCases = [
    ['做底板', '#home-model-opengrid'],
    ['做連接件', '#home-model-opengrid-snap'],
    ['做分隔', '#home-model-opengrid-divider'],
    ['做支柱', '#home-model-opengrid-pillar'],
    ['做收納', '#home-model-opengrid-stackable-box'],
  ] as const
  for (const [label, target] of expectedUseCases) {
    await expect(useCases.getByRole('link', { name: label })).toHaveAttribute(
      'href',
      target,
    )
  }

  const homeModelCards = page.getByTestId('home-model-card')
  await expect(homeModelCards).toHaveCount(7)
  const expectedHomeModels = [
    ['opengrid', '底板', '/cad/opengrid'],
    ['opengrid-snap', 'Snap', '/cad/opengrid-snap'],
    ['opengrid-pillar', '圓柱支柱', '/cad/opengrid-pillar'],
    ['opengrid-divider', '分隔塊', '/cad/opengrid-divider'],
    ['opengrid-stackable-box', '堆疊盒', '/cad/opengrid-stackable-box'],
    [
      'opengrid-stackable-cylinder',
      '可堆疊圓柱',
      '/cad/opengrid-stackable-cylinder',
    ],
    ['opengrid-snap-remover', 'Snap Remover', '/cad/opengrid-snap-remover'],
  ] as const
  for (const [index, [modelId, label, route]] of expectedHomeModels.entries()) {
    const card = homeModelCards.nth(index)
    await expect(card).toHaveAttribute('data-model-id', modelId)
    await expect(card.getByRole('heading', { name: label })).toBeVisible()
    await expect(card.locator('img')).toHaveAttribute('alt', new RegExp(label))
    await expect(
      card.getByRole('link', { name: `開始生成 ${label}` }),
    ).toHaveAttribute('href', route)
  }

  await page.goto('/models')
  await expect(
    page.getByRole('link', { name: 'Shape Shortcut' }),
  ).not.toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('link', { name: '模型庫', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('heading', { name: '選擇 CAD 模型' }),
  ).toBeVisible()
  await expect(page.getByTestId('model-selection').locator('p')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'OpenGrid 系列' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'HSW 系列' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '其他模型' })).toHaveCount(0)
  const familySections = page.locator('[data-testid^="model-family-"]')
  await expect(familySections).toHaveCount(2)
  await expect(familySections.nth(0)).toHaveAttribute(
    'data-testid',
    'model-family-opengrid',
  )
  await expect(familySections.nth(1)).toHaveAttribute(
    'data-testid',
    'model-family-hsw',
  )

  const editLinkFor = (displayName: string) =>
    page
      .getByRole('heading', { name: displayName, exact: true })
      .locator('..')
      .getByRole('link', { name: `編輯 ${displayName}`, exact: true })

  await expect(editLinkFor('六角蜂巢')).toHaveAttribute('href', '/cad/hsw-cell')
  await expect(editLinkFor('圓柱支柱')).toHaveAttribute(
    'href',
    '/cad/opengrid-pillar',
  )
  await expect(editLinkFor('底板')).toHaveAttribute('href', '/cad/opengrid')
  await expect(editLinkFor('Snap')).toHaveAttribute(
    'href',
    '/cad/opengrid-snap',
  )
  await expect(editLinkFor('分隔塊')).toHaveAttribute(
    'href',
    '/cad/opengrid-divider',
  )
  await expect(editLinkFor('堆疊盒')).toHaveAttribute(
    'href',
    '/cad/opengrid-stackable-box',
  )
  await expect(editLinkFor('可堆疊圓柱')).toHaveAttribute(
    'href',
    '/cad/opengrid-stackable-cylinder',
  )
  await expect(editLinkFor('Snap Remover')).toHaveAttribute(
    'href',
    '/cad/opengrid-snap-remover',
  )
  const openGridCards = page
    .getByTestId('model-family-opengrid')
    .locator('[data-model-id]')
  await expect(openGridCards.nth(0)).toHaveAttribute(
    'data-model-id',
    'opengrid',
  )
  await expect(openGridCards.nth(1)).toHaveAttribute(
    'data-model-id',
    'opengrid-snap',
  )
  const bottomCardBounds = await openGridCards.nth(0).boundingBox()
  const snapCardBounds = await openGridCards.nth(1).boundingBox()
  expect(bottomCardBounds).not.toBeNull()
  expect(snapCardBounds).not.toBeNull()
  if (!bottomCardBounds || !snapCardBounds) {
    throw new Error('OpenGrid bottom and Snap cards must be laid out')
  }
  expect(snapCardBounds.x).toBeGreaterThan(bottomCardBounds.x)
  expect(snapCardBounds.y).toBeCloseTo(bottomCardBounds.y, 0)
  for (const displayName of [
    '方塊',
    '標準開口盒',
    '模組化網格底板',
    '可調六角柱',
  ]) {
    await expect(
      page.getByRole('heading', { name: displayName, exact: true }),
    ).toHaveCount(0)
  }
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  await page.goto('/docs/')
  await expect(
    page.getByRole('heading', { name: 'Prototype 文件' }),
  ).toBeVisible()
  await expect(
    page.getByText(/方塊、獨立的 box-normal 開口盒、模組化網格底板/),
  ).toBeVisible()
  await expect(
    page.getByText(/OpenGrid 系列提供 Full、Lite、Heavy 三種 28 mm 網格板型/),
  ).toBeVisible()
  await expect(
    page.getByText(/模型選擇頁依 HSW 系列、OpenGrid 系列與其他模型分類/),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: '返回模型選擇' }),
  ).toHaveAttribute('href', '/models')
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

test('CAD root returns to the model selection page', async ({ page }) => {
  await page.goto('/cad/')
  await expect(page).toHaveURL('/models')
  await expect(
    page.getByRole('heading', {
      name: '選擇 CAD 模型',
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

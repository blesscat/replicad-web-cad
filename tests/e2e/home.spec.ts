import { expect, test } from '@playwright/test'
import { configuredPortalySupportUrl, supportLink } from './helpers'

test('home, model selection, and docs are static Astro pages', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: '用瀏覽器建立、調整並匯出 CAD 模型' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Shape Shortcut' }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('link', { name: '選擇模型', exact: true }),
  ).not.toHaveAttribute('aria-current', 'page')
  const modelCta = page.getByRole('link', { name: '開始選擇模型' })
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

  await page.goto('/models')
  await expect(
    page.getByRole('link', { name: 'Shape Shortcut' }),
  ).not.toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('link', { name: '選擇模型', exact: true }),
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

  const editLinkFor = (
    container: ReturnType<typeof page.locator>,
    displayName: string,
  ) =>
    container
      .getByRole('heading', { name: displayName, exact: true })
      .locator('..')
      .getByRole('link', { name: `編輯 ${displayName}`, exact: true })

  const deskSystem = page.getByTestId('model-subgroup-desk')
  const wallRelated = page.getByTestId('model-subgroup-wall')
  const hswSeries = page.getByTestId('model-subgroup-hsw')
  await expect(
    deskSystem.getByRole('heading', { name: 'Desk System' }),
  ).toBeVisible()
  await expect(
    wallRelated.getByRole('heading', { name: 'Wall Related' }),
  ).toBeVisible()
  await expect(editLinkFor(hswSeries, '六角蜂巢')).toHaveAttribute(
    'href',
    '/cad/hsw-cell',
  )
  await expect(editLinkFor(deskSystem, '圓柱支柱')).toHaveAttribute(
    'href',
    '/cad/opengrid-pillar?system=desk',
  )
  await expect(editLinkFor(deskSystem, '底板')).toHaveAttribute(
    'href',
    '/cad/opengrid?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Snap')).toHaveAttribute(
    'href',
    '/cad/opengrid-snap?system=desk',
  )
  await expect(editLinkFor(wallRelated, '底板')).toHaveAttribute(
    'href',
    '/cad/opengrid?system=wall',
  )
  await expect(editLinkFor(wallRelated, 'Snap')).toHaveAttribute(
    'href',
    '/cad/opengrid-snap?system=wall',
  )
  await expect(editLinkFor(deskSystem, '分隔塊')).toHaveAttribute(
    'href',
    '/cad/opengrid-divider?system=desk',
  )
  await expect(editLinkFor(deskSystem, '堆疊盒')).toHaveAttribute(
    'href',
    '/cad/opengrid-stackable-box?system=desk',
  )
  await expect(editLinkFor(deskSystem, '可堆疊圓柱')).toHaveAttribute(
    'href',
    '/cad/opengrid-stackable-cylinder?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Snap Remover')).toHaveAttribute(
    'href',
    '/cad/opengrid-snap-remover?system=desk',
  )
  const openGridCards = deskSystem.locator('[data-model-id]')
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
  await expect(wallRelated.locator('[data-model-id]')).toHaveCount(2)
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

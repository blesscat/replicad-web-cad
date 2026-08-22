import { expect, test } from '@playwright/test'

test('localized model chooser exposes localized shell and search metadata', async ({
  page,
}) => {
  await page.goto('/en/models')

  await expect(page).toHaveURL(/\/en\/models\/?$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', { name: 'Choose a CAD model' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Models', exact: true }),
  ).toHaveAttribute('aria-current', 'page')

  const canonical = page.locator('link[rel="canonical"]')
  await expect(canonical).toHaveAttribute('href', /\/en\/models\/?$/)

  const alternateLinks = page.locator(
    'link[rel="alternate"][hreflang="zh-Hant"], link[rel="alternate"][hreflang="en"]',
  )
  await expect(alternateLinks).toHaveCount(2)
  await expect(
    page.locator('link[rel="alternate"][hreflang="x-default"]'),
  ).toHaveCount(1)
  await expect(
    page.getByRole('link', { name: 'Language', exact: true }),
  ).toHaveAttribute('href', '/zh-Hant/models')
})

test('model chooser exposes capability summaries and stable modal details', async ({
  page,
}) => {
  await page.goto('/en/models')

  const cards = page.locator('[data-testid="model-selection"] [data-model-id]')
  await expect(cards).not.toHaveCount(0)
  const staticResponse = await page.request.get('/en/models')
  expect(staticResponse.ok()).toBe(true)
  const staticHtml = await staticResponse.text()
  expect(staticHtml).toContain('data-testid="model-details-dialog"')
  expect(staticHtml).toContain('Inner clear height')
  expect(staticHtml).toContain('10.5 displayed cells')
  const staticCadResponse = await page.request.get('/en/cad/opengrid')
  expect(staticCadResponse.ok()).toBe(true)
  expect(await staticCadResponse.text()).toContain('10.5 displayed cells')
  const cardCount = await cards.count()
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index)
    await expect(card.getByTestId('model-capability-summary')).toBeVisible()
    await expect(
      card.getByRole('button', { name: 'View full details', exact: true }),
    ).toBeVisible()
  }

  const board = page.locator('[data-entry-key="opengrid-desk"]')
  const boardSummary = board.getByTestId('model-capability-summary')
  await expect(boardSummary).toContainText('Adjustable settings:')
  await expect(boardSummary).not.toContainText('Fixed geometry')
  await expect(boardSummary).not.toContainText(/\(\d+\)/)

  const fixedCard = page.locator(
    '[data-entry-key="opengrid-snap-remover-desk"]',
  )
  await expect(fixedCard.getByTestId('model-capability-summary')).toContainText(
    'Fixed geometry',
  )

  const parameterCard = page.locator(
    '[data-entry-key="opengrid-stackable-box-desk"]',
  )
  const opener = parameterCard.getByRole('button', {
    name: 'View full details',
    exact: true,
  })
  const boundsBefore = await cards.evaluateAll((cardElements) =>
    cardElements.map((card) => {
      const bounds = card.getBoundingClientRect()
      return {
        x: bounds.x + window.scrollX,
        y: bounds.y + window.scrollY,
        width: bounds.width,
        height: bounds.height,
      }
    }),
  )

  await opener.click()

  const dialog = parameterCard.getByTestId('model-details-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Grid Box' })).toBeVisible()
  await expect(dialog).toContainText('Inner clear height')
  await expect(dialog).toContainText('STEP and STL')

  const boundsAfter = await cards.evaluateAll((cardElements) =>
    cardElements.map((card) => {
      const bounds = card.getBoundingClientRect()
      return {
        x: bounds.x + window.scrollX,
        y: bounds.y + window.scrollY,
        width: bounds.width,
        height: bounds.height,
      }
    }),
  )
  expect(boundsAfter).toHaveLength(boundsBefore.length)
  for (let index = 0; index < boundsBefore.length; index += 1) {
    const before = boundsBefore[index]
    const after = boundsAfter[index]
    expect(after?.x).toBeCloseTo(before?.x ?? 0, 3)
    expect(after?.y).toBeCloseTo(before?.y ?? 0, 3)
    expect(after?.width).toBeCloseTo(before?.width ?? 0, 3)
    expect(after?.height).toBeCloseTo(before?.height ?? 0, 3)
  }

  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()

  await opener.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('model chooser details remain readable without narrow-screen overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 360 })
  await page.goto('/en/models')

  const card = page.locator(
    '[data-entry-key="opengrid-stackable-cylinder-desk"]',
  )
  await card
    .getByRole('button', { name: 'View full details', exact: true })
    .click()

  const dialog = card.getByTestId('model-details-dialog')
  await expect(dialog).toBeVisible()
  const layout = await dialog.evaluate((dialogElement) => {
    const scrollElement = dialogElement.querySelector(
      '[data-testid="model-details-scroll"]',
    )
    if (!scrollElement) throw new Error('Expected scrollable dialog content')
    return {
      pageFitsViewport:
        document.documentElement.scrollWidth <= window.innerWidth,
      dialogFitsViewport:
        dialogElement.getBoundingClientRect().right <= window.innerWidth,
      contentScrolls: scrollElement.scrollHeight > scrollElement.clientHeight,
    }
  })

  expect(layout.pageFitsViewport).toBe(true)
  expect(layout.dialogFitsViewport).toBe(true)
  expect(layout.contentScrolls).toBe(true)
})

test('traditional Chinese model cards expose the same capability presentation', async ({
  page,
}) => {
  await page.goto('/zh-Hant/models')

  const cards = page.locator('[data-testid="model-selection"] [data-model-id]')
  await expect(cards).not.toHaveCount(0)
  const cardCount = await cards.count()
  for (let index = 0; index < cardCount; index += 1) {
    const card = cards.nth(index)
    await expect(card.getByTestId('model-capability-summary')).toBeVisible()
    await expect(
      card.getByRole('button', { name: '查看完整資訊', exact: true }),
    ).toBeVisible()
  }
  await expect(
    page
      .locator('[data-entry-key="opengrid-desk"]')
      .getByTestId('model-capability-summary'),
  ).toContainText('可調整設定：')
  await expect(
    page
      .locator('[data-entry-key="opengrid-snap-remover-desk"]')
      .getByTestId('model-capability-summary'),
  ).toContainText('固定幾何')
  await expect(
    page
      .locator('[data-entry-key="opengrid-desk"]')
      .getByRole('button', { name: '查看完整資訊', exact: true }),
  ).toBeVisible()
})

test('localized public pages and CAD controls expose both locales', async ({
  page,
}) => {
  await page.goto('/zh-Hant/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant')
  await expect(
    page.getByRole('heading', { name: '用瀏覽器建立、調整並匯出 CAD 模型' }),
  ).toBeVisible()

  await page.goto('/en/docs/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('heading', { name: 'Prototype documentation' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Parameters and constraints' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Advanced reference' }),
  ).toBeVisible()

  await page.goto('/en/cad/box?system=desk&view=search')
  await expect(
    page.getByRole('heading', { name: 'Editing: Box', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Width/ })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Back to model selection' }),
  ).toHaveAttribute('href', '/en/models')
  await expect(page.getByTestId('cad-static-summary')).toBeAttached()
  await expect(
    page.locator('link[rel="alternate"][hreflang="zh-Hant"]'),
  ).toHaveAttribute('href', /\/zh-Hant\/cad\/box$/)

  const width = page.getByRole('textbox', { name: /Width/ })
  await width.fill('25.5')
  await expect(page.getByRole('alert')).toContainText('Width is invalid')
  await expect(page.getByRole('link', { name: 'Language' })).toHaveAttribute(
    'href',
    '/zh-Hant/cad/box?system=desk&view=search',
  )

  await width.fill('25')
  await page.getByRole('link', { name: 'Language' }).click()
  await expect(page).toHaveURL(/\/zh-Hant\/cad\/box\?system=desk&view=search$/)
  await expect(page.getByRole('textbox', { name: /寬度/ })).toHaveValue('25')
})

test('legacy routes redirect to the default locale without hiding English routes', async ({
  page,
}) => {
  await page.goto('/models')
  await expect(page).toHaveURL(/\/zh-Hant\/models\/?$/)

  await page.goto('/cad/box?system=desk')
  await expect(page).toHaveURL(/\/zh-Hant\/cad\/box\?system=desk$/)

  await page.goto('/en/models')
  await expect(page).toHaveURL(/\/en\/models\/?$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('publishes canonical localized sitemap URLs', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('application/xml')

  const body = await response.text()
  const origin = new URL(response.url()).origin
  expect(body).toContain(`<loc>${origin}/en/</loc>`)
  expect(body).toContain(`<loc>${origin}/zh-Hant/cad/opengrid</loc>`)
  expect(body).not.toContain(`<loc>${origin}/cad/opengrid</loc>`)
})

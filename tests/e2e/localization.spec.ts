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

test('model chooser keeps full parameter ranges collapsed until requested', async ({
  page,
}) => {
  await page.goto('/en/models')

  const parameters = page.locator(
    '[data-model-id="opengrid-stackable-box"] details',
  )
  await expect(parameters).toHaveCount(1)
  const summary = parameters.locator(':scope > summary')
  await expect(summary).toContainText('Adjustable parameters')
  await expect(summary).toContainText('View full parameters')
  await expect(parameters.locator('ul')).toBeHidden()

  await summary.click()

  await expect(parameters).toHaveAttribute('open', '')
  await expect(parameters.locator('ul')).toBeVisible()
  await expect(parameters.locator('ul')).toContainText('Inner clear height')
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

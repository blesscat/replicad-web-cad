import { expect, test, type Locator, type Page } from '@playwright/test'
import { configuredPortalySupportUrl, supportLink } from './helpers'

type HomepageRuntimeObservation = {
  workerUrls: string[]
  wasmRequests: string[]
}

function observeHomepageRuntime(page: Page): HomepageRuntimeObservation {
  const observation: HomepageRuntimeObservation = {
    workerUrls: [],
    wasmRequests: [],
  }

  page.on('worker', (worker) => {
    observation.workerUrls.push(worker.url())
  })
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (pathname.endsWith('.wasm')) observation.wasmRequests.push(pathname)
  })

  return observation
}

function parseRgb(value: string): [number, number, number] {
  const components = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []
  if (components.length < 3) throw new Error(`Unsupported color: ${value}`)
  return [components[0] ?? 0, components[1] ?? 0, components[2] ?? 0]
}

function relativeLuminance(value: string): number {
  const channels = parseRgb(value).map((channel) => channel / 255)
  const linearChannels = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return (
    0.2126 * (linearChannels[0] ?? 0) +
    0.7152 * (linearChannels[1] ?? 0) +
    0.0722 * (linearChannels[2] ?? 0)
  )
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

async function readCtaColors(locator: Locator): Promise<{
  color: string
  backgroundColor: string
}> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
    }
  })
}

async function expectStaticHomepage(
  page: Page,
  observation: HomepageRuntimeObservation,
): Promise<void> {
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(observation.workerUrls).toEqual([])
  expect(observation.wasmRequests).toEqual([])

  const imageAlts = await page
    .locator('main img')
    .evaluateAll((images) =>
      images.map((image) => image.getAttribute('alt')?.trim() ?? ''),
    )
  expect(imageAlts.length).toBeGreaterThan(0)
  expect(imageAlts.every((alt) => alt.length > 0)).toBe(true)
}

test('home, model selection, and docs are static Astro pages', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/zh-Hant\/$/)
  await expect(
    page.getByRole('heading', { name: '在瀏覽器裡，做出剛好適合你的桌面收納' }),
  ).toBeVisible()
  await expect(page.getByTestId('home-hero')).toBeVisible()
  await expect(page.getByTestId('home-capabilities')).toBeVisible()
  await expect(page.getByTestId('home-desk-system')).toBeVisible()
  await expect(page.getByTestId('home-explore')).toBeVisible()
  await expect(page.getByText('即時 3D 預覽', { exact: true })).toBeVisible()
  await expect(page.getByText('STEP／STL 匯出', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Shape Shortcut' }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('link', { name: '選擇模型', exact: true }),
  ).not.toHaveAttribute('aria-current', 'page')
  const primaryCta = page.getByRole('link', { name: '從 Desk System 開始' })
  await expect(primaryCta).toHaveAttribute(
    'href',
    '/zh-Hant/cad/opengrid?system=desk',
  )
  const modelCta = page.getByRole('link', { name: '瀏覽所有模型' })
  await expect(modelCta).toHaveAttribute('href', '/zh-Hant/models')
  await expect(
    page.getByRole('link', { name: '先看 Desk System 快速入門 →' }),
  ).toHaveAttribute('href', '/zh-Hant/docs/')
  const ctaBackground = await primaryCta.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  const navigationBackground = await page
    .getByRole('navigation', { name: '主要導覽' })
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(ctaBackground).not.toBe(navigationBackground)
  await expect(
    page.getByRole('link', { name: '編輯 →', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('[data-model-id]')).toHaveCount(0)
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByTestId('home-hero')).toBeVisible()
  const heroButtons = page.getByTestId('home-hero').getByRole('link')
  const heroButtonPositions = await heroButtons.evaluateAll((links) =>
    links.slice(0, 2).map((link) => {
      const bounds = link.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y }
    }),
  )
  expect(heroButtonPositions[0]?.x).toBe(heroButtonPositions[1]?.x)

  await page.setViewportSize({ width: 1440, height: 900 })
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
  await expect(page.locator('main')).toHaveCSS('max-width', 'none')
  await expect(page.getByTestId('model-selection').locator('p')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'OpenGrid 系列' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'HSW 系列' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '其他模型' })).toHaveCount(0)
  await expect(page.getByText('系統入口', { exact: true })).toHaveCount(0)
  await expect(
    page.getByTestId('model-family-opengrid').getByText('OpenGrid', {
      exact: true,
    }),
  ).toHaveCount(0)
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
  const openGridFamily = page.getByTestId('model-family-opengrid')
  const openGridSubgroups = page.getByTestId('model-subgroups-opengrid')
  await expect(
    openGridFamily.locator(':scope > [data-testid="model-subgroups-opengrid"]'),
  ).toHaveCount(1)
  await expect(
    openGridSubgroups.locator(':scope > [data-testid^="model-subgroup-"]'),
  ).toHaveCount(2)
  await expect(page.getByTestId('model-selection')).toHaveCSS(
    'border-top-width',
    '0px',
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
  await expect(
    editLinkFor(deskSystem, 'Locating Post (定位柱)'),
  ).toHaveAttribute('href', '/cad/opengrid-pillar?system=desk')
  await expect(editLinkFor(deskSystem, 'Board (底版)')).toHaveAttribute(
    'href',
    '/cad/opengrid?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Snap (咔咔)')).toHaveAttribute(
    'href',
    '/cad/opengrid-snap?system=desk',
  )
  await expect(editLinkFor(wallRelated, 'Board (底版)')).toHaveAttribute(
    'href',
    '/cad/opengrid?system=wall',
  )
  await expect(editLinkFor(wallRelated, 'Snap (咔咔)')).toHaveAttribute(
    'href',
    '/cad/opengrid-snap?system=wall',
  )
  await expect(editLinkFor(deskSystem, 'divider (分隔牆)')).toHaveAttribute(
    'href',
    '/cad/opengrid-divider?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Grid Box (方盒)')).toHaveAttribute(
    'href',
    '/cad/opengrid-stackable-box?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Round Box (圓盒)')).toHaveAttribute(
    'href',
    '/cad/opengrid-stackable-cylinder?system=desk',
  )
  await expect(editLinkFor(deskSystem, 'Snap Remover')).toHaveAttribute(
    'href',
    '/cad/opengrid-snap-remover?system=desk',
  )
  await expect(
    editLinkFor(deskSystem, 'Open Shelf (斜開格櫃)'),
  ).toHaveAttribute('href', '/cad/opengrid-open-shelf?system=desk')
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
  const openGridCardPositions = await openGridCards.evaluateAll((cards) =>
    cards.map((card) => {
      const bounds = card.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y }
    }),
  )
  const firstCardPosition = openGridCardPositions[0]
  if (!firstCardPosition) throw new Error('Expected OpenGrid card positions')
  const firstRowCount = openGridCardPositions.filter(
    (position) => Math.abs(position.y - firstCardPosition.y) < 1,
  ).length
  expect(firstRowCount).toBeGreaterThanOrEqual(3)
  await expect(wallRelated.locator('[data-model-id]')).toHaveCount(2)
  for (const displayName of ['方塊', '模組化網格底板', '可調六角柱']) {
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
    page.getByText(/方塊、模組化網格底板、獨立的 HSW 六角蜂巢/),
  ).toBeVisible()
  await expect(
    page.getByText(
      /OpenGrid 系列提供 Full、Lite、Heavy、Hybrid 四種 28 mm 網格板型/,
    ),
  ).toBeVisible()
  await expect(
    page.getByText(/模型選擇頁依 HSW 系列、OpenGrid 系列與其他模型分類/),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: '返回模型選擇' }),
  ).toHaveAttribute('href', '/models')
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

test('Traditional Chinese homepage uses the Desk System entry flow', async ({
  page,
}) => {
  const runtimeObservation = observeHomepageRuntime(page)
  await page.goto('/zh-Hant/')

  await expect(page).toHaveTitle('Shape Shortcut｜瀏覽器 CAD 與 3D 列印')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /OpenGrid.*STEP／STL/,
  )
  await expect(
    page.getByRole('heading', { name: '在瀏覽器裡，做出剛好適合你的桌面收納' }),
  ).toBeVisible()
  await expect(page.getByTestId('home-hero')).toBeVisible()
  await expect(page.getByTestId('home-desk-system')).toBeVisible()
  await expect(
    page.getByRole('link', { name: '從 Desk System 開始' }),
  ).toHaveAttribute('href', '/zh-Hant/cad/opengrid?system=desk')
  await expect(
    page.getByRole('link', { name: '瀏覽所有模型' }),
  ).toHaveAttribute('href', '/zh-Hant/models')
  await expect(
    page.getByRole('link', { name: '先看 Desk System 快速入門 →' }),
  ).toHaveAttribute('href', '/zh-Hant/docs/')
  await expect(
    page.getByRole('link', { name: '探索 Wall Related →' }),
  ).toHaveAttribute('href', '/zh-Hant/cad/opengrid?system=wall')
  await expect(
    page.getByRole('link', { name: '建立六角蜂巢 →' }),
  ).toHaveAttribute('href', '/zh-Hant/cad/hsw-cell')
  await expect(
    page.getByAltText('OpenGrid Desk System Board 底板預覽'),
  ).toBeVisible()
  await expectStaticHomepage(page, runtimeObservation)
})

test('English homepage uses localized promotional content and routes', async ({
  page,
}) => {
  const runtimeObservation = observeHomepageRuntime(page)
  await page.goto('/en/')

  await expect(page).toHaveTitle('Shape Shortcut | Browser CAD & 3D Printing')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /Adjust OpenGrid.*STEP\/STL/,
  )
  await expect(
    page.getByRole('heading', {
      name: 'Build the desk setup that fits you—in your browser',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Start with Desk System' }),
  ).toHaveAttribute('href', '/en/cad/opengrid?system=desk')
  await expect(
    page.getByRole('link', { name: 'Browse all models' }),
  ).toHaveAttribute('href', '/en/models')
  await expect(
    page.getByRole('link', { name: 'Read the Desk System quick start →' }),
  ).toHaveAttribute('href', '/en/docs/')
  await expect(
    page.getByRole('link', { name: 'Explore Wall Related →' }),
  ).toHaveAttribute('href', '/en/cad/opengrid?system=wall')
  await expect(
    page.getByRole('link', { name: 'Build a honeycomb →' }),
  ).toHaveAttribute('href', '/en/cad/hsw-cell')
  await expect(
    page.getByAltText('OpenGrid Desk System Board preview'),
  ).toBeVisible()
  await expectStaticHomepage(page, runtimeObservation)
})

test('localized homepage final CTA remains readable in both color schemes', async ({
  page,
}) => {
  const homepageCtaCases = [
    {
      path: '/zh-Hant/',
      name: '開始選擇模型 →',
      href: '/zh-Hant/models',
    },
    {
      path: '/en/',
      name: 'Start choosing a model →',
      href: '/en/models',
    },
  ] as const

  await page.setViewportSize({ width: 1440, height: 900 })

  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })

    for (const homepage of homepageCtaCases) {
      await page.goto(homepage.path)
      const cta = page.getByRole('link', { name: homepage.name, exact: true })

      await expect(cta).toBeVisible()
      await expect(cta).toHaveAttribute('href', homepage.href)
      await cta.focus()
      await expect(cta).toBeFocused()

      const normalColors = await readCtaColors(cta)
      expect(
        contrastRatio(normalColors.color, normalColors.backgroundColor),
      ).toBeGreaterThanOrEqual(4.5)

      await cta.hover()
      const hoverColors = await readCtaColors(cta)
      expect(
        contrastRatio(hoverColors.color, hoverColors.backgroundColor),
      ).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test('model selection stacks all cards on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/models')

  const cards = page.getByTestId('model-selection').locator('[data-model-id]')
  const positions = await cards.evaluateAll((cardElements) =>
    cardElements.map((card) => {
      const bounds = card.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y }
    }),
  )
  expect(positions.length).toBe(11)
  const cardX = positions[0]?.x
  if (cardX === undefined) throw new Error('Expected narrow model cards')
  expect(positions.every((position) => Math.abs(position.x - cardX) < 1)).toBe(
    true,
  )
  expect(
    positions.every((position, index) => {
      const previous = positions[index - 1]
      return index === 0 || (previous !== undefined && position.y > previous.y)
    }),
  ).toBe(true)
})

test('model cards keep long localized names on one line', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/models')

  const heading = page.getByRole('heading', {
    name: 'Locating Post (定位柱)',
    exact: true,
  })
  await expect(heading).toBeVisible()

  const isSingleLine = await heading.evaluate((element) => {
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
    return element.getBoundingClientRect().height <= lineHeight + 1
  })
  expect(isSingleLine).toBe(true)
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

  const linkCount = await page.locator('a').count()
  let supportLinkFocused = false
  for (let index = 0; index < linkCount + 2; index += 1) {
    await page.keyboard.press('Tab')
    supportLinkFocused = await supportLink(page).evaluate(
      (element) => element === document.activeElement,
    )
    if (supportLinkFocused) break
  }
  expect(supportLinkFocused).toBe(true)
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

  const removedResponse = await page.goto('/cad/box-normal')
  expect(removedResponse?.status()).toBe(404)
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

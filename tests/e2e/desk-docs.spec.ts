import { expect, test } from '@playwright/test'

const locales = [
  {
    code: 'zh-Hant',
    quickStart: 'Desk System 快速入門',
    board: 'Board (底版)',
    snap: 'Snap (咔咔)',
    gridBox: 'Grid Box (方盒)',
    roundBox: 'Round Box (圓盒)',
    reference: '進階參考',
  },
  {
    code: 'en',
    quickStart: 'Desk System Quick Start',
    board: 'Board',
    snap: 'Snap',
    gridBox: 'Grid Box',
    roundBox: 'Round Box',
    reference: 'Advanced reference',
  },
] as const

for (const locale of locales) {
  test(`${locale.code} Desk quick start exposes the static workflow`, async ({
    page,
  }) => {
    await page.goto(`/${locale.code}/docs/`)

    await expect(
      page.getByRole('heading', { name: locale.quickStart, exact: true }),
    ).toBeVisible()
    await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
    await expect(page.getByTestId('docs-advanced-reference')).toContainText(
      locale.reference,
    )

    const steps = page
      .getByTestId('desk-quick-start')
      .locator('ol > li[data-step]')
    await expect(steps).toHaveCount(4)
    await expect(steps.nth(0)).toHaveAttribute('data-step', 'board')
    await expect(steps.nth(1)).toHaveAttribute('data-step', 'snap')
    await expect(steps.nth(2)).toHaveAttribute('data-step', 'locating')
    await expect(steps.nth(3)).toHaveAttribute('data-step', 'container')

    await expect(
      page.locator(`a[href="/${locale.code}/cad/opengrid?system=desk"]`),
    ).toHaveCount(3)
    await expect(
      page.locator(`a[href="/${locale.code}/cad/opengrid-snap?system=desk"]`),
    ).toHaveCount(3)
    await expect(
      page.locator(`a[href="/${locale.code}/cad/opengrid-pillar?system=desk"]`),
    ).toHaveCount(3)
    await expect(
      page.locator(
        `a[href="/${locale.code}/cad/opengrid-stackable-box?system=desk"]`,
      ),
    ).toHaveCount(3)
    await expect(
      page.locator(
        `a[href="/${locale.code}/cad/opengrid-stackable-cylinder?system=desk"]`,
      ),
    ).toHaveCount(3)

    await expect(
      page.getByRole('link', { name: locale.board }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: locale.snap }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: locale.gridBox }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: locale.roundBox }).first(),
    ).toBeVisible()

    await expect(page.locator('img[src^="/docs/desk-system/"]')).toHaveCount(3)
    const diagramAltPatterns = [
      ['desk-system-flow', /Board|流程圖/],
      ['desk-system-board-snap', /Board|俯視/],
      ['desk-system-locating-options', /Locating Post|比較圖/],
    ] as const
    for (const [asset, altPattern] of diagramAltPatterns) {
      await expect(
        page.locator(`img[src$="${asset}.${locale.code}.svg"]`),
      ).toHaveAttribute('alt', altPattern)
    }
  })
}

test('Desk quick start remains understandable when SVG assets are unavailable', async ({
  page,
}) => {
  await page.route('**/docs/desk-system/*.svg', (route) => route.abort())
  await page.goto('/en/docs/')

  await expect(
    page.getByRole('heading', { name: 'Desk System Quick Start', exact: true }),
  ).toBeVisible()
  await expect(page.getByTestId('desk-quick-start')).toContainText(
    'Simple placement is enough',
  )
  await expect(page.getByTestId('desk-quick-start')).toContainText(
    'do not add a separate Locating Post',
  )
  await expect(page.getByTestId('desk-quick-start')).toContainText(
    'Grid Box is the first example',
  )
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

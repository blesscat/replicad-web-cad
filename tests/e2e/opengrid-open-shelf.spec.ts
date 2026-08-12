import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid Open Shelf exposes its Desk controls and front-opening workspace', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-open-shelf?system=desk')

  await expect(
    page.getByRole('heading', {
      name: '目前編輯：OpenGrid Open Shelf (斜開格櫃)',
    }),
  ).toBeVisible()
  await expect(page.getByTestId('cad-system-context')).toHaveText(
    '目前系統：Desk System',
  )
  await expect(page.getByTestId('opengrid-open-shelf-help')).toContainText(
    '整體高度包含所有板厚',
  )
  const sliders = page.getByRole('slider')
  await expect(sliders).toHaveCount(6)
  for (const [index, label] of [
    'X',
    'Y',
    '整體高度（Z）',
    'X',
    'Z',
    '前方開口仰角（Y/Z）',
  ].entries()) {
    await expect(sliders.nth(index)).toHaveAttribute('aria-label', label)
  }

  await waitForCadReady(page)
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()
})

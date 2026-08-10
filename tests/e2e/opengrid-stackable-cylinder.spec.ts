import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid stackable-cylinder is listed and exposes 1 mm controls', async ({
  page,
}) => {
  await page.goto('/models')
  const modelLink = page.getByRole('link', { name: '使用OpenGrid 可堆疊圓柱' })
  await expect(modelLink).toHaveAttribute(
    'href',
    '/cad/opengrid-stackable-cylinder',
  )
  await modelLink.click()

  await expect(page).toHaveURL('/cad/opengrid-stackable-cylinder')
  await expect(
    page.getByRole('heading', { name: '目前編輯：OpenGrid 可堆疊圓柱' }),
  ).toBeVisible()
  await expect(
    page.locator('p').filter({ hasText: '這是開口圓柱容器' }),
  ).toHaveCount(0)
  await expect(page.getByRole('radio')).toHaveCount(3)
  const modeOptions = page.getByTestId('opengrid-cylinder-mode-options')
  await expect(modeOptions.getByRole('radio')).toHaveCount(3)
  await expect(
    modeOptions.locator(
      'xpath=following-sibling::p[@data-testid="opengrid-cylinder-mode-description"]',
    ),
  ).toHaveText('預設模式：可堆疊，使用標準8mm固定柱')
  await expect(page.getByRole('radio', { name: '預設模式' })).toBeChecked()
  await expect(page.getByRole('radio', { name: '薄殼模式' })).not.toBeChecked()
  await expect(page.locator('p').filter({ hasText: '目前模式：' })).toHaveCount(
    0,
  )
  await expect(page.locator('p').filter({ hasText: '底部孔洞：' })).toHaveCount(
    0,
  )
  await expect(
    page.getByRole('checkbox', { name: '開啟底部全部孔洞', exact: true }),
  ).toBeChecked()

  const diameter = page.getByRole('slider', { name: '外徑（直徑）' })
  const height = page.getByRole('slider', { name: '高度（Z）' })
  await expect(diameter).toHaveAttribute('min', '20')
  await expect(diameter).toHaveAttribute('max', '300')
  await expect(diameter).toHaveAttribute('step', '1')
  await expect(height).toHaveAttribute('min', '10')
  await expect(height).toHaveAttribute('max', '500')
  await expect(height).toHaveAttribute('step', '1')
  await diameter.press('ArrowRight')
  await expect(diameter).toHaveValue('57')
})

test('OpenGrid stackable-cylinder updates and exports deterministic metadata', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('slider', { name: '外徑（直徑）' }).press('ArrowRight')
  await page.getByRole('textbox', { name: '高度（Z）' }).fill('31')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d57-h31.step',
  )
})

test('OpenGrid stackable-cylinder exports the selected thin and no-hole state', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('radio', { name: '薄殼模式' }).check()
  await page
    .getByRole('checkbox', { name: '開啟底部全部孔洞', exact: true })
    .uncheck()
  await expect(
    page.getByTestId('opengrid-cylinder-mode-description'),
  ).toHaveText('薄殼模式：可堆疊，使用6mm固定柱')
  await expect(page.locator('p').filter({ hasText: '底部孔洞：' })).toHaveCount(
    0,
  )
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d56-h30-thin-no-holes.step',
  )
})

test('OpenGrid stackable-cylinder exports the clipped bottom-plate mode', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('radio', { name: '薄殼模式' }).check()
  await waitForCadReady(page)
  await page.getByRole('radio', { name: '底版模式' }).check()
  await expect(page.getByRole('radio', { name: '薄殼模式' })).not.toBeChecked()
  await expect(
    page.getByTestId('opengrid-cylinder-mode-description'),
  ).toHaveText('底版模式：不可堆疊，使用6mm固定柱')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d56-h30-bottom-plate.step',
  )
})

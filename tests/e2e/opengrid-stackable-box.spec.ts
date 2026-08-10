import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid stackable-box is listed and exposes the half-cell controls', async ({
  page,
}) => {
  await page.goto('/models')
  const modelLink = page
    .getByRole('heading', { name: 'OpenGrid 堆疊盒', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 OpenGrid 堆疊盒', exact: true })
  await expect(modelLink).toHaveAttribute('href', '/cad/opengrid-stackable-box')
  await modelLink.click()

  await expect(page).toHaveURL('/cad/opengrid-stackable-box')
  await expect(
    page.getByRole('heading', { name: '目前編輯：OpenGrid 堆疊盒' }),
  ).toBeVisible()
  const x = page.getByRole('slider', { name: 'X' })
  const y = page.getByRole('slider', { name: 'Y' })
  const height = page.getByRole('textbox', { name: '盒內淨高（Z）' })
  await expect(x).toHaveAttribute('min', '0.5')
  await expect(x).toHaveAttribute('step', '0.5')
  await expect(y).toHaveAttribute('min', '0.5')
  await expect(y).toHaveAttribute('step', '0.5')
  await expect(height).toHaveAttribute('min', '10')
  await expect(height).toHaveAttribute('max', '500')
  const cornerHoles = page.getByRole('checkbox', { name: '底部四角孔' })
  await expect(cornerHoles).toBeVisible()
  await expect(cornerHoles).toBeChecked()
  const fullGrid = page.getByRole('checkbox', { name: '底部全孔模式' })
  await expect(fullGrid).toBeVisible()
  await expect(fullGrid).not.toBeChecked()
  const defaultMode = page.getByRole('radio', { name: '預設模式' })
  await expect(defaultMode).toBeVisible()
  await expect(defaultMode).toBeChecked()
  const basePlate = page.getByRole('radio', { name: '底版模式' })
  await expect(basePlate).toBeVisible()
  await expect(basePlate).not.toBeChecked()
  await expect(
    page.getByText(/預設模式：可堆疊滑動，使用標準8mm固定柱/),
  ).toBeVisible()
  await expect(page.getByText(/底版模式：不可堆疊，使用6mm固定柱/)).toHaveCount(
    0,
  )
  await basePlate.check()
  await expect(basePlate).toBeChecked()
  await expect(defaultMode).not.toBeChecked()
  await expect(
    page.getByText(/預設模式：可堆疊滑動，使用標準8mm固定柱/),
  ).toHaveCount(0)
  await expect(
    page.getByText(/底版模式：不可堆疊，使用6mm固定柱/),
  ).toBeVisible()
  await cornerHoles.uncheck()
  await expect(cornerHoles).not.toBeChecked()
  await fullGrid.check()
  await expect(fullGrid).toBeChecked()
  await expect(page.getByText(/增加 14 mm 中心距/)).toHaveCount(0)

  const targetX = page.getByRole('textbox', { name: 'X（mm）' })
  const targetY = page.getByRole('textbox', { name: 'Y（mm）' })
  await targetX.fill('41.85')
  await targetY.fill('27.85')
  await page.getByRole('button', { name: '計算格數' }).click()
  await expect(x).toHaveValue('1.5')
  await expect(y).toHaveValue('1')
})

test('OpenGrid stackable-box keeps half-cell dimensions in export metadata', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-box')
  await waitForCadReady(page)

  const x = page.getByRole('slider', { name: 'X' })
  const y = page.getByRole('slider', { name: 'Y' })
  const height = page.getByRole('textbox', { name: '盒內淨高（Z）' })
  await x.press('ArrowLeft')
  await y.press('ArrowLeft')
  await height.fill('20')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-box-1.5x1.5-h20.step',
  )
})

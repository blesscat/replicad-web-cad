import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid stackable-box is listed and exposes the half-cell controls', async ({
  page,
}) => {
  await page.goto('/models')
  const modelLink = page.getByRole('link', { name: '使用OpenGrid 堆疊盒' })
  await expect(modelLink).toHaveAttribute('href', '/cad/opengrid-stackable-box')
  await modelLink.click()

  await expect(page).toHaveURL('/cad/opengrid-stackable-box')
  await expect(
    page.getByRole('heading', { name: '目前編輯：OpenGrid 堆疊盒' }),
  ).toBeVisible()
  await expect(page.getByText(/每格 28 mm，X\/Y 支援半格尺寸/)).toBeVisible()

  const x = page.getByRole('slider', { name: 'X' })
  const y = page.getByRole('slider', { name: 'Y' })
  const height = page.getByRole('textbox', { name: '盒體高度（Z）' })
  await expect(x).toHaveAttribute('min', '0.5')
  await expect(x).toHaveAttribute('step', '0.5')
  await expect(y).toHaveAttribute('min', '0.5')
  await expect(y).toHaveAttribute('step', '0.5')
  await expect(height).toHaveAttribute('min', '10')
  await expect(height).toHaveAttribute('max', '500')
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByText(/上方是連續凸導軌/)).toBeVisible()

  const targetX = page.getByRole('textbox', { name: 'X（mm）' })
  const targetY = page.getByRole('textbox', { name: 'Y（mm）' })
  await targetX.fill('28')
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
  const height = page.getByRole('textbox', { name: '盒體高度（Z）' })
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

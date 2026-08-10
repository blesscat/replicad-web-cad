import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid divider is listed with independent directional controls', async ({
  page,
}) => {
  await page.goto('/models')
  const modelLink = page.getByRole('link', { name: '使用OpenGrid 分隔塊' })
  await expect(modelLink).toHaveAttribute('href', '/cad/opengrid-divider')
  await modelLink.click()

  await expect(page).toHaveURL('/cad/opengrid-divider')
  await expect(
    page.getByRole('heading', { name: '目前編輯：OpenGrid 分隔塊' }),
  ).toBeVisible()
  await expect(page.getByText(/自製底座半格 7 mm、整格 14 mm/)).toHaveCount(0)
  await expect(page.getByText(/中心距 28 mm/)).toHaveCount(0)
  await expect(page.getByTestId('opengrid-divider-summary')).toHaveCount(0)
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByText(/Full|Lite|Heavy|螺絲|接頭孔/)).toHaveCount(0)

  for (const name of ['左臂（X）', '右臂（X）', '上臂（Y）', '下臂（Y）']) {
    await expect(page.getByRole('slider', { name })).toHaveAttribute('min', '0')
    await expect(page.getByRole('slider', { name })).toHaveAttribute(
      'max',
      '35.5',
    )
    await expect(page.getByRole('slider', { name })).toHaveAttribute(
      'step',
      '0.5',
    )
  }
  const height = page.getByRole('textbox', { name: '分隔牆高度（Z）' })
  await expect(height).toHaveAttribute('min', '2')
  await expect(height).toHaveAttribute('max', '500')
  const wallThickness = page.getByRole('textbox', { name: '上方牆厚（Z）' })
  await expect(wallThickness).toHaveAttribute('min', '1')
  await expect(wallThickness).toHaveAttribute('max', '5')
  await expect(wallThickness).toHaveValue('2')

  await wallThickness.fill('4')
  await expect(wallThickness).toHaveValue('4')

  await page.getByRole('slider', { name: '上臂（Y）' }).press('ArrowRight')
})

test('OpenGrid divider exports the committed normalized shape', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-divider')
  await waitForCadReady(page)

  const height = page.getByRole('textbox', { name: '分隔牆高度（Z）' })
  await height.fill('24')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-divider-l1-r1-u0-d0-t2-h24.step',
  )
})

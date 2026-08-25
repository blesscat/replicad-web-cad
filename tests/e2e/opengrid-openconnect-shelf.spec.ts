import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('uses a half-degree slider and clamps it to the dynamic angle limit', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/zh-Hant/cad/opengrid-openconnect-shelf?system=wall')
  await waitForCadReady(page)

  const limit = page.getByTestId('opengrid-openconnect-shelf-angle-limit')
  const rows = page.getByRole('slider', { name: 'Y', exact: true })
  const angleSlider = page.getByRole('slider', {
    name: /列印斜面角度/,
  })
  const angleInput = page.getByRole('textbox', {
    name: /列印斜面角度/,
  })

  await expect(
    page.getByTestId('opengrid-openconnect-shelf-help'),
  ).toContainText('水平安裝面')
  await expect(limit).toContainText('目前 3 行深度可用的最大角度為 14°')
  await expect(angleSlider).toHaveAttribute('max', '14')
  await expect(angleSlider).toHaveAttribute('step', '0.5')
  await expect(angleInput).toHaveCount(0)

  await rows.fill('2')
  await expect(limit).toContainText('目前 2 行深度可用的最大角度為 20°')
  await expect(angleSlider).toHaveAttribute('max', '20')
  await angleSlider.fill('19.5')
  await waitForCadReady(page)

  await page.reload()
  await waitForCadReady(page)
  await expect(rows).toHaveValue('2')
  await expect(angleSlider).toHaveValue('19.5')

  await rows.fill('3')
  await expect(limit).toContainText('目前 3 行深度可用的最大角度為 14°')
  await expect(angleSlider).toHaveAttribute('max', '14')
  await expect(angleSlider).toHaveValue('14')
  await waitForCadReady(page)
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
})

import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid Snap Remover previews and exports without parameter controls', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/models')
  await expect(
    page.getByRole('link', { name: '使用OpenGrid Snap Remover' }),
  ).toHaveAttribute('href', '/cad/opengrid-snap-remover')
  await page.getByRole('link', { name: '使用OpenGrid Snap Remover' }).click()
  await expect(page).toHaveURL('/cad/opengrid-snap-remover')
  await expect(
    page.getByRole('heading', {
      name: '目前編輯：OpenGrid Snap Remover',
      exact: true,
    }),
  ).toBeVisible()

  const panel = page.getByTestId('cad-workspace-panel')
  await expect(panel.getByRole('textbox')).toHaveCount(0)
  await expect(panel.getByRole('slider')).toHaveCount(0)
  await expect(panel.getByRole('combobox')).toHaveCount(0)
  await expect(panel.getByRole('button', { name: '全部恢復預設' })).toHaveCount(
    0,
  )

  await waitForCadReady(page)
  await expect(page.getByTestId('cad-viewport').locator('canvas')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('snap remover.step')
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  let byteLength = 0
  for await (const chunk of stream ?? []) byteLength += chunk.length
  expect(byteLength).toBeGreaterThan(0)
})

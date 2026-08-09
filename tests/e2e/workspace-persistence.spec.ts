import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('CAD workspaces restore valid parameters independently per component', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  await page.goto('/cad/box')
  await waitForCadReady(page)
  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()

  await page.goto('/cad/modular-grid-base')
  await waitForCadReady(page)
  const rows = page.getByRole('slider', { name: 'Y' })
  const columns = page.getByRole('slider', { name: 'X' })
  await expect(rows).toHaveValue('1')
  await expect(columns).toHaveValue('1')
  await rows.press('ArrowRight')
  await columns.press('ArrowRight')
  await columns.press('ArrowRight')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('3')

  await page.goto('/cad/hsw-cell')
  await waitForCadReady(page)
  const hswRows = page.getByRole('slider', { name: 'Y' })
  const hswColumns = page.getByRole('slider', { name: 'X' })
  await expect(hswRows).toHaveValue('1')
  await expect(hswColumns).toHaveValue('1')
  await hswRows.press('ArrowRight')
  await hswRows.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await hswColumns.press('ArrowRight')
  await waitForCadReady(page)
  await page.reload()
  await waitForCadReady(page)
  await expect(hswRows).toHaveValue('3')
  await expect(hswColumns).toHaveValue('4')

  await page.goto('/cad/box')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
})

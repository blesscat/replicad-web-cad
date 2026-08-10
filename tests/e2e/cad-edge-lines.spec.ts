import { expect, test } from '@playwright/test'
import {
  readCadViewportAppearance,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

test('CAD edge overlay stays with the committed mesh across invalid input', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/cad/box')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()

  const canvas = page.getByTestId('cad-viewport').locator('canvas')
  await expect(canvas).toHaveCount(1)
  await expect(canvas).toBeVisible()
  const initialAppearance = await readCadViewportAppearance(page, canvas)
  expect(initialAppearance.modelPixelCount).toBeGreaterThan(1000)
  expect(initialAppearance.darkPixelCount).toBeGreaterThan(100)

  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25.5')
  await expect(page.getByRole('alert')).toContainText('必須是有限的整數。')
  await expect(page.getByText('預覽與目前輸入不同步')).toBeVisible()

  await expect(canvas).toHaveCount(1)
  await expect(canvas).toBeVisible()
  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 30 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 40 mm')).toBeVisible()
  const staleAppearance = await readCadViewportAppearance(page, canvas)
  expect(staleAppearance.modelPixelCount).toBeGreaterThan(
    initialAppearance.modelPixelCount * 0.75,
  )
  expect(staleAppearance.darkPixelCount).toBeGreaterThan(
    initialAppearance.darkPixelCount * 0.75,
  )

  await width.fill('25')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()

  const updatedAppearance = await readCadViewportAppearance(page, canvas)
  expect(updatedAppearance.modelPixelCount).toBeGreaterThan(1000)
  expect(updatedAppearance.darkPixelCount).toBeGreaterThan(100)
})

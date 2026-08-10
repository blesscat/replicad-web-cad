import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
} from './helpers'

test('OpenGrid Snap route exposes profiles, features, and one shared outer offset', async ({
  page,
}) => {
  await page.goto('/cad/opengrid-snap')
  await expect(page.getByTestId('opengrid-snap-panel')).toBeVisible()
  await expect(
    page.getByRole('combobox', { name: 'OpenGrid Snap 型號' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('combobox', { name: 'OpenGrid Snap 型號' })
      .locator('option'),
  ).toHaveCount(2)
  const profile = page.getByRole('combobox', { name: 'OpenGrid Snap 幾何版本' })
  await expect(profile.locator('option')).toHaveCount(2)
  const cornerHoles = page.getByRole('checkbox', {
    name: 'OpenGrid Snap 四周定位孔',
  })
  const centerRemover = page.getByRole('checkbox', {
    name: 'OpenGrid Snap 中心 remover 孔',
  })
  await expect(cornerHoles).not.toBeChecked()
  await expect(centerRemover).not.toBeChecked()
  await profile.selectOption('Directional')
  await cornerHoles.check()
  await centerRemover.check()
  await page.reload()
  await expect(profile).toHaveValue('Directional')
  await expect(cornerHoles).toBeChecked()
  await expect(centerRemover).toBeChecked()
  await profile.selectOption('Standard')
  await cornerHoles.uncheck()
  await centerRemover.uncheck()
  const offset = page.getByRole('slider', { name: '外框總增量（X/Y）' })
  await expect(offset).toHaveValue('0')
  await expect(offset).toHaveAttribute('min', '0')
  await expect(offset).toHaveAttribute('max', '1')
  await expect(offset).toHaveAttribute('step', '0.05')
  await expect(
    page.getByRole('textbox', { name: '外框總增量（X/Y）' }),
  ).toHaveCount(0)
  await expect(
    page.getByText('外框總尺寸：25.60 × 25.60 × 6.80 mm'),
  ).toBeVisible()
  const halfCellX = page.getByRole('combobox', {
    name: 'OpenGrid Snap X 半格方向',
  })
  const halfCellY = page.getByRole('combobox', {
    name: 'OpenGrid Snap Y 半格方向',
  })
  await halfCellX.selectOption('left')
  await expect(
    page.getByText('外框總尺寸：12.80 × 25.60 × 6.80 mm'),
  ).toBeVisible()
  await halfCellY.selectOption('top')
  await expect(
    page.getByText('外框總尺寸：12.80 × 12.80 × 6.80 mm'),
  ).toBeVisible()
  await expect(page.getByTestId('opengrid-snap-panel')).toContainText(
    '宿主格距：X 14 × Y 14 mm',
  )
  await halfCellX.selectOption('none')
  await halfCellY.selectOption('none')
  await expect(page.getByTestId('opengrid-panel')).toHaveCount(0)
  await expect(
    page.getByTestId('opengrid-snap-panel').getByText(/板型|格數|螺絲|連接孔/),
  ).toHaveCount(0)

  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 型號' })
    .selectOption('Lite')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await expect(
    page.getByText('外框總尺寸：25.80 × 25.80 × 3.40 mm'),
  ).toBeVisible()
})

test('OpenGrid Snap generates the complete assembly and exports the committed revision', async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-snap')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })
  await expect(page.getByLabel('寬度 X 25.6 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 25.6 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 6.8 mm')).toBeVisible()

  const offset = page.getByRole('slider', { name: '外框總增量（X/Y）' })
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await offset.press('ArrowRight')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })
  await expect(page.getByLabel('寬度 X 25.8 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 25.8 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 6.8 mm')).toBeVisible()

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe(
    'opengrid-snap-standard-full-offset0.2-xnone-ynone-corners0-center0.step',
  )

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe(
    'opengrid-snap-standard-full-offset0.2-xnone-ynone-corners0-center0.stl',
  )
  await expect
    .poll(() => readBinaryStlByteLength(stlDownload))
    .toBeGreaterThan(84)

  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 幾何版本' })
    .selectOption('Directional')
  await page.getByRole('checkbox', { name: 'OpenGrid Snap 四周定位孔' }).check()
  await page
    .getByRole('checkbox', { name: 'OpenGrid Snap 中心 remover 孔' })
    .check()
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })
  const directionalStepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const directionalStepDownload = await directionalStepDownloadPromise
  expect(directionalStepDownload.suggestedFilename()).toBe(
    'opengrid-snap-directional-full-offset0.2-xnone-ynone-corners1-center1.step',
  )
})

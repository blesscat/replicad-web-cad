import { expect, test } from '@playwright/test'
import { HEXAGONAL_COLUMN_CONFIGURATION } from '../../src/cad-contract/units'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

test('hexagonal-column orientation settings can be restored', async ({
  page,
}) => {
  await page.goto('/cad/hexagonal-column')

  const orientation = page.getByRole('combobox', { name: '擺放方向' })
  await orientation.selectOption('standing')
  const restoreOrientation = page.getByRole('button', {
    name: '復原擺放方向',
  })
  await restoreOrientation.click()
  await expect(orientation).toHaveValue(
    HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation,
  )
  await expect(restoreOrientation).toHaveCount(0)
})

test('CAD workspace exposes independent hexagonal-column parameters and exports 3 columns', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/')
  await page.getByRole('link', { name: '使用可調六角柱' }).click()
  await waitForCadReady(page)

  await expect(page).toHaveURL('/cad/hexagonal-column')
  await expect(page.getByText(/兩端固定 0.2 mm/)).toBeVisible()
  const height = page.getByRole('textbox', { name: '整體長度（X/Z）' })
  const heightSlider = page.getByRole('slider', { name: '整體長度（X/Z）' })
  const count = page.getByRole('slider', { name: '支數（Y）' })
  const gap = page.getByRole('textbox', { name: '柱間隙（Y）' })
  const gapSlider = page.getByRole('slider', { name: '柱間隙（Y）' })
  await expect(height).toHaveValue('8')
  await expect(height).toHaveAttribute('min', '1')
  await expect(height).toHaveAttribute('max', '999')
  await expect(heightSlider).toHaveAttribute('min', '1')
  await expect(heightSlider).toHaveAttribute('max', '200')
  await expect(heightSlider).toHaveValue('8')
  await expect(count).toHaveAttribute('min', '1')
  await expect(count).toHaveAttribute('max', '20')
  await expect(count).toHaveAttribute('step', '1')
  await expect(count).toHaveValue('1')
  await expect(gap).toHaveValue('1')
  await expect(gap).toHaveAttribute('min', '1')
  await expect(gap).toHaveAttribute('max', '99')
  await expect(gapSlider).toHaveAttribute('min', '1')
  await expect(gapSlider).toHaveAttribute('max', '10')
  await expect(gapSlider).toHaveValue('1')
  const orientation = page.getByRole('combobox', { name: '擺放方向' })
  await expect(orientation).toHaveValue('lying')
  await orientation.selectOption('standing')
  await expect(orientation).toHaveValue('standing')
  await waitForCadReady(page)
  await orientation.selectOption('lying')
  await expect(orientation).toHaveValue('lying')
  await waitForCadReady(page)

  await heightSlider.press('ArrowRight')
  await expect(height).toHaveValue('9')
  await height.fill('50')
  await expect(heightSlider).toHaveValue('50')
  await gapSlider.press('ArrowRight')
  await expect(gap).toHaveValue('2')
  await gap.fill('1')
  await expect(gapSlider).toHaveValue('1')

  await count.press('ArrowRight')
  await count.press('ArrowRight')
  await expect(count).toHaveValue('3')
  await waitForCadReady(page)

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe(
    'hexagonal-column-50x3-g1-lying.step',
  )
  const stepStream = await stepDownload.createReadStream()
  expect(stepStream).not.toBeNull()
  let stepByteLength = 0
  for await (const chunk of stepStream ?? []) stepByteLength += chunk.length
  expect(stepByteLength).toBeGreaterThan(0)

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe(
    'hexagonal-column-50x3-g1-lying.stl',
  )
  expect(await readBinaryStlByteLength(stlDownload)).toBeGreaterThan(84)
})

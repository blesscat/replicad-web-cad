import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

test('CAD workspace exposes the independent HSW honeycomb component and exports 2x2', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/')
  await page.getByRole('link', { name: '使用HSW 六角蜂巢' }).click()
  await waitForCadReady(page)

  await expect(page).toHaveURL('/cad/hsw-cell')
  await expect(page.getByText(/平頂六角單元/)).toBeVisible()
  await expect(page.getByText(/不套用額外圓角/)).toBeVisible()
  const rows = page.getByRole('slider', { name: 'Y' })
  const columns = page.getByRole('slider', { name: 'X' })
  await expect(rows).toHaveAttribute('min', '1')
  await expect(rows).toHaveAttribute('max', '20')
  await expect(rows).toHaveAttribute('step', '1')
  await expect(columns).toHaveAttribute('min', '1')
  await expect(columns).toHaveAttribute('max', '20')
  await expect(columns).toHaveAttribute('step', '1')
  await expect(rows).toHaveValue('1')
  await expect(columns).toHaveValue('1')

  await rows.press('ArrowRight')
  await columns.press('ArrowRight')
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('2')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 47.69 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 59 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 8 mm')).toBeVisible()

  await rows.press('ArrowRight')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
  await rows.press('ArrowLeft')
  await waitForCadReady(page)

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe('hsw-cell-2x2.step')
  const stepStream = await stepDownload.createReadStream()
  expect(stepStream).not.toBeNull()
  let stepByteLength = 0
  for await (const chunk of stepStream ?? []) stepByteLength += chunk.length
  expect(stepByteLength).toBeGreaterThan(0)

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe('hsw-cell-2x2.stl')
  expect(await readBinaryStlByteLength(stlDownload)).toBeGreaterThan(84)
})

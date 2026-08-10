import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

test('OpenGrid pillar is listed in its family and initializes with plain defaults', async ({
  page,
}) => {
  await page.goto('/models')

  const modelLink = page
    .getByRole('heading', { name: 'OpenGrid 圓柱支柱', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 OpenGrid 圓柱支柱', exact: true })
  await expect(modelLink).toHaveAttribute('href', '/cad/opengrid-pillar')
  await modelLink.click()

  await expect(page).toHaveURL('/cad/opengrid-pillar')
  await expect(
    page.getByRole('heading', { name: '目前編輯：OpenGrid 圓柱支柱' }),
  ).toBeVisible()

  const length = page.getByRole('textbox', { name: '總長度（Z）' })
  const lengthSlider = page.getByRole('slider', { name: '總長度（Z）' })
  const sixMillimetre = page.getByRole('button', { name: '6 mm', exact: true })
  const eightMillimetre = page.getByRole('button', {
    name: '8 mm',
    exact: true,
  })
  const baseConnection = page.getByRole('checkbox', { name: '連接底版用' })
  await expect(length).toBeVisible()
  await expect(page.getByText(/固定 Ø5 mm/)).toBeVisible()
  await expect(length).toHaveValue('5')
  await expect(length).toHaveAttribute('min', '3')
  await expect(length).toHaveAttribute('max', '500')
  await expect(length).toHaveAttribute('step', '1')
  await expect(lengthSlider).toHaveAttribute('min', '3')
  await expect(lengthSlider).toHaveAttribute('max', '200')
  await expect(baseConnection).not.toBeChecked()
  await expect(sixMillimetre).toHaveAttribute('aria-pressed', 'false')
  await expect(eightMillimetre).toHaveAttribute('aria-pressed', 'false')
  await sixMillimetre.click()
  await expect(length).toHaveValue('6')
  await expect(sixMillimetre).toHaveAttribute('aria-pressed', 'true')
  await eightMillimetre.click()
  await expect(length).toHaveValue('8')
  await expect(eightMillimetre).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('textbox', { name: /直徑|chamfer/i }),
  ).toHaveCount(0)
})

test('OpenGrid pillar preserves total length across base mode and exports deterministic files', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-pillar')
  await waitForCadReady(page)

  const length = page.getByRole('textbox', { name: '總長度（Z）' })
  const baseConnection = page.getByRole('checkbox', { name: '連接底版用' })
  await length.fill('500')
  await waitForCadReady(page)
  await expect(length).toHaveValue('500')

  const maximumStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const maximumStep = await maximumStepPromise
  expect(maximumStep.suggestedFilename()).toBe('pillar-500-plain.step')

  await length.fill('8')
  await waitForCadReady(page)
  await expect(length).toHaveValue('8')

  const sixMillimetre = page.getByRole('button', { name: '6 mm', exact: true })
  const eightMillimetre = page.getByRole('button', {
    name: '8 mm',
    exact: true,
  })
  await sixMillimetre.click()
  await waitForCadReady(page)
  await expect(length).toHaveValue('6')
  await eightMillimetre.click()
  await waitForCadReady(page)
  await expect(length).toHaveValue('8')

  const plainStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const plainStep = await plainStepPromise
  expect(plainStep.suggestedFilename()).toBe('pillar-8-plain.step')
  expect((await plainStep.createReadStream())?.readable).toBeTruthy()

  await length.fill('12')
  await waitForCadReady(page)
  await expect(length).toHaveValue('12')

  await baseConnection.check()
  await waitForCadReady(page)
  await expect(baseConnection).toBeChecked()

  await page.getByRole('button', { name: '8 mm', exact: true }).click()
  await waitForCadReady(page)
  await expect(length).toHaveValue('8')

  const baseStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const baseStep = await baseStepPromise
  expect(baseStep.suggestedFilename()).toBe('pillar-8-base.step')

  const stlPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stl = await stlPromise
  expect(stl.suggestedFilename()).toBe('pillar-8-base.stl')
  expect(await readBinaryStlByteLength(stl)).toBeGreaterThan(84)

  await page.reload()
  await waitForCadReady(page)
  await expect(length).toHaveValue('8')
  await expect(baseConnection).toBeChecked()
})

test('OpenGrid pillar rejects manual length above 500 mm', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-pillar')
  await waitForCadReady(page)

  const length = page.getByRole('textbox', { name: '總長度（Z）' })
  await length.fill('501')
  await expect(length).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toContainText('3–500')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeDisabled()
})

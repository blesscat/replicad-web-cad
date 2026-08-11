import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

test('OpenGrid pillar is listed in its family and exposes fixed mode radios', async ({
  page,
}) => {
  await page.goto('/models')

  const modelLink = page
    .getByRole('heading', { name: '圓柱支柱', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 圓柱支柱', exact: true })
  await expect(modelLink).toHaveAttribute(
    'href',
    /\/cad\/opengrid-pillar(?:\?system=desk)?$/,
  )
  await modelLink.click()

  await expect(page).toHaveURL(/\/cad\/opengrid-pillar(?:\?system=desk)?$/)
  await expect(
    page.getByRole('heading', { name: '目前編輯：OpenGrid 圓柱支柱' }),
  ).toBeVisible()

  const standard = page.getByRole('radio', { name: '標準版' })
  const thinShell = page.getByRole('radio', { name: '薄殼版' })
  await expect(standard).toBeVisible()
  await expect(thinShell).toBeVisible()
  await expect(standard).toBeChecked()
  await expect(thinShell).not.toBeChecked()
  await expect(page.getByText(/固定 Ø4\.5 mm/)).toBeVisible()
  await expect(page.getByText('固定總長 9 mm，適合標準底板。')).toBeVisible()
  await expect(page.getByText('固定總長 5 mm，適合薄殼板。')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveCount(0)
  await expect(page.getByRole('slider', { name: /總長度/ })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: '連接底版用' })).toHaveCount(
    0,
  )

  await thinShell.check()
  await expect(thinShell).toBeChecked()
  await expect(standard).not.toBeChecked()
})

test('OpenGrid pillar exports deterministic files for both fixed modes', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-pillar')
  await waitForCadReady(page)

  const standard = page.getByRole('radio', { name: '標準版' })
  const thinShell = page.getByRole('radio', { name: '薄殼版' })

  const standardStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const standardStep = await standardStepPromise
  expect(standardStep.suggestedFilename()).toBe('pillar-9-standard.step')
  expect((await standardStep.createReadStream())?.readable).toBeTruthy()

  await thinShell.check()
  await waitForCadReady(page)
  await expect(thinShell).toBeChecked()

  const thinShellStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const thinShellStep = await thinShellStepPromise
  expect(thinShellStep.suggestedFilename()).toBe('pillar-5-thin-shell.step')

  const stlPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stl = await stlPromise
  expect(stl.suggestedFilename()).toBe('pillar-5-thin-shell.stl')
  expect(await readBinaryStlByteLength(stl)).toBeGreaterThan(84)

  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByRole('radio', { name: '薄殼版' })).toBeChecked()
})

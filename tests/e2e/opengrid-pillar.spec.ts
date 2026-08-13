import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

const THIN_SHELL_RENDER_WARNING =
  '注意：薄殼模式會明顯降低模型渲染速度。建議先使用一般模式確認形狀，下載前再切換至薄殼模式。'

test('OpenGrid pillar is listed in its family and exposes fixed and positioning modes', async ({
  page,
}) => {
  await page.goto('/models')

  const modelLink = page
    .getByRole('heading', { name: 'Locating Post (定位柱)', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 Locating Post (定位柱)', exact: true })
  await expect(modelLink).toHaveAttribute(
    'href',
    /\/cad\/opengrid-pillar(?:\?system=desk)?$/,
  )
  await modelLink.click()

  await expect(page).toHaveURL(/\/cad\/opengrid-pillar(?:\?system=desk)?$/)
  await expect(
    page.getByRole('heading', { name: '目前編輯：Locating Post (定位柱)' }),
  ).toBeVisible()

  const standard = page.getByRole('radio', { name: '堆疊版' })
  const thinShell = page.getByRole('radio', { name: '薄殼版' })
  const positioning = page.getByRole('radio', { name: '物件定位用' })
  await expect(standard).toBeVisible()
  await expect(thinShell).toBeVisible()
  await expect(positioning).toBeVisible()
  await expect(standard).not.toBeChecked()
  await expect(thinShell).toBeChecked()
  await expect(positioning).not.toBeChecked()
  await expect(page.getByText('固定總長 9 mm')).toBeVisible()
  await expect(page.getByText('固定總長 6 mm')).toBeVisible()
  const thinShellWarning = page.getByTestId('thin-shell-render-warning')
  await expect(thinShellWarning).toHaveText(THIN_SHELL_RENDER_WARNING)
  await expect(page.getByRole('slider', { name: /X 偏移/ })).toBeVisible()
  await expect(page.getByRole('slider', { name: /Y 偏移/ })).toBeVisible()
  await expect(page.getByText(/請選擇支柱版本/)).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveCount(0)
  await expect(page.getByRole('slider', { name: /總長度/ })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: '連接底版用' })).toHaveCount(
    0,
  )

  await thinShell.check()
  await expect(thinShell).toBeChecked()
  await expect(standard).not.toBeChecked()

  await positioning.check()
  await expect(positioning).toBeChecked()
  await expect(thinShellWarning).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: /總長度/ })).toBeVisible()
  await expect(page.getByRole('slider', { name: /總長度/ })).toBeVisible()
  await standard.check()
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveCount(0)
  await expect(thinShellWarning).toHaveCount(0)
})

test('OpenGrid pillar exports deterministic files for all pillar modes', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-pillar')
  await waitForCadReady(page)

  const standard = page.getByRole('radio', { name: '堆疊版' })
  const thinShell = page.getByRole('radio', { name: '薄殼版' })
  const positioning = page.getByRole('radio', { name: '物件定位用' })

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
  expect(thinShellStep.suggestedFilename()).toBe('pillar-6-thin-shell.step')

  const stlPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stl = await stlPromise
  expect(stl.suggestedFilename()).toBe('pillar-6-thin-shell.stl')
  expect(await readBinaryStlByteLength(stl)).toBeGreaterThan(84)

  await positioning.check()
  await page.getByRole('textbox', { name: /總長度/ }).fill('25')
  await page.getByRole('textbox', { name: /X 偏移/ }).fill('0.25')
  await page.getByRole('textbox', { name: /Y 偏移/ }).fill('-0.15')
  await waitForCadReady(page)

  const positioningStepPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const positioningStep = await positioningStepPromise
  expect(positioningStep.suggestedFilename()).toBe(
    'pillar-25-positioning-x0.25-y-0.15.step',
  )

  await page.reload()
  await waitForCadReady(page)
  await expect(page.getByRole('radio', { name: '物件定位用' })).toBeChecked()
  await expect(page.getByRole('textbox', { name: /總長度/ })).toHaveValue('25')
  await expect(page.getByRole('textbox', { name: /X 偏移/ })).toHaveValue(
    '0.25',
  )
  await expect(page.getByRole('textbox', { name: /Y 偏移/ })).toHaveValue(
    '-0.15',
  )
})

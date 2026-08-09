import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('box-normal restores all settings including checkbox defaults', async ({
  page,
}) => {
  await page.goto('/cad/box-normal')

  const x = page.getByRole('slider', { name: 'X' })
  const cornerPosts = page.getByRole('checkbox', { name: '四角六角定位柱' })
  const restoreAll = page.getByRole('button', { name: '全部恢復預設' })
  await x.press('ArrowRight')
  await cornerPosts.uncheck()

  await expect(
    page.getByRole('button', { name: '復原四角六角定位柱' }),
  ).toHaveCount(0)
  await restoreAll.click()
  await expect(x).toHaveValue('2')
  await expect(cornerPosts).toBeChecked()
})

test('box-normal exposes grid controls, optional posts, persistence, and export metadata', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/')
  await page.getByRole('link', { name: '使用標準開口盒' }).click()
  await waitForCadReady(page)

  await expect(page).toHaveURL('/cad/box-normal')
  const x = page.getByRole('slider', { name: 'X' })
  const y = page.getByRole('slider', { name: 'Y' })
  const height = page.getByRole('textbox', { name: '盒體高度（Z）' })
  const heightSlider = page.getByRole('slider', { name: '盒體高度（Z）' })
  const posts = page.getByRole('checkbox', { name: '四角六角定位柱' })

  await expect(x).toHaveAttribute('min', '2')
  await expect(x).toHaveAttribute('max', '40')
  await expect(y).toHaveAttribute('min', '2')
  await expect(y).toHaveAttribute('max', '35')
  await expect(height).toHaveAttribute('min', '10')
  await expect(height).toHaveAttribute('max', '500')
  await expect(heightSlider).toHaveAttribute('min', '10')
  await expect(heightSlider).toHaveAttribute('max', '500')
  await expect(x).toHaveValue('2')
  await expect(y).toHaveValue('2')
  await expect(height).toHaveValue('10')
  await expect(posts).toBeChecked()

  await x.press('ArrowRight')
  await y.press('ArrowRight')
  await height.fill('20')
  await posts.uncheck()
  await waitForCadReady(page)

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe('box-normal-3x3-h20-plain.step')
  expect((await stepDownload.createReadStream())?.readable).toBeTruthy()

  await page.reload()
  await waitForCadReady(page)
  await expect(x).toHaveValue('3')
  await expect(y).toHaveValue('3')
  await expect(height).toHaveValue('20')
  await expect(posts).not.toBeChecked()
})

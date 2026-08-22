import { expect, test } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

test('OpenGrid organizer-box is listed and exposes the cavity controls', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/zh-Hant/models')

  const card = page
    .getByRole('heading', {
      name: 'Organizer Box (收納方盒)',
      exact: true,
    })
    .locator('..')
  await expect(
    card.getByRole('link', {
      name: '編輯 Organizer Box (收納方盒)',
      exact: true,
    }),
  ).toHaveAttribute('href', '/zh-Hant/cad/opengrid-organizer-box?system=desk')

  await page.goto('/zh-Hant/cad/opengrid-organizer-box')
  await waitForCadReady(page)

  await expect(
    page.getByRole('heading', {
      name: '目前編輯：OpenGrid Organizer Box (收納方盒)',
    }),
  ).toBeVisible()
  await expect(
    page
      .getByTestId('opengrid-organizer-box-interface-mode')
      .getByRole('radio'),
  ).toHaveCount(3)
  await expect(
    page.getByTestId('opengrid-organizer-box-spacing-mode').getByRole('radio'),
  ).toHaveCount(2)
  await expect(
    page.getByRole('textbox', { name: '孔外圍間距（Y）' }),
  ).toHaveCount(0)
  const viewport = page.getByTestId('cad-viewport')
  const initialRevision = await viewport.getAttribute('data-model-revision')
  expect(initialRevision).toBeTruthy()
  await expect(
    page.getByTestId('opengrid-organizer-box-layout-summary'),
  ).toContainText('X 2 格 × Y 2 格')

  await page.getByRole('textbox', { name: '孔外圍間距（X）' }).fill('3')
  await page.getByRole('radio', { name: '分開' }).check()
  await expect(
    page.getByRole('textbox', { name: '孔外圍間距（Y）' }),
  ).toHaveValue('3')
  await expect(
    page.getByTestId('opengrid-organizer-box-layout-summary'),
  ).toContainText('X 2.5 格 × Y 2.5 格')

  const shapes = page.getByRole('combobox', { name: '孔形狀' })
  await expect(shapes).toHaveValue('circle')
  await shapes.selectOption('hexagon')
  await expect(shapes).toHaveValue('hexagon')
  await waitForCadReady(page, 90_000)

  const interfaceMode = page.getByTestId(
    'opengrid-organizer-box-interface-mode',
  )
  const lockingCornerSeat = interfaceMode.getByRole('radio', {
    name: '鎖定角座',
  })
  await expect(lockingCornerSeat).toBeChecked()

  const revisionBeforeCornerSeat = await viewport.getAttribute(
    'data-model-revision',
  )
  await interfaceMode.getByRole('radio', { name: '四角固定座' }).check()
  await expect(
    interfaceMode.getByRole('radio', { name: '四角固定座' }),
  ).toBeChecked()
  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    revisionBeforeCornerSeat ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)

  const revisionBeforeLockingCornerSeat = await viewport.getAttribute(
    'data-model-revision',
  )
  await lockingCornerSeat.check()
  await expect(lockingCornerSeat).toBeChecked()
  await expect(
    interfaceMode.getByRole('radio', { name: '四角固定座' }),
  ).not.toBeChecked()
  await expect(
    interfaceMode.getByRole('radio', { name: '堆疊結構' }),
  ).not.toBeChecked()
  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    revisionBeforeLockingCornerSeat ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)

  const revisionBeforeStackable = await viewport.getAttribute(
    'data-model-revision',
  )
  await interfaceMode.getByRole('radio', { name: '堆疊結構' }).check()
  await expect(
    interfaceMode.getByRole('radio', { name: '堆疊結構' }),
  ).toBeChecked()
  await expect(
    interfaceMode.getByRole('radio', { name: '四角固定座' }),
  ).not.toBeChecked()

  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    revisionBeforeStackable ?? '',
    { timeout: 90_000 },
  )
  await waitForCadReady(page, 90_000)
  await expect(viewport).not.toHaveAttribute(
    'data-model-revision',
    initialRevision ?? '',
  )
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-organizer-box-2x2-hexagon-sm-independent-d20-sx3-sy3-h20-b1-istackable.step',
  )
})

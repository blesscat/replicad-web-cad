import { expect, test, type Page } from '@playwright/test'
import { skipHeadlessFirefoxWithoutWebGL, waitForCadReady } from './helpers'

const sideOpeningGroups = [
  { direction: '-Y', label: '前方' },
  { direction: '+Y', label: '後方' },
  { direction: '-X', label: '左方' },
  { direction: '+X', label: '右方' },
] as const

async function openCylinderSideOpenings(page: Page) {
  const disclosure = page.getByTestId('opengrid-cylinder-opening-disclosure')
  const summary = disclosure.locator(':scope > summary')
  await expect(summary).toHaveText('四個方向開口設定')
  if ((await disclosure.getAttribute('open')) === null) {
    await summary.click()
  }
  await expect(disclosure).toHaveAttribute('open', '')
}

async function openCylinderSideOpeningGroup(
  page: Page,
  direction: (typeof sideOpeningGroups)[number]['direction'],
) {
  const group = page.getByTestId(`opengrid-cylinder-opening-group-${direction}`)
  if ((await group.getAttribute('open')) === null) {
    await group.locator(':scope > summary').click()
  }
  await expect(group).toHaveAttribute('open', '')
}

test('OpenGrid stackable-cylinder is listed and exposes 1 mm controls', async ({
  page,
}) => {
  await page.goto('/models')
  const modelLink = page
    .getByRole('heading', { name: '可堆疊圓柱', exact: true })
    .locator('..')
    .getByRole('link', { name: '編輯 可堆疊圓柱', exact: true })
  await expect(modelLink).toHaveAttribute(
    'href',
    '/cad/opengrid-stackable-cylinder?system=desk',
  )
  await modelLink.click()

  await expect(page).toHaveURL('/cad/opengrid-stackable-cylinder?system=desk')
  await expect(
    page.getByRole('heading', { name: '目前編輯：OpenGrid 可堆疊圓柱' }),
  ).toBeVisible()
  await expect(
    page.locator('p').filter({ hasText: '這是開口圓柱容器' }),
  ).toHaveCount(0)
  await expect(page.getByRole('radio')).toHaveCount(3)
  const modeOptions = page.getByTestId('opengrid-cylinder-mode-options')
  await expect(modeOptions.getByRole('radio')).toHaveCount(3)
  await expect(
    modeOptions.locator(
      'xpath=following-sibling::p[@data-testid="opengrid-cylinder-mode-description"]',
    ),
  ).toHaveText('預設模式：可堆疊，使用標準8mm固定柱')
  await expect(page.getByRole('radio', { name: '預設模式' })).toBeChecked()
  await expect(page.getByRole('radio', { name: '薄殼模式' })).not.toBeChecked()
  await expect(page.locator('p').filter({ hasText: '目前模式：' })).toHaveCount(
    0,
  )
  await expect(page.locator('p').filter({ hasText: '底部孔洞：' })).toHaveCount(
    0,
  )
  await expect(
    page.getByRole('checkbox', { name: '開啟底部全部孔洞', exact: true }),
  ).toBeChecked()
  const openingDisclosure = page.getByTestId(
    'opengrid-cylinder-opening-disclosure',
  )
  await expect(openingDisclosure).toBeVisible()
  await expect(openingDisclosure).not.toHaveAttribute('open', '')
  await openCylinderSideOpenings(page)

  const diameter = page.getByRole('slider', { name: '外徑（直徑）' })
  const height = page.getByRole('slider', { name: '高度（Z）' })
  const heightInput = page.getByRole('textbox', { name: '高度（Z）' })
  await expect(diameter).toHaveAttribute('min', '20')
  await expect(diameter).toHaveAttribute('max', '300')
  await expect(diameter).toHaveAttribute('step', '1')
  await expect(height).toHaveAttribute('min', '10')
  await expect(height).toHaveAttribute('max', '200')
  await expect(height).toHaveAttribute('step', '1')
  await expect(heightInput).toHaveAttribute('min', '10')
  await expect(heightInput).toHaveAttribute('max', '500')
  for (const [index, { direction, label }] of sideOpeningGroups.entries()) {
    const group = page.getByTestId(
      `opengrid-cylinder-opening-group-${direction}`,
    )
    await expect(group).toBeVisible()
    await expect(group.locator('summary')).toHaveText(label)
    if (index === 0) {
      await expect(group).toHaveAttribute('open', '')
    } else {
      await expect(group).not.toHaveAttribute('open', '')
    }
  }
  for (const { direction, label } of sideOpeningGroups) {
    await openCylinderSideOpeningGroup(page, direction)
    const group = page.getByTestId(
      `opengrid-cylinder-opening-group-${direction}`,
    )
    await expect(group.getByRole('slider')).toHaveCount(3)
    await expect(
      group.getByRole('textbox', { name: `切口底部長度（${label}）` }),
    ).toHaveValue('1')
    await expect(
      group.getByRole('slider', { name: `下切深度（${label}）` }),
    ).toHaveAttribute('max', '25')
    await expect(
      group.getByRole('slider', { name: `側壁角度（${label}）` }),
    ).toHaveAttribute('min', '1')
    await expect(
      group.getByRole('slider', { name: `側壁角度（${label}）` }),
    ).toHaveAttribute('max', '90')
    await expect(
      group.getByRole('slider', { name: `側壁角度（${label}）` }),
    ).toHaveAttribute('step', '1')
    await expect(
      group.getByRole('slider', { name: `側壁角度（${label}）` }),
    ).toHaveAttribute('dir', 'rtl')
  }
  const rightDepth = page.getByRole('textbox', { name: '下切深度（右方）' })
  const rightBottomLength = page.getByRole('slider', {
    name: '切口底部長度（右方）',
  })
  await rightDepth.fill('12')
  await expect(rightBottomLength).toHaveAttribute('min', '1')
  await expect(rightBottomLength).toHaveAttribute('max', '45')
  await page.getByRole('textbox', { name: '切口底部長度（右方）' }).fill('1')
  await page.getByRole('textbox', { name: '高度（Z）' }).fill('20')
  for (const { direction, label } of sideOpeningGroups) {
    await expect(
      page
        .getByTestId(`opengrid-cylinder-opening-group-${direction}`)
        .getByRole('slider', { name: `下切深度（${label}）` }),
    ).toHaveAttribute('max', '15')
  }
  await page.getByRole('radio', { name: '薄殼模式' }).check()
  for (const { direction, label } of sideOpeningGroups) {
    await expect(
      page
        .getByTestId(`opengrid-cylinder-opening-group-${direction}`)
        .getByRole('slider', { name: `下切深度（${label}）` }),
    ).toHaveAttribute('max', '18')
  }
  await diameter.press('ArrowRight')
  await expect(diameter).toHaveValue('57')
})

test('OpenGrid stackable-cylinder keeps four opening groups independent and restorable', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-cylinder')
  await openCylinderSideOpenings(page)
  await openCylinderSideOpeningGroup(page, '+X')
  await openCylinderSideOpeningGroup(page, '-X')

  const rightDepth = page.getByRole('textbox', { name: '下切深度（右方）' })
  const rightLength = page.getByRole('textbox', {
    name: '切口底部長度（右方）',
  })
  const leftDepth = page.getByRole('textbox', { name: '下切深度（左方）' })
  const leftLength = page.getByRole('textbox', {
    name: '切口底部長度（左方）',
  })
  await rightDepth.fill('5')
  await expect(rightDepth).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#openingPlusXDepth-error')).toContainText(
    '固定 2.5 mm 圓角',
  )
  await rightDepth.fill('8')
  await expect(rightDepth).toHaveAttribute('aria-invalid', 'false')
  await expect(
    page.getByRole('textbox', { name: '切口底部長度（右方）' }),
  ).toHaveAttribute('aria-invalid', 'false')
  await rightLength.fill('12')
  await page.getByRole('textbox', { name: '側壁角度（右方）' }).fill('70')
  await leftDepth.fill('9')
  await leftLength.fill('10')
  await waitForCadReady(page)
  await expect(rightDepth).toHaveValue('8')
  await expect(leftDepth).toHaveValue('9')

  await page.getByRole('button', { name: '復原下切深度（右方）' }).click()
  await expect(rightDepth).toHaveValue('0')
  await expect(leftDepth).toHaveValue('9')
  await waitForCadReady(page)

  await page.reload()
  await waitForCadReady(page)
  await openCylinderSideOpenings(page)
  await openCylinderSideOpeningGroup(page, '+X')
  await openCylinderSideOpeningGroup(page, '-X')
  await expect(leftDepth).toHaveValue('9')
  await expect(rightDepth).toHaveValue('0')
})

test('OpenGrid stackable-cylinder updates and exports deterministic metadata', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('slider', { name: '外徑（直徑）' }).press('ArrowRight')
  await page.getByRole('textbox', { name: '高度（Z）' }).fill('31')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d57-h31.step',
  )
})

test('OpenGrid stackable-cylinder exports the selected thin and no-hole state', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('radio', { name: '薄殼模式' }).check()
  await page
    .getByRole('checkbox', { name: '開啟底部全部孔洞', exact: true })
    .uncheck()
  await expect(
    page.getByTestId('opengrid-cylinder-mode-description'),
  ).toHaveText('薄殼模式：可堆疊，2 mm 底厚、1.6 mm 壁厚')
  await expect(page.locator('p').filter({ hasText: '底部孔洞：' })).toHaveCount(
    0,
  )
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d56-h30-thin-no-holes.step',
  )
})

test('OpenGrid stackable-cylinder export identity includes enabled opening settings', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)
  await openCylinderSideOpenings(page)
  await openCylinderSideOpeningGroup(page, '+X')

  await page.getByRole('textbox', { name: '下切深度（右方）' }).fill('8')
  await page.getByRole('textbox', { name: '切口底部長度（右方）' }).fill('12')
  await page.getByRole('textbox', { name: '側壁角度（右方）' }).fill('70')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d56-h30-open-8-12-70_0-1-90_0-1-90_0-1-90.step',
  )
})

test('OpenGrid stackable-cylinder exports the clipped bottom-plate mode', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-stackable-cylinder')
  await waitForCadReady(page)

  await page.getByRole('radio', { name: '薄殼模式' }).check()
  await waitForCadReady(page)
  await page.getByRole('radio', { name: '底版模式' }).check()
  await expect(page.getByRole('radio', { name: '薄殼模式' })).not.toBeChecked()
  await expect(
    page.getByTestId('opengrid-cylinder-mode-description'),
  ).toHaveText('底版模式：不可堆疊，使用6mm固定柱')
  await waitForCadReady(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'opengrid-stackable-cylinder-d56-h30-bottom-plate.step',
  )
})

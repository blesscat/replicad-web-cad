import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'
import { OPENGRID_CONFIGURATION } from '../../src/cad-contract/units'

test('Desk OpenGrid board starts with a 4 by 4 grid when no value is saved', async ({
  page,
}) => {
  await page.goto('/cad/opengrid?system=desk')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue('4')
  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('4')
})

test('OpenGrid CAD route exposes typed controls and the custom matrix', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')
  await expect(page.getByTestId('opengrid-panel')).toBeVisible()
  await expect(
    page.getByRole('combobox', { name: 'OpenGrid 板型' }),
  ).toBeVisible()
  expect(
    await page
      .getByRole('combobox', { name: 'OpenGrid 板型' })
      .locator('option')
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
  ).toEqual(['Lite', 'Full', 'Heavy', 'Hybrid'])
  await page
    .getByRole('combobox', { name: 'OpenGrid 板型' })
    .selectOption('Hybrid')
  await expect(page.getByText('尺寸：56 × 56 × 13.8 mm')).toBeVisible()
  await expect(page.getByTestId('opengrid-hybrid-description')).toBeVisible()
  await page
    .getByRole('combobox', { name: 'OpenGrid 板型' })
    .selectOption('Lite')
  const rows = page.getByRole('slider', { name: 'Y' })
  const columns = page.getByRole('slider', { name: 'X' })
  await expect(rows).toHaveValue('2')
  await expect(columns).toHaveValue('2')
  expect(
    await page
      .getByTestId('opengrid-panel')
      .locator('input[type="range"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('aria-label')),
      ),
  ).toEqual(['X', 'Y'])
  await expect(page.getByTestId('grid-dimension-calculator')).toBeVisible()
  await expect(page.getByText('尺寸：56 × 56 × 4 mm')).toBeVisible()
  const halfCellX = page.getByRole('combobox', {
    name: 'OpenGrid X 半格方向',
  })
  const halfCellY = page.getByRole('combobox', {
    name: 'OpenGrid Y 半格方向',
  })
  await halfCellX.selectOption('right')
  await expect(columns).toHaveValue('2.5')
  await expect(columns).toHaveAttribute('min', '1')
  await expect(columns).toHaveAttribute(
    'max',
    String(OPENGRID_CONFIGURATION.maxGridCount + 0.5),
  )
  await expect(columns).toHaveAttribute('step', '0.5')
  await expect(page.getByText('X 2.5 格')).toBeVisible()
  await columns.press('ArrowRight')
  await expect(columns).toHaveValue('3.5')
  await expect(page.getByText('X 3.5 格')).toBeVisible()
  await columns.press('ArrowLeft')
  await expect(columns).toHaveValue('2.5')
  await expect(page.getByText('尺寸：70 × 56 × 4 mm')).toBeVisible()
  await halfCellY.selectOption('top')
  await expect(page.getByText('尺寸：70 × 70 × 4 mm')).toBeVisible()
  await halfCellX.selectOption('left')
  await expect(page.getByText('尺寸：70 × 70 × 4 mm')).toBeVisible()
  await halfCellX.selectOption('none')
  await halfCellY.selectOption('none')
  const screwSource = page.getByRole('combobox', {
    name: 'OpenGrid 螺絲尺寸來源',
  })
  const woodScrewDescription = page.getByText(
    '木螺絲預設採 90° 沉頭；板厚或格內淨空不足的規格會停用。',
    { exact: true },
  )
  const advancedSettings = page.getByRole('checkbox', { name: '進階設定' })
  const screwDiameter = page.getByRole('spinbutton', {
    name: 'OpenGrid 螺絲通孔直徑',
  })
  await expect(
    screwSource.locator('option[value="official-default"]'),
  ).toHaveText(/官方 SCAD 預設/)
  await expect(advancedSettings).toHaveCount(0)
  await expect(screwDiameter).toHaveCount(0)
  await expect(
    page.getByRole('checkbox', { name: 'OpenGrid 是否沉頭' }),
  ).toHaveCount(0)
  await expect(woodScrewDescription).toHaveCount(0)
  await screwSource.selectOption('custom')
  await expect(woodScrewDescription).toHaveCount(0)
  await expect(advancedSettings).toBeVisible()
  await expect(advancedSettings).toBeChecked()
  await expect(screwDiameter).toBeVisible()
  await expect(
    page.getByRole('checkbox', { name: 'OpenGrid 是否沉頭' }),
  ).toBeVisible()
  for (const label of [
    'OpenGrid 螺絲通孔直徑',
    'OpenGrid 螺絲頭直徑',
    'OpenGrid 螺絲頭內縮',
    'OpenGrid 螺絲沉頭角度',
  ]) {
    await expect(
      page.getByRole('button', { name: `復原${label}` }),
    ).toHaveCount(0)
  }
  await screwSource.selectOption('m5')
  await expect(woodScrewDescription).toBeVisible()
  await expect(
    page.getByRole('spinbutton', { name: 'OpenGrid 螺絲通孔直徑' }),
  ).toHaveValue(String(OPENGRID_CONFIGURATION.screwPresets.m5.diameter))
  await expect(
    page.getByRole('spinbutton', { name: 'OpenGrid 螺絲頭直徑' }),
  ).toHaveValue(String(OPENGRID_CONFIGURATION.screwPresets.m5.headDiameter))
  await screwSource.selectOption('official-default')
  await expect(screwSource).toHaveValue('official-default')
  await expect(woodScrewDescription).toHaveCount(0)
  await expect(advancedSettings).toHaveCount(0)
  await expect(screwDiameter).toHaveCount(0)
  const centerScrew = page.getByRole('checkbox', {
    name: 'OpenGrid 正中心螺絲孔',
  })
  await expect(centerScrew).toBeEnabled()
  await centerScrew.check()
  await expect(centerScrew).toBeChecked()
  const screwEvery = page.getByRole('spinbutton', {
    name: 'OpenGrid 每隔幾格一個螺絲孔',
  })
  await screwEvery.fill('2')
  await expect(screwEvery).toHaveValue('2')
  await page
    .getByRole('combobox', { name: 'OpenGrid 螺絲孔模式' })
    .selectOption('custom')
  await expect(page.getByTestId('opengrid-custom-matrix')).toBeVisible()
  await expect(
    page.getByRole('button', { name: '內部交界第 1 行第 1 列' }),
  ).toBeVisible()
})

test('OpenGrid enables the center screw on odd grids using the official corner configuration', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')

  const columns = page.getByRole('slider', { name: 'X' })
  const rows = page.getByRole('slider', { name: 'Y' })
  const centerScrew = page.getByRole('checkbox', {
    name: 'OpenGrid 正中心螺絲孔',
  })

  await columns.press('ArrowRight')
  await rows.press('ArrowRight')
  await expect(columns).toHaveValue('3')
  await expect(rows).toHaveValue('3')
  await expect(
    page.getByRole('combobox', { name: 'OpenGrid 螺絲孔模式' }),
  ).toHaveValue('corners')
  await expect(centerScrew).toBeEnabled()
  await centerScrew.check()
  await expect(centerScrew).toBeChecked()

  await columns.fill('1')
  await expect(centerScrew).toBeDisabled()
})

test('OpenGrid changed settings can be restored independently', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')

  const variant = page.getByRole('combobox', { name: 'OpenGrid 板型' })
  await variant.selectOption('Full')
  const restoreVariant = page.getByRole('button', {
    name: '復原OpenGrid 板型',
  })
  await expect(restoreVariant).toBeVisible()
  await restoreVariant.click()
  await expect(variant).toHaveValue(
    OPENGRID_CONFIGURATION.defaultParameters.variant,
  )
  await expect(restoreVariant).toHaveCount(0)

  const rows = page.getByRole('slider', { name: 'Y' })
  await rows.press('ArrowRight')
  const restoreRows = page.getByRole('button', { name: '復原Y' })
  await expect(restoreRows).toBeVisible()
  await restoreRows.click()
  await expect(rows).toHaveValue(
    String(OPENGRID_CONFIGURATION.defaultParameters.rows),
  )
  await expect(restoreRows).toHaveCount(0)

  const connectorHoles = page.getByRole('combobox', { name: 'OpenGrid 連接孔' })
  await connectorHoles.selectOption('none')
  const restoreConnectorHoles = page.getByRole('button', {
    name: '復原OpenGrid 連接孔',
  })
  await restoreConnectorHoles.click()
  await expect(connectorHoles).toHaveValue('enabled')

  const topSide = page.getByRole('checkbox', { name: '上', exact: true })
  await topSide.uncheck()
  await expect(
    page.getByRole('button', { name: '復原OpenGrid 接頭孔上側' }),
  ).toHaveCount(0)

  const screwSource = page.getByRole('combobox', {
    name: 'OpenGrid 螺絲尺寸來源',
  })
  await screwSource.selectOption('m5')
  const restoreScrewSource = page.getByRole('button', {
    name: '復原OpenGrid 螺絲尺寸來源',
  })
  await restoreScrewSource.click()
  await expect(screwSource).toHaveValue('official-default')
  await expect(restoreScrewSource).toHaveCount(0)

  await page
    .getByRole('combobox', { name: 'OpenGrid 螺絲孔模式' })
    .selectOption('by-row-column')
  const everyRows = page.getByRole('spinbutton', {
    name: 'OpenGrid 每幾行螺絲孔',
  })
  await everyRows.fill('2')
  const restoreEveryRows = page.getByRole('button', {
    name: '復原OpenGrid 每幾行螺絲孔',
  })
  await restoreEveryRows.click()
  await expect(everyRows).toHaveValue(
    String(OPENGRID_CONFIGURATION.defaultParameters.screwEveryRows),
  )

  const centerScrew = page.getByRole('checkbox', {
    name: 'OpenGrid 正中心螺絲孔',
  })
  await centerScrew.check()
  await expect(
    page.getByRole('button', { name: '復原OpenGrid 正中心螺絲孔' }),
  ).toHaveCount(0)

  await page
    .getByRole('combobox', { name: 'OpenGrid 螺絲孔模式' })
    .selectOption('custom')
  const customPosition = page.getByRole('button', {
    name: '內部交界第 1 行第 1 列',
  })
  await customPosition.click()
  const restoreCustomPositions = page.getByRole('button', {
    name: '復原OpenGrid 自訂內部交界螺絲孔',
  })
  await restoreCustomPositions.click()
  await expect(customPosition).toHaveAttribute('aria-pressed', 'false')
  await expect(restoreCustomPositions).toHaveCount(0)
})

test('OpenGrid restores all settings including boolean defaults', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')

  const variant = page.getByRole('combobox', { name: 'OpenGrid 板型' })
  const rows = page.getByRole('slider', { name: 'Y' })
  const targetX = page
    .getByTestId('grid-dimension-calculator')
    .getByRole('textbox', { name: '目標 X（mm）' })
  const topSide = page.getByRole('checkbox', { name: '上', exact: true })
  const centerScrew = page.getByRole('checkbox', {
    name: 'OpenGrid 正中心螺絲孔',
  })

  await variant.selectOption('Full')
  await targetX.fill('84')
  await topSide.uncheck()
  await centerScrew.check()

  await page.getByRole('button', { name: '全部恢復預設' }).click()

  await expect(variant).toHaveValue(
    OPENGRID_CONFIGURATION.defaultParameters.variant,
  )
  await expect(rows).toHaveValue(
    String(OPENGRID_CONFIGURATION.defaultParameters.rows),
  )
  await expect(targetX).toHaveValue('')
  await expect(topSide).toBeChecked()
  await expect(centerScrew).not.toBeChecked()
})

test('OpenGrid workspace edits typed parameters and keeps export tied to the committed revision', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid')
  await waitForCadReady(page)

  await expect(
    page.getByRole('combobox', { name: 'CAD component' }),
  ).toHaveCount(0)
  await expect(page.getByLabel('寬度 X 56 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 56 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 4 mm')).toBeVisible()

  await page
    .getByRole('combobox', { name: 'OpenGrid 板型' })
    .selectOption('Lite')
  const rows = page.getByRole('slider', { name: 'Y' })
  const columns = page.getByRole('slider', { name: 'X' })
  await expect(rows).toHaveAttribute('min', '1')
  await expect(rows).toHaveAttribute(
    'max',
    String(OPENGRID_CONFIGURATION.maxGridCount),
  )
  await expect(rows).toHaveAttribute('step', '1')
  await expect(columns).toHaveAttribute('min', '1')
  await expect(columns).toHaveAttribute(
    'max',
    String(OPENGRID_CONFIGURATION.maxGridCount),
  )
  await expect(columns).toHaveAttribute('step', '1')
  await columns.press('ArrowRight')
  await expect(columns).toHaveValue('3')
  await page
    .getByRole('combobox', { name: 'OpenGrid 螺絲尺寸來源' })
    .selectOption('custom')
  const screwMode = page.getByRole('combobox', { name: 'OpenGrid 螺絲孔模式' })
  await screwMode.selectOption('corners')
  await expect(screwMode).toHaveValue('corners')
  await screwMode.selectOption('everywhere')
  await expect(screwMode).toHaveValue('everywhere')
  await screwMode.selectOption('custom')
  await expect(page.getByTestId('opengrid-custom-matrix')).toBeVisible()

  const northEast = page.getByRole('button', {
    name: '內部交界第 1 行第 1 列',
  })
  await northEast.click()
  await expect(northEast).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('已選 1 孔')).toBeVisible()

  await page
    .getByRole('combobox', { name: 'OpenGrid 連接孔' })
    .selectOption('enabled')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 84 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 56 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 4 mm')).toBeVisible()

  await waitForCadReady(page)
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '下載 STL' })).toBeEnabled()

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toMatch(
    /^opengrid-lite-3x2-xnone-ynone-custom-custom-corners-enabled-[0-9a-f]{8}\.step$/,
  )
  const stepStream = await stepDownload.createReadStream()
  expect(stepStream).not.toBeNull()
  let stepByteLength = 0
  for await (const chunk of stepStream ?? []) stepByteLength += chunk.length
  expect(stepByteLength).toBeGreaterThan(0)

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toMatch(
    /^opengrid-lite-3x2-xnone-ynone-custom-custom-corners-enabled-[0-9a-f]{8}\.stl$/,
  )
  expect(await readBinaryStlByteLength(stlDownload)).toBeGreaterThan(84)
})

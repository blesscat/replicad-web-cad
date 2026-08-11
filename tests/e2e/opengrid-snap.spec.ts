import { expect, test } from '@playwright/test'
import {
  readBinaryStlByteLength,
  skipHeadlessFirefoxWithoutWebGL,
} from './helpers'

test('OpenGrid Snap route exposes profiles, features, and one shared outer offset', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const captures: unknown[] = []
    ;(
      window as Window & { __cadModelGenerateCaptures?: unknown[] }
    ).__cadModelGenerateCaptures = captures
    const originalPostMessage = Worker.prototype.postMessage as (
      this: Worker,
      message: unknown,
      transfer?: Transferable[] | StructuredSerializeOptions,
    ) => void
    Worker.prototype.postMessage = function (message, transfer) {
      if (
        typeof message === 'object' &&
        message !== null &&
        'kind' in message &&
        message.kind === 'model.generate'
      ) {
        captures.push(message)
      }
      return originalPostMessage.call(this, message, transfer)
    }
  })
  await page.goto('/cad/opengrid-snap')
  await expect(page.getByTestId('opengrid-snap-panel')).toBeVisible()
  const variant = page.getByRole('combobox', { name: 'OpenGrid Snap 型號' })
  await expect(variant).toBeVisible()
  await expect(variant.locator('option').nth(0)).toHaveAttribute(
    'value',
    'Lite',
  )
  await expect(variant.locator('option').nth(1)).toHaveAttribute(
    'value',
    'Full',
  )
  const profile = page.getByRole('combobox', { name: 'OpenGrid Snap 幾何版本' })
  await expect(profile.locator('option')).toHaveCount(2)
  const cornerHoles = page.getByRole('checkbox', {
    name: '定位孔',
  })
  const centerRemover = page.getByRole('checkbox', {
    name: '移除孔',
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
  await expect(page.getByTestId('opengrid-snap-panel')).not.toContainText(
    '外框總尺寸',
  )
  const footprint = page.getByRole('combobox', {
    name: 'OpenGrid Snap 格型',
  })
  await expect(footprint.locator('option')).toHaveCount(3)
  await expect(page.getByText('格型測試中 不保證可使用')).toHaveCount(0)
  await expect(
    page.getByRole('combobox', { name: /Snap.*半格方向|Snap.*X|Snap.*Y/ }),
  ).toHaveCount(0)
  await footprint.selectOption('half')
  await expect(page.getByText('格型測試中 不保證可使用')).toBeVisible()
  await footprint.selectOption('quarter')
  await expect(page.getByText('格型測試中 不保證可使用')).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const captures = (
          window as Window & { __cadModelGenerateCaptures?: unknown[] }
        ).__cadModelGenerateCaptures
        return captures?.at(-1) ?? null
      }),
    )
    .toMatchObject({
      kind: 'model.generate',
      modelId: 'opengrid-snap',
      parameters: {
        footprint: 'quarter',
        profile: 'Standard',
        variant: 'Full',
        offset: 0,
        fourCornerLocatingHoles: false,
        centerRemoverHole: false,
      },
    })
  const latestGenerate = await page.evaluate(() => {
    const captures = (
      window as Window & { __cadModelGenerateCaptures?: unknown[] }
    ).__cadModelGenerateCaptures
    return captures?.at(-1) as Record<string, unknown> | undefined
  })
  const latestParameters = latestGenerate?.parameters as
    Record<string, unknown> | undefined
  expect(latestParameters).not.toHaveProperty('halfCellX')
  expect(latestParameters).not.toHaveProperty('halfCellY')
  await page.reload()
  await expect(footprint).toHaveValue('quarter')
  const persistedSnap = await page.evaluate(() => {
    const raw = localStorage.getItem('shape-shortcut.component-parameters')
    if (!raw) return null
    const payload = JSON.parse(raw) as {
      values?: Record<string, Record<string, unknown>>
    }
    return payload.values?.['opengrid-snap'] ?? null
  })
  expect(persistedSnap).toMatchObject({ footprint: 'quarter' })
  expect(persistedSnap).not.toHaveProperty('halfCellX')
  expect(persistedSnap).not.toHaveProperty('halfCellY')
  await footprint.selectOption('full')
  await expect(page.getByText('格型測試中 不保證可使用')).toHaveCount(0)
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
    'opengrid-snap-standard-full-offset0.2-full-corners0-center0.step',
  )

  const stlDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STL' }).click()
  const stlDownload = await stlDownloadPromise
  expect(stlDownload.suggestedFilename()).toBe(
    'opengrid-snap-standard-full-offset0.2-full-corners0-center0.stl',
  )
  await expect
    .poll(() => readBinaryStlByteLength(stlDownload))
    .toBeGreaterThan(84)

  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 幾何版本' })
    .selectOption('Directional')
  await page.getByRole('checkbox', { name: '定位孔' }).check()
  await page.getByRole('checkbox', { name: '移除孔' }).check()
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })
  const directionalStepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const directionalStepDownload = await directionalStepDownloadPromise
  expect(directionalStepDownload.suggestedFilename()).toBe(
    'opengrid-snap-directional-full-offset0.2-full-corners1-center1.step',
  )
})

test('OpenGrid Snap commits the user-reported Directional Lite offset build', async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000)
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/opengrid-snap')
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 90_000,
  })

  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 型號' })
    .selectOption('Lite')
  await page
    .getByRole('combobox', { name: 'OpenGrid Snap 幾何版本' })
    .selectOption('Directional')
  await page.getByRole('checkbox', { name: '定位孔' }).check()
  await page.getByRole('checkbox', { name: '移除孔' }).check()

  const offset = page.getByRole('slider', { name: '外框總增量（X/Y）' })
  for (let step = 0; step < 7; step += 1) {
    await offset.press('ArrowRight')
  }
  await expect(offset).toHaveValue('0.35')
  await expect(page.getByLabel('寬度 X 25.95 mm')).toBeVisible({
    timeout: 90_000,
  })
  await expect(page.getByLabel('深度 Y 26.35 mm')).toBeVisible()

  const stepDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '下載 STEP' }).click()
  const stepDownload = await stepDownloadPromise
  expect(stepDownload.suggestedFilename()).toBe(
    'opengrid-snap-directional-lite-offset0.35-full-corners1-center1.step',
  )
})

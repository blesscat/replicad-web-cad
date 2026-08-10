import { createHash } from 'node:crypto'
import { devices, expect, test } from '@playwright/test'
import {
  dispatchMobileTouchDrag,
  dispatchMobileTouchFrames,
  readCadViewportAppearance,
  type MobileTouchFrame,
  waitForCadReady,
} from './helpers'

const CHROMIUM_MOBILE_DEVICE = {
  userAgent: devices['iPhone 13'].userAgent,
  viewport: devices['iPhone 13'].viewport,
  deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
  isMobile: devices['iPhone 13'].isMobile,
  hasTouch: devices['iPhone 13'].hasTouch,
}

test.use(CHROMIUM_MOBILE_DEVICE)

function screenshotHash(image: Buffer): string {
  return createHash('sha256').update(image).digest('hex')
}

function createTwoFingerSpreadFrames(box: {
  x: number
  y: number
  width: number
  height: number
}): MobileTouchFrame[] {
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height * 0.45
  const frames: MobileTouchFrame[] = []
  const frameCount = 8

  for (let step = 0; step <= frameCount; step += 1) {
    const offset = 40 + step * 4
    frames.push([
      { x: centerX - offset, y: centerY },
      { x: centerX + offset, y: centerY },
    ])
  }

  return frames
}

test('mobile CAD preview keeps one-finger orbit active until release', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Mobile touch coverage runs on Chromium')

  await page.goto('/cad/box')
  await waitForCadReady(page)

  const canvas = page.getByTestId('cad-viewport').locator('canvas')
  const before = screenshotHash(await canvas.screenshot())
  const report = await dispatchMobileTouchDrag(page, canvas)
  const after = screenshotHash(await canvas.screenshot())

  expect(report.pointerDownCount).toBe(1)
  expect(report.pointerCancelCount).toBe(0)
  expect(report.pointerUpCount).toBe(1)
  expect(report.pointerMoveCount).toBeGreaterThanOrEqual(10)
  expect(report.lastPointerMove).not.toBeNull()
  if (!report.lastPointerMove) throw new Error('Expected a final pointer move')
  expect(report.lastPointerMove.x).toBeGreaterThanOrEqual(report.end.x - 1)
  expect(after).not.toBe(before)
})

test('mobile page scrolling remains available outside the CAD preview', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Mobile touch coverage runs on Chromium')

  await page.goto('/cad/box')
  await waitForCadReady(page)
  await page.evaluate(() => window.scrollTo(0, 0))

  const documentHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  )
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  expect(documentHeight).toBeGreaterThan(viewportHeight)

  const heading = page.getByRole('heading', {
    name: '目前編輯：方塊',
    exact: true,
  })
  await dispatchMobileTouchDrag(page, heading, {
    start: [0.5, 0.5],
    delta: [0, -220],
    steps: 12,
  })

  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)
})

test('mobile CAD preview keeps the existing two-finger viewport gesture active', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Mobile touch coverage runs on Chromium')

  await page.goto('/cad/box')
  await waitForCadReady(page)

  const canvas = page.getByTestId('cad-viewport').locator('canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) throw new Error('Expected a visible CAD viewport canvas')

  const before = await readCadViewportAppearance(page, canvas)
  const report = await dispatchMobileTouchFrames(
    page,
    createTwoFingerSpreadFrames(box),
  )
  const after = await readCadViewportAppearance(page, canvas)

  expect(report.pointerDownCount).toBe(2)
  expect(report.pointerCancelCount).toBe(0)
  expect(report.pointerUpCount).toBe(2)
  expect(report.pointerMoveCount).toBeGreaterThanOrEqual(14)
  expect(after.modelPixelCount).toBeGreaterThan(before.modelPixelCount * 1.05)
})

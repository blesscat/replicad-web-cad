import { expect, test, type Locator, type Page } from '@playwright/test'
import { CAD_VIEWPORT_GIZMO } from '../../src/features/cad/viewport/config'
import {
  orbitCadViewport,
  skipHeadlessFirefoxWithoutWebGL,
  waitForCadReady,
} from './helpers'

const GIZMO_SELECTOR = `#${CAD_VIEWPORT_GIZMO.id}`

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

function getGizmo(page: Page): Locator {
  return page.getByTestId('cad-viewport').locator(GIZMO_SELECTOR)
}

async function readRect(locator: Locator): Promise<Rect> {
  const rect = await locator.boundingBox()
  expect(rect).not.toBeNull()
  if (!rect) throw new Error('Expected a visible viewport gizmo')
  return rect
}

function expectRectToBeStable(before: Rect, after: Rect): void {
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1)
}

function expectRectInside(inner: Rect, outer: Rect): void {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x)
  expect(inner.y).toBeGreaterThanOrEqual(outer.y)
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width)
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height)
}

function expectRectsNotToOverlap(first: Rect, second: Rect): void {
  const separated =
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  expect(separated).toBe(true)
}

test('CAD viewport shows the XYZ orientation gizmo for box and OpenGrid', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)

  for (const fixture of [
    { route: '/cad/box', screenshot: 'box-initial.png' },
    { route: '/cad/opengrid', screenshot: 'opengrid-initial.png' },
  ]) {
    await page.goto(fixture.route)
    await waitForCadReady(page)

    const gizmo = getGizmo(page)
    await expect(gizmo).toHaveCount(1)
    await expect(gizmo).toBeVisible()
    await expect(gizmo).toHaveScreenshot(fixture.screenshot, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    })

    const viewportRect = await readRect(page.getByTestId('cad-viewport'))
    const gizmoRect = await readRect(gizmo)
    expectRectInside(gizmoRect, viewportRect)
  }
})

test('XYZ orientation gizmo follows orbit and stays anchored through model updates', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const gizmo = getGizmo(page)
  const initialRect = await readRect(gizmo)

  await orbitCadViewport(page, 'side-back')
  await expect(gizmo).toHaveScreenshot('box-side-back.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  })
  const orbitRect = await readRect(gizmo)
  expectRectToBeStable(initialRect, orbitRect)
  await expect(page.getByLabel('寬度 X 20 mm')).toBeVisible()
  await expect(page.getByLabel('深度 Y 30 mm')).toBeVisible()
  await expect(page.getByLabel('高度 Z 40 mm')).toBeVisible()

  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25')
  await waitForCadReady(page)
  await expect(page.getByLabel('寬度 X 25 mm')).toBeVisible()
  expectRectToBeStable(initialRect, await readRect(gizmo))

  await width.fill('25.5')
  await expect(page.getByRole('alert')).toContainText('必須是有限的整數。')
  await expect(page.getByText('預覽與目前輸入不同步')).toBeVisible()
  expectRectToBeStable(initialRect, await readRect(gizmo))

  await page.setViewportSize({ width: 900, height: 720 })
  await expect(gizmo).toHaveCount(1)
  expectRectInside(
    await readRect(gizmo),
    await readRect(page.getByTestId('cad-viewport')),
  )
})

test('XYZ orientation gizmo stays readable inside a narrow viewport', async ({
  page,
  browserName,
}) => {
  skipHeadlessFirefoxWithoutWebGL(browserName)
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/cad/box')
  await waitForCadReady(page)

  const viewport = page.getByTestId('cad-viewport')
  const gizmo = getGizmo(page)
  await expect(gizmo).toBeVisible()
  await expect(gizmo).toHaveScreenshot('box-narrow.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  })

  const viewportRect = await readRect(viewport)
  const gizmoRect = await readRect(gizmo)
  expectRectInside(gizmoRect, viewportRect)
  expect(
    await viewport.evaluate((element) => element.scrollWidth),
  ).toBeLessThanOrEqual(
    await viewport.evaluate((element) => element.clientWidth),
  )

  const width = page.getByRole('textbox', { name: /寬度/ })
  await width.fill('25.5')
  const staleBadge = page.getByText('預覽與目前輸入不同步')
  await expect(staleBadge).toBeVisible()
  const staleRect = await readRect(staleBadge)
  expectRectsNotToOverlap(gizmoRect, staleRect)
})

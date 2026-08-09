import { expect, test } from '@playwright/test'

test('desktop parameter menu scrolls independently from the model viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/cad/opengrid')

  const panel = page.getByTestId('cad-workspace-panel')
  const viewport = page.getByTestId('cad-viewport')
  const workspace = page.getByTestId('cad-workspace')
  await expect(panel).toBeVisible()
  await expect(viewport).toBeVisible()

  const selectionColumnWidth = await workspace.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).gridTemplateColumns),
  )
  expect(selectionColumnWidth).toBeLessThanOrEqual(320)

  const panelMetrics = await panel.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: style.overflowY,
    }
  })
  const windowHeight = await page.evaluate(() => window.innerHeight)

  expect(panelMetrics.overflowY).toBe('auto')
  expect(panelMetrics.scrollHeight).toBeGreaterThan(panelMetrics.clientHeight)
  expect(panelMetrics.clientHeight).toBeLessThanOrEqual(windowHeight)

  const documentMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(documentMetrics.scrollHeight).toBeLessThanOrEqual(
    documentMetrics.clientHeight,
  )

  const viewportTopBeforeScroll = await viewport.evaluate(
    (element) => element.getBoundingClientRect().top,
  )
  await panel.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(() => panel.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  const viewportTopAfterScroll = await viewport.evaluate(
    (element) => element.getBoundingClientRect().top,
  )

  expect(viewportTopAfterScroll).toBe(viewportTopBeforeScroll)
})

test('wide OpenGrid workspace keeps document scrolling inside the parameter panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1394 })
  await page.goto('/cad/opengrid')

  const panel = page.getByTestId('cad-workspace-panel')
  const viewport = page.getByTestId('cad-viewport')
  await expect(panel).toBeVisible()
  await expect(viewport).toBeVisible()

  const documentMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(documentMetrics.scrollHeight).toBeLessThanOrEqual(
    documentMetrics.clientHeight,
  )

  const panelMetrics = await panel.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: style.overflowY,
    }
  })
  expect(panelMetrics.overflowY).toBe('auto')
  expect(panelMetrics.scrollHeight).toBeGreaterThan(panelMetrics.clientHeight)

  const viewportBeforeScroll = await viewport.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top, height: rect.height }
  })
  await panel.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(() => panel.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  const viewportAfterScroll = await viewport.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top, height: rect.height }
  })

  expect(viewportAfterScroll).toEqual(viewportBeforeScroll)
  expect(viewportAfterScroll.height).toBeLessThanOrEqual(520)
})

test('stacked CAD workspace keeps normal document scrolling below the desktop breakpoint', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 720 })
  await page.goto('/cad/opengrid')

  await expect(page.getByTestId('cad-workspace-panel')).toBeVisible()
  await expect(page.getByTestId('cad-viewport')).toBeVisible()

  const documentMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(documentMetrics.scrollHeight).toBeGreaterThan(
    documentMetrics.clientHeight,
  )
})

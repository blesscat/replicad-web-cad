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

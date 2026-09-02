import { expect, test, type Page } from '@playwright/test'

async function readThemeAppearance(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const body = getComputedStyle(document.body)
    return {
      colorScheme: root.colorScheme,
      bodyBackground: body.backgroundColor,
    }
  })
}

test('header theme toggle overrides the system mode and persists across pages', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/zh-Hant/')

  const toggle = page.locator('[data-theme-toggle]')
  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAccessibleName('切換為淺色模式')

  const systemDark = await readThemeAppearance(page)
  expect(systemDark.colorScheme).toBe('dark')

  await toggle.click()
  await expect(toggle).toHaveAccessibleName('切換為深色模式')

  const selectedLight = await readThemeAppearance(page)
  expect(selectedLight.colorScheme).toBe('light')
  expect(selectedLight.bodyBackground).not.toBe(systemDark.bodyBackground)

  await page.goto('/en/')
  const englishToggle = page.locator('[data-theme-toggle]')
  await expect(englishToggle).toBeVisible()
  await expect(englishToggle).toHaveAccessibleName('Switch to dark mode')

  await englishToggle.click()
  await expect(englishToggle).toHaveAccessibleName('Switch to light mode')

  const selectedDark = await readThemeAppearance(page)
  expect(selectedDark.colorScheme).toBe('dark')
  expect(selectedDark.bodyBackground).toBe(systemDark.bodyBackground)

  await page.emulateMedia({ colorScheme: 'light' })
  await expect
    .poll(async () => (await readThemeAppearance(page)).colorScheme)
    .toBe('dark')
  await expect
    .poll(async () => (await readThemeAppearance(page)).bodyBackground)
    .toBe(systemDark.bodyBackground)
})

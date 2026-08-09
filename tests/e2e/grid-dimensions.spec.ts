import { expect, test } from '@playwright/test'

test('grid dimension calculators apply counts and preserve manual controls', async ({
  page,
}) => {
  const fixtures = [
    {
      path: '/cad/modular-grid-base',
      targetX: '59',
      targetY: '41',
      expectedColumns: '2',
      expectedRows: '2',
      expectedDimensions: 'X 40 mm、Y 40 mm',
      invalidX: '19',
      invalidMessage: '20 mm',
    },
    {
      path: '/cad/opengrid',
      targetX: '83.99',
      targetY: '55.99',
      expectedColumns: '2',
      expectedRows: '1',
      expectedDimensions: 'X 56 mm、Y 28 mm',
      invalidX: '27',
      invalidMessage: '28 mm',
    },
    {
      path: '/cad/hsw-cell',
      targetX: '47.7',
      targetY: '59.1',
      expectedColumns: '2',
      expectedRows: '2',
      expectedDimensions: 'X 47.69 mm、Y 59 mm',
      invalidX: '20',
      invalidMessage: 'HSW',
    },
  ]

  for (const fixture of fixtures) {
    await page.goto(fixture.path)
    const calculator = page.getByTestId('grid-dimension-calculator')
    const targetX = calculator.getByRole('textbox', {
      name: 'X（mm）',
    })
    const targetY = calculator.getByRole('textbox', {
      name: 'Y（mm）',
    })
    const calculateButton = calculator.getByRole('button', {
      name: '計算格數',
    })

    await expect(targetX).toBeVisible()
    await expect(targetY).toBeVisible()
    await targetX.fill(fixture.targetX)
    await targetY.fill(fixture.targetY)
    await expect(calculator.getByRole('button', { name: /^復原/ })).toHaveCount(
      0,
    )
    await calculateButton.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('slider', { name: 'X' })).toHaveValue(
      fixture.expectedColumns,
    )
    await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue(
      fixture.expectedRows,
    )
    await expect(page.getByTestId('grid-dimension-result')).toContainText(
      fixture.expectedDimensions,
    )

    const calculateButtonBottomBeforeError = await calculateButton.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    await targetX.fill(fixture.invalidX)
    await calculateButton.click()
    await expect(targetX).toHaveAttribute('aria-invalid', 'true')
    await expect(targetX).toHaveAttribute(
      'aria-describedby',
      'grid-dimension-x-error',
    )
    await expect(calculator.getByRole('alert')).toContainText(
      fixture.invalidMessage,
    )
    const calculateButtonBottomAfterError = await calculateButton.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    expect(
      Math.abs(
        calculateButtonBottomAfterError - calculateButtonBottomBeforeError,
      ),
    ).toBeLessThanOrEqual(1)
    await expect(page.getByRole('slider', { name: 'X' })).toHaveValue(
      fixture.expectedColumns,
    )
    await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue(
      fixture.expectedRows,
    )
  }
})

test('grid dimension calculators remain usable on narrow viewports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })

  for (const path of [
    '/cad/modular-grid-base',
    '/cad/opengrid',
    '/cad/hsw-cell',
  ]) {
    await page.goto(path)
    const calculator = page.getByTestId('grid-dimension-calculator')
    await expect(calculator).toBeVisible()
    await expect(
      calculator.getByRole('textbox', { name: 'X（mm）' }),
    ).toBeVisible()
    await expect(
      calculator.getByRole('textbox', { name: 'Y（mm）' }),
    ).toBeVisible()
    await expect(
      calculator.getByRole('button', { name: '計算格數' }),
    ).toBeVisible()
    const targetX = calculator.getByRole('textbox', { name: 'X（mm）' })
    const calculateButton = calculator.getByRole('button', {
      name: '計算格數',
    })
    const targetXBottom = await targetX.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    const calculateButtonBottom = await calculateButton.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    expect(Math.abs(calculateButtonBottom - targetXBottom)).toBeLessThanOrEqual(
      1,
    )
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBeTruthy()
  }
})

test('OpenGrid dimension calculator respects selected half-cell directions', async ({
  page,
}) => {
  await page.goto('/cad/opengrid')
  await page
    .getByRole('combobox', { name: 'OpenGrid X 半格方向' })
    .selectOption('right')
  await page
    .getByRole('combobox', { name: 'OpenGrid Y 半格方向' })
    .selectOption('top')

  const calculator = page.getByTestId('grid-dimension-calculator')
  await calculator.getByRole('textbox', { name: 'X（mm）' }).fill('83.99')
  await calculator.getByRole('textbox', { name: 'Y（mm）' }).fill('69.99')
  await calculator.getByRole('button', { name: '計算格數' }).click()

  await expect(page.getByRole('slider', { name: 'X' })).toHaveValue('2')
  await expect(page.getByRole('slider', { name: 'Y' })).toHaveValue('1')
  await expect(page.getByTestId('grid-dimension-result')).toContainText(
    'X 70 mm、Y 42 mm',
  )
})

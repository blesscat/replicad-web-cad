import { expect, test, type Download, type Page } from '@playwright/test'
import { getValidPortalySupportUrl } from '../../src/features/support/portaly'

export function skipHeadlessFirefoxWithoutWebGL(browserName: string): void {
  test.skip(
    browserName === 'firefox' && process.env.PW_HEADFUL !== '1',
    'The headless Firefox image used in this environment has no WebGL context; run with Xvfb and PW_HEADFUL=1 for the full Firefox gate.',
  )
}

const astroOptimizeDepError =
  'Failed to load resource: the server responded with a status of 504 (Outdated Optimize Dep)'
const astroDevToolbarEntrypoint =
  '/@id/astro/runtime/client/dev-toolbar/entrypoint.js'

export function isAstroDevToolbarError(message: string): boolean {
  return (
    message === astroOptimizeDepError ||
    message.includes(astroDevToolbarEntrypoint)
  )
}

export const configuredPortalySupportUrl = getValidPortalySupportUrl(
  process.env.PUBLIC_PORTALY_SUPPORT_URL,
)

export function supportLink(page: Page) {
  return page.getByRole('link', {
    name: '支持這個專案',
    exact: true,
  })
}

export async function readBinaryStlByteLength(
  download: Download,
): Promise<number> {
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  for await (const chunk of stream ?? []) {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
    chunks.push(bytes)
    byteLength += bytes.byteLength
  }
  const payload = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    payload.set(chunk, offset)
    offset += chunk.byteLength
  }
  const triangleCount = new DataView(payload.buffer).getUint32(80, true)
  expect(triangleCount).toBeGreaterThan(0)
  expect(byteLength).toBe(84 + triangleCount * 50)
  return byteLength
}

export async function waitForCadReady(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout: 30_000,
  })
}

export type DimensionAnnotationBox = {
  label: string
  x: number
  y: number
  width: number
  height: number
}

export async function readDimensionAnnotationBoxes(
  page: Page,
): Promise<DimensionAnnotationBox[]> {
  return page
    .getByTestId('cad-viewport')
    .locator('[aria-label]')
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            label: element.getAttribute('aria-label') ?? '',
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }
        })
        .filter((annotation) => /^(寬度|深度|高度)/.test(annotation.label))
        .sort((left, right) => left.label.localeCompare(right.label)),
    )
}

export function expectDimensionAnnotationBoxesToStayStable(
  expected: readonly DimensionAnnotationBox[],
  actual: readonly DimensionAnnotationBox[],
  tolerance = 1,
): void {
  expect(actual).toHaveLength(expected.length)

  for (const [index, expectedBox] of expected.entries()) {
    const actualBox = actual[index]
    if (!actualBox) throw new Error(`Missing annotation at index ${index}`)

    expect(actualBox.label).toBe(expectedBox.label)
    expect(Math.abs(actualBox.x - expectedBox.x)).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(actualBox.y - expectedBox.y)).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(actualBox.width - expectedBox.width)).toBeLessThanOrEqual(
      tolerance,
    )
    expect(Math.abs(actualBox.height - expectedBox.height)).toBeLessThanOrEqual(
      tolerance,
    )
  }
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  cadPathForModel,
  groupModelDefinitions,
  modelSelectionLabelFor,
} from '../../src/features/cad/model-catalog'
import { CAD_VIEWPORT_THEME_FALLBACK } from '../../src/features/cad/viewport/theme'
import { translate } from '../../src/i18n'
import { localizedCadPathFor } from '../../src/i18n/routes'
import { waitForCadReady } from './helpers'

const PREVIEW_WIDTH = 640
const PREVIEW_HEIGHT = 400
const CAPTURE_MODEL_PREVIEWS = process.env.CAPTURE_MODEL_PREVIEWS === '1'
const MODEL_PREVIEW_ID = process.env.MODEL_PREVIEW_ID
const PREVIEW_DIRECTORY = path.resolve(process.cwd(), 'public/model-previews')
const VISIBLE_MODEL_DEFINITIONS = groupModelDefinitions()
  .flatMap((group) => group.definitions)
  .filter(
    (definition) => !MODEL_PREVIEW_ID || definition.id === MODEL_PREVIEW_ID,
  )

function entryKey(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
): string {
  return `${definition.id}-${definition.systemContext ?? 'legacy'}`
}

function previewRoute(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
): string {
  const route = cadPathForModel(definition.id, definition.systemContext)
  return `${route}${route.includes('?') ? '&' : '?'}preview=thumbnail`
}

function previewAssetPath(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
) {
  const preview = definition.previewImage
  if (!preview)
    throw new Error(`PREVIEW_METADATA_MISSING:${entryKey(definition)}`)
  return path.resolve(process.cwd(), 'public', preview.src.slice(1))
}

function readPngDimensions(filePath: string): {
  width: number
  height: number
} {
  const payload = readFileSync(filePath)
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ])
  if (!payload.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`PREVIEW_NOT_PNG:${filePath}`)
  }
  return {
    width: payload.readUInt32BE(16),
    height: payload.readUInt32BE(20),
  }
}

function rgbaForHexColor(color: string): [number, number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (!match) throw new Error(`PREVIEW_COLOR_NOT_HEX:${color}`)
  return [
    Number.parseInt(match[1]!, 16),
    Number.parseInt(match[2]!, 16),
    Number.parseInt(match[3]!, 16),
    255,
  ]
}

async function sampleCanvasBackground(
  page: Page,
  canvas: Locator,
): Promise<number[]> {
  const screenshot = await canvas.screenshot()
  const encoded = screenshot.toString('base64')
  return page.evaluate(async (encodedScreenshot) => {
    const response = await fetch(`data:image/png;base64,${encodedScreenshot}`)
    const bitmap = await createImageBitmap(await response.blob())
    const output = document.createElement('canvas')
    output.width = bitmap.width
    output.height = bitmap.height
    const context = output.getContext('2d')
    if (!context) throw new Error('PREVIEW_CANVAS_CONTEXT_UNAVAILABLE')

    context.drawImage(bitmap, 0, 0)
    const sampleX = Math.floor(bitmap.width * 0.1)
    const sampleY = Math.floor(bitmap.height * 0.1)
    const color = Array.from(context.getImageData(sampleX, sampleY, 1, 1).data)
    bitmap.close()
    return color
  }, encoded)
}

async function resizeScreenshot(
  page: Page,
  screenshot: Buffer,
): Promise<Buffer> {
  const encoded = screenshot.toString('base64')
  const resized = await page.evaluate(
    async ({ encodedScreenshot, width, height }) => {
      const response = await fetch(`data:image/png;base64,${encodedScreenshot}`)
      const bitmap = await createImageBitmap(await response.blob())
      const output = document.createElement('canvas')
      output.width = width
      output.height = height
      const context = output.getContext('2d')
      if (!context) throw new Error('PREVIEW_CANVAS_CONTEXT_UNAVAILABLE')

      context.fillStyle = '#eef2f8'
      context.fillRect(0, 0, width, height)
      const scale = Math.min(width / bitmap.width, height / bitmap.height)
      const drawWidth = bitmap.width * scale
      const drawHeight = bitmap.height * scale
      context.drawImage(
        bitmap,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      )
      bitmap.close()
      return output
        .toDataURL('image/png')
        .slice('data:image/png;base64,'.length)
    },
    {
      encodedScreenshot: encoded,
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
    },
  )
  return Buffer.from(resized, 'base64')
}

async function capturePreview(
  page: Page,
  canvas: Locator,
  filePath: string,
): Promise<void> {
  mkdirSync(PREVIEW_DIRECTORY, { recursive: true })
  const screenshot = await canvas.screenshot()
  writeFileSync(filePath, await resizeScreenshot(page, screenshot))
}

function assertPreviewAsset(
  definition: (typeof VISIBLE_MODEL_DEFINITIONS)[number],
) {
  const preview = definition.previewImage
  if (!preview)
    throw new Error(`PREVIEW_METADATA_MISSING:${entryKey(definition)}`)
  const filePath = previewAssetPath(definition)
  expect(
    existsSync(filePath),
    `Missing preview for ${entryKey(definition)}`,
  ).toBe(true)
  expect(readPngDimensions(filePath)).toEqual({
    width: preview.width,
    height: preview.height,
  })
  expect({ width: preview.width, height: preview.height }).toEqual({
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
  })
}

test.describe.configure({ mode: 'serial' })

test('visible model previews are captured from ready generators', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  for (const definition of VISIBLE_MODEL_DEFINITIONS) {
    await page.goto('/models')
    await page.evaluate(() => localStorage.clear())
    await page.goto(previewRoute(definition))

    await expect(page.getByTestId('cad-viewport')).toHaveAttribute(
      'data-presentation',
      'thumbnail',
    )
    await waitForCadReady(page)
    await page.waitForTimeout(300)
    const canvas = page.getByTestId('cad-viewport').locator('canvas')
    await expect(canvas).toBeVisible()
    await expect(sampleCanvasBackground(page, canvas)).resolves.toEqual(
      rgbaForHexColor(CAD_VIEWPORT_THEME_FALLBACK.background),
    )

    const filePath = previewAssetPath(definition)
    if (CAPTURE_MODEL_PREVIEWS) {
      await capturePreview(page, canvas, filePath)
    }
    assertPreviewAsset(definition)
  }
})

test('model cards expose static previews and preserve selection on image failure', async ({
  page,
}) => {
  await page.route('**/model-previews/opengrid-desk.png', (route) =>
    route.abort(),
  )
  await page.goto('/models')
  const locale = 'zh-Hant' as const

  for (const definition of VISIBLE_MODEL_DEFINITIONS) {
    const preview = definition.previewImage
    if (!preview)
      throw new Error(`PREVIEW_METADATA_MISSING:${entryKey(definition)}`)

    const card = page.locator(`[data-entry-key="${entryKey(definition)}"]`)
    await expect(card.locator('img')).toHaveAttribute('src', preview.src)
    await expect(card.locator('img')).toHaveAttribute(
      'alt',
      translate(locale, preview.alt),
    )
    await expect(
      card.getByRole('link', {
        name: `編輯 ${translate(locale, modelSelectionLabelFor(definition))}`,
      }),
    ).toHaveAttribute(
      'href',
      localizedCadPathFor(locale, definition.id, definition.systemContext),
    )
  }

  const failedPreviewCard = page.locator('[data-entry-key="opengrid-desk"]')
  await expect(
    failedPreviewCard.getByTestId('model-preview-fallback'),
  ).toBeVisible()
  await expect(page.getByTestId('cad-workspace')).toHaveCount(0)
})

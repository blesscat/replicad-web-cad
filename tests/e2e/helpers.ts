import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test'
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

export const CAD_LIGHTING_TEST_VIEWPORT = {
  width: 1440,
  height: 900,
} as const

export const CANONICAL_CAD_LIGHTING_VIEWS = [
  'initial',
  'side-back',
  'high-angle',
  'low-angle',
  'underside',
  'underside-reverse',
] as const

type CanonicalCadLightingView = (typeof CANONICAL_CAD_LIGHTING_VIEWS)[number]
type OrbitCadLightingView = Exclude<CanonicalCadLightingView, 'initial'>

type CanvasBox = {
  x: number
  y: number
  width: number
  height: number
}

type NormalizedCanvasPoint = readonly [number, number]

export type MobileTouchPoint = {
  x: number
  y: number
}

export type MobileTouchFrame = readonly MobileTouchPoint[]

export type MobileTouchEventReport = {
  pointerDownCount: number
  pointerMoveCount: number
  pointerUpCount: number
  pointerCancelCount: number
  lastPointerMove: MobileTouchPoint | null
}

export type MobileTouchDragOptions = {
  start?: NormalizedCanvasPoint
  delta?: readonly [number, number]
  steps?: number
  delayMs?: number
}

export type MobileTouchDragReport = MobileTouchEventReport & {
  start: MobileTouchPoint
  end: MobileTouchPoint
}

type MobileTouchWindow = Window & {
  __cadMobileTouchEventReport?: MobileTouchEventReport
}

const CANONICAL_CAD_LIGHTING_DRAGS: Record<
  OrbitCadLightingView,
  { start: NormalizedCanvasPoint; end: NormalizedCanvasPoint }
> = {
  'side-back': {
    start: [0.52, 0.48],
    end: [0.1, 0.58],
  },
  'high-angle': {
    start: [0.52, 0.48],
    end: [0.52, 0.9],
  },
  'low-angle': {
    start: [0.52, 0.48],
    end: [0.52, 0.1],
  },
  underside: {
    start: [0.52, 0.5],
    end: [0.52, 0.35],
  },
  'underside-reverse': {
    start: [0.52, 0.5],
    end: [0.92, 0.35],
  },
}

function pointInCanvas(
  box: CanvasBox,
  point: NormalizedCanvasPoint,
): MobileTouchPoint {
  return {
    x: box.x + box.width * point[0],
    y: box.y + box.height * point[1],
  }
}

function toCdpTouchPoints(points: MobileTouchFrame) {
  return points.map((point, index) => ({
    id: index + 1,
    x: point.x,
    y: point.y,
  }))
}

async function installMobileTouchEventTracking(page: Page): Promise<void> {
  await page.evaluate(() => {
    const report: MobileTouchEventReport = {
      pointerDownCount: 0,
      pointerMoveCount: 0,
      pointerUpCount: 0,
      pointerCancelCount: 0,
      lastPointerMove: null,
    }
    const trackedWindow = window as MobileTouchWindow
    trackedWindow.__cadMobileTouchEventReport = report

    document.addEventListener(
      'pointerdown',
      () => {
        report.pointerDownCount += 1
      },
      true,
    )
    document.addEventListener(
      'pointermove',
      (event) => {
        report.pointerMoveCount += 1
        report.lastPointerMove = {
          x: event.clientX,
          y: event.clientY,
        }
      },
      true,
    )
    document.addEventListener(
      'pointerup',
      () => {
        report.pointerUpCount += 1
      },
      true,
    )
    document.addEventListener(
      'pointercancel',
      () => {
        report.pointerCancelCount += 1
      },
      true,
    )
  })
}

async function readMobileTouchEventReport(
  page: Page,
): Promise<MobileTouchEventReport> {
  return page.evaluate(() => {
    const trackedWindow = window as MobileTouchWindow
    const report = trackedWindow.__cadMobileTouchEventReport
    if (!report) throw new Error('Mobile touch event tracking is not installed')
    return report
  })
}

export async function dispatchMobileTouchFrames(
  page: Page,
  frames: readonly MobileTouchFrame[],
  delayMs = 16,
): Promise<MobileTouchEventReport> {
  const [startFrame, ...moveFrames] = frames
  if (!startFrame || startFrame.length === 0) {
    throw new Error('A mobile touch gesture needs a non-empty start frame')
  }
  for (const frame of moveFrames) {
    if (frame.length !== startFrame.length) {
      throw new Error('A mobile touch gesture must keep its pointer count')
    }
  }

  await installMobileTouchEventTracking(page)
  const client = await page.context().newCDPSession(page)
  let touchStarted = false

  try {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: toCdpTouchPoints(startFrame),
    })
    touchStarted = true

    for (const frame of moveFrames) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: toCdpTouchPoints(frame),
      })
      if (delayMs > 0) await page.waitForTimeout(delayMs)
    }
  } finally {
    if (touchStarted) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
    }
  }

  await page.waitForTimeout(80)
  return readMobileTouchEventReport(page)
}

export async function dispatchMobileTouchDrag(
  page: Page,
  target: Locator,
  options: MobileTouchDragOptions = {},
): Promise<MobileTouchDragReport> {
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  if (!box) throw new Error('Mobile touch target is not available')

  const defaultStart: NormalizedCanvasPoint = [0.5, 0.45]
  const defaultDelta: readonly [number, number] = [112, 18]
  const startRatio = options.start ?? defaultStart
  const delta = options.delta ?? defaultDelta
  const steps = options.steps ?? 12
  const delayMs = options.delayMs ?? 16
  if (!Number.isSafeInteger(steps) || steps < 1) {
    throw new Error('Mobile touch drag steps must be a positive integer')
  }

  const start = pointInCanvas(box, startRatio)
  const end = {
    x: start.x + delta[0],
    y: start.y + delta[1],
  }
  const frames: MobileTouchFrame[] = [[start]]
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps
    frames.push([
      {
        x: start.x + delta[0] * progress,
        y: start.y + delta[1] * progress,
      },
    ])
  }

  const report = await dispatchMobileTouchFrames(page, frames, delayMs)
  return { ...report, start, end }
}

export async function setCadLightingViewport(page: Page): Promise<void> {
  await page.setViewportSize(CAD_LIGHTING_TEST_VIEWPORT)
}

export async function orbitCadViewport(
  page: Page,
  view: CanonicalCadLightingView,
): Promise<void> {
  if (view === 'initial') return

  const canvas = page.getByTestId('cad-viewport').locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('CAD viewport canvas is not available')

  const drag = CANONICAL_CAD_LIGHTING_DRAGS[view]
  const start = pointInCanvas(box, drag.start)
  const end = pointInCanvas(box, drag.end)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(120)
}

export async function expectCadLightingLuminance(
  page: Page,
  canvas: Locator,
): Promise<void> {
  const screenshot = await canvas.screenshot()
  const summary = await page.evaluate(async (encodedPng) => {
    const response = await fetch(`data:image/png;base64,${encodedPng}`)
    const bitmap = await createImageBitmap(await response.blob())
    const imageCanvas = document.createElement('canvas')
    imageCanvas.width = bitmap.width
    imageCanvas.height = bitmap.height
    const context = imageCanvas.getContext('2d', {
      willReadFrequently: true,
    })
    if (!context) throw new Error('CAD lighting screenshot decoder unavailable')

    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    const modelLuminances: number[] = []
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      if (blue > red * 1.15 && blue > green * 1.03 && red > 40) {
        modelLuminances.push(0.2126 * red + 0.7152 * green + 0.0722 * blue)
      }
    }

    modelLuminances.sort((left, right) => left - right)
    const percentile = (fraction: number): number =>
      modelLuminances[Math.floor((modelLuminances.length - 1) * fraction)] ?? 0
    const lowLuminancePixels = modelLuminances.filter(
      (luminance) => luminance < 80,
    ).length

    return {
      modelPixelCount: modelLuminances.length,
      p05: percentile(0.05),
      p95: percentile(0.95),
      lowLuminanceRatio:
        lowLuminancePixels / Math.max(modelLuminances.length, 1),
    }
  }, screenshot.toString('base64'))

  expect(summary.modelPixelCount).toBeGreaterThan(1000)
  expect(summary.p05).toBeGreaterThan(80)
  expect(summary.lowLuminanceRatio).toBeLessThan(0.03)
  expect(summary.p95 - summary.p05).toBeGreaterThan(24)
}

export async function readCadViewportAppearance(
  page: Page,
  canvas: Locator,
): Promise<{ modelPixelCount: number; darkPixelCount: number }> {
  const screenshot = await canvas.screenshot()
  return page.evaluate(async (encodedPng) => {
    const response = await fetch(`data:image/png;base64,${encodedPng}`)
    const bitmap = await createImageBitmap(await response.blob())
    const imageCanvas = document.createElement('canvas')
    imageCanvas.width = bitmap.width
    imageCanvas.height = bitmap.height
    const context = imageCanvas.getContext('2d', {
      willReadFrequently: true,
    })
    if (!context) throw new Error('CAD viewport screenshot decoder unavailable')

    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    let modelPixelCount = 0
    let darkPixelCount = 0
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index]
      const green = pixels[index + 1]
      const blue = pixels[index + 2]
      if (blue > red * 1.15 && blue > green * 1.03 && red > 40) {
        modelPixelCount += 1
      }
      if (red < 90 && green < 100 && blue < 150) {
        darkPixelCount += 1
      }
    }

    return { modelPixelCount, darkPixelCount }
  }, screenshot.toString('base64'))
}

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

export async function waitForCadReady(
  page: Page,
  timeout = 30_000,
): Promise<void> {
  await expect(page.getByRole('button', { name: '下載 STEP' })).toBeEnabled({
    timeout,
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

import { makeBox, makeCompound, Sketcher, type Shape3D } from 'replicad'
import {
  OPENGRID_SNAP_CONFIGURATION,
  type OpenGridSnapParameters,
} from '../../../cad-contract/units'

export const OPENGRID_SNAP_FLAT_TEXT_CONFIGURATION = {
  value: 'SNAP' as const,
  depth: 0.4,
  glyphWidth: 2.4,
  glyphHeight: 4.2,
  stroke: 0.65,
  letterGap: 0.65,
} as const

export function openGridSnapFlatTextTopZFor(
  parameters: OpenGridSnapParameters,
): number {
  return OPENGRID_SNAP_CONFIGURATION.variantHeights[parameters.variant]
}

export function isOpenGridSnapFlatTextConfiguration(
  parameters: OpenGridSnapParameters,
): boolean {
  return (
    parameters.topText === OPENGRID_SNAP_FLAT_TEXT_CONFIGURATION.value &&
    parameters.variant === 'Lite' &&
    parameters.profile === 'Standard' &&
    parameters.offset === 0 &&
    parameters.footprint === 'full' &&
    parameters.openConnect === false &&
    parameters.fourCornerLocatingHoles === false &&
    parameters.centerRemoverHole === false &&
    parameters.magnetHoleShape === 'none' &&
    parameters.magnetHoleLength === 0 &&
    parameters.magnetHoleWidth === 0 &&
    parameters.magnetHoleDiameter === 0 &&
    parameters.magnetHoleThickness === 0
  )
}

type Point2D = [number, number]

function deleteShape(shape: { delete?: () => void } | null | undefined): void {
  try {
    shape?.delete?.()
  } catch {
    // Preserve the primary geometry error during cleanup.
  }
}

function extrudePolygon(
  points: readonly Point2D[],
  baseZ: number,
  height: number,
): Shape3D {
  const sketcher = new Sketcher('XY', [0, 0, baseZ])
  let sketch: ReturnType<Sketcher['close']> | null = null
  try {
    const first = points[0]
    if (!first) throw new Error('OPENGRID_SNAP_FLAT_TEXT_POLYGON_EMPTY')
    sketcher.movePointerTo(first)
    for (const point of points.slice(1)) sketcher.lineTo(point)
    sketch = sketcher.close()
    return sketch.extrude(height)
  } finally {
    deleteShape(sketch)
    sketcher.delete()
  }
}

function rectangularBar(
  x: number,
  y: number,
  width: number,
  height: number,
  baseZ: number,
  depth: number,
): Shape3D {
  return makeBox([x, y, baseZ], [x + width, y + height, baseZ + depth])
}

function slantedBar(
  start: Point2D,
  end: Point2D,
  width: number,
  baseZ: number,
  depth: number,
): Shape3D {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const length = Math.hypot(dx, dy)
  if (length <= 0) throw new Error('OPENGRID_SNAP_FLAT_TEXT_BAR_INVALID')
  const halfWidth = width / 2
  const normal: Point2D = [
    (-dy / length) * halfWidth,
    (dx / length) * halfWidth,
  ]
  return extrudePolygon(
    [
      [start[0] + normal[0], start[1] + normal[1]],
      [end[0] + normal[0], end[1] + normal[1]],
      [end[0] - normal[0], end[1] - normal[1]],
      [start[0] - normal[0], start[1] - normal[1]],
    ],
    baseZ,
    depth,
  )
}

function fuseBars(bars: Shape3D[]): Shape3D {
  const first = bars.shift()
  if (!first) throw new Error('OPENGRID_SNAP_FLAT_TEXT_GLYPH_EMPTY')
  let result = first
  try {
    for (const bar of bars) {
      const fused = result.fuse(bar, { optimisation: 'none' })
      if (fused !== result) deleteShape(result)
      if (fused !== bar) deleteShape(bar)
      result = fused
    }
    return result
  } catch (error) {
    deleteShape(result)
    for (const bar of bars) deleteShape(bar)
    throw error
  }
}

function makeGlyph(
  letter: 'S' | 'N' | 'A' | 'P',
  originX: number,
  originY: number,
  baseZ: number,
): Shape3D {
  const {
    glyphWidth: width,
    glyphHeight: height,
    stroke,
    depth,
  } = OPENGRID_SNAP_FLAT_TEXT_CONFIGURATION
  const halfHeight = height / 2
  const bars: Shape3D[] = []

  if (letter === 'S') {
    bars.push(
      rectangularBar(
        originX,
        originY + height - stroke,
        width,
        stroke,
        baseZ,
        depth,
      ),
      rectangularBar(
        originX,
        originY + halfHeight,
        stroke,
        halfHeight,
        baseZ,
        depth,
      ),
      rectangularBar(
        originX,
        originY + halfHeight - stroke / 2,
        width,
        stroke,
        baseZ,
        depth,
      ),
      rectangularBar(
        originX + width - stroke,
        originY,
        stroke,
        halfHeight,
        baseZ,
        depth,
      ),
      rectangularBar(originX, originY, width, stroke, baseZ, depth),
    )
  } else if (letter === 'N') {
    bars.push(
      rectangularBar(originX, originY, stroke, height, baseZ, depth),
      rectangularBar(
        originX + width - stroke,
        originY,
        stroke,
        height,
        baseZ,
        depth,
      ),
      slantedBar(
        [originX + stroke / 2, originY],
        [originX + width - stroke / 2, originY + height],
        stroke,
        baseZ,
        depth,
      ),
    )
  } else if (letter === 'A') {
    bars.push(
      slantedBar(
        [originX + stroke / 2, originY],
        [originX + width / 2, originY + height],
        stroke,
        baseZ,
        depth,
      ),
      slantedBar(
        [originX + width - stroke / 2, originY],
        [originX + width / 2, originY + height],
        stroke,
        baseZ,
        depth,
      ),
      rectangularBar(
        originX + width * 0.2,
        originY + height * 0.42,
        width * 0.6,
        stroke,
        baseZ,
        depth,
      ),
    )
  } else {
    bars.push(
      rectangularBar(originX, originY, stroke, height, baseZ, depth),
      rectangularBar(
        originX,
        originY + height - stroke,
        width * 0.75,
        stroke,
        baseZ,
        depth,
      ),
      rectangularBar(
        originX,
        originY + halfHeight - stroke / 2,
        width * 0.75,
        stroke,
        baseZ,
        depth,
      ),
      rectangularBar(
        originX + width * 0.7,
        originY + halfHeight,
        stroke,
        halfHeight - stroke / 2,
        baseZ,
        depth,
      ),
    )
  }

  return fuseBars(bars)
}

export function makeOpenGridSnapFlatTextShape(
  parameters: OpenGridSnapParameters,
): Shape3D {
  if (!isOpenGridSnapFlatTextConfiguration(parameters)) {
    throw new Error('OPENGRID_SNAP_FLAT_TEXT_UNSUPPORTED_CONFIGURATION')
  }

  const {
    glyphWidth: width,
    glyphHeight: height,
    letterGap,
    depth,
  } = OPENGRID_SNAP_FLAT_TEXT_CONFIGURATION
  const letters: readonly ['S', 'N', 'A', 'P'] = ['S', 'N', 'A', 'P']
  const totalWidth = letters.length * width + (letters.length - 1) * letterGap
  const startX = -totalWidth / 2
  const startY = -height / 2
  const baseZ = openGridSnapFlatTextTopZFor(parameters) - depth
  const glyphs: Shape3D[] = []

  try {
    letters.forEach((letter, index) => {
      glyphs.push(
        makeGlyph(letter, startX + index * (width + letterGap), startY, baseZ),
      )
    })
    return makeCompound(glyphs).asShape3D()
  } catch (error) {
    for (const glyph of glyphs) deleteShape(glyph)
    throw error
  }
}

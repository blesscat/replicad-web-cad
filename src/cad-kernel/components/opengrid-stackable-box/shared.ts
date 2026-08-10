import type { Shape3D } from 'replicad'

export type Bounds = [[number, number, number], [number, number, number]]

export type OpenGridStackableBoxBuildContext = {
  isGenerationCurrent?: () => boolean
}

export function deleteShape(
  shape: { delete?: () => void } | null | undefined,
): void {
  try {
    shape?.delete?.()
  } catch {
    // Cleanup must not replace the original geometry error.
  }
}

export function assertGenerationCurrent(
  context: OpenGridStackableBoxBuildContext,
): void {
  if (context.isGenerationCurrent && !context.isGenerationCurrent()) {
    throw new Error('STALE_GENERATION')
  }
}

export function closeEnough(
  first: number,
  second: number,
  tolerance = 0.02,
): boolean {
  return Math.abs(first - second) <= tolerance
}

export function readBounds(shape: Shape3D): Bounds {
  const boundingBox = shape.boundingBox
  try {
    return boundingBox.bounds as Bounds
  } finally {
    boundingBox.delete()
  }
}

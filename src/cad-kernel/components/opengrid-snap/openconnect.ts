import type { ModelBounds } from '../../../cad-contract/units'

export const OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS: ModelBounds = {
  min: [-8.5, -1.7, 0],
  max: [8.5, 8.9, 2.6],
}

export const OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION: readonly [
  number,
  number,
  number,
] = [0, 0, 4]

export type OpenGridSnapOpenConnectAnchor = readonly [number, number, number]

export type OpenGridSnapOpenConnectXYTransform = {
  scaleX: number
  scaleY: number
  centerX: number
  centerY: number
}

export function openGridSnapOpenConnectAnchorForXYTransform(
  transform?: OpenGridSnapOpenConnectXYTransform,
): OpenGridSnapOpenConnectAnchor {
  const translation = OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION
  const x = transform
    ? transform.centerX + (0 - transform.centerX) * transform.scaleX
    : 0
  const y = transform
    ? transform.centerY + (0 - transform.centerY) * transform.scaleY
    : 0
  return [x + translation[0], y + translation[1], translation[2]]
}

export function openGridSnapOpenConnectAnchorForSnapBounds(
  snapBounds: ModelBounds,
): OpenGridSnapOpenConnectAnchor {
  const translation = OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION
  return [
    (snapBounds.min[0] + snapBounds.max[0]) / 2 + translation[0],
    (snapBounds.min[1] + snapBounds.max[1]) / 2 + translation[1],
    translation[2],
  ]
}

export function openGridSnapOpenConnectHeadBoundsForAnchor(
  anchor: OpenGridSnapOpenConnectAnchor,
): ModelBounds {
  const source = OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS
  return {
    min: [
      source.min[0] + anchor[0],
      source.min[1] + anchor[1],
      source.min[2] + anchor[2],
    ],
    max: [
      source.max[0] + anchor[0],
      source.max[1] + anchor[1],
      source.max[2] + anchor[2],
    ],
  }
}

export function openGridSnapOpenConnectHeadBounds(): ModelBounds {
  return openGridSnapOpenConnectHeadBoundsForAnchor(
    OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION,
  )
}

export function openGridSnapOpenConnectCompositeBounds(
  snapBounds: ModelBounds,
): ModelBounds {
  const headBounds = openGridSnapOpenConnectHeadBoundsForAnchor(
    openGridSnapOpenConnectAnchorForSnapBounds(snapBounds),
  )
  return {
    min: [
      Math.min(snapBounds.min[0], headBounds.min[0]),
      Math.min(snapBounds.min[1], headBounds.min[1]),
      Math.min(snapBounds.min[2], headBounds.min[2]),
    ],
    max: [
      Math.max(snapBounds.max[0], headBounds.max[0]),
      Math.max(snapBounds.max[1], headBounds.max[1]),
      Math.max(snapBounds.max[2], headBounds.max[2]),
    ],
  }
}

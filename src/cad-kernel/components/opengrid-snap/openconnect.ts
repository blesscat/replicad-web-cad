import {
  OPENGRID_SNAP_CONFIGURATION,
  type OpenGridSnapVariant,
} from '../../../cad-contract/units/opengrid-snap'
import type { ModelBounds } from '../../../cad-contract/units'

export const OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS: ModelBounds = {
  min: [-8.5, -1.7, 0],
  max: [8.5, 8.9, 2.6],
}

export const OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION: readonly [
  number,
  number,
  number,
] = [0, 0, OPENGRID_SNAP_CONFIGURATION.variantHeights.Lite]

export const OPENGRID_SNAP_OPEN_CONNECT_NOTCH_HALF_WIDTH = 2.5
export const OPENGRID_SNAP_OPEN_CONNECT_NOTCH_OUTER_Y = -13.5
export const OPENGRID_SNAP_OPEN_CONNECT_NOTCH_INNER_Y = -10.605

// The supplied Lite STL includes a 0.6 mm interface layer that this builder
// intentionally omits. Keep the inferred notch aligned with the lowered head.
const OPENGRID_SNAP_OPEN_CONNECT_LITE_REFERENCE_LIFT = 0.6

const OPENGRID_SNAP_OPEN_CONNECT_NOTCH_Z_BOUNDS: Readonly<
  Record<OpenGridSnapVariant, readonly [number, number]>
> = {
  Lite: [
    2.605 - OPENGRID_SNAP_OPEN_CONNECT_LITE_REFERENCE_LIFT,
    3.205 - OPENGRID_SNAP_OPEN_CONNECT_LITE_REFERENCE_LIFT,
  ],
  Full: [4.605, 5.605],
}

// The supplied STEP is authored opposite to the assembled placement reference.
export const OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_DEGREES = 180
export const OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_ORIGIN: readonly [
  number,
  number,
  number,
] = [
  0,
  0,
  (OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS.min[2] +
    OPENGRID_SNAP_OPEN_CONNECT_HEAD_SOURCE_BOUNDS.max[2]) /
    2,
]
export const OPENGRID_SNAP_OPEN_CONNECT_HEAD_ROTATION_AXIS: readonly [
  number,
  number,
  number,
] = [0, 1, 0]

export function openGridSnapOpenConnectHeadBaseZFor(
  variant: OpenGridSnapVariant,
): number {
  return OPENGRID_SNAP_CONFIGURATION.variantHeights[variant]
}

export type OpenGridSnapOpenConnectAnchor = readonly [number, number, number]

export type OpenGridSnapOpenConnectXYTransform = {
  scaleX: number
  scaleY: number
  centerX: number
  centerY: number
}

export function openGridSnapOpenConnectAnchorForXYTransform(
  transform?: OpenGridSnapOpenConnectXYTransform,
  variant: OpenGridSnapVariant = 'Lite',
): OpenGridSnapOpenConnectAnchor {
  const translation = OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION
  const x = transform
    ? transform.centerX + (0 - transform.centerX) * transform.scaleX
    : 0
  const y = transform
    ? transform.centerY + (0 - transform.centerY) * transform.scaleY
    : 0
  return [
    x + translation[0],
    y + translation[1],
    openGridSnapOpenConnectHeadBaseZFor(variant),
  ]
}

export function openGridSnapOpenConnectAnchorForSnapBounds(
  snapBounds: ModelBounds,
  variant: OpenGridSnapVariant = 'Lite',
): OpenGridSnapOpenConnectAnchor {
  const translation = OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION
  return [
    (snapBounds.min[0] + snapBounds.max[0]) / 2 + translation[0],
    (snapBounds.min[1] + snapBounds.max[1]) / 2 + translation[1],
    openGridSnapOpenConnectHeadBaseZFor(variant),
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

export function openGridSnapOpenConnectNotchBoundsFor(
  variant: OpenGridSnapVariant,
): ModelBounds {
  const [minZ, maxZ] = OPENGRID_SNAP_OPEN_CONNECT_NOTCH_Z_BOUNDS[variant]
  return {
    min: [
      -OPENGRID_SNAP_OPEN_CONNECT_NOTCH_HALF_WIDTH,
      OPENGRID_SNAP_OPEN_CONNECT_NOTCH_OUTER_Y,
      minZ,
    ],
    max: [
      OPENGRID_SNAP_OPEN_CONNECT_NOTCH_HALF_WIDTH,
      OPENGRID_SNAP_OPEN_CONNECT_NOTCH_INNER_Y,
      maxZ,
    ],
  }
}

export function openGridSnapOpenConnectHeadBounds(
  variant: OpenGridSnapVariant = 'Lite',
): ModelBounds {
  return openGridSnapOpenConnectHeadBoundsForAnchor([
    OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION[0],
    OPENGRID_SNAP_OPEN_CONNECT_HEAD_TRANSLATION[1],
    openGridSnapOpenConnectHeadBaseZFor(variant),
  ])
}

export function openGridSnapOpenConnectCompositeBounds(
  snapBounds: ModelBounds,
  variant: OpenGridSnapVariant = 'Lite',
): ModelBounds {
  const anchor = openGridSnapOpenConnectAnchorForSnapBounds(snapBounds, variant)
  const headBounds = openGridSnapOpenConnectHeadBoundsForAnchor(anchor)
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

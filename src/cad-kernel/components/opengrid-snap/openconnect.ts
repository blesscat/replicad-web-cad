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

export type OpenGridSnapOpenConnectNotchSegment = {
  min: readonly [number, number, number]
  max: readonly [number, number, number]
}

const OPENGRID_SNAP_OPEN_CONNECT_NOTCH_SEGMENTS: Readonly<
  Record<OpenGridSnapVariant, readonly OpenGridSnapOpenConnectNotchSegment[]>
> = {
  Lite: [
    {
      min: [-2.5, -12.4, 2.605],
      max: [2.5, -11.7, OPENGRID_SNAP_CONFIGURATION.variantHeights.Lite],
    },
    {
      min: [-2.5, -11.1, 2.605],
      max: [2.5, -10.605, OPENGRID_SNAP_CONFIGURATION.variantHeights.Lite],
    },
  ],
  Full: [
    {
      min: [-2.5, -12.8, 4.5],
      max: [2.5, -11.7, 5.6],
    },
    {
      min: [-2.5, -11.1, 4.5],
      max: [2.5, -10.605, 5.5],
    },
    {
      min: [-2.5, -12.4, 6],
      max: [2.5, -11.4, OPENGRID_SNAP_CONFIGURATION.variantHeights.Full],
    },
  ],
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
  const segment = openGridSnapOpenConnectNotchSegmentsFor(variant)[0]
  if (!segment) throw new Error('OPENGRID_SNAP_OPEN_CONNECT_NOTCH_EMPTY')
  return {
    min: [segment.min[0], segment.min[1], segment.min[2]],
    max: [segment.max[0], segment.max[1], segment.max[2]],
  }
}

export function openGridSnapOpenConnectNotchSegmentsFor(
  variant: OpenGridSnapVariant,
): readonly OpenGridSnapOpenConnectNotchSegment[] {
  return OPENGRID_SNAP_OPEN_CONNECT_NOTCH_SEGMENTS[variant]
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

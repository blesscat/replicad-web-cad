import { OPENGRID_GRID_CONFIGURATION } from './opengrid-grid'

/**
 * Fixed, conservative lattice dimensions shared by the two stackable OpenGrid
 * containers. The UI intentionally exposes only the mode switch so that the
 * protected interface geometry stays deterministic.
 */
export const OPENGRID_HONEYCOMB_CONFIGURATION = {
  anchorPitch: OPENGRID_GRID_CONFIGURATION.halfPitch,
  rowPitch: (OPENGRID_GRID_CONFIGURATION.halfPitch * Math.sqrt(3)) / 2,
  cellRadius: 4.25,
  sideFrame: 5,
  bottomFrame: 7,
  topFrame: 7,
  lowerFrame: 7,
  featureClearance: 3,
  bottomSkinThickness: 0.8,
  cutterMargin: 0.04,
  minimumPanelSpan: 18,
} as const

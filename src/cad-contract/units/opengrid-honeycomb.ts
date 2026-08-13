const HONEYCOMB_RIB_THICKNESS = 1.25

function honeycombLatticeFor(cellRadius: number) {
  const anchorPitch = Math.sqrt(3) * cellRadius + HONEYCOMB_RIB_THICKNESS
  return {
    anchorPitch,
    rowPitch: (Math.sqrt(3) * anchorPitch) / 2,
    cellRadius,
    ribThickness: HONEYCOMB_RIB_THICKNESS,
    minimumPanelSpan: cellRadius * 2,
  } as const
}

const SIDE_HONEYCOMB_LATTICE = honeycombLatticeFor(3.1)
const BOTTOM_HONEYCOMB_LATTICE = honeycombLatticeFor(2.6)

/**
 * Fixed lattice dimensions shared by the OpenGrid containers and open shelf.
 * Side and plate pitches are each derived from their hex size and the same
 * printable rib width; horizontal plates use a finer pattern around protected
 * holes and interfaces.
 */
export const OPENGRID_HONEYCOMB_CONFIGURATION = {
  ...SIDE_HONEYCOMB_LATTICE,
  bottomLattice: BOTTOM_HONEYCOMB_LATTICE,
  sideFrame: 3.5,
  bottomFrame: 5,
  bottomHoleSafetyRing: 2,
  topFrame: 1.5,
  lowerFrame: HONEYCOMB_RIB_THICKNESS,
  featureClearance: 3,
  bottomFeatureClearance: HONEYCOMB_RIB_THICKNESS,
  cutterMargin: 0.04,
} as const

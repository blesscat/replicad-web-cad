## 1. Contract, assets, and persistence foundations

- [x] 1.1 Add the supplied OpenConnect STEP head under the existing
  `opengrid-snap` asset directory, document its millimetre source bounds, and
  encode the placement anchor/transform measured from the STL reference.
- [x] 1.2 Extend the `opengrid-snap` typed contract with `openConnect`, default
  it to `false`, normalize legacy snapshots, validate the full-footprint
  prerequisite, and include the state in deterministic export metadata.
- [x] 1.3 Extend Worker asset loading, cache retry behavior, and disposal for
  the OpenConnect STEP reference without changing the existing model ID,
  buildKey, route, or profile/variant asset keys.
- [x] 1.4 Make Snap parameter persistence switchable between Desk and Wall
  scopes while preserving the existing route-seeded scope, context-free legacy
  behavior, and independent saved values.

## 2. Snap panel and system-scoped controls

- [x] 2.1 Add the top-level Desk System / Wall System radio group to the Snap
  panel with accessible labels and stable test IDs.
- [x] 2.2 Implement scope switching so the selected radio loads its saved
  parameters or preset, leaves the inactive scope untouched, and uses the
  existing validation/debounce/latest-wins generation lifecycle.
- [x] 2.3 Apply the system-specific control rules: Desk exposes footprint,
  locating-hole, and remover-hole controls; Wall fixes footprint to `full`,
  hides those two hole controls, and exposes OpenConnect. Keep variant,
  profile, offset, and magnet controls consistent with the existing contracts.
- [x] 2.4 Add localized OpenConnect and system-radio labels, descriptions, and
  invalid-state messages without changing existing model display identities.
- [x] 2.5 Verify the existing catalog and model IDs remain unchanged; the radio
  must not introduce a second OpenGrid component, route, build key, or catalog
  entry.

## 3. Geometry and composition

- [x] 3.1 Build the selected Snap profile/variant and apply its normal full-
  footprint XY offset before any OpenConnect placement calculation.
- [x] 3.2 Apply existing Snap-local optional cutters using their current fixed
  dimensions and centers, then clone and place the source-sized OpenConnect
  head at the final adjusted interface anchor.
- [x] 3.3 Preserve OpenConnect source dimensions and Z geometry for Standard
  Lite, Standard Full, Directional Lite, and Directional Full, including valid
  wall offsets other than zero.
- [x] 3.4 Reject OpenConnect requests for Half/Quarter fixed footprints and
  preserve the existing fixed-asset behavior for snapshots with OpenConnect
  disabled.

## 4. Quality, bounds, and exports

- [x] 4.1 Extend Snap bounds and quality checks to cover the composite
  Snap/OpenConnect result while retaining profile-specific topology, B-Rep,
  mesh, feature, and offset checks for the base Snap.
- [x] 4.2 Add OpenConnect interface-placement and source-dimension probes, and
  ensure failed head loading, missing placement, scaling, or invalid composite
  geometry discards the candidate and disables export.
- [x] 4.3 Update STEP/STL export naming and revision plumbing so enabled and
  disabled OpenConnect configurations cannot collide and both exports match
  the committed viewport revision.

## 5. Verification

- [x] 5.1 Add unit coverage for the extended contract, legacy normalization,
  profile/variant matrix, footprint rejection, system presets/scopes, bounds,
  and export filenames.
- [x] 5.2 Add Worker integration coverage for STEP loading/disposal, all four
  profile/variant combinations, zero and positive wall offsets, post-offset
  head composition, composite quality, and stale-candidate failure behavior.
- [x] 5.3 Add E2E coverage for the top radio, independent Desk/Wall persistence,
  system-specific controls, OpenConnect generation, invalid display behavior,
  and STEP/STL export availability.
- [x] 5.4 Run the targeted unit, Worker, E2E, type-check, lint, and OpenSpec
  validation commands; resolve failures and mark every task complete.

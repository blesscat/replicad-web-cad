## 1. Parameter contract and mode datums

- [x] 1.1 Add `thinShellMode` to the existing `opengrid-stackable-box` parameter keys, types, defaults, raw serialization, and legacy persistence normalization.
- [x] 1.2 Validate `thinShellMode` as a boolean and reject it when combined with `basePlateMode`, while preserving all existing normal and base-plate snapshots.
- [x] 1.3 Add mode-aware derived profile data for the thin 2 mm floor, `height` datum, outer-high/inner-low rim, 1.6 mm wall, R2 inner fillet, and external bounds without changing normal/base-plate datums.
- [x] 1.4 Add deterministic thin-shell STEP/STL filename identity and preserve existing no-opening normal filenames and base-plate suffixes.

## 2. Thin-shell CAD geometry

- [x] 2.1 Add fixed thin-shell geometry constants for the 2 mm floor, 1.6 mm wall, R2 inner floor fillet, 1.5 mm outside bottom chamfer, and 1.6 mm 45° top opening chamfer.
- [x] 2.2 Implement the thin-shell box-native shell profile with a continuous flat outside bottom, outer-high/inner-low top rim, and no stepped top rail.
- [x] 2.3 Branch the stackable-box builder by mode so thin-shell generation skips the normal bottom guide, internal grid-seam reliefs, and self-mating interface while leaving normal/base-plate construction unchanged.
- [x] 2.4 Implement the thin-mode Ø5.05 mm × 1 mm plus Ø7.05 mm × 1 mm corner socket cutter and 2 mm ordinary-hole cutter, including the existing flange and shaft-exposure behavior.
- [x] 2.5 Adapt side-opening profile derivation and cutters to the thin active floor, lower inner-rim datum, continuous 1.6 mm sloped top rim, and 1.6 mm wall without leaving a top-rim lip or horizontal rim plane.

## 3. Quality gates and diagnostics

- [x] 3.1 Add mode-aware quality measurements for thin floor thickness, straight wall thickness, R2 inner fillet, outside bottom chamfer, continuous 1.6 mm top chamfer orientation, absence of a horizontal rim plane, flat floor continuity, and single-solid validity.
- [x] 3.2 Update hole, opening, bounds, and error validation so thin mode uses its 1+1 mm socket profile and does not run normal stacking-guide assertions.
- [x] 3.3 Verify that normal-mode self-mating, base-plate validation, and Snap reference decoupling remain unchanged.

## 4. Catalog, panel, and compatibility

- [x] 4.1 Extend the existing `opengrid-stackable-box` catalog definition and workspace validation with the three mutually exclusive mode choices while preserving the existing model ID, route, and OpenGrid naming.
- [x] 4.2 Replace the two-choice mode control with three radio choices and a thin-shell non-stackable description; keep the corner-hole, full-grid, dimension-calculator, and four-opening controls available.
- [x] 4.3 Ensure persistence hydration, restore controls, export requests, and preview metadata retain thin mode without altering existing mode snapshots.

## 5. Behavior-focused tests

- [x] 5.1 Add unit coverage for thin-mode defaults, legacy normalization, mutual exclusion, active datums, external bounds, mode-specific filename identity, and unchanged normal/base-plate behavior.
- [x] 5.2 Add Worker B-Rep coverage for thin 1×1, multi-cell, and half-cell shells, including flat bottom, 2 mm floor, 1.6 mm wall, R2 fillet, both chamfers, no lower guide, no stepped rail, valid bounds, watertightness, and exportability.
- [x] 5.3 Add behavior tests for thin-mode corner sockets, full bottom-hole grid, half-cell de-duplication, Ø5.8 mm flange retention, and approximately 3 mm shaft exposure.
- [x] 5.4 Add behavior tests for one and four independent side openings in thin mode, including floor safety, corner bridges, opening angles, top-rim breakthrough, and zero-depth preservation.
- [x] 5.5 Add E2E coverage for selecting all three modes, persistence/restore behavior, thin-mode descriptions, and distinct thin-shell download filenames.

## 6. Verification

- [x] 6.1 Run targeted stackable-box unit, Worker integration, and E2E tests, then run formatting, typecheck, build, and relevant full regression suites.
- [x] 6.2 Run strict OpenSpec validation for `add-opengrid-stackable-box-thin-shell` and confirm every requirement scenario has corresponding behavior evidence.

## 7. Top-rim revision

- [x] 7.1 Change the thin-shell top rim to a continuous 1.6 mm 45° outer-high/inner-low chamfer with no horizontal rim plane, preserving normal/base-plate geometry.
- [x] 7.2 Add behavior coverage for the 1.6 mm rim height and zero horizontal top-rim planar faces while preserving openings and exports.
- [x] 7.3 Rerun thin-shell Worker, opening, unit, E2E, build, format, typecheck, and strict OpenSpec verification.

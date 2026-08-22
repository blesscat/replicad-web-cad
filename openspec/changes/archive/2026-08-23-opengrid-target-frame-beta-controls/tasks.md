## 1. OpenGrid contract and persistence

- [x] 1.1 Add normalized `targetFrameShape` and `targetFrameSides` fields with square/all-sided backward-compatible defaults, parameter-key coverage, and persistence hydration for legacy snapshots.
- [x] 1.2 Validate the new enum and boolean-record fields, accept the pending target-frame state without positive targets, and preserve target-size validation and the 28 mm axis remainder limit.
- [x] 1.3 Implement shared directional frame bounds and use them for derived dimensions, nominal-versus-target envelope behavior, and deterministic file/export identities.

## 2. OpenGrid beta controls

- [x] 2.1 Move the physical target-frame checkbox to the first OpenGrid control and add localized Beta labels and descriptions in Chinese and English.
- [x] 2.2 Render the target-size calculator, `外框角型` selector, and independent top/right/bottom/left frame-direction checkboxes only when target-frame mode is enabled.
- [x] 2.3 Hide print planning and nominal board chamfer controls in target-frame mode while preserving connector and screw controls and restoring the existing controls when disabled.
- [x] 2.4 Wire the pending no-target state, target application, side toggles, and shape selection into normalized parameter updates without changing the `opengrid` route or model id.

## 3. Directional target-frame geometry

- [x] 3.1 Replace the centered-only frame construction with side-specific strips that implement full remainder on one selected side, equal remainder on two opposite sides, and no frame on an axis with no selected side.
- [x] 3.2 Apply square, chamfered, and filleted outer-frame corner shapes to frame geometry only, using safe geometry-dependent treatment sizes and preserving a single fused solid.
- [x] 3.3 Keep nominal connector and screw cutters on the nominal grid, fuse the completed frame afterward, and ensure unframed sides retain their connector holes without adding frame hosts.
- [x] 3.4 Extend target-frame quality evidence for directional bounds, selected strip material, nominal openings, connector stability, and each outer-frame corner shape.

## 4. Verification

- [x] 4.1 Add unit coverage for normalization defaults, pending target fitting, directional bounds, target-frame shape values, and export identity differences.
- [x] 4.2 Add native Worker integration coverage for one-sided, two-sided, unextended-axis, chamfer, fillet, and connector-preservation geometry.
- [x] 4.3 Add browser coverage for first-control ordering, conditional visibility, Beta mode, side selection, shape selection, and the restored print/chamfer controls.
- [x] 4.4 Run OpenSpec validation, type checking, formatting, focused unit and Worker tests, and the relevant browser tests; record the results before review.

## Verification record

- `openspec validate opengrid-target-frame-beta-controls --type change --strict` — passed.
- `pnpm check` — passed.
- Prettier check and `git diff --check` — passed.
- Focused unit suite — 88 passed across 4 test files.
- OpenGrid Worker suite — 57 passed, 2 skipped across builder, runtime, and target-frame integration tests.
- Chromium OpenGrid browser suite — 5 passed, including target-frame control ordering, visibility, shape selection, and independent frame-side toggles.

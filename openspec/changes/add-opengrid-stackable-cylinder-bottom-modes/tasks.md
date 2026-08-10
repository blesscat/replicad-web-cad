## 1. Parameter contract and migration

- [x] 1.1 Extend `OpenGridStackableCylinderParameters` with the mutually exclusive `thinBottomMode` and `bottomPlateMode` flags plus `bottomHolesEnabled`, add their defaults, and define mode-specific floor, fillet, and stepped-hole constants while preserving diameter/height ranges and 1 mm steps.
- [x] 1.2 Update exact-key validation, shared model unions, workspace parameter keys, raw parsing, model defaults, and model guards to accept all three booleans and reject invalid values.
- [x] 1.3 Normalize legacy persisted `{ diameter, height }` snapshots to `thinBottomMode=false` and `bottomHolesEnabled=true`, preserve unrelated component entries, and add persistence regression coverage.
- [x] 1.4 Update typed STEP/STL filename helpers so default exports keep the established names, thin and bottom-plate exports append their mode suffix, and any no-hole export appends `-no-holes` without using raw input formatting.

## 2. Mode-aware cylinder geometry

- [x] 2.1 Refactor the cylinder builder to select the default 5 mm/original inner-fillet profile, the existing 3 mm/parallel-ramp thin profile, or the clipped 3 mm bottom-plate profile from the typed mode flags.
- [x] 2.2 Keep the common 2 mm wall, top inner 45-degree guide, and 0.2 mm mating clearance shared; retain the lower foot bevel, vertical landing, and outer lower transition in the default/thin profiles while using the clipped outer transition for bottom-plate mode.
- [x] 2.3 Gate the entire bottom-hole group with `bottomHolesEnabled`, with no individual center/outer controls or cutters when disabled.
- [x] 2.4 Make the stepped-hole cutter and measured hole sections mode-aware: default `Ø5.05 × 4 mm` plus `Ø7.05 × 1 mm`; thin and bottom-plate `Ø5.05 × 2 mm` plus `Ø7.05 × 1 mm`.
- [x] 2.5 Implement mode-specific outer-hole safety calculations: preserve the original outer-edge threshold for default and bottom-plate modes, use the outer-edge plus flat-floor/ramp threshold for thin mode, and emit only the four outermost cardinal holes when the group is enabled.
- [x] 2.6 Preserve intermediate-shape cleanup, stale-generation handling, one-solid checks, B-Rep validity, and diagnosable errors for all three mode branches and the no-hole branch.

## 3. Quality diagnostics and lifecycle integration

- [x] 3.1 Extend the interface quality report with the selected mode, all-holes flag, mode-specific floor, fillet/ramp, stepped-hole, hole-clearance, bounds, and common stacking measurements.
- [x] 3.2 Reject default candidates missing the 5 mm floor, 0.6 mm inner fillet, or 4+1 mm hole profile; reject thin candidates missing the 3 mm floor, parallel ramp, no-fillet/no-filler profile, or 2+1 mm hole profile; reject bottom-plate candidates missing the 3 mm floor, default-style 0.6 mm fillet, no-ramp profile, or 2+1 mm hole profile; require zero hole records when disabled.
- [x] 3.3 Verify the shared 2 mm wall, applicable 2 mm hole outer clearance, 0.2 mm same-diameter mating clearance, non-interference fixture, actual bounds, and export-ready B-Rep in all three modes and the no-hole branch.
- [x] 3.4 Preserve Worker latest-wins, invalid-input, candidate commit/discard, stale-generation, and failed-candidate export gating when the mode or all-holes flag changes during generation.

## 4. Catalog, controls, and documentation

- [x] 4.1 Add default-off `薄底模式` and `底板模式` controls plus a default-on `底部孔洞` total control to the cylinder panel, show the active profile and corresponding hole depths, and keep the existing diameter/height slider controls unchanged.
- [x] 4.2 Update catalog selection text, panel guidance, docs, and user-facing error messages to distinguish default 5 mm/4+1 mm, thin 3 mm/2+1 mm, and bottom-plate 3 mm/2+1 mm behavior.
- [x] 4.3 Preserve the existing `opengrid-stackable-cylinder` modelId, buildKey, route, catalog identity, and parameter-store isolation while exposing only the two mutually exclusive mode flags and one group-level hole boolean.

## 5. Behavior-focused tests

- [x] 5.1 Add unit tests for default mode, thin mode, all-holes default, legacy missing-field normalization, invalid boolean values, mode-specific constants, bounds, and deterministic filenames.
- [x] 5.2 Add Worker geometry tests for all three modes with holes enabled and disabled at diameter 20, default diameter, the default first safe outer-hole threshold, thin 47/48 mm threshold, and diameter 300.
- [x] 5.3 Add mode-specific assertions for floor thickness, inner fillet versus parallel ramp, stepped hole diameters/depths, outer-hole clearances, zero-hole output when disabled, and absence of thin-mode filler/fillet.
- [x] 5.4 Add same-diameter stacking, different-diameter behavior, mesh, STEP, STL, stale-generation, and failed-quality lifecycle coverage for all three modes and the no-hole branch.
- [x] 5.5 Add catalog, persistence, runtime, and Chromium E2E coverage for default mode initialization, mode switching, the single all-holes control, generation readiness, and mode/hole-state export filenames.

## 6. Verification and handoff

- [x] 6.1 Run focused unit and cylinder Worker tests, then the affected unit/Worker/runtime suites; fix B-Rep or tolerance regressions without weakening quality gates.
- [x] 6.2 Run type checking, formatting, build, relevant E2E tests, and strict OpenSpec validation for `add-opengrid-stackable-cylinder-bottom-modes`.
- [x] 6.3 Review the final diff for stable identity/persistence compatibility, confirm all tasks and all three modes are covered, and document any unrelated repository test fixture failures.

## 7. Bottom-plate mode refinement

- [x] 7.1 Add persisted `bottomPlateMode=false` with legacy four-key and two-key snapshot normalization, mutually exclusive mode validation, defaults, raw parsing, and parameter-store coverage.
- [x] 7.2 Add the clipped bottom-plate profile: retain a 3 mm floor with the default-style vertical inner wall and 0.6 mm floor fillet plus 2+1 mm holes, cut the lower foot below the former red-line boundary, and start the direct outer 45-degree transition from the clearance-reduced mating face.
- [x] 7.3 Extend quality diagnostics, mode-aware mating probes, hole safety, worker errors, deterministic filenames, catalog text, panel controls, and documentation for the bottom-plate profile while preserving the original thin profile.
- [x] 7.4 Add behavior-focused unit, Worker geometry, runtime, persistence, and Chromium coverage for bottom-plate mode and mutual mode switching.
- [x] 7.5 Run focused/full verification, strict OpenSpec validation, and an independent read-only compliance review for the bottom-plate refinement.

## 8. Bottom-mode control clarification

- [x] 8.1 Clarify the bottom-plate contract as a 3 mm floor with the default-style vertical inner wall and 0.6 mm floor fillet, with only the lower outer foot clipped, and preserve the existing thin profile separately.
- [x] 8.2 Replace the two mode checkboxes with one accessible three-option radio group for default, thin-bottom, and bottom-plate modes while retaining the all-holes checkbox.
- [x] 8.3 Add Chromium and regression verification for the three-option mode group, bottom-plate 3 mm floor wording, and direct thin-to-bottom-plate switching.

## 9. Bottom-plate interior geometry correction

- [x] 9.1 Change bottom-plate mode to use the default-style vertical inner wall and 0.6 mm floor fillet at 3 mm floor thickness, with no internal 45-degree ramp, while preserving thin mode.
- [x] 9.2 Use the default outer-hole safety boundary for bottom-plate mode so equal diameters produce the same outer-hole count as default mode.
- [x] 9.3 Add regression coverage for the bottom-plate interior profile, equal hole counts, B-Rep quality, stacking, and exports, then update the specification and user-facing guidance.

## 10. Compact bottom-mode guidance

- [x] 10.1 Remove the long inline geometry description from the cylinder panel and show only the selected mode's concise stacking/fixed-post guidance.
- [x] 10.2 Present the three bottom-mode radio controls in one row with compact labels, while retaining the single all-holes toggle.
- [x] 10.3 Add Chromium regression coverage for the compact labels, selected-mode guidance, and removal of the long inline description.

## 11. Selected-mode description placement

- [x] 11.1 Remove the `目前模式` prefix and the bottom-hole summary from the panel.
- [x] 11.2 Render the selected mode's concise guidance directly below the three radio controls.
- [x] 11.3 Extend Chromium coverage for the description order and removal of the obsolete summaries.

## 12. Compact hole-toggle label

- [x] 12.1 Remove the explanatory parenthetical from the all-holes checkbox label.

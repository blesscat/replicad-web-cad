## 1. Shared detachable-seat contract and references

- [x] 1.1 Add the canonical male-seat and retaining-tab female-holder STEP assets under the shared `opengrid-locating-assembly` Worker directory with stable ASCII filenames.
- [x] 1.2 Extend the shared locating-assembly configuration with the fixed male/female dimensions, source bounds, nominal volumes, and seated transforms without changing existing locating values.
- [x] 1.3 Implement shared STEP import, B-Rep validity/bounds/volume inspection, seated zero-intersection inspection, and female socket-void derivation.
- [x] 1.4 Add cached Worker/context getters with retry-safe loading, clone ownership, stale-generation handling, and disposal for both references.
- [x] 1.5 Add focused shared-contract and Worker integration tests for asset validity, 0.2 mm lead-in, 0.15 mm wear cap, fixed key clearance, and canonical male/female compatibility.
- [x] 1.6 Derive and validate the 3.8 mm male locating body, 5.3 mm total height, and 1.75 mm effective holder depth while preserving the supplied bottom geometry.

## 2. Detachable corner-seat Pillar mode

- [x] 2.1 Extend the Pillar typed union, strict validation, normalization, bounds, fixed length helpers, and STEP/STL export identity with exact `{ mode: 'detachable-corner-seat' }` behavior while preserving every existing mode.
- [x] 2.2 Update raw workspace parsing, state/persistence hydration, parameter summaries, and diagnostics so detachable mode drops hidden numeric fields while external non-exact snapshots remain invalid.
- [x] 2.3 Build the detachable Pillar mode from a cloned canonical male reference and add reference-specific single-solid, bounds, volume, mesh, lead-in, and wear-cap quality checks.
- [x] 2.4 Add the fourth Pillar radio option and Traditional Chinese/English copy, hide length and offset for that mode, and verify existing `opengrid-pillar` model ID, build key, and route remain unchanged.
- [x] 2.5 Add/update Pillar unit, persistence, Worker integration, export, UI, and e2e tests for mode switching, exact parameters, fixed geometry, and existing-mode regressions.

## 3. Integrated Organizer Box sockets

- [x] 3.1 Extend Organizer Box bottom-interface typing, validation, footprint collision envelopes, bounds, persistence, and deterministic export identity with `detachable-corner-seat` while preserving both existing modes.
- [x] 3.2 Derive the female void from the canonical holder, place it at the existing four corner centers with quadrant-based 0°/90°/180°/270° rotations, and cut all four voids from the box as one measured Worker boolean.
- [x] 3.3 Extend Organizer Box quality inspection to verify one box solid, socket centers/orientations, retaining material, male seated clearance, cavity roof separation, and exclusion of built-in feet and the stacking guide.
- [x] 3.4 Add the third Organizer Box radio option and Traditional Chinese/English labels/descriptions without changing the existing model identity, route, defaults, or cavity controls.
- [x] 3.5 Add/update Organizer Box contract, persistence, Worker integration, export, UI, and e2e tests for the integrated sockets, B rotation pattern, interface exclusivity, preview bounds, and existing-mode regressions.

## 4. Documentation and complete validation

- [x] 4.1 Update user/developer documentation to explain the fixed detachable socket, separate Pillar-printed male seat, insertion chamfer, wear cap, corner rotation pattern, and physical prototype gate for wider rollout.
- [x] 4.2 Run formatting and type checking; run the targeted shared-interface, Pillar, Organizer Box, persistence, Worker, and e2e suites; run the project build and strict OpenSpec validation, then record the exact results.

## Validation record — 2026-08-22

- `pnpm format:check`: passed.
- `pnpm check`: passed.
- Pure unit regression suite (excluding pre-existing benchmark, HSW asset, and OpenGrid honeycomb OpenCascade suites): 70 files, 518 tests passed.
- Targeted detachable-seat, Pillar, Organizer Box, and Worker lifecycle integration suite: 4 files, 32 tests passed.
- Independent-review remediation suite across contracts, error mapping, kernel adapters, canonical geometry, Organizer Box, and Worker lifecycle: 10 files, 115 tests passed.
- Post-cleanup Organizer Box/kernel rerun: 2 files, 19 tests passed.
- Chromium target e2e: 3 tests passed.
- Headful Firefox target e2e: 3 tests passed.
- `pnpm build`: passed; 49 static pages built.
- `openspec validate add-detachable-opengrid-corner-seat --type change --strict --json`: passed with zero issues.
- `openspec validate --specs --strict --json`: 38 main specs passed with zero failures.
- `git diff --check`: passed.
- Independent read-only compliance review: all findings remediated; final re-review reported no findings.

## Follow-up validation — 2026-08-22

- Increased the detachable male locating body to 3.8 mm and total height to 5.3 mm while preserving the 0.2 mm insertion chamfer and 0.15 mm wear cap.
- Increased the Organizer Box holder/socket effective depth by 0.25 mm to 1.75 mm while preserving the supplied bottom entrance.
- `pnpm format:check`: passed.
- `pnpm check`: passed.
- Focused contract/catalog unit suite: 3 files, 30 tests passed.
- Detachable-seat, Pillar, Organizer Box, and Worker lifecycle integration suite: 4 files, 33 tests passed.
- Chromium target e2e: 3 tests passed.
- Headful Firefox target e2e: both CAD tests passed; the control-only test also passed on its isolated single-worker rerun after a parallel resource-contention timeout.
- `pnpm build`: passed; 49 static pages built.
- `openspec validate --specs --strict --json`: 38 main specs passed with zero failures.

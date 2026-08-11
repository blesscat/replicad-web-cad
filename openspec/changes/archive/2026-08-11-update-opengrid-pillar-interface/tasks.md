## 1. Establish behavior-first coverage

- [x] 1.1 Update the pillar unit and Worker integration tests to use `{ mode: 'standard' | 'thin-shell' }`, assert fixed 9 mm/5 mm bounds, Ø4.5 mm shaft behavior, Ø7 mm × 0.8 mm flange behavior, mode validation, and legacy normalization.
- [x] 1.2 Update catalog, workspace-validation, parameter-store, message, runtime-lifecycle, and E2E tests to assert the two radio choices, standard default, mode-only persistence, invalidation behavior, and absence of manual length controls.
- [x] 1.3 Update locating-assembly, Stackable Box, Stackable Cylinder, model-generation, and HSW/fixture tests to assert Ø4.5 mm fixture shafts, Ø4.55 mm special passages, unchanged Ø7.05 mm retaining openings, unchanged Ø5.05 mm ordinary grid holes, and the existing Ø7 mm × 0.8 mm flange.
- [x] 1.4 Update export-runtime and catalog export tests for `pillar-9-standard` and `pillar-5-thin-shell` while preserving committed-B-Rep and readiness-gate behavior.
- [x] 1.5 Run the focused changed test files and record the expected failures before changing production implementation.

## 2. Implement the shared and pillar contracts

- [x] 2.1 Replace the pillar parameter type, validator, defaults, and fixed geometry configuration with the mode-only contract and explicit standard/thin-shell heights while preserving `opengrid-pillar` identity.
- [x] 2.2 Update the shared OpenGrid locating-assembly contract so the fixture shaft is Ø4.5 mm and the derived special shaft opening is Ø4.55 mm, while retaining Ø7 mm × 0.8 mm, Ø7.05 mm, and ordinary Ø5.05 mm values.
- [x] 2.3 Rebuild the pillar profile as one connected fused solid with a flat Ø7 mm × 0.8 mm lower flange, sharp Ø7-to-Ø4.5 shoulder, centered Ø4.5 mm body, and 0.5 mm upper chamfer within the selected fixed total height.
- [x] 2.4 Update pillar quality checks, Worker dispatch typing, and generation metadata to validate both fixed mode profiles and reject mismatched or legacy shapes at the runtime boundary.
- [x] 2.5 Update pillar catalog metadata and deterministic STEP/STL export naming to derive the fixed mode-specific stems from the normalized mode.

## 3. Integrate the mode-only workspace and persistence flow

- [x] 3.1 Replace the numeric length and checkbox controls with the labeled `標準版`/`薄殼版` radio group, defaulting to standard and showing the fixed 9 mm/5 mm profiles without exposing dimension fields.
- [x] 3.2 Update workspace parameter serialization and validation so mode values remain typed strings, invalid values emit diagnostics/invalidation, and only valid mode snapshots generate or persist.
- [x] 3.3 Add legacy/malformed pillar hydration to the versioned parameter store and direct-navigation fallback, mapping safely to `{ mode: 'standard' }` without modifying unrelated component entries.
- [x] 3.4 Update model-selection and route tests/metadata so the existing OpenGrid pillar entry remains independent, correctly named, and isolated from other builders and template caches.

## 4. Apply the shared passage change to consumers

- [x] 4.1 Update Stackable Box special corner socket cutters, quality probes, compatibility fixtures, and tests to consume the shared Ø4.55 mm lower bore while retaining mode-specific depths and Ø7.05 mm upper seats.
- [x] 4.2 Update Stackable Cylinder stepped center-hole cutters, quality probes, compatibility fixtures, and tests to consume the shared Ø4.55 mm lower section while retaining the existing 2/4 mm depths and Ø7.05 mm upper sections.
- [x] 4.3 Verify ordinary Stackable Box bottom-grid cutters and unrelated OpenGrid locating dimensions remain Ø5.05 mm and unchanged, including their regression assertions.

## 5. Verify, review, and prepare the change

- [x] 5.1 Rerun the focused red/green tests, then run typecheck, lint, unit, Worker/integration, and relevant E2E checks; resolve regressions without weakening the contracts.
- [x] 5.2 Run `openspec validate update-opengrid-pillar-interface --type change --strict` and confirm every requirement scenario is covered by implementation or behavior-focused tests.
- [x] 5.3 Perform an independent read-only compliance review against proposal, design, delta specs, tasks, and acceptance criteria; fix any findings and rerun affected checks.
- [x] 5.4 Synchronize accepted delta requirements into the main `openspec/specs/` files, archive the completed change under the current date, and rerun strict OpenSpec validation.
- [ ] 5.5 Commit the scoped implementation/spec archive, push `agent/update-opengrid-pillar-interface`, and open a draft PR targeting `main` with verification results.

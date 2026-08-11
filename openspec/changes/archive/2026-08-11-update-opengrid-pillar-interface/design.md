## Context

The current `opengrid-pillar` implementation couples an arbitrary numeric `length` with a `baseConnection` checkbox. Its builder, quality gate, catalog metadata, panel, persistence hydration, runtime validation, and export naming all assume that shape. The shared locating-assembly contract also still exposes a Ø4 mm test shaft and derives a Ø4.05 mm special passage, while Stackable Box and Stackable Cylinder consume those values directly.

This change crosses the pillar UI/runtime boundary, the shared OpenGrid assembly dimensions, and the two consumers of the special passage. Stable OpenGrid identifiers and the existing ordinary Ø5.05 mm grid and Ø7.05 mm retaining interfaces are compatibility constraints. The requirements are defined in the change specs; this document records the implementation decisions and migration mechanics.

## Goals / Non-Goals

**Goals:**

- Make the normalized pillar snapshot a small, typed mode-only value that can be validated consistently in the browser, Worker, persistence layer, and catalog.
- Centralize fixed pillar geometry dimensions and derive the two supported heights from the selected mode.
- Keep the shared locating-assembly dimensions internally coherent: Ø4.5 mm fixture shaft, Ø4.55 mm special passage, Ø7 mm × 0.8 mm flange, Ø7.05 mm retaining opening, and ordinary Ø5.05 mm grid holes.
- Preserve existing model identity and export lifecycle behavior while giving the two fixed pillar modes deterministic export stems.
- Exercise the changed behavior through focused unit, Worker/integration, workspace, persistence, export, and end-to-end tests.

**Non-Goals:**

- Do not introduce a new model ID, route, build key, component family, or persistence store.
- Do not make pillar dimensions user-editable or preserve arbitrary pillar lengths as an active compatibility mode.
- Do not change the official OpenGrid pitch, ordinary grid-hole diameter, retaining-seat diameter, Snap-reference exposure rules, or unrelated components.
- Do not change the flange height to 1 mm; the existing Ø7 mm × 0.8 mm fixture flange remains the shared contract.

## Decisions

### 1. Store only the selected pillar mode

The public normalized type will be `{ mode: 'standard' | 'thin-shell' }`. A shared validator will reject missing, non-string, and unsupported modes, while a persistence normalizer will map missing, malformed, and legacy `{ length, baseConnection }` records to `{ mode: 'standard' }`.

This avoids contradictory states such as a thin-shell mode paired with a standard length. Retaining both `mode` and `length` was considered, but it would keep an obsolete user control in the data model and require precedence rules in every caller. Keeping the old fields and interpreting them in the builder was also rejected because it would leave the checkbox semantics visible to external callers and make the migration incomplete.

### 2. Preserve identity and isolate migration at hydration boundaries

`opengrid-pillar` remains the stable model ID, build key, route, catalog entry, and CAD directory. The compatibility conversion belongs in the versioned parameter store and direct-navigation initialization, not in the Worker builder. The Worker receives only the new validated shape. Legacy records therefore cannot accidentally reactivate arbitrary lengths, and invalid raw values cannot overwrite a previously accepted entry.

The standard mode is the safe fallback because it is the default catalog profile and the only deterministic mapping for old records that do not encode the new distinction. The conversion is intentionally lossy for the removed arbitrary length and checkbox state, as specified in the proposal.

### 3. Use one flanged builder with a mode-to-height lookup

The pillar builder will always construct the same profile: a flat Ø7 mm × 0.8 mm lower flange fused to a centered Ø4.5 mm shaft with a sharp shoulder, followed by the existing 0.5 mm equal-distance upper chamfer. A small named mode-to-height helper will select 9 mm or 5 mm and place the chamfer within that total height.

Using one profile builder keeps the flange, shoulder, shaft, and chamfer identical between modes; separate standard/thin-shell construction branches were considered but would invite dimension drift. The mode-to-height lookup will use explicit control flow and named values so the fixed geometry remains readable and easy to audit.

### 4. Keep the shared locating contract as the source for mating dimensions

The shared locating-assembly unit will set the fixture shaft to Ø4.5 mm and derive the special shaft opening as shaft diameter plus the existing 0.05 mm clearance, yielding Ø4.55 mm. The test flange remains Ø7 mm × 0.8 mm. The ordinary assembly opening remains Ø5.05 mm and the retaining opening remains Ø7.05 mm.

Box corner sockets and Cylinder stepped holes will continue to consume the shared special-opening value rather than duplicating 4.55 in their builders. Their quality probes, fixtures, and behavioral tests will be updated to observe the new contract. This keeps the explicit change localized and prevents the ordinary bottom grid from being resized as a side effect.

### 5. Represent the radio group in the pillar panel, not as numeric schema fields

The catalog definition will expose the typed mode as the sole parameter, while the pillar-specific Svelte panel will render the two radio choices with the required Traditional Chinese labels. The generic numeric `ParameterControl` remains unchanged because it is not the right abstraction for a finite string choice. The panel will send a normalized mode snapshot through the existing workspace update path, which preserves validation, persistence, generation sequencing, invalidation, and stale-export gates.

The mode labels and fixed lengths will be visible in the panel copy, but no length field or quick-length buttons will remain. A radio-specific control was preferred over extending the generic numeric control with unrelated branching because it keeps the common parameter editor focused and makes the pillar contract explicit.

### 6. Derive export identity from normalized mode

The catalog export metadata will map `standard` to `pillar-9-standard` and `thin-shell` to `pillar-5-thin-shell`, preserving the existing STEP/STL format, MIME, committed-B-Rep, and readiness behavior. The mapping will happen after validation so an invalid mode cannot produce a plausible filename or export request.

### 7. Test observable contracts before refactoring

Following the repository test workflow, tests will first be changed or added for the mode contract, fixed bounds/profile, panel/persistence behavior, export names, and Ø4.55 mm consumers. The focused tests will be run to demonstrate the expected failures, then the implementation will be updated and the same tests rerun before broader typecheck, lint, unit, Worker, and E2E checks.

Tests will assert generated geometry, normalized parameters, emitted messages, persistence values, filenames, and user-visible controls. They will not inspect source text or duplicate mutable production configuration literals when an exported contract or observable relationship is available.

## Risks / Trade-offs

- **[Persisted legacy snapshots]** Existing users lose arbitrary length and checkbox state during hydration → normalize only at the persistence/direct-navigation boundary, use the documented standard fallback, and test that legacy data never reaches generation.
- **[Mode-only string path]** Generic validation or serialization may assume all parameters are numeric → add explicit typed mode parsing/serialization coverage and keep the catalog schema empty for numeric controls while the pillar panel owns the radio input.
- **[Short thin-shell profile]** A 0.8 mm flange plus a 0.5 mm upper chamfer leaves little shaft length → build the profile from explicit axial segments and verify both bounds and connected-solid quality at the kernel tolerance.
- **[Shared dimension drift]** Updating one consumer but not the shared fixture or quality probe could make Box/Cylinder appear compatible while tests disagree → update the shared contract first, then have both consumers and their fixtures read the shared values.
- **[Regression of ordinary mounting holes]** A broad diameter replacement could alter the normal Ø5.05 mm grid → keep ordinary grid cutters and assertions separate from special socket/stepped-hole assertions and include preservation tests.
- **[Export revision races]** New mode transitions could reuse stale committed geometry → retain the existing generation revision/readiness gates and verify exports use the latest committed mode.

## Migration Plan

1. Add the mode-only types, validator, normalizer, fixed profile builder, and shared dimension update while preserving stable IDs and routes.
2. Update the catalog, panel, workspace serialization, persistence hydration, home fallback, Worker dispatch/quality checks, Box/Cylinder consumers, and focused tests.
3. Run strict OpenSpec validation, focused red/green tests, then the repository's broader checks and an independent compliance review.
4. After review passes, merge the accepted delta requirements into the corresponding files under `openspec/specs/`, run strict validation again, and archive this change under the date-prefixed archive directory.
5. Commit the implementation plus synchronized specs, push the feature branch, and open a draft PR targeting `main`.

Rollback is a branch/commit rollback before deployment. Since persistence hydration is backward-compatible at read time and stable IDs are preserved, reverting the implementation also reverts the new mode contract without requiring a data-store migration; any newly saved mode-only entries would need the old application version's existing default/invalid-entry handling and should be treated as a coordinated application rollback.

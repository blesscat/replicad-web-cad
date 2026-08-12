## Context

The Divider contract, catalog schema, CAD builder, quality probes, and route tests currently duplicate parts of the arm-envelope calculation. The builder can already construct a wall on one active axis, but contract validation and shape classification prevent a single active direction. See `proposal.md` for the requested behavior and the modified capability specs for the acceptance contract.

The implementation must keep the existing `opengrid-divider` model id, build key, route, parameter keys, persistence shape, and export filename fields. The change therefore has no browser-storage migration and introduces no checkbox or new persisted parameter.

## Goals / Non-Goals

**Goals:**

- Make the shared Divider contract the single source for the 10-grid limit, the fixed active-end retraction, and the retraction-aware planar envelope.
- Let the existing wall builder construct one, two, three, or four active directional arms while keeping the central junction and peg placement stable.
- Make preview bounds, quality checks, validation, catalog controls, and exports agree on the same shortened geometry.
- Preserve the existing OpenGrid identifiers and behavior outside the Divider component.

**Non-Goals:**

- Do not add a shape selector, checkbox, persistence field, or compatibility alias.
- Do not change the official OpenGrid grid contract, height limits, wall profile dimensions, peg spacing, or unrelated OpenGrid components.
- Do not make the 2.275 mm retraction depend on a selectable box variant; this change standardizes the normal OpenGrid box inner-wall target.

## Decisions

### 1. Keep endpoint and envelope math in the Divider contract

Add a fixed `armEndRetraction` configuration value of 2.275 mm and expose a small contract-level helper for the retraction-aware raw plan bounds (and, where useful, active arm endpoints). For an active left/down arm, the effective endpoint moves toward the origin by the retraction; for an active right/up arm, it moves toward the origin by the same amount. Inactive directions continue to contribute only the central 5 mm wall envelope.

The builder, `boundsForOpenGridDivider`, plan dimensions, validation footprint guard, and quality placement probes will use this helper rather than maintaining independent copies of the old nominal bounds. This avoids a preview/export mismatch when an asymmetric or single-arm configuration is used.

The alternative—subtracting the clearance only inside the CAD builder—would leave validation and committed bounds at the old endpoints, so it is rejected.

### 2. Model a single arm as an explicit shape classification

Extend `OpenGridDividerShape` with a `single` value. `classifyOpenGridDividerShape` will reject only the all-zero case, return `single` for one active direction, and retain the existing straight/L/T/cross rules for two or more active directions. `openGridDividerAxisFor` will treat both `single` and `straight` as axis-aligned classifications.

No UI shape selector is added: the classification remains derived from the four directional counts. The alternative—representing a single arm as a special straight line with an implicit zero-length opposite arm—would hide the new semantic state and make metadata ambiguous, so it is rejected.

### 3. Build each active axis from effective endpoints

The horizontal wall extrusion will start at the effective left endpoint when `left > 0`, otherwise at the central junction, and finish at the effective right endpoint when `right > 0`, otherwise at the central junction. The vertical wall will use the same down/up rule before its existing quarter-turn rotation. Thus every generated portion of an active arm—the 5 mm base, 45-degree transition, and upper wall—ends at the same shortened station because all are produced by one profiled extrusion.

The central wall remains the construction anchor. Peg centers continue to use the existing 28 mm spacing and are not moved by the endpoint retraction; the maximum valid peg station remains strictly inside the shortened arm for all supported half-grid counts.

### 4. Make the limit explicit and reuse it in the catalog

Set the Divider directional maximum to the specified 10 grids instead of deriving it from the 500 mm footprint. Keep the independent footprint check based on the actual retraction-aware envelope. The catalog already reads its directional maxima from `OPENGRID_DIVIDER_CONFIGURATION`, so changing that contract value updates all four controls without duplicating the limit.

The height text and slider configuration remain unchanged. Remove only the repeated technical paragraph from the Divider panel and catalog selection description; the controls and runtime validation continue to expose their existing ranges.

### 5. Verify behavior at contract, geometry, UI, and lifecycle boundaries

Update behavior-focused unit tests for classification, validation, max counts, footprint rejection, and expected centered bounds. Add Worker integration coverage for a single arm and for endpoint clearance across the base and upper wall, while retaining solid, peg, mesh, and export checks. Update catalog, workspace-validation, persistence/lifecycle, and E2E assertions that currently encode the old maximum or the removed paragraph. Keep persistence round-trip assertions unchanged in structure and add single-arm values where they exercise valid snapshots.

## Risks / Trade-offs

- [Risk] Changing the envelope calculation can alter which near-limit configurations pass the 500 mm guard. → Keep the guard independent and test both the per-arm 10-grid maximum and a combined over-500-mm span.
- [Risk] Filleting or boolean fusion could reintroduce geometry beyond the intended endpoint. → Assert mesh/B-Rep bounds and probe the terminal profile at base, transition, and upper-wall heights in Worker integration tests.
- [Risk] A single arm could expose an unhandled horizontal/vertical axis branch. → Exercise single right, left, up, and down configurations through contract classification and at least one generated asymmetric single-arm shape.
- [Risk] Existing UI or persistence tests may rely on the old explanatory copy or 17.5 maximum. → Update those behavior assertions while preserving route, model id, parameter keys, and export identity checks.

## Migration Plan

1. Implement the contract, builder, quality, catalog/panel, and test updates in the feature branch.
2. Run focused Divider, workspace, catalog, persistence, lifecycle, and E2E checks, followed by the repository validation suite required by the implementation skill.
3. Complete an independent compliance review against the proposal, design, tasks, and modified specs.
4. Synchronize the main OpenSpec capability specs, validate, and archive this change. The runtime change is backward-compatible for existing persisted parameter keys; snapshots that were previously invalid because they had one active arm become valid, while values above 10 grids remain invalid.
5. If a rollback is required before release, revert the implementation commit and the synchronized spec/archive commit together; no data migration rollback is required.

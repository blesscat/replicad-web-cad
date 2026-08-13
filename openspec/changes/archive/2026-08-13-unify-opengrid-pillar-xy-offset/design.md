## Context

The existing `opengrid-pillar` contract carries two numeric offsets through the catalog, workspace parser, persistence snapshot, worker builder, quality probes, and export naming. The builder already fuses the Ø7 mm flange with the Ø5 mm body; the change simplifies the parameter plumbing and makes one shared XY diameter increment explicit. See `proposal.md` and the delta spec for the user-facing intent and normative behavior.

## Goals / Non-Goals

**Goals:**

- Make one scalar `offset` the canonical locating-post XY parameter and expose one `XY 直徑增量` control.
- Apply the scalar identically as an additive increment to every applicable XY diameter for every pillar mode.
- Preserve the complete centered fixed profile, including the Ø7 mm flange, while keeping every axial dimension unchanged.
- Migrate compatible old snapshots deterministically and avoid silently preserving an impossible unequal X/Y position.
- Keep model IDs, routes, mode dimensions, length limits, mesh quality gates, and export extensions stable unless the shared-offset contract requires an export-stem update.

**Non-Goals:**

- Do not add independent X/Y editing back through a combined control.
- Do not translate the post by the offset.
- Do not expose independent X/Y editing, a proportional scale factor, or any Z/length adjustment through this control.
- Do not change the standard, thin-shell, or positioning axial profile geometry apart from the shared XY diameter increment.
- Do not introduce a new component, route, dependency, or persistence store.

## Decisions

### Use `offset` as the canonical scalar parameter

Use the existing generic `offset` parameter key rather than introducing `offsetX`, `offsetY`, or a new vector encoding. The normalized snapshots become exactly `{ mode, offset }` for fixed modes and `{ mode, length, offset }` for positioning. This keeps raw workspace parsing, parameter-schema typing, and the user-facing model definition aligned around one field.

Alternatives considered:

- Keep `offsetX` and `offsetY` internally while hiding one UI control: rejected because persistence and worker contracts would still support two independent positions and would not express the requested invariant.
- Store a string or object vector in one field: rejected because the user wants one shared value, not two values hidden inside a composite input.

### Apply the increment while constructing the centered solid

Construct the flange and body at the local origin with effective diameters `nominalDiameter + parameters.offset`. For fixed modes, this means Ø7 and Ø5 become Ø7.5 and Ø5.5 at `offset=0.5`; for positioning mode, the Ø5 body becomes Ø5.5. Keep chamfer distances, flange height, total length, and all Z stations unchanged. Bounds and quality probes derive their centered X/Y envelopes from the same effective diameters.

Alternatives considered:

- Translate the completed solid by `(offset, offset, 0)`: rejected because the requested value changes Ø7 to Ø7.5 and Ø5 to Ø5.5 rather than moving the center.
- Use a proportional XY scale factor: rejected because scaling Ø5 to Ø5.5 would make Ø7 become Ø7.7, not Ø7.5.

### Migrate old snapshots conservatively

Hydration accepts old `{ offsetX, offsetY }` records as a compatibility input only. If both values are valid and equal, it maps them to `offset`; if they differ, it preserves a valid mode and positioning length where possible but sets `offset=0`. This avoids silently choosing one axis, averaging a position, or inventing a new diagonal location. Existing legacy length/base-connection records continue to map to positioning mode with zero offset.

### Encode one offset in export identity

Keep zero-offset stems unchanged. For non-zero snapshots, use `-xy{offset}` so the filename reflects the canonical input without repeating the same value as separate X/Y segments. The export still uses the committed B-Rep and existing STEP/STL extension handling.

### Verify behavior before implementation cleanup

Add or update contract, workspace, catalog, persistence, worker geometry, and end-to-end tests to assert the single field, centered effective diameters, unchanged Z bounds, migration behavior, and export identity. Run the focused tests after each contract/build slice, then run the project type, format, build, and OpenSpec checks.

## Risks / Trade-offs

- [Risk] Persisted snapshots with unequal X/Y offsets cannot be represented by the new contract → preserve valid mode/length but reset only the shared offset to zero, and cover this migration explicitly.
- [Risk] Existing consumers may rely on non-zero `-x...-y...` filenames → keep all zero-offset stems and extensions stable, document the intentional non-zero stem change in the delta spec, and update export tests.
- [Risk] A partial parameter rename can leave runtime requests or quality checks using stale fields → update the canonical contract first, then use TypeScript and focused tests to catch every remaining reference.

## Migration Plan

1. Add failing behavior tests for the shared contract, UI field, centered XY diameter increment, migration, and export stem.
2. Change the canonical pillar type, validation, normalization, raw parsing, catalog schema, and panel to use `offset`.
3. Update worker effective-diameter construction and quality/bounds/export helpers, then run focused unit and worker tests.
4. Update persistence, runtime, and end-to-end regressions; run typecheck, formatting, build, and strict OpenSpec validation.
5. If rollback is needed before merge, revert the change commit; old snapshots remain readable through the migration branch while the old two-field contract is no longer emitted.

## Open Questions

None.

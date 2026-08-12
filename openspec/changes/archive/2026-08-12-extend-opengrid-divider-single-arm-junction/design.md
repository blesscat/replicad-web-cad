## Context

The Divider builder creates each active axis as one profiled extrusion. For a
single right or up arm its inactive-side endpoint is currently the central
axis, so the profile is tangent to only one side of the central peg. The shared
plan bounds already include the central 5 mm wall envelope, and the endpoint
retraction is already centralized in the Divider contract.

## Goals / Non-Goals

**Goals:**

- Make every single-arm orientation carry the full profile 2.5 mm across the
  central axis toward the inactive side.
- Keep the active terminal endpoint, centering, peg placement, and one-solid
  guarantees unchanged.
- Leave all multi-arm junctions exactly as they are.

**Non-Goals:**

- Do not change the 2.275 mm active-end retraction or any validation limits.
- Do not add parameters, UI controls, persistence fields, or new model types.
- Do not extend an axis that is inactive in an L, T, straight, or cross shape.

## Decisions

### 1. Extend the single-arm extrusion endpoint, not the peg

When the derived shape is `single`, use half the configured 5 mm `wallWidth`
as the inactive-side center extension. For a right or up arm, the profiled
extrusion starts at `-2.5`; for a left or down arm, it ends at `+2.5`. The
active endpoint continues to come from
`openGridDividerArmEndpointsFor`, so the base, transition, and upper wall
share the same retracted terminal station.

Extending the existing extrusion keeps the base, transition, fillets, and
upper wall aligned. Moving or enlarging the peg instead would change the
OpenGrid locating interface and would not put the wall above the peg.

### 2. Gate the extension on the derived shape classification

Use the existing four-direction classification to identify `single`. An axis
with one active direction inside an L or T remains anchored at the central
axis because another arm already supplies the central junction. This avoids
adding a hidden branch or changing multi-arm envelopes.

### 3. Verify center coverage and endpoint preservation in Worker geometry tests

For a single right arm, inspect a section above the transition and assert that
the wall reaches the centered central-peg axis on the inactive side while its
active maximum remains the retracted endpoint. Exercise the other single-arm
orientations through the same construction path, and retain existing solid,
mesh, peg, and export assertions.

## Risks / Trade-offs

- [Risk] A short opposite-side profile could fail filleting or solid fusion. →
  Reuse the existing profiled-arm and rounding pipeline and run the focused
  Divider Worker integration suite for all supported wall thicknesses.
- [Risk] Centering or bounds could shift unexpectedly. → The extension ends at
  the existing central 2.5 mm envelope, so assert centered bounds and the
  unchanged active terminal endpoint in integration tests.

## Migration Plan

No migration is required. Existing parameter snapshots and model identity are
unchanged. If reverted, only the single-arm center visual coverage behavior is
removed; multi-arm geometry and persistence remain compatible.

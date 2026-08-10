## Context

`opengrid-pillar` currently keeps `length` and `baseConnection` as its complete normalized parameter snapshot. The CAD builder applies one shared chamfer distance to every selected end station, while the quality checks and panel copy assume a 1 mm upper chamfer. The length panel already routes every text or slider update through the shared raw-input validation, debounce, generation, and persistence flow.

## Goals / Non-Goals

**Goals:**

- Give the pillar panel visible 6 mm and 8 mm quick actions without adding a parameter or changing the custom 3–500 mm input range.
- Make the upper 45° equal-distance chamfer 0.5 mm in both pillar end modes.
- Keep the plain lower chamfer at 1 mm, the base flange geometry unchanged, and total requested height unchanged.
- Keep quality gates and browser tests aligned with the new end profiles.

**Non-Goals:**

- No new model id, route, Worker message, normalized parameter, export format, or persistence schema.
- No user-adjustable chamfer or diameter control.
- No restriction of length input to only the 6 mm and 8 mm presets.

## Decisions

### Use explicit top and bottom chamfer constants

Replace the ambiguous shared pillar chamfer value with explicit fixed geometry constants for the lower 1 mm chamfer and upper 0.5 mm chamfer. Update the builder helper to accept the distance for each chamfer operation: plain mode applies the lower distance at `Z=0` and the upper distance at `Z=length`; base-connection mode applies only the upper distance after fusing the unchanged flange and body.

This is preferred over keeping one shared distance because the two ends now intentionally differ. The values remain fixed constants rather than becoming user parameters, preserving the existing parameter contract.

### Keep quick lengths local to the pillar panel

Render two clearly labeled buttons near the existing length control from a small panel-level list of numeric values. Each button calls the existing `onInputChange('length', String(value))` callback. The button state is derived from the current raw length and uses an accessible pressed state; manually entered lengths outside 6 and 8 leave both buttons unselected.

This is preferred over extending the generic catalog `ParameterField` schema because the request is specific to one component and the values are presentation shortcuts, not model metadata. Reusing `onInputChange` ensures quick actions receive the same validation, invalidation, debounce, generation, persistence, and export-readiness behavior as manual input.

### Derive end-profile quality probes from the fixed geometry

Update pillar quality and integration probes to distinguish the unchanged 1 mm lower chamfer from the new 0.5 mm upper chamfer. Upper straight-section checks must be positioned below the 0.5 mm transition, and upper-transition checks must use radial probe points that distinguish the shorter slope from the Ø5 mm body. Test expectations must assert the default plain straight section is 3.5 mm and the default base-connection straight section is 3.7 mm.

### Preserve identity and export naming

Keep `opengrid-pillar`, `/cad/opengrid-pillar`, the exact `{ length, baseConnection }` snapshot, and `pillar-{length}-{plain|base}` export stems unchanged. Existing saved snapshots remain valid; only newly generated B-Reps use the revised upper profile.

## Risks / Trade-offs

- [Risk] A probe tuned for the old 1 mm upper chamfer could pass or fail incorrectly after the geometry change. → Derive probe stations from the explicit upper chamfer constant and cover both plain and base modes in CAD-kernel integration tests.
- [Risk] A quick button could bypass normal input lifecycle if it updates local UI state directly. → Route every preset through `onInputChange` and assert the displayed value and generated/exported state in E2E coverage.
- [Trade-off] The preset list is panel-local rather than reusable catalog metadata. → This keeps the model contract small; promote it to shared metadata only if multiple components later need the same shortcut pattern.

## Migration Plan

No data migration is required. Existing persisted pillar snapshots remain valid because their shape and accepted length range are unchanged. Deploy the geometry, panel, catalog copy, and tests together; rollback is a code/spec revert and does not require rewriting persisted values.

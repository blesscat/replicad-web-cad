## Context

The existing cylinder uses the shared `OpenGridLocatingSeatMode` enum and the
same `bottomSeatMode` field name as the Stackable Box, while the Snap
center-remover profile is already defined independently as a stepped
rectangular opening. The implementation must add the new behavior without
making the Box accept a value it cannot build. See `proposal.md` for the
motivation and the delta specs for the observable contract.

## Goals / Non-Goals

**Goals:**

- Add a cylinder-only fourth radio value, `center-hook`, without changing the
  shared three-value Box seat enum.
- Generate a printable, centered, fused male hook that works with both the
  repository-defined Full and Lite Snap center-remover profiles.
- Preserve all existing cylinder profiles, hole layouts, stacking interface,
  side openings, honeycomb behavior, persistence defaults, and exports.
- Make the new geometry observable through validation, quality probes, bounds,
  and deterministic export metadata.

**Non-Goals:**

- Do not modify the Snap assets, Snap parameter schema, Snap model identity, or
  Snap center-remover cutter.
- Do not add a new catalog component or a user-configurable hook dimension.
- Do not make the hook combinable with the existing cylinder seat modes; the
  fourth value is a mutually exclusive mounting mode.
- Do not redesign the circular stacking interface or make the hook a general
  detachable accessory.

## Decisions

### 1. Keep the shared seat contract narrow and add a cylinder-local union

The shared `OpenGridLocatingSeatMode` and `OPENGRID_LOCATING_SEAT_MODES` remain
`none`, `hole`, and `integrated` for the Box and other consumers. The cylinder
contract introduces a local `OpenGridStackableCylinderSeatMode` union that adds
`center-hook`, and its validator accepts only that expanded set. Workspace raw
parsing and persistence normalization must special-case the cylinder seat
field rather than widening the shared parser. This prevents an unsupported hook
value from reaching the Box builder.

The default remains `hole`; existing legacy `bottomHolesEnabled` migration is
unchanged. The new value is canonical and is stored as `bottomSeatMode`.

### 2. Use a fixed nominal 8 × 4 quarter-turn hook

The Snap profile registry is the source of truth for the mating opening:

```text
Snap top
    narrow passage: X=4, Y=8
    ───────────────────  step
    lower chamber:    X=8, Y=8
Snap bottom
```

The cylinder hook is built in the insertion orientation with a rectangular
plan of 3.6 × 7.6 mm. This is the nominal 8 × 4 hook reduced by 0.2 mm on every
side of the 4 × 8 passage. Its long axis is along Y while inserting. After a
90-degree rotation around Z the 7.6 mm axis is along X, so it cannot return
through the 4 mm-wide upper passage and is retained by the step. The hook spans
Z=-3 mm through Z=0, which exceeds the Full narrow-band depth of 2 mm and the
Lite depth of 1.5 mm.

The clearance is a fixed product contract, not a new user parameter. The
geometry should remain simple and printable; no chamfer or fillet is required
for the first implementation unless the quality or boolean operation proves
that one is necessary.

### 3. Fuse the hook as the cylinder's only special bottom feature

The existing cylinder pipeline creates the revolved shell first and then adds
bottom locating geometry before side openings and honeycomb cuts. The hook will
follow that same pipeline: create one `makeBox`-equivalent rectangular solid,
fuse it to the cylinder's Z=0 bottom face, and release intermediate shapes on
boolean replacement. `center-hook` will skip stepped-hole cutters and round
integrated seats, and it will not emit the 14 mm outer cardinal group.

The shell's normal central bottom face provides the fusion interface in all
three floor profiles. The hook is inside the existing cylinder XY envelope,
does not change the circular stacking radii, and uses the same outward minimum
Z convention as the existing 3 mm integrated seats.

### 4. Validate the mating feature behaviorally

Cylinder quality will distinguish four cases:

- `hole`: current stepped-hole records and fixture checks;
- `integrated`: current round-seat records and footprint checks;
- `none`: no special bottom records;
- `center-hook`: one centered rectangular solid, positive printable clearance,
  correct Z span, fusion into the cylinder, and no outer locating group.

The contract bounds use min Z=-3 only for `integrated` and `center-hook`. The
quality gate must continue to reject invalid candidates before committing a
preview or enabling STEP/STL export. Existing committed revisions remain the
fallback after a failed hook generation.

### 5. Extend UI, persistence, and export metadata without changing identity

The cylinder panel adds `中心卡勾` to its existing radio group and uses a
cylinder-specific description. Raw parameter parsing, browser persistence,
catalog validation, and model-generation dispatch all carry the same typed
enum. Existing snapshots remain byte-for-byte equivalent after normalization
unless the user selects the new mode. The existing seat suffix mechanism gains
the deterministic `-seats-center-hook` value for both STEP and STL names.

### 6. Test first, then implement the smallest geometry path

Tests will first cover the new contract, parser/persistence behavior, catalog
labels and filenames, and Worker geometry/quality behavior. The initial test
run must fail for the missing `center-hook` behavior. Implementation then adds
the local enum, validation, UI/persistence plumbing, hook fusion, and quality
checks in small increments, followed by regression tests for all existing seat
modes and profiles.

## Risks / Trade-offs

- **Boolean fusion at a coplanar Z=0 face can produce a fragile B-Rep** → reuse
  the existing integrated-seat fusion pattern, inspect the resulting solid,
  and reject any invalid candidate through the quality gate.
- **Printed clearance may be insufficient for some materials or printers** →
  keep the 0.2 mm per-side contract explicit and fixed for this change; expose
  no misleading dimension control until a separate fit study exists.
- **The hook can be mistaken for a general locating peg** → label it as a
  center Snap-remover quarter-turn hook and keep it mutually exclusive from
  round seat modes.
- **Generic seat parsing is shared by Box and Cylinder** → add a cylinder-local
  parser/validator path and regression-test that Box still rejects
  `center-hook`.
- **Honeycomb cuts could intersect the hook's protected floor area** → treat the
  hook footprint as protected in the same way as existing bottom interfaces and
  validate it after honeycomb processing.

## Migration Plan

1. Extend the cylinder contract, raw parser, persistence normalization, panel,
   labels, catalog schema, and filename suffix while keeping the default at
   `hole`.
2. Add the centered hook builder and the cylinder quality/bounds checks.
3. Run unit, Worker integration, workspace, persistence, catalog, and export
   regression suites, including Full/Lite mating probes and all three existing
   cylinder floor profiles.
4. Sync the delta requirements into the three main specs and validate them.
5. Archive the complete change. Rollback is a source revert; no browser data
   migration is needed because existing snapshots retain their current values.

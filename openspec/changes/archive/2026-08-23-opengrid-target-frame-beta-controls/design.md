## Context

See `proposal.md` for the motivation. The existing OpenGrid target frame is
centered, is derived directly from `targetWidth`/`targetDepth`, and is fused
after nominal-grid feature cuts. The normalized snapshot has no frame-side or
frame-corner-shape fields, while the panel renders print planning and board
chamfer controls regardless of target-frame mode.

## Goals / Non-Goals

**Goals:**

- Add a backward-compatible persisted frame configuration without changing the
  `opengrid` model id or route.
- Make the target-frame mode a distinct beta UI state whose visible controls
  match the geometry it can safely configure.
- Derive directional bounds and frame strips from one shared side-allocation
  calculation so panel dimensions, Worker geometry, quality checks, and export
  identities agree.
- Apply square, chamfered, or filleted outer-frame corners to frame geometry
  only, after nominal OpenGrid features have been cut.

**Non-Goals:**

- Changing half-cell host directions, nominal OpenGrid connector coordinates,
  screw patterns, or the existing board chamfer behavior when target fitting is
  disabled.
- Adding connector or screw features to the physical frame.
- Adding user-configurable chamfer/fillet radii in this beta change.
- Changing print-plan geometry; print planning is only hidden while the beta
  target-frame mode is enabled.

## Decisions

### Persist frame state separately from nominal board features

Add `targetFrameShape` (`none | chamfer | fillet`) and
`targetFrameSides` (`top/right/bottom/left` booleans) to the normalized OpenGrid
snapshot. Hydration of older snapshots supplies `none` and all four sides
enabled, preserving the current centered-frame result. The existing
`chamfers` and `chamferCorners` fields remain unchanged and are not reused for
the target frame.

### Use one directional allocation model for bounds and geometry

For each axis, calculate the positive remainder as `target - nominal` when a
positive target exists. If neither opposite frame side is enabled, the
remainder is discarded for the physical envelope. If one side is enabled, the
whole remainder is assigned to that side. If both are enabled, each receives
half. The same result drives the physical bounds, the side-strip boxes, the
dimension summary, and quality probes.

This keeps target dimensions as requested inputs while making an intentionally
unextended axis visibly nominal. It also avoids treating a one-sided frame as a
translated version of the nominal grid: the nominal grid host coordinates stay
fixed and only the physical envelope grows outward.

### Keep the checkbox first and make target configuration a mode

Render the physical-target checkbox as the first OpenGrid control and append a
Beta label. When enabled, reveal the target calculator and frame-only controls;
when disabled, reveal print planning and nominal board chamfer controls. The
checkbox remains usable before a target is calculated. In that pending state,
zero target values produce the nominal envelope until the calculator applies
positive targets. Existing positive persisted targets are reused immediately.

This avoids a deadlock where the calculator is hidden until the checkbox is
checked but the checkbox is disabled until the calculator has already run.

### Build and shape the frame independently from the grid

Build each selected side as a solid strip spanning the effective physical
bounds of the other axis, overlap adjacent strips by the existing small fuse
overlap, and fuse the strips into one frame candidate. Apply the selected
corner shape to this frame candidate before fusing it to the already feature-cut
nominal grid:

- `none` keeps the outer plan corners square.
- `chamfer` uses the existing planar diagonal-cutter convention with a safe
  fixed size constrained by the available frame geometry.
- `fillet` rounds only the frame's exposed vertical outer-corner edges with a
  safe fixed radius.

The frame candidate receives no OpenGrid cutters. Nominal connector and screw
locations are calculated from the nominal grid exactly as in the non-fitted
board, so a side without a frame remains an exposed side with its connector
holes. A side with a frame also keeps its connector at the nominal boundary;
the frame never becomes a new host surface.

### Keep quality and identity aligned with the new state

Extend validation and normalized serialization for the new enums and boolean
record. Include the frame shape and a deterministic side fingerprint in file
names so different physical envelopes cannot share export identities. Quality
checks use directional bounds, selected-strip probes, nominal opening probes,
and shape-specific outer-corner evidence. Any invalid frame result remains a
generation failure and does not silently fall back to a nominal or centered
frame.

### Alternatives considered

- **Always keep the frame centered:** rejected because it cannot model the
  requested one-sided extension and makes the four direction controls cosmetic.
- **Reuse `chamfers` for the frame:** rejected because board chamfers and frame
  corner treatment have different visibility and geometry lifecycles.
- **Move connectors to the outer frame edge:** rejected because the frame is a
  non-host border and adding holes there would change the OpenGrid interface.
- **Require dimensions before enabling the checkbox:** rejected because it
  prevents the calculator from appearing after the checkbox as requested.

## Risks / Trade-offs

- **Risk:** Fillet operations can fail on a very narrow or one-sided frame. →
  Derive a safe radius from the available strip width, reject invalid geometry
  through the existing quality gate, and cover one-sided and narrow cases in
  native integration tests.
- **Risk:** Existing persisted snapshots do not have the new fields. → Apply
  explicit hydration defaults and test legacy snapshots before validation.
- **Risk:** Hiding controls can make a previously persisted board-chamfer or
  print-plan setting appear to disappear. → Preserve those values in the
  snapshot and restore their controls when target-frame mode is disabled.
- **Risk:** A target dimension can be larger than the physical envelope when
  no side is selected. → Show the derived nominal dimensions and test the
  intentional unextended-axis behavior rather than pretending the target was
  reached.

## Migration Plan

1. Add normalization defaults and validation for the new frame fields.
2. Add directional bounds, frame geometry, corner treatment, and quality tests.
3. Update the panel, translations, persistence tests, and browser scenarios.
4. Run OpenSpec validation and the relevant unit, Worker, type, format, and
   browser checks.

Rollback is field-compatible: disabling `fitToTarget` restores the existing
nominal/print-planning UI, and removing the new fields from a persisted
snapshot causes hydration to restore the square, all-sided defaults.

## Context

The existing `opengrid` model is the official 28 mm board generator and is not a container. The existing `box-normal` model provides the closest open-box behavior to reuse, but its grid pitch and corner-post interface are not OpenGrid-compatible. The supplied `public/openGrid Bare Lite Snap hold.step` is a local mating reference for the separate OpenGrid Snap base; it is not the body template for the new box.

The new component must preserve a closed box floor, an open top, adjustable X/Y cell dimensions and height, and a single interchangeable part that can be used at any stack level. The two physical interfaces have different jobs: the box-to-box interface provides sliding and stacking, while the four bottom sockets provide mounting to the OpenGrid Snap base.

## Goals / Non-Goals

**Goals:**

- Add a separate `opengrid-stackable-box` model without changing the official `opengrid` board contract.
- Keep the existing standard open-box parameter semantics where they are useful, while changing the footprint to the OpenGrid 28 mm pitch and 0.15 mm total clearance.
- Generate the same upper guide and lower receiving geometry for every box.
- Make the bottom receiving groove 45°-lead-in and keep the external stacking bottom generally flush rather than adding permanently protruding posts.
- Provide four nominal Ø5 mm Snap mounting sockets at the OpenGrid 7 mm corner offset for full-cell footprints.
- Recess the mounting-cylinder flange inside the box so its top surface is flush with the interior floor, while leaving approximately 3 mm of shaft below the exterior bottom.
- Validate continuous sliding, multi-box bridging, half-cell geometry, captive-cylinder placement, and exportability.

**Non-Goals:**

- Replacing or extending the official OpenGrid board generator in this change.
- Generating the supplied Snap base from the STEP file.
- Supporting separate upper-box and lower-box model variants.
- Using isolated round holes as the box-to-box stacking interface.
- Adding magnets, adhesive mounting, arbitrary tile shapes, or a user-configurable stacking mechanism in the first implementation.

## Decisions

### 1. Use a separate model and typed parameter boundary

Register `opengrid-stackable-box` as a new catalog and Worker model rather than adding conditionals to `opengrid` or silently changing `box-normal`. The normalized snapshot contains `x`, `y`, and `height`; X/Y accept 0.5 increments, and the definition rejects derived dimensions outside the existing 500 mm workspace limit. Fixed interface dimensions remain implementation constants so a saved model cannot accidentally become incompatible with another box or the Snap base.

The catalog metadata, route, persistence key, filename metadata, and Worker dispatch all use the new stable model id. The official OpenGrid board's saved snapshots and generated geometry remain untouched.

### 2. Build a standard open-box shell around an OpenGrid footprint

The builder uses a centered coordinate system with the exterior footprint calculated as:

```text
width  = x × 28 mm − 0.15 mm
depth  = y × 28 mm − 0.15 mm
```

The floor starts at Z=0 and the height field retains the standard open-box meaning. The top remains open, the floor remains closed except for the four mounting sockets, and the existing standard wall/floor behavior is reused only where it does not conflict with the OpenGrid interfaces. The guide rail, receiving groove, and socket recesses are included in the geometry bounds contract rather than being hidden post-export decorations.

### 3. Make the box-to-box interface a continuous rail-and-groove system

Every box receives a low-profile convex guide rail on its top rim and a matching recessed groove on its underside. The receiving groove has a 45° lead-in to tolerate small placement errors. The guide path is continuous along the relevant box edges, so a smaller box can move along a longer box without being restricted to discrete pin holes.

The upper rail uses a two-sided printable profile: its existing top lead-in remains, and the lower inner/outer rail edges use direct planar transitions sized to reach the box-rim alignment. The lower transition removes the residual vertical step and sharp downward overhang at the rail base while leaving a continuous sliding path and a positive mating surface for the underside groove. The lower transition angle is not treated as a separate fit contract; the alignment and absence of a residual step are the contract.

The rail profile is kept low and broad enough to transfer lateral load through a surface rather than through four thin posts. Internal seams between adjacent lower boxes must be lower than, or relieved from, the upper box's mating surface. For a larger upper box spanning smaller boxes, the underside relief and outer guide path must allow it to bridge the seam while remaining seated on the combined outer perimeter.

The design deliberately does not use a separate upper/lower flag. A generated box can be placed below or above another generated box, and the same interface is used at every level.

Alternatives considered:

- Four protruding stacking posts were rejected because they make the upper box less flush, do not provide continuous sliding, and create a half-cell overlap problem.
- Isolated circular stacking holes were rejected because they only provide discrete positions.
- Magnets and flexible snap hooks were deferred because they add hardware or fatigue-sensitive printed parts without improving the required sliding behavior.

### 4. Separate Snap mounting sockets from the stacking rails

The bottom contains four nominal Ø5 mm mounting sockets for the OpenGrid Snap base. In a full-cell footprint, socket centerlines follow the four external corners with a 7 mm offset from each corresponding box edge. Each entry has a fixed two-diameter profile: the base-facing opening is Ø5.05 mm, then a 0.5 mm deep 45° transition reaches an Ø6.05 mm opening toward the box interior. This is a short fixed chamfer, not a long graduated lead-in.

Each socket is a stepped captive seat rather than a plain equal-diameter through-hole:

1. The nominal Ø5 mm shaft bore receives the Snap cylinder through the Ø5.05 mm base-facing opening.
2. The fixed 45° transition expands the shaft entry to Ø6.05 mm toward the box interior.
3. The Ø6.05 mm inner opening itself is the retaining seat; no separate larger Ø6.75 mm counterbore is applied over the chamfer.
4. The compatible flange is Ø5.8 mm with 0.5 mm thickness, giving 0.25 mm radial clearance and placing its top flush with the interior floor.
5. The shaft length is calculated so approximately 3 mm remains below the box exterior after the flange is seated.

A plain, constant-diameter Ø5 mm pin cannot be made reliably captive by a hole alone; the supported base-mounting insert therefore includes a flange or equivalent shoulder. If the supplied Snap part already provides that shoulder, the generated socket is validated against its actual profile. Otherwise, a compatible flanged cylinder becomes the mounting accessory.

When a half-cell axis would put two nominal corner sockets closer than the Ø5 mm interface can physically allow, the normalized socket layout de-duplicates the coincident/overlapping locations. This preserves the requested half-cell footprint and prevents invalid overlapping cutters; the resulting socket count is determined by geometry rather than by a hard-coded four-cylinder boolean.

### 5. Treat the supplied STEP as a compatibility fixture

The supplied STEP is imported only in a developer/test path to inspect its Snap mating envelope, cylindrical interface, lead-in, and retention behavior. Its measured compound envelope is approximately 25.6 × 25.6 × 3.4 mm and it contains multiple solids, so it must not be scaled into a 28 mm box body or fused into the generated container.

The release fixture compares the generated nominal Ø5 mm socket placement and insertion clearance against the STEP reference. A mismatch produces a diagnostic compatibility failure; the builder must not hide the mismatch by changing the requested 28 mm footprint or 7 mm corner offset.

### 6. Integrate through the existing model lifecycle

Add a component definition, typed contract, builder, Worker dispatch, route, Svelte panel, persistence key, export metadata, and model-selection entry following the existing per-model boundaries. The panel exposes only X, Y, and height plus fixed explanatory copy for the stacking and Snap interfaces; it does not expose an upper/lower variant.

The latest-wins generation, invalidation, candidate commit, preview, STEP, and STL behavior remains shared with the existing workspace. Geometry-specific checks run before commit so a failed socket or stacking-interface candidate cannot replace the last valid revision.

### 7. Validate the mechanical contract with fixture shapes

Add deterministic geometry fixtures for:

- 1×1, 1×4, 1×2, and 2×2 full-cell boxes;
- 0.5×1, 1×0.5, and 0.5×0.5 half-cell boxes;
- a 1×4 lower box with a 1×1 sliding upper box;
- two 1×2 lower boxes supporting a 2×2 upper box;
- four-corner flanged-cylinder insertion with a flush interior floor;
- the supplied Snap STEP mating reference; and
- STEP/STL export from successful committed revisions.

The fixtures inspect bounds, watertightness, non-overlapping socket cutters, rail/groove engagement clearances, the flush flange plane, and the approximately 3 mm exterior shaft exposure. Browser tests verify route isolation, persistence isolation, invalid-input behavior, and the static OpenGrid chooser entry.

### 8. Calculate requested dimensions with half-cell upward rounding

The stackable-box panel includes the shared dimension calculator. For a requested X/Y footprint, it evaluates the generated footprint (`cell count × 28 mm − 0.15 mm`) at 0.5-cell increments and selects the smallest valid count whose footprint is not smaller than the requested dimension. This calculator is independent from the existing calculators for models whose contract intentionally rounds down to the largest fitting integer count.

### 9. Align the lower guide-rail transition

The lower guide-rail transition is extended from the previous 0.35 mm distance to the full 0.5 mm rail-to-rim transition. This consumes the remaining 0.15 mm inner overhang and makes the lower transition meet the box rim without a vertical segment. The top lead-in and underside receiving groove remain unchanged.

## Risks / Trade-offs

- **[STEP mating geometry differs from the requested nominal 7 mm/Ø5 mm contract]** → Keep the STEP as an explicit fixture, use declared fit tolerances, and fail with a diagnostic rather than silently scaling the box.
- **[A plain Ø5 mm cylinder cannot be captive in a plain through-hole]** → Require a Ø5.8 mm flanged/shouldered cylinder in the Ø6.05 mm retaining seat; test the flush placement and retention direction.
- **[Half-cell corner sockets overlap]** → De-duplicate socket positions before boolean operations and test all three half-cell layouts.
- **[Adjacent lower boxes create an interfering seam]** → Keep internal seam geometry below the mating plane or provide underside relief, and include the 1×2 + 1×2 → 2×2 fixture.
- **[Printed fit varies by printer and material]** → Keep nominal interface dimensions separate from fit clearance constants and expose a diagnosable fixture failure when the chosen tolerance is not viable.
- **[Guide geometry changes effective height or usable interior]** → Preserve the standard height semantics in the contract and verify the interior floor/top bounds in geometry tests.

## Migration Plan

1. Add the typed model contract and catalog definition without changing existing model ids or saved snapshots.
2. Implement and validate the open-box shell, continuous guide rail/groove, and captive mounting sockets.
3. Add Worker dispatch, route, panel, persistence, chooser metadata, and export naming.
4. Run unit, Worker, browser, mating-reference, and export fixtures for the new model.
5. Enable the model in the OpenGrid series only after the fixture matrix passes.
6. If the new model must be rolled back, remove its catalog/route registration and preserve all existing `opengrid`, `box-normal`, and other model persistence entries; no migration of those existing entries is required.

## Open Questions

- The exact rail cross-section and print-fit values will be tuned against the supplied STEP and the repository's supported print tolerance. The selected Ø5.05/Ø6.05 hole profile and captive-flange approach remain fixed.

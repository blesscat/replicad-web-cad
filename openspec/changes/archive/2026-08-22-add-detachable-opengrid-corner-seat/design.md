## Context

See `proposal.md` for motivation and the three delta specs for the observable
contract. The Organizer Box currently maps its two bottom modes onto shared Grid
Box geometry: `corner-seat` fuses the existing Ø5 × 3 mm integrated feet and
`stackable` applies the normal stacking profile. Its body bottom datum is Z=0,
while cavity floors remain above the fixed 5 mm interface floor datum plus the
requested bottom thickness.

The Pillar builder currently constructs three analytic profiles from typed
parameters. The Worker already supports cached STEP-backed templates through
`KernelBuildContext`, so the supplied male and retaining-tab female STEP models
can remain Worker-only B-Reps without reconstructing their trimmed conical
surfaces on the main thread.

## Goals / Non-Goals

**Goals:**

- Preserve the two supplied STEP solids as the canonical prototype fit instead
  of approximating their keyed taper and retaining tabs.
- Share one validated geometry contract between the Organizer Box female socket
  and Pillar male-seat mode.
- Leave existing Organizer Box and Pillar modes byte-for-byte compatible at the
  parameter-contract level and geometrically unchanged.
- Keep imported templates cached by the Worker but clone every shape before a
  builder transforms or owns it.

**Non-Goals:**

- Do not add the detachable socket to Grid Box, Round Box, or another OpenGrid
  model before physical prototype acceptance.
- Do not expose clearance, tab dimensions, male length, or XY offset controls
  for the detachable fit.
- Do not synthesize four male seats in the Organizer Box export; the Pillar
  component continues to export one printable part at a time.
- Do not add a new catalog component, model ID, route, or dependency.

## Decisions

### 1. Store and validate canonical STEP references in a shared Worker module

Add the supplied files under
`src/cad-kernel/components/opengrid-locating-assembly/assets/` with stable ASCII
filenames for the male seat and female socket material. A sibling shared module
will expose their URLs, import functions, bounds/volume inspection, seated-pose
compatibility inspection, and fixed local transforms. Numeric dimensions live
in `OPENGRID_LOCATING_ASSEMBLY_CONFIGURATION`; the binary references remain the
source of truth for the trimmed taper and retaining-tab boundaries that cannot
be represented by the simple scalar contract alone.

`KernelBuildContext` and the CAD Worker gain two cached reference getters. The
Worker owns and disposes the cached originals; each builder clones a reference
before rotating, translating, cutting, or returning it. Failed imports clear
their cache entry so a later generation can retry. Node integration tests load
the same assets from disk and pass them through the context boundary.

Alternatives considered:

- Reconstruct both parts only from cylinders, cones, and box cuts: rejected for
  the prototype because a small error in the two asymmetric retaining tabs
  would invalidate the physical test.
- Duplicate assets and import logic under both consumer directories: rejected
  because future fit corrections could silently update only one side.

### 2. Form the female socket by cutting the reference complement

The female STEP describes material, but the Organizer Box body already contains
that material. Normalize the reference from source Z=3..4.5 to box-local
Z=0..1.5, subtract it from a coincident Ø7 × 1.5 mm envelope to obtain the
socket-void template, then cut translated/rotated clones of that void from the
existing Organizer Box solid. This leaves the ring and retaining tabs as native
box material, so there is no second solid and no fragile holder-to-body fuse.

Derive four placements from the existing corner-center calculator, but assign
rotation by quadrant rather than relying on array order: upper-left 0°,
upper-right 90°, lower-right 180°, and lower-left 270°. Combine the four voids
into one cutter and perform one measured boolean cut with generation-current
checks around the operation. The existing integrated-foot and stackable paths
remain unchanged; the new branch bypasses both.

The Organizer Box contract treats the detachable socket as a Ø7 interface
feature for footprint collision calculations. Its expected lower bound is Z=0,
and its 1.5 mm depth stays well below the current cavity floor because that
floor includes the fixed 5 mm interface datum.

Alternatives considered:

- Cut a Ø7 disk and fuse the holder reference into the opening: rejected because
  coincident cylindrical faces make a one-solid fuse more sensitive to boolean
  tolerance.
- Emit the holder as a second printable solid: rejected because the user
  explicitly requires it to be part of the box.

### 3. Add an exact fixed Pillar union member

Extend the normalized Pillar union with exactly
`{ mode: 'detachable-corner-seat' }`. The raw workspace parser deliberately
drops hidden `offset` and `length` values when this radio option is active, and
the canonical validator rejects those fields if an external caller includes
them. Existing three modes retain their current shapes, offset semantics,
legacy normalization, and export stems.

For the new mode, `buildPillar` clones the cached male reference, verifies the
generation is still current, and runs the normal single-solid, finite-bounds,
mesh, volume, and export lifecycle. It does not run the existing flange fuse or
end-chamfer routines. The fixed bounds are ±2.5 mm in X/Y and 0..4.5 mm in Z;
the export stem is `pillar-4.5-detachable-corner-seat`.

The Pillar panel adds a fourth `可拆式角座` / `Detachable corner seat` radio
choice. It hides both numeric controls for this mode, while standard,
thin-shell, and positioning retain the current offset control and positioning
alone retains length.

Alternatives considered:

- Reuse `positioning` with `length=4.5`: rejected because positioning requires
  an integer length and its round chamfered profile cannot express the keyed
  retaining head.
- Allow the shared Pillar offset to tune fit: rejected until the fixed reference
  has completed its physical trial.

### 4. Layer quality checks around the shared references and assembled box

Shared reference tests verify B-Rep validity, one-solid topology, exact bounds,
nominal volumes, the 0.2 mm insertion lead-in, the 0.15 mm wear extension, and
zero positive-volume intersection in the canonical seated pose. Pillar quality
branches to reference-specific probes rather than applying the existing round
pillar end-profile probes.

Organizer quality verifies all four keyed voids at the expected centers and
rotations, confirms material remains in the retaining-tab regions, confirms a
properly transformed male reference has no positive-volume collision with the
box, and confirms neither existing downward feet nor the stacking guide is
present. Existing quality assertions continue unchanged for the other two
modes.

Contract, persistence, UI, Worker, STEP/STL export, and targeted e2e coverage
will exercise the fourth Pillar mode and third Organizer Box mode. The supplied
fit remains a physical acceptance item: CI can prove geometric compatibility,
but not printed friction or wear behavior.

## Risks / Trade-offs

- [STEP import adds first-use latency] → cache both originals for the Worker
  lifetime, clone them for generation, and include asset loading in integration
  tests.
- [Complement booleans can expose coincident-face tolerance issues] → validate
  the derived void as a non-empty B-Rep, cut all four placements in one measured
  operation, and compare the result with reference-placement probes.
- [Hidden stale Pillar fields can produce a non-exact snapshot] → normalize raw
  detachable mode directly to its one-key union member and test mode switching,
  persistence, and external strict validation separately.
- [Geometric clearance does not guarantee the desired printed retention] → keep
  all dimensions fixed, record the hand-fit criteria, and explicitly defer wider
  rollout until a real Organizer Box print passes.
- [Asymmetric socket orientation can drift during refactoring] → derive angle
  from corner quadrant and assert the ordered 0°/90°/180°/270° placement in
  contract and Worker tests.

## Migration Plan

This is an additive enum extension with unchanged defaults. Existing Organizer
Box and Pillar snapshots normalize exactly as before; only newly selected modes
write the new enum values. Deploy the shared assets and loaders first, then the
Pillar and Organizer branches, controls, and tests in the same release. Rollback
removes the two new enum branches and assets; existing saved snapshots and model
IDs remain untouched. A persisted new-mode snapshot on a rolled-back build will
fall back through the existing invalid-snapshot default behavior.

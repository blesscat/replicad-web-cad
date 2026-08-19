## Context

The existing CAD system registers each model through a typed contract, model
catalog definition, route, workspace panel, Worker kernel definition, and
component-local builder. OpenGrid uses a 28 mm pitch, a 0.15 mm per-axis
exterior clearance, and fixed locating/stacking interface geometry. The current
stackable-box builder is primarily a hollow shell with a stepped top rail and
optional side openings, so its shell cavity cannot be reused as the organizer's
solid top surface without changing existing behavior.

See `proposal.md` for motivation and
`specs/opengrid-organizer-box/spec.md` for the observable contract.

## Goals / Non-Goals

**Goals:**

- Add an independently persisted and routed `opengrid-organizer-box` model.
- Produce one solid body with a centered matrix of identical blind cavities.
- Reuse the existing OpenGrid footprint and bottom-interface geometry through
  tested shared primitives or adapters.
- Keep cavity layout calculations deterministic, bounded, and safe for Worker
  generation and export.

**Non-Goals:**

- Do not change or migrate existing model IDs, saved snapshots, or Grid Box
  geometry contracts.
- Do not support per-cavity dimensions, mixed shapes, per-cavity rotation, or
  side openings in the first version.
- Do not add a third combined bottom-interface mode.
- Do not add a new CAD kernel dependency or a new Worker protocol version.

## Decisions

### 1. Use a dedicated model contract and component-local directories

The stable identity is `opengrid-organizer-box` everywhere: model ID, build key,
route slug, catalog component file, panel directory, and CAD-kernel component
directory. The display name will begin with `OpenGrid `. Existing definitions
remain registered unchanged. This follows the project naming rule and prevents
the new parameter shape from being accidentally accepted as a Grid Box
snapshot.

The canonical parameter shape is:

```text
holeCountX: number
holeCountY: number
holeSpacingMode: 'linked' | 'independent'
holeSpacingX: number
holeSpacingY: number
holeShape: 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon'
holeDiameter: number
holeDepth: number
bottomThickness: number
bottomInterfaceMode: 'corner-seat' | 'stackable'
```

The initial defaults are 2 × 2 circular cavities, linked 2 mm edge spacing,
20 mm cavity diameter, 20 mm cavity depth, 2 mm bottom thickness, and the
`corner-seat` interface. Initial UI bounds are 1–20 for each count, 0.5–300 mm
for spacing and diameter, 1–500 mm for cavity depth, and 1–100 mm for bottom
thickness. The derived 500 mm workspace limit remains the final guardrail.

In linked mode the panel renders one spacing field and writes the same typed
value to both axes. In independent mode it renders two fields. Keeping both
canonical fields in all snapshots avoids optional-field migration and makes
validation deterministic.

### 2. Derive layout from outer envelopes, not center distances

The layout calculator first constructs the selected cavity's 2D outer envelope
from its shape, fixed orientation, and inscribed-circle diameter. A circle's
envelope is its diameter. A polygon is a regular polygon whose apothem is half
of `holeDiameter`; its actual X/Y envelope is measured from the canonical
vertices rather than approximated as a circle.

All cavities use one canonical orientation relative to world X/Y. The cavity
centers are symmetric around the origin. For each axis:

```text
axis pitch = axis envelope + requested edge-to-edge gap
axis span  = axis envelope + (count - 1) × axis pitch
```

The calculator then adds the fixed printable/interface boundary clearance and
selects the smallest legal 0.5-grid OpenGrid count that contains the span. The
external footprint remains `gridCount × 28 mm - 0.15 mm` per axis. The selected
grid count is derived display data, not a user-editable parameter. The
calculator must also perform a real collision check against the chosen bottom
interface; if the minimum footprint would intersect a fixed interface feature,
it advances to the next legal half-grid before returning a result.

This makes the user-facing spacing unambiguously outer-envelope-to-
outer-envelope while keeping the box compatible with the existing grid.

### 3. Build a solid rounded envelope, then cut batched cavity tools

The organizer builder will create a solid rounded-rectangle envelope using the
existing OpenGrid external corner and bottom reference conventions. It will
not call the existing hollow-shell path. The top surface is flat except for
the cavity openings; no top rail or side opening is added by the organizer
body.

For every layout center, the builder creates a cutter extending from slightly
above the top surface down to the calculated cavity floor, with a small boolean
epsilon that guarantees an open top without reducing the requested remaining
bottom thickness. Circle cutters use cylinders. Polygon cutters use a regular
polygon sketch/prism with apothem `holeDiameter / 2` and the single canonical
orientation. Cavity tools are compound-cut in bounded batches so large valid
matrices do not require one boolean operation per cavity while still allowing
generation-current checks between batches.

The top Z datum is derived rather than entered directly:

```text
storage body height = interface floor datum + bottomThickness + holeDepth
```

The existing fixed lower datum for the selected interface remains part of the
overall bounds. `holeDepth` always describes usable cavity depth, and
`bottomThickness` always describes material remaining below the cavity floor.

### 4. Reuse bottom-interface primitives behind an explicit two-way adapter

The new builder will expose only `corner-seat` and `stackable` as a radio-backed
enum. Shared geometry helpers will be extracted or wrapped so that existing
Grid Box generation continues to use its current parameter contract and tests.

- `corner-seat` uses the existing four-corner socket-center calculation and
  the Grid Box's `integrated` built-in-foot profile, including small-footprint
  de-duplication. It fuses four downward Ø5 mm × 3 mm solid feet from Z=-3 mm
  to Z=0 mm; it does not create insertable socket holes and does not apply the
  normal box-to-box stacking guide.
- `stackable` applies the existing normal bottom guide/seam profile and its
  fixed 0.25 mm stacking clearance. It does not add the four corner sockets.

The adapter owns the new component's height and body envelope, while the shared
interface helpers own the existing locating positions, radii, steps, and
quality tolerances. Existing Grid Box tests will run unchanged as regression
coverage after any helper extraction.

### 5. Register the model through the existing catalog and Worker boundaries

The implementation will add the new contract to the model union, typed
validation, bounds and filename dispatch, then add a catalog definition and a
dedicated Svelte panel. The panel will expose radio controls for the bottom
interface and cavity shape, linked/independent spacing controls, count and
dimension fields, calculated grid occupancy, and field-specific errors.

The model will be added to the catalog, kernel registry, initial state defaults,
workspace validation, parameter persistence, diagnostics, localization, and
route generation. The Worker builder will receive only typed validated
parameters and will keep all B-Rep operations Worker-only. No main-thread
component will construct CAD geometry.

### 6. Validate geometry at contract and quality layers

Contract validation rejects malformed types, unsupported enums, invalid linked
spacing, unsafe counts/dimensions, over-limit footprints, and layouts that
cannot leave the required bottom or outer wall material. Builder quality checks
verify a single solid, finite bounds, cavity count/shape/depth, requested
bottom thickness, no side openings, and exactly the selected bottom interface.

Exports use a compact deterministic fingerprint containing the shape, counts,
spacing mode/values, diameter, depth, bottom thickness, and interface mode so
distinct organizer snapshots cannot overwrite one another.

## Risks / Trade-offs

- [Boolean cost grows with cavity count] → cap counts and dimensional bounds,
  compound cutters in bounded batches, report boolean progress, and check
  generation freshness between batches.
- [Polygon envelope or orientation mistakes can make edge spacing misleading]
  → derive axis envelopes from canonical vertices, use one fixed orientation,
  and test circle plus every polygon side count with asymmetric X/Y spacing.
- [Shared bottom-profile extraction could regress Grid Box geometry] → keep the
  existing contract unchanged, preserve current tests, and add organizer
  interface probes for both radio modes before replacing any helper.
- [Deep cavities can collide with interface or thin walls] → perform layout and
  solid-boundary checks before generation and repeat final watertight/single-
  solid quality checks before commit.
- [Large derived footprints make the model difficult to print] → retain the
  500 mm workspace guardrail, show derived grid occupancy, and keep export
  disabled for invalid snapshots.

## Migration Plan

This is an additive model with no migration of existing IDs or snapshots. Add
the new catalog/persistence entry and route, validate the new model in
isolation, and then sync/archive the OpenSpec delta. Rollback is deleting the
new model registration and its component-local files; existing model contracts
and persisted entries remain untouched.

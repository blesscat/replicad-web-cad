## Context

The existing OpenGrid builder has two kinds of geometry: a single profiled
surface for Full/Lite and a Heavy product made from opposing profiled layers,
a 0.2 mm middle gap, and a projected bridge. Its product path currently
chooses one variant for every cell, while the Worker and catalog already carry
the variant as part of the normalized OpenGrid snapshot.

The external reference is the public MakerWorld design `openGrid Hybrid - 28
Sizes` (design id `1863562`, creator KYZ Design). Its public design API
description is the authoritative comparison note for this change:

```text
Hybrid of openGrid and openGrid Heavy to balance the thicker and stiffer
openGrid Heavy panels with the lower material use and print time of openGrid.
These panels have one “Heavy” perimeter and standard grids inside.
```

Reference URLs:

- https://makerworld.com/en/models/1863562-opengrid-hybrid-28-sizes
- https://api.bambulab.com/v1/design-service/design/1863562
- https://github.com/AndyLevesque/QuackWorks/blob/61231295ea08c302eff32051769113c48cbda255/openGrid/openGrid.scad

The external model is a collection of pre-generated 6×6 through 12×12
boards, not a runtime dependency or an API contract. The implementation will
generalize the same structural rule to the existing legal 1–17 grid range.

## Goals / Non-Goals

**Goals:**

- Keep the existing `opengrid` model id, normalized snapshot shape, route,
  persistence key, Worker protocol, filenames, and export lifecycle.
- Make Hybrid a real mixed-cell product: Heavy perimeter cells, Full
  interior cells, and Heavy profile for every selected half-cell boundary.
- Match the public Hybrid side profile by adding a one-sided sloped transition
  from the Full interior height to the Heavy perimeter height on each
  inward-facing perimeter edge.
- Reuse the already verified OpenGrid Full and Heavy profiles and feature
  cutters so the new variant retains the 28 mm interface and existing
  accessory compatibility.
- Keep the production strategy cell-balanced and preserve cancellation,
  candidate ownership, quality gating, and native-resource cleanup.
- Add deterministic structural tests that distinguish Heavy perimeter material
  from Full interior material, plus UI, Worker, benchmark, and export coverage.

**Non-Goals:**

- Do not import MakerWorld STL/3MF files or require network access, OpenSCAD,
  Bambu Studio, or a new native CAD dependency at runtime.
- Do not add a new model id or route for Hybrid, and do not change existing
  Full, Lite, or Heavy geometry or persisted snapshots.
- Do not reproduce MakerWorld's fixed download-size catalog or printer-specific
  plate layout; the app remains a parametric generator.
- Do not treat Hybrid as a uniform 13.8 mm plate or as a second Full/Lite
  layer across the entire board.

## Decisions

### 1. Represent Hybrid as an existing variant with a derived layered envelope

Add `Hybrid` to `OpenGridVariant` and to `OPENGRID_CONFIGURATION.variants`
with `thickness: 13.8`. The existing bounds and UI dimension paths can then
continue to describe the board's maximum envelope while the design and tests
make clear that the interior material only reaches the Full 6.8 mm surface.

**Alternative rejected:** Add a boolean `heavyPerimeter` or a second board
model. That would split persistence and Worker contracts, make the external
variant impossible to identify in the UI, and create a second route for a
profile that belongs to the OpenGrid board family.

### 2. Classify full cells by the one-cell perimeter rule

For a full-cell coordinate `(row, column)`, classify it as perimeter when
`row === 0`, `row === rows - 1`, `column === 0`, or `column === columns - 1`.
Build perimeter cells with the existing Heavy layer profile and interior cells
with the existing Full profile. When either full-cell axis is smaller than
three, no interior cell exists and all cells intentionally use Heavy.

This preserves the reference's one-cell perimeter for rectangular boards and
does not invent a new thickness or profile. The mixed lower layer remains
connected at the cell seams; the upper Heavy layer and bridge are restricted
to perimeter cells, so interior cells retain the open Full surface.

**Alternative rejected:** Make a Full board and add a solid rectangular rim
around it. A rectangular rim would cover or distort the profiled capture
interface at perimeter seams and would not preserve the Heavy cell geometry.

### 3. Build Hybrid with two perimeter surfaces and a perimeter bridge

Use the same layer thickness and vertical positions as Heavy:

```text
lower Heavy/Full surfaces: Z = 0 .. 6.8, mirrored within the layer
middle bridge:              Z = 6.8 .. 7.0
upper Heavy perimeter:      Z = 7.0 .. 13.8
Full interior:              Z = 0 .. 6.8 only
```

The lower and upper surface builders will accept a per-cell profile factory.
The bridge builder will emit the existing projected bridge pieces only for
perimeter cells, plus Heavy half-cell boundary pieces. The final product is
fused before board-level screw and connector cutters are applied.

**Alternative rejected:** Use the existing whole-board Heavy bridge. It would
fill the interior middle layer and turn the standard interior into a Heavy
surface, contradicting the reference and increasing material unnecessarily.

### 4. Treat half-cell hosts as part of the Heavy perimeter

Half-cell pieces always lie on the outer boundary, so Hybrid half-cell rails,
corner nodes, and bridge pieces use the existing Heavy construction helpers.
The full-cell perimeter classification remains based on full-cell rows and
columns; this avoids changing the existing centered half-cell coordinates or
feature placement.

### 5. Apply features according to the mixed envelope

Hybrid is a layered variant for feature-cut purposes. Chamfer cutters are
applied to each lower/upper surface and the perimeter bridge at the same
stages used by Heavy. Board-level screw cutters use the full 13.8 mm envelope
and both top/bottom head treatments, while connector cutters are emitted at
both Heavy layer offsets. This gives perimeter seams the same robust Heavy
cutout behavior and lets interior lattice intersections pass through the
standard lower/full material without adding a second interior layer.

The existing feature-coordinate functions remain authoritative. No Hybrid
specific screw or connector coordinates are introduced.

### 6. Keep prototype assets and production strategy separate

Hybrid has no single canonical cell whose tiling can reproduce the mixed
board. The product strategy remains `cell-balanced`; the one-cell Hybrid
prototype is allowed to be Heavy-equivalent for cache and template-bound
tests only. Prototype-template benchmark requests for multi-cell Hybrid must
be reported as unavailable rather than silently used for production.

The existing Heavy STEP asset may validate the one-cell Hybrid prototype
because the one-cell contract is explicitly Heavy-equivalent; no new binary
asset is needed.

### 7. Validate structure, not just the maximum bounds

The quality gate will retain all existing bounds, topology, profile, opening,
half-cell, and mesh checks. New Hybrid tests will additionally probe a
perimeter cell at a Heavy-layer Z level and an interior cell above 6.8 mm. The
perimeter probe must contain material at the upper layer, while the interior
probe must be empty there. The lower surface must remain connected and all
cell opening probes must remain through.

The optional external-reference test remains environment-gated. If a user
provides a downloaded Hybrid STL fixture, it may be compared by envelope,
volume, and representative section occupancy using the same developer-only
mechanism; production must remain independent of the download.

### 8. Add the Heavy-to-Full transition profile

The public Hybrid reference side profile shows that the Heavy perimeter is not
joined to the Full interior by a square vertical step. On each perimeter side
that faces an interior cell, the boundary receives a transition wedge whose
lower end starts at the Full surface height and whose upper end reaches the
Heavy envelope height. The outside-facing perimeter edge remains the existing
Heavy vertical profile. Corners receive the two applicable inward-facing
transitions.

The transition will be generated as a small, reusable wedge aligned to the
perimeter side rather than by changing the standard Full or Heavy tile profile.
It will be fused before board-level feature cuts, remain inside the perimeter
cell boundary, and be kept clear of the cell opening. A behavioral section
test will sample the ramp at lower, middle, and upper heights; exact geometry
must be derived from the existing 6.8 mm Full and 13.8 mm Heavy envelope
constants rather than copied literals.

## Risks / Trade-offs

- **[Mixed profiles may fail to fuse at Full/Heavy seams]** → retain a small
  seam overlap through the existing profiled tile geometry, add 3×3 and 6×6
  single-solid integration tests, and reject candidates through the quality
  gate.
- **[Applying Heavy bridge cutters to a perimeter-only bridge may cut empty
  space or leave disconnected solids]** → build bridge pieces with the same
  perimeter classifier, apply chamfers before the final fuse, and test all
  outer-corner combinations.
- **[The public reference has fixed sizes while this app accepts 1–17]** →
  document the generalized rule, make 1–2-cell axes explicitly
  Heavy-equivalent, and use 6×6/12×12 fixtures for external comparison.
- **[Existing variant loops may omit Hybrid]** → centralize the supported
  variant list where practical, update benchmark/release/reference matrices,
  and add contract tests that assert the four variant names.
- **[Mixed-depth preview may be misread as a uniform 13.8 mm board]** → show
  “13.8 mm max；外圍 Heavy／內部 Full” in the panel and document the profile
  semantics in the catalog and docs.

## Migration Plan

1. Update the OpenSpec delta and shared variant contract/bounds metadata.
2. Add mixed-cell Hybrid surface and perimeter-bridge assembly helpers while
   preserving Full/Lite/Heavy paths.
3. Update layered feature-cut and quality behavior for Hybrid.
4. Update panel, catalog, docs, persistence fixtures, benchmark matrices, and
   targeted unit/Worker/E2E tests.
5. Run targeted CAD tests, typecheck, build, formatting, strict OpenSpec
   validation, and the relevant full test suite.
6. Review the completed change with a read-only subagent against the OpenSpec
   artifacts and the public Hybrid definition; apply and re-review any valid
   findings.

Rollback is a normal revert of the Hybrid variant and mixed-cell builder
changes. Existing Full, Lite, Heavy snapshots and routes remain compatible
because the normalized field shape and existing enum values are preserved.

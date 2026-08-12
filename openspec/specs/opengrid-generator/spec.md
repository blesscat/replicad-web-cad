## Purpose

提供目前產品中的官方 OpenGrid generator contract。使用者可以設定
Full/Lite/Heavy 板型、grid、half-cell、螺絲、connector 與 chamfer，並取得
可驗證的 B-Rep、preview、STEP 與 binary STL。

## Reference

The implementation profile is based on the official OpenGrid source at commit
61231295ea08c302eff32051769113c48cbda255:

https://github.com/AndyLevesque/QuackWorks/blob/61231295ea08c302eff32051769113c48cbda255/openGrid/openGrid.scad

The implementation retains source attribution and license notes. The old
flat-plate, 16 mm opening, four-slot, and small/large connector schemas are
not compatible with the current normalized snapshot.

## Requirements

### Requirement: OpenGrid product assembly

The existing opengrid product builder MUST use the cell-balanced assembly
strategy for Full, Lite, and Heavy. Whole-profile, row-block, and
prototype-template strategies MAY remain available to explicit benchmark or
geometry-test requests, but MUST NOT be selected as a silent product fallback.

#### Scenario: Product generation uses the selected product strategy

- **WHEN** the Worker receives a valid opengrid snapshot
- **THEN** the product builder MUST dispatch the cell-balanced strategy
- **AND** a product-generation failure MUST remain a generation failure rather
  than silently retrying prototype-template

### Requirement: OpenGrid normalized parameter contract

The existing catalog model id MUST remain opengrid and its normalized
parameters MUST include:

- variant Full, Lite, or Heavy;
- integer rows and columns from 1 through 10;
- halfCellX none, left, or right, and halfCellY none, top, or bottom;
- chamfers none, corners, or everywhere plus four outer-corner flags;
- connectorHoles none or enabled plus independent top, right, bottom, and left
  side flags;
- screwKind official-default or custom;
- generic screw diameter, head diameter, head inset, countersunk toggle, and
  countersunk angle;
- screwMode none, corners, everywhere, by-row-column, or custom;
- screwCenter, screwEvery, row interval, and column interval; and
- sorted custom positions on the internal rows-minus-one by
  columns-minus-one intersection lattice.

The standard pitch MUST be 28 mm. Without half-cell directions, the board
width and depth MUST be columns times 28 mm and rows times 28 mm. Each
selected half-cell direction MUST add exactly 14 mm on its axis while keeping
the board centered and within the 500 mm workspace limit.

The official default MUST be Lite 2 by 2 with corner chamfers, all connector
sides enabled, corner screws, and screw dimensions 4.1 mm, 7.2 mm, 1 mm,
countersunk enabled, and 90 degrees.

The normalized snapshot MUST use generic dimensions and MUST NOT retain the
former 16 mm opening, four-slot, small/large connector, or M3/M4/M5-only
schema. Named m3 through m7 UI presets MAY exist only as helpers that write
the generic dimensions.

#### Scenario: Official defaults

- **WHEN** the opengrid route has no valid saved snapshot
- **THEN** the workspace MUST use the official default snapshot
- **AND** the derived board size MUST be 56 by 56 mm with 4 mm thickness

#### Scenario: Invalid or legacy snapshot

- **WHEN** a snapshot has an unsupported enum, invalid dimension, out-of-range
  grid, duplicate or out-of-range intersection, old schema field, or invalid
  half-cell value
- **THEN** validation MUST reject it before native work
- **AND** the previous accepted preview MUST remain stale
- **AND** incompatible persisted data MUST fall back to the component default

### Requirement: Official tile profile and variants

Each logical cell MUST use the official profiled tile rather than a flat
plate with an invented through-hole. The profile MUST preserve the 28 mm
pitch, 0.8 mm outside extrusion, 0.4 mm top chamfer, 1 mm middle chamfer,
2.4 mm capture inset, 2.6 mm corner-square thickness, 4.2 mm intersection
distance, and 25 mm inner tile size.

Full MUST use 6.8 mm thickness. Lite MUST use the official 4 mm reduced
profile and connector/snap height behavior. Heavy MUST use the official
13.8 mm opposing profiled layers around the 0.2 mm gap and projected middle
layer, rather than a single solid plate.

#### Scenario: Profiled board envelope

- **WHEN** a valid 1 by 1 or multi-cell board is generated
- **THEN** its outer envelope MUST use the selected grid and half-cell
  dimensions
- **AND** its base MUST remain at Z=0
- **AND** its center opening, capture ledges, corner nodes, and edge rails MUST
  be present

### Requirement: Official chamfer and connector behavior

The generator MUST support none, corners, and everywhere chamfer modes.
Corners mode MUST honor the four independent outer-corner flags without
moving the board envelope.

Connector holes MUST use an enable flag, independent side flags, official
inward-facing cutout geometry, and eligible seam placement. The connector
profile MUST preserve the official primary radius 2.6 mm, dimple radius
2.7 mm, separation 2.5 mm, cut height 2.4 mm, and variant-specific Z
placement. A one-cell axis MUST produce no duplicate seam positions.

#### Scenario: Selected connector sides

- **WHEN** only selected connector sides are enabled
- **THEN** only those outer sides MAY receive connector cutouts
- **AND** unselected edge geometry MUST remain unchanged

### Requirement: Official screw geometry and placement

Screw cutters MUST use the generic through diameter, head diameter, head
inset, countersunk toggle, and countersunk angle. The official default MUST
be 4.1 mm, 7.2 mm, 1 mm, enabled, and 90 degrees. Screw and connector
polygonal profiles MUST use the official 30-side and 50-side resolutions.

Screw positions MUST use the internal tile-intersection lattice. The modes
MUST behave as follows:

- none adds no screws;
- corners selects the de-duplicated outer lattice positions;
- everywhere selects every eligible lattice position;
- by-row-column applies the requested intervals; and
- custom uses exactly the validated custom positions.

The `screwCenter` modifier MUST add one de-duplicated internal lattice position
when both grid axes contain at least two cells. For each even cell-count axis,
it MUST select the exact central lattice coordinate. For each odd cell-count
axis, it MUST select the nearest central lattice coordinate with a stable
upper-left bias: negative X for columns and positive Y for rows in the
centered board coordinate system. A one-cell axis MUST keep the center
modifier invalid because no internal intersection exists on that axis.

Center and interval modifiers MUST add de-duplicated lattice positions.
Custom positions MUST be sorted and de-duplicated by normalization rather than
silently moved into cells.

#### Scenario: Generic screw placement

- **WHEN** a user selects official-default, custom dimensions, or a custom
  internal-intersection matrix
- **THEN** the normalized snapshot MUST contain generic screw dimensions and
  validated lattice positions
- **AND** generated cutters MUST use those dimensions and positions

#### Scenario: Center screw on an even-by-even board

- **WHEN** `screwCenter=true` is selected for a board with even `rows` and
  even `columns`, including the official 2 by 2 board
- **THEN** the center modifier MUST resolve to the exact central internal
  intersection
- **AND** existing `Corners` positions MUST remain de-duplicated with the
  center position

#### Scenario: Center screw on an odd grid

- **WHEN** `screwCenter=true` is selected with `rows >= 2` and `columns >= 2`
  and either axis has an odd cell count
- **THEN** validation MUST accept the snapshot
- **AND** the center modifier MUST resolve to the nearest internal intersection
  using the upper-left tie-breaker
- **AND** the board-level cutter MUST remove a screw hole at that resolved
  position using the selected screw dimensions

#### Scenario: Center screw with an official corner configuration

- **WHEN** `screwKind=official-default`, `screwMode=corners`, and
  `screwCenter=true` are selected on a valid odd-grid board
- **THEN** the official screw dimensions and corner holes MUST remain unchanged
- **AND** the resolved upper-left center-adjacent hole MUST be added to the
  effective screw centers

#### Scenario: Center screw on a one-cell axis

- **WHEN** `screwCenter=true` is selected while `rows < 2` or `columns < 2`
- **THEN** validation MUST reject the snapshot with an internal-intersection
  availability error
- **AND** the UI MUST keep the center control disabled

### Requirement: Half-cell board extension

The board MUST preserve the official full-cell profile and add a 14 mm
boundary host on each selected half-cell axis. left/right MUST map to the
negative/positive X outer side, and top/bottom MUST map to the
positive/negative Y outer side. Feature coordinates, connector placement,
screw placement, centering, and variant thickness MUST use the final board
envelope.

The detailed shared half-cell direction, interface, and persistence contract
is defined by the opengrid-half-cell capability.

#### Scenario: Select a half-cell direction

- **WHEN** a user selects one or both half-cell directions
- **THEN** the derived board envelope MUST add 14 mm on each selected axis
- **AND** the board MUST remain centered with feature and connector placement
  on the final envelope

### Requirement: OpenGrid quality gate

Before a candidate is committed, the Worker quality gate MUST check the
expected centered bounds and base placement, positive volume, one-solid
topology, valid B-Rep, finite non-empty mesh, through-cell coverage, official
outer-rail and inner-capture probes, and selected half-cell boundary probes.

Feature-specific connector, screw, chamfer, Heavy-layer, lifecycle, and
export behavior MUST remain covered by the contract and Worker integration
tests. STEP and binary STL exports MUST be produced from the quality-gated
committed B-Rep revision.

#### Scenario: Invalid profile candidate

- **WHEN** a generated shape has the expected envelope but fails topology,
  mesh, through-cell, rail/capture, or half-cell checks
- **THEN** the candidate MUST be rejected before commit
- **AND** the previous committed revision MAY remain visible but MUST be stale

### Requirement: Optional official reference comparison

The repository MUST treat the official-reference comparison as an optional,
environment-gated test using
binary STL fixtures supplied through OPENGRID_OFFICIAL_REFERENCE_DIR. The test
MUST export the Replicad candidate and compare centered envelope coordinates
within 0.01 mm, absolute volume within 0.5 mm3, and representative section
occupancy with no more than eight fixed-grid mismatches.

The reference comparison MUST remain developer-only. OpenSCAD MUST NOT be
required by the browser, Worker, or production export path. Reference fixture
generation and execution are external verification steps, not product
runtime dependencies.

#### Scenario: Run the optional reference comparison

- **WHEN** OPENGRID_OFFICIAL_REFERENCE_DIR points to the supplied pinned-source
  binary STL fixtures
- **THEN** the test MUST export each selected Replicad candidate and apply the
  documented envelope, volume, and section-occupancy comparisons
- **AND** the test MUST remain skipped when the reference directory is not
  configured

### Requirement: Optional release benchmark

The repository MUST provide an environment-gated benchmark capability that
covers Full, Lite, and Heavy at 1 by 1, 2 by 2, 5 by 5, and 10 by 10 within the
500 mm limit. It MUST compare the available assembly strategies,
perform one cold run, one warm-up, and five measured runs, and retain quality
and export failures.

The benchmark MAY write structured and human-readable reports containing the
source commit, environment, selected strategy, fixture results, median, P95,
and known limitations. It MUST remain internal and MUST NOT add a product
route, catalog entry, persistence entry, or Worker protocol version.

#### Scenario: Run the optional release benchmark

- **WHEN** the release benchmark flag is enabled
- **THEN** the benchmark MUST execute the configured variants and scale
  fixtures with cold, warm-up, and five measured samples
- **AND** quality/export failures MUST remain in the result
- **AND** report files MUST be written only when report output is explicitly
  enabled

### Requirement: OpenGrid Worker and workspace lifecycle

OpenGrid MUST use the existing version-1 Worker contract, route locking,
latest-wins invalidation, cancellation, candidate ownership, revision
pinning, progress, timeout/recovery, STEP export, binary STL export, and
deterministic filenames. A model.generate request MUST carry the complete
normalized snapshot, while model.invalidate MUST remain parameter-free.

The opengrid panel MUST expose variant, rows, columns, half-cell directions,
chamfer mode and corners, connector enable and sides, screw mode, generic
screw dimensions, intervals, and the internal-intersection custom matrix.
It MUST display derived width, depth, and thickness in millimetres.

#### Scenario: Latest-wins OpenGrid generation

- **WHEN** a newer valid or invalid snapshot supersedes a running OpenGrid
  generation
- **THEN** the older candidate MUST NOT commit or replace the newer revision
- **AND** invalidation MUST carry no parameter snapshot
- **AND** preview and exports MUST use the same committed B-Rep revision

## MODIFIED Requirements

### Requirement: OpenGrid product assembly

The existing opengrid product builder MUST use the cell-balanced assembly
strategy for Full, Lite, Heavy, and Hybrid. Whole-profile, row-block, and
prototype-template strategies MAY remain available to explicit benchmark or
geometry-test requests, but MUST NOT be selected as a silent product
fallback.

Hybrid MUST be assembled as a one-cell-wide Heavy perimeter around standard
Full-profile interior cells. If either full-cell axis has fewer than three
cells, every full cell is on the perimeter and the result MUST be
Heavy-equivalent.

At every Heavy-to-Full perimeter boundary on a board with an interior, Hybrid
MUST include a one-sided sloped transition on the inward-facing Heavy edge.
The transition MUST rise from the standard Full surface height to the Heavy
envelope height while preserving the outer Heavy edge and the through-cell
openings.

#### Scenario: Product generation uses the selected product strategy

- **WHEN** the Worker receives a valid opengrid snapshot
- **THEN** the product builder MUST dispatch the cell-balanced strategy
- **AND** a product-generation failure MUST remain a generation failure rather
  than silently retrying prototype-template

#### Scenario: Hybrid separates perimeter and interior profiles

- **WHEN** a Hybrid board has at least three rows and three columns
- **THEN** every outer-row or outer-column cell MUST use the Heavy assembly
  profile
- **AND** every non-perimeter cell MUST use the standard Full profile
- **AND** the board MUST remain one valid connected solid

#### Scenario: Small Hybrid board has no interior

- **WHEN** a Hybrid board has one or two full cells on either axis
- **THEN** every generated full cell MUST use the Heavy assembly profile
- **AND** its envelope, feature behavior, and mating surfaces MUST match a
  Heavy board with the same parameters

### Requirement: OpenGrid normalized parameter contract

The existing catalog model id MUST remain opengrid and its normalized
parameters MUST include:

- variant Full, Lite, Heavy, or Hybrid;
- integer rows and columns from 1 through 17;
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
the board centered and within the 500 mm workspace limit. Hybrid MUST use the
same normalized field shape as the other OpenGrid variants and MUST NOT add a
variant-specific persistence or Worker field.

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

#### Scenario: Hybrid is accepted without schema branching

- **WHEN** a complete OpenGrid snapshot has `variant=Hybrid`
- **THEN** validation MUST accept it when all existing fields are valid
- **AND** normalization MUST preserve the Hybrid variant and all feature
  values
- **AND** generated requests MUST use the existing `modelId=opengrid`

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
layer, rather than a single solid plate. Hybrid MUST use that same Heavy
two-layer assembly only for its one-cell outer perimeter and MUST use a
single standard Full 6.8 mm profiled layer for each interior cell. The Hybrid
board envelope height MUST be 13.8 mm, with its base at Z=0.

#### Scenario: Profiled board envelope

- **WHEN** a valid 1 by 1 or multi-cell board is generated
- **THEN** its outer envelope MUST use the selected grid and half-cell
  dimensions
- **AND** its base MUST remain at Z=0
- **AND** its center opening, capture ledges, corner nodes, and edge rails MUST
  be present

#### Scenario: Hybrid has a Heavy perimeter and Full interior

- **WHEN** a Hybrid board has at least three rows and three columns
- **THEN** the outer perimeter MUST reach the Heavy 13.8 mm envelope and
  preserve the opposing profiled layers and middle bridge
- **AND** the interior cells MUST stop at the standard Full 6.8 mm profile
- **AND** the standard interior openings MUST remain compatible with normal
  OpenGrid Full accessories
- **AND** the inward-facing Heavy edge MUST contain the sloped transition from
  the Full height to the Heavy height

#### Scenario: Hybrid Heavy-to-Full transition

- **WHEN** a Hybrid board has a Heavy perimeter adjacent to a Full interior
- **THEN** a section probe moving inward across the perimeter boundary MUST
  observe a monotonic rise from the Full surface height to the Heavy envelope
  height
- **AND** the opposite/outside Heavy edge MUST retain the Heavy profile
- **AND** no transition material MAY close the through-cell opening

#### Scenario: Hybrid half-cell boundary

- **WHEN** a Hybrid board selects an X half-cell, Y half-cell, or both
- **THEN** every added half-cell boundary host MUST use the Heavy perimeter
  profile
- **AND** the full-cell interior classification and final centered envelope
  MUST remain unchanged

### Requirement: Official chamfer and connector behavior

The generator MUST support none, corners, and everywhere chamfer modes.
Corners mode MUST honor the four independent outer-corner flags without
moving the board envelope.

Connector holes MUST use an enable flag, independent side flags, official
inward-facing cutout geometry, and eligible seam placement. The connector
profile MUST preserve the official primary radius 2.6 mm, dimple radius 2.7
mm, separation 2.5 mm, cut height 2.4 mm, and variant-specific Z placement. A
one-cell axis MUST produce no duplicate seam positions. For Hybrid, outer
perimeter connector cuts MUST reach both Heavy layers, while standard
interior cells MUST retain the Full interface.

#### Scenario: Selected connector sides

- **WHEN** only selected connector sides are enabled
- **THEN** only those outer sides MAY receive connector cutouts
- **AND** unselected edge geometry MUST remain unchanged
- **AND** Hybrid connector cuts MUST remain present through the applicable
  Heavy perimeter layers

### Requirement: OpenGrid quality gate

Before a candidate is committed, the Worker quality gate MUST check the
expected centered bounds and base placement, positive volume, one-solid
topology, valid B-Rep, finite non-empty mesh, through-cell coverage, official
outer-rail and inner-capture probes, and selected half-cell boundary probes.

Feature-specific connector, screw, chamfer, Heavy-layer, Hybrid perimeter /
Full-interior, lifecycle, and export behavior MUST remain covered by the
contract and Worker integration tests. STEP and binary STL exports MUST be
produced from the quality-gated committed B-Rep revision.

#### Scenario: Invalid profile candidate

- **WHEN** a generated shape has the expected envelope but fails topology,
  mesh, through-cell, rail/capture, or half-cell checks
- **THEN** the candidate MUST be rejected before commit
- **AND** the previous committed revision MAY remain visible but MUST be stale

#### Scenario: Hybrid quality evidence

- **WHEN** a Hybrid board with an interior cell is quality-checked
- **THEN** the report MUST verify the 13.8 mm Heavy perimeter envelope
- **AND** it MUST verify Heavy-layer occupancy on the perimeter and Full-layer
  occupancy in the interior
- **AND** it MUST verify all requested cell openings and a single valid solid

### Requirement: Optional release benchmark

The repository MUST provide an environment-gated benchmark capability that
covers Full, Lite, Heavy, and Hybrid at 1 by 1, 2 by 2, 5 by 5, 10 by 10,
and 17 by 17 within the 500 mm limit. It MUST compare the available assembly
strategies, perform one cold run, one warm-up, and five measured runs, and
retain quality and export failures.

The benchmark MAY write structured and human-readable reports containing the
source commit, environment, selected strategy, fixture results, median, P95,
and known limitations. It MUST remain internal and MUST NOT add a product
route, catalog entry, persistence entry, or Worker protocol version.

#### Scenario: Run the optional reference comparison

- **WHEN** the release benchmark flag is enabled
- **THEN** the benchmark MUST execute the configured Full, Lite, Heavy, and
  Hybrid fixtures with cold, warm-up, and five measured samples
- **AND** quality/export failures MUST remain in the result
- **AND** report files MUST be written only when report output is explicitly
  enabled

## Purpose

提供真正依照官方 OpenGrid generator profile 的 CAD 產生器。使用者可以設定板型、rows/columns、螺絲孔參數與位置、connector 側邊以及 chamfer，並取得可驗證的 B-Rep、預覽、STEP 與 STL。

## Reference

The official geometry reference is the OpenGrid source at commit `61231295ea08c302eff32051769113c48cbda255`:

`https://github.com/AndyLevesque/QuackWorks/blob/61231295ea08c302eff32051769113c48cbda255/openGrid/openGrid.scad`

The implementation MUST preserve attribution and license metadata from that source. It MUST NOT describe the old square-plate implementation as compatible.

### Requirement: Product assembly strategy

The production OpenGrid builder MUST use the `cell-balanced` assembly strategy
for Full, Lite, and Heavy. The `prototype-template` strategy MAY remain
available to explicit benchmark and geometry tests, but it MUST NOT be selected
by the product builder or used as a silent fallback for a failed
`cell-balanced` generation.

#### Scenario: Formal product generation uses cell-balanced assembly

- **WHEN** the Worker generates a valid OpenGrid snapshot through the product route
- **THEN** the product builder MUST dispatch the selected `cell-balanced` strategy for the requested variant
- **AND** generation MUST NOT require a saved 1×1 prototype template
- **AND** a `cell-balanced` failure MUST be reported as a generation failure rather than silently retrying `prototype-template`

#### Scenario: Prototype remains benchmark-only

- **WHEN** a benchmark or explicit geometry test requests `prototype-template`
- **THEN** that strategy MAY build from the saved feature-free 1×1 template and apply board features after assembly
- **AND** invoking that strategy MUST NOT change the production strategy selection

### Requirement: Official reference parity

The implementation MUST be checked against the pinned official OpenGrid SCAD
at commit `61231295ea08c302eff32051769113c48cbda255` before release sign-off.
The reference harness MUST render the same Full, Lite, and Heavy fixtures with
the official OpenSCAD source and compare the Replicad candidate's centered
envelope, variant thickness, solid volume, and representative Z-section
occupancy for feature-free, screw, connector, chamfer, and default cases.

The comparison tolerance MUST be explicit and MUST be tight enough to detect a
wrong profile, missing Heavy middle layer, misplaced screw, or wrong connector
side. STL byte equality and triangle-count equality MUST NOT be used as the
sole criterion because OpenSCAD and Open Cascade tessellate the same solid
differently. Screw cutters MUST preserve the official `$fn=30` polygonal
profile and connector circular pieces MUST preserve the official `$fn=50`
profile before the geometric comparison is made.

The current gate documents its tolerances as: envelope coordinates within
0.01 mm, absolute solid-volume difference within 0.5 mm³, and no more than
eight material mismatches across the fixed 0.97 mm XY sampling grid at the
variant-specific Z planes. Any relaxation MUST be recorded in the change
artifacts with the reason and affected fixtures.

OpenSCAD MAY be installed and invoked by developer or CI verification tooling,
but MUST NOT be required by the browser, Worker, or production export path.

#### Scenario: Official reference fixture passes

- **WHEN** a pinned-source fixture is rendered for Full, Lite, or Heavy
- **THEN** the Replicad result MUST match the official envelope and thickness within the documented tolerance
- **AND** its solid volume MUST match the official reference within the documented tolerance
- **AND** its representative Z-sections MUST have no material mismatches beyond the documented sampling tolerance

#### Scenario: Wrong profile is rejected

- **WHEN** a candidate uses a flat plate, wrong Heavy middle projection, misplaced screw, or wrong connector profile
- **THEN** the official reference parity check MUST fail before the candidate is accepted as release-compatible

## ADDED Requirements

### Requirement: Official OpenGrid parameter contract

The system MUST expose a catalog model with stable `modelId=opengrid`. Its normalized parameters MUST include:

- `variant`: `Full`, `Lite`, or `Heavy`;
- `rows` and `columns`: safe integers from 1 through 17;
- `chamfers`: `none`, `corners`, or `everywhere`;
- four independent outer-corner chamfer flags;
- `connectorHoles`: `none` or `enabled`, plus independent top/right/bottom/left side flags;
- `screwKind`: `official-default` or `custom`;
- official screw dimensions: diameter, head diameter, head inset, countersunk toggle, and countersunk angle;
- `screwMode`: `none`, `corners`, `everywhere`, `by-row-column`, or `custom`;
- `screwCenter`: a boolean that adds the exact central internal intersection when both grid axes have an even cell count;
- `screwEvery`: a non-negative integer interval, where `0` disables the additional centered interval pattern;
- row/column intervals for `by-row-column`; and
- a normalized custom screw-position list on the internal tile-intersection lattice.

The standard tile pitch MUST be 28 mm. The derived board width and depth MUST be `columns × 28 mm` and `rows × 28 mm`, and MUST remain within the current 500 mm workspace limit. The official source defaults MUST be represented accurately: Lite, 2×2, corner chamfers, connectors enabled on all sides, corner screw mounting, 4.1 mm screw diameter, 7.2 mm head diameter, 1 mm head inset, countersunk enabled, and 90° countersink.

The normalized snapshot MUST be self-contained and MUST NOT retain the former `16 mm` opening, four-slot-per-cell, `small`/`large` connector, or M3/M4/M5 counterbore-only schema.

#### Scenario: Official defaults

- **WHEN** `/cad/opengrid` is opened without a valid saved snapshot
- **THEN** the workspace MUST show the official source defaults
- **AND** the derived board size MUST be 56 × 56 mm with a 4 mm Lite board thickness
- **AND** generation MUST use official corner screws, chamfers, and all connector sides

#### Scenario: Legal workspace range

- **WHEN** rows or columns is between 1 and 17 inclusive
- **THEN** the snapshot MUST be structurally valid
- **AND** its envelope MUST remain centered on X/Y with minimum Z=0

- **WHEN** rows or columns is non-integer, below 1, above 17, or exceeds the 500 mm workspace limit
- **THEN** validation MUST reject it before native work and retain the previous accepted preview as stale

### Requirement: Official tile profile and board variants

Each logical grid cell MUST be generated from the official tile profile rather than a solid square with an invented through-hole. The profile MUST preserve the source parameters: 0.8 mm outside extrusion, 0.4 mm top chamfer, 1 mm middle chamfer, 2.4 mm top capture inset, 2.6 mm corner-square thickness, 4.2 mm intersection distance, and 25 mm tile inner size.

Full MUST use the official 6.8 mm profile. Lite MUST use the official 4 mm reduced board profile and its connector/snap height behavior. Heavy MUST use the official 13.8 mm construction: two opposing OpenGrid sides around the 0.2 mm Heavy gap plus the official projected middle layer, with the official Heavy profile branch. A Heavy board MUST NOT be implemented as one solid 13.8 mm plate with the Full/Lite profile cut into it.

#### Scenario: Profile compatibility fixture

- **WHEN** a 1×1 board is generated for Full, Lite, or Heavy with no optional cuts
- **THEN** the result MUST have the official variant thickness and 28 × 28 mm envelope
- **AND** the center opening, capture ledges, corner nodes, and edge rails MUST be present
- **AND** the quality report MUST distinguish this profile from a flat rectangular plate

#### Scenario: Grid assembly

- **WHEN** a valid R×C board is generated
- **THEN** the official tile profile MUST repeat on a 28 mm pitch
- **AND** adjacent tiles MUST preserve the official continuous edge/corner interface
- **AND** the outer envelope MUST be `C×28` by `R×28` even when chamfers remove material at corners

### Requirement: Official chamfer behavior

The generator MUST support `none`, `corners`, and `everywhere` chamfer modes. In `corners` mode, only enabled outer corner flags MAY be cut. In `everywhere` mode, every tile intersection eligible under the official source rules MUST receive the 45° chamfer; when official screw modes require an intersection, the screw-compatible behavior MUST match the source. Chamfers MUST remove material without moving the board envelope or screw/connector coordinate system.

#### Scenario: Per-corner chamfer

- **WHEN** only the top-left outer chamfer flag is enabled in `corners` mode
- **THEN** only that outer corner MAY be chamfered
- **AND** the other three outer corners MUST retain their profile

### Requirement: Official screw mounting geometry

Screw holes MUST use the official generic dimensions rather than hardcoded M3/M4/M5 counterbores. The normalized dimensions MUST be:

- through diameter `screwDiameter`;
- head diameter `screwHeadDiameter`;
- head inset `screwHeadInset`;
- `screwHeadIsCountersunk`; and
- `screwHeadCountersunkDegree`.

The official-default values MUST be 4.1 mm, 7.2 mm, 1 mm, true, and 90°. The cutter MUST contain a through cylinder and, when enabled, the official cylindrical head relief plus countersink transition.

Screw positions MUST lie on the internal tile-intersection lattice, not four arbitrary offsets inside each cell. For a board with `columns` and `rows`, the custom lattice has `(columns-1) × (rows-1)` positions; a position is zero-based `{ row, column }`, with row zero at the top and column zero at the left. Its world coordinate MUST match the official 28 mm lattice. When an axis has one cell, the official corner positions MAY collapse to one geometric point and MUST be de-duplicated before cutting.

The modes MUST match the official source:

- `none`: no screw cut;
- `corners`: the four outer internal-lattice positions, de-duplicated;
- `everywhere`: every internal-lattice position;
- `by-row-column`: positions selected at the requested row/column intervals using official alignment; and
- `custom`: exactly the selected internal-lattice positions.

The optional `screwCenter` and `screwEvery` modifiers MUST add positions to the selected mode, MUST use the internal intersection lattice, and MUST de-duplicate overlapping positions. A centered interval of `N` MUST use the same official centering/alignment rules on both axes; `N=0` MUST add no interval positions. `screwCenter=true` MUST be rejected unless both `rows` and `columns` are even.

#### Scenario: Official default screw geometry

- **WHEN** the official default screw settings are used
- **THEN** each selected mounting point MUST use a 4.1 mm through diameter, 7.2 mm head diameter, 1 mm inset, and 90° countersink
- **AND** the position MUST be at an internal tile intersection

#### Scenario: Custom screw positions

- **WHEN** the user selects `custom`
- **THEN** the UI MUST show an `(rows-1) × (columns-1)` intersection matrix, or no selectable positions when an axis has one cell
- **AND** the generated model MUST contain exactly the selected positions
- **AND** the normalized positions MUST be sorted and de-duplicated by validation rather than silently moved into cells

#### Scenario: Invalid screw data

- **WHEN** a snapshot has missing dimensions, non-positive dimensions, an invalid angle/inset, an out-of-range internal-lattice coordinate, a duplicate position, or custom positions while the mode is not `custom`
- **THEN** validation MUST reject it before native work
- **AND** no invalid snapshot MAY be persisted or exported

### Requirement: Official connector-hole geometry

Connector holes MUST be controlled by an enable flag and independent top/right/bottom/left side flags. They MUST be placed on the board's side seams exactly as the official source: `(rows-1)` positions on the vertical sides and `(columns-1)` positions on the horizontal sides; an axis with one cell has no connector positions on that axis.

The connector cutter MUST use the official inward-facing profile, not a cylinder. Its reference dimensions MUST be 2.6 mm primary radius, 2.7 mm dimple radius, 2.5 mm separation, 2.4 mm cut height, and the official outward insertion flare. Full/Heavy and Lite MUST use the appropriate official Z placement.

#### Scenario: Connector side selection

- **WHEN** connector holes are enabled only on the right and bottom sides
- **THEN** only those side profiles MAY be cut
- **AND** the top and left edge geometry MUST remain unchanged

#### Scenario: Connector placement

- **WHEN** a 3×4 board is generated with all connector sides enabled
- **THEN** each eligible side seam position MUST contain one official connector cutout
- **AND** no duplicate cutout MAY be created where a one-cell axis collapses positions
- **AND** the board envelope MUST remain 84 × 112 mm

### Requirement: OpenGrid controls and feedback

The workspace MUST expose variant, rows, columns, chamfer mode and corner flags, connector enable and side flags, screw mode, official-default/custom screw dimensions, by-row/column intervals, and the internal-intersection custom screw matrix. It MUST display derived width, depth, and thickness in millimetres. The UI MUST label screw positions as intersections between tiles rather than as four slots inside each cell.

#### Scenario: Configure official controls

- **WHEN** a user selects Full, 5 rows, 7 columns, custom screw dimensions, custom screw positions, selected connector sides, and corner chamfers
- **THEN** the pending typed snapshot MUST contain exactly those official-profile controls
- **AND** the derived size MUST display 196 × 140 mm and 6.8 mm thickness
- **AND** settled input MUST use the existing debounce and Worker lifecycle

#### Scenario: Invalid controls

- **WHEN** an enum, dimension, interval, side, or matrix coordinate is invalid
- **THEN** the UI MUST display a field-specific OpenGrid error
- **AND** it MUST send `model.invalidate` for a newer generation instead of `model.generate`
- **AND** STEP/STL controls MUST remain disabled until a new official-profile snapshot is committed

### Requirement: Official-profile quality gate

Before candidate registration, the Worker MUST verify the requested envelope, center, base Z, positive volume, one-solid topology, valid B-Rep, finite non-empty mesh, and official-profile probes. The probes MUST verify the 25 mm inner clear dimension, the edge capture/rail profile at representative cross-sections, connector cutout orientation and envelope, screw lattice coordinates, chamfer selections, and Heavy's opposing profile/gap behavior. A candidate that only passes flat-plate opening tests MUST fail the gate.

#### Scenario: Flat plate is rejected

- **WHEN** a shape has the right 28 mm pitch and thickness but lacks the official rail/capture/corner profile
- **THEN** the quality gate MUST reject it before candidate-ready
- **AND** the previous committed revision MAY remain visible but MUST be stale for the failed generation

#### Scenario: Valid official-profile candidate

- **WHEN** a supported fixture passes all profile, envelope, topology, mesh, and export checks
- **THEN** it MAY become the current revision
- **AND** preview and STEP/STL MUST use the same committed B-Rep revision

### Requirement: Worker lifecycle and exports

OpenGrid MUST use the existing version-1 Worker contract, latest-wins invalidation, cancellation, candidate ownership, revision pinning, STEP export, binary STL export, deterministic filenames, timeout, and recovery behavior. `model.generate` MUST carry a complete normalized official-profile snapshot. `model.invalidate` MUST remain parameter-free.

#### Scenario: Stale official-profile generation

- **WHEN** a newer valid or invalid snapshot supersedes a running generation
- **THEN** the older official-profile candidate MUST not commit or replace the newer revision
- **AND** all intermediate profile, fuse, cutter, and mesh resources MUST be released

### Requirement: Official compatibility release matrix

The release matrix MUST be rebuilt after the official profile implementation. It MUST cover Full, Lite, and Heavy at 1×1, 2×2, 5×5, 10×10, and 17×17, with representative official screw modes, custom intersection positions, connector side selections, chamfers, and the Heavy variant. The old blocked `10×10 + all M5 + large connector` rule MUST be removed because it belonged to the invalid old schema. Any new limitation MUST be reported from the rebuilt benchmark and quality evidence, not carried over from the old flat-plate benchmark.

Each selected strategy/fixture MUST have one cold run, one warm-up, and at least five measured runs in one native epoch. All supported samples MUST pass profile, B-Rep, mesh, and export gates, and measured P95 MUST remain below the existing 120-second operation timeout.

#### Scenario: Release report proves the new profile

- **WHEN** the official-profile release report is generated
- **THEN** it MUST record the pinned source commit, selected strategy, every variant/fixture, profile-gate result, export result, median/P95, and known limitations
- **AND** it MUST explicitly state that the old 16 mm/slot/cylindrical-hole benchmark is obsolete

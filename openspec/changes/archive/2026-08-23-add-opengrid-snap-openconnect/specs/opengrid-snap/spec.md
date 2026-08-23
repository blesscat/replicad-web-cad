## MODIFIED Requirements

### Requirement: OpenGrid Snap model contract

The system MUST register the independent `opengrid-snap` model with `Full` and
`Lite` variants and `Standard` and `Directional` profiles. Its normalized
parameter snapshot MUST contain exactly `variant`, `profile`, `offset`,
`footprint`, `fourCornerLocatingHoles`, `centerRemoverHole`, `openConnect`,
`magnetHoleShape`, `magnetHoleLength`, `magnetHoleWidth`,
`magnetHoleDiameter`, and `magnetHoleThickness`. `variant` MUST be `Full` or
`Lite`; `profile` MUST be `Standard` or `Directional`; and `footprint` MUST be
`full`, `half`, or `quarter`. `openConnect` MUST be boolean and
`magnetHoleShape` MUST be `none`, `square`, or `round`. When `openConnect` is
`true`, `footprint` MUST be `full`; the selected profile and variant MUST be
used without restricting OpenConnect to Directional geometry. When the magnet
shape is `none`, all four magnet dimensions MUST be zero and the magnet feature
MUST have no geometric effect. When the shape is `square`,
`magnetHoleLength`, `magnetHoleWidth`, and `magnetHoleThickness` MUST be finite
positive values and `magnetHoleDiameter` MUST be zero. When the shape is
`round`, `magnetHoleDiameter` and `magnetHoleThickness` MUST be finite positive
values and `magnetHoleLength` and `magnetHoleWidth` MUST be zero. The magnet
feature MUST be mutually exclusive with `fourCornerLocatingHoles` and
`centerRemoverHole`; invalid combinations MUST be rejected. For
`footprint=half` or `footprint=quarter`, the magnet shape MUST be `none`, all
magnet dimensions MUST be zero, and `openConnect` MUST be false. The system
radio used to select Desktop or Wall persistence MUST NOT be added to this
normalized CAD snapshot or change the existing `opengrid-snap` modelId,
buildKey, route, Worker request model id, or export contract. A Snap snapshot
MUST NOT contain board rows, columns, Heavy, screws, connectors, chamfers,
`halfCellX`, `halfCellY`, `allowHalfCell`, or direction-specific/diagonal
fields. The OpenGrid board MAY continue to use its own `halfCellX` and
`halfCellY` contract. A zero-offset, full-footprint Standard snapshot with all
features disabled and `openConnect=false` MUST use the repository-owned Bare
Standard reference or its equivalent programmatic baseline.

#### Scenario: Valid full-footprint Standard snapshot

- **WHEN** a complete `opengrid-snap` snapshot has `variant=Full`,
  `profile=Standard`, `offset=0`, `footprint=full`, `openConnect=false`, both
  existing hole flags `false`, `magnetHoleShape=none`, and all magnet
  dimensions `0`
- **THEN** validation MUST accept it as a typed Snap snapshot
- **AND** generation MUST select the Full Bare Standard baseline
- **AND** the body MUST remain solid except for fixed geometry already present
  in the source profile

#### Scenario: Valid OpenConnect profile and variant matrix

- **WHEN** a complete full-footprint snapshot enables `openConnect` for any of
  `Standard Lite`, `Standard Full`, `Directional Lite`, or `Directional Full`
- **THEN** validation MUST accept the selected profile and variant combination
- **AND** generation MUST use the corresponding Snap profile and variant
- **AND** generation MUST retain `openConnect=true` without substituting a
  Directional profile for a Standard profile

#### Scenario: OpenConnect is not accepted for a fixed partial footprint

- **WHEN** a snapshot sets `openConnect=true` with `footprint=half` or
  `footprint=quarter`
- **THEN** validation MUST reject the snapshot with a diagnosable field error
- **AND** the Worker MUST NOT generate or export that snapshot

#### Scenario: Valid square magnet snapshot

- **WHEN** a full-footprint snapshot selects `magnetHoleShape=square` with
  positive length, width, and thickness, zero diameter, and both existing hole
  flags `false`
- **THEN** validation MUST accept it when the dimensions fit the selected
  profile's printable body and retaining structure
- **AND** generation MUST apply one centered square magnet feature

#### Scenario: Valid round magnet snapshot

- **WHEN** a full-footprint snapshot selects `magnetHoleShape=round` with
  positive diameter and thickness, zero length and width, and both existing
  hole flags `false`
- **THEN** validation MUST accept it when the dimensions fit the selected
  profile's printable body and retaining structure
- **AND** generation MUST apply one centered round magnet feature

#### Scenario: Valid canonical half-footprint snapshot

- **WHEN** a complete Snap snapshot has `variant=Lite`, `profile=Standard`,
  `offset=0`, `footprint=half`, `openConnect=false`, both existing hole flags
  `false`, `magnetHoleShape=none`, and all magnet dimensions `0`
- **THEN** validation MUST accept it
- **AND** production preview generation MUST use the repository-owned fixed
  `snap-half.step` asset
- **AND** the fixed result MUST fit one 14 mm axis host and one 28 mm host axis

#### Scenario: Valid canonical quarter-footprint snapshot

- **WHEN** a complete Snap snapshot has `variant=Lite`,
  `profile=Directional`, `offset=0`, `footprint=quarter`,
  `openConnect=false`, both existing hole flags `false`,
  `magnetHoleShape=none`, and all magnet dimensions `0`
- **THEN** validation MUST accept it
- **AND** production preview generation MUST use the repository-owned fixed
  `snap-quarter.step` asset
- **AND** the fixed result MUST fit both 14 mm host axes

#### Scenario: Legacy Snap snapshots normalize OpenConnect off

- **WHEN** a persisted or imported Snap snapshot predates the `openConnect`
  field and otherwise contains a valid current Snap configuration
- **THEN** normalization MUST add `openConnect=false`
- **AND** the normalized snapshot MUST remain compatible with the existing
  generation and export behavior

#### Scenario: Board or direction fields are rejected by the normalized Snap validator

- **WHEN** a normalized Snap snapshot contains forbidden board/direction fields,
  an unknown OpenConnect value, an unknown magnet shape, non-zero inactive
  magnet dimensions, non-positive or non-finite active dimensions, or a magnet
  conflict with an existing hole flag
- **THEN** validation MUST reject the snapshot as a model-parameter mismatch
- **AND** the Worker MUST NOT generate or export that snapshot

## ADDED Requirements

### Requirement: OpenConnect reference geometry and composition

When `openConnect=true`, the system MUST load the repository-owned
`openConnect_head.step` geometry as the production OpenConnect head. The head's
source dimensions and Z geometry MUST remain unchanged; the supplied STL MAY
serve as placement evidence but MUST NOT be treated as a second production
mesh. The selected Snap profile and variant MUST be built first and MUST
receive the requested full-footprint XY offset transform. The final OpenConnect
interface position MUST then be derived from that adjusted Snap and the
unchanged head MUST be composed at that position. The OpenConnect head MUST
NOT receive the Snap's XY scale transform.

#### Scenario: OpenConnect uses the supplied STEP size

- **WHEN** a valid full-footprint Snap enables OpenConnect
- **THEN** the generated result MUST contain the selected Snap assembly and the
  OpenConnect head from the repository-owned STEP source
- **AND** the head's measurable source dimensions MUST match the STEP source
  within the configured CAD tolerance
- **AND** the STL reference MUST not add duplicate or unrelated production
  geometry

#### Scenario: Wall offset adjusts Snap before OpenConnect composition

- **WHEN** a valid full-footprint OpenConnect snapshot uses `offset=0` or a
  positive valid offset
- **THEN** the selected Snap assembly MUST use its normal full-footprint XY
  transform and retain its selected profile, variant, and Z bounds
- **AND** the OpenConnect head MUST retain its original XY dimensions
- **AND** the OpenConnect interface MUST be placed using the final adjusted
  Snap coordinates before the head is composed

#### Scenario: Snap-only cutters do not resize the OpenConnect head

- **WHEN** a valid OpenConnect snapshot also enables a Snap-local optional
  cutter that is applicable to the active system scope
- **THEN** the cutter MUST apply to the Snap geometry according to the existing
  feature contract
- **AND** the OpenConnect head MUST retain its source dimensions and placement
  after the Snap feature operation

### Requirement: OpenConnect quality and committed export metadata

Before committing an OpenConnect candidate, the Worker MUST verify that the
selected Snap assembly and OpenConnect head are present, the head remains
within its source geometry tolerance, the final interface placement is valid,
the combined result has valid B-Rep geometry, and the committed mesh is finite
and non-empty. OpenConnect-enabled Full-footprint STEP and STL filenames MUST
identify the OpenConnect state so that enabled and disabled exports cannot
overwrite one another. A failed OpenConnect quality check MUST discard the
candidate and keep STEP/STL export disabled for that generation.

#### Scenario: Valid OpenConnect candidate becomes exportable

- **WHEN** an OpenConnect candidate passes source-geometry, interface,
  assembly, B-Rep, mesh, and generation checks
- **THEN** it MAY be committed
- **AND** the viewport, STEP export, and STL export MUST refer to the same
  committed revision
- **AND** its filenames MUST distinguish the OpenConnect-enabled configuration

#### Scenario: Invalid OpenConnect candidate remains stale

- **WHEN** the OpenConnect source cannot be loaded, the interface is misplaced,
  the head is scaled or missing, or the combined result fails B-Rep or mesh
  validation
- **THEN** the candidate MUST be discarded
- **AND** the previous committed preview MAY remain visible but MUST be marked
  stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

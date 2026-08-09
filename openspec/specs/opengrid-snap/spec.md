## Purpose

定義 OpenGrid Snap 元件的參數契約、參考幾何、半格衍生幾何、品質驗證、生命週期與匯出一致性。

## Requirements

### Requirement: OpenGrid Snap model contract

The system MUST register an independent `opengrid-snap` model with exactly two variants, `Full` and `Lite`. Its normalized parameter snapshot MUST contain exactly `variant`, `offset`, `halfCellX`, and `halfCellY`. `halfCellX` MUST be `none`, `left`, or `right`; `halfCellY` MUST be `none`, `top`, or `bottom`. It MUST NOT reuse the existing OpenGrid board snapshot or expose rows, columns, Heavy, screws, connectors, chamfers, `allowHalfCell`, or diagonal-only half-cell fields. `Full` MUST use `opengrid-hole-snap-full.step` and `Lite` MUST use `opengrid-bare-lite-snap.step` as their zero-offset, no-half references. Half-cell results are a project-owned derived geometry and MUST NOT be described as official Snap assets.

#### Scenario: Valid full-cell Full snapshot

- **WHEN** a complete `opengrid-snap` snapshot has `variant=Full`, `offset=0`, `halfCellX=none`, and `halfCellY=none`
- **THEN** validation MUST accept it as a typed Snap snapshot
- **AND** generation MUST select the Full reference asset

#### Scenario: Valid single-axis half snapshot

- **WHEN** a complete Snap snapshot has `variant=Lite`, `offset=0`, `halfCellX=left`, and `halfCellY=none`
- **THEN** validation MUST accept it as a typed half-cell Snap snapshot
- **AND** generation MUST use the project-owned half-cell derivation path

#### Scenario: Valid dual-axis half snapshot

- **WHEN** a complete Snap snapshot has `variant=Full`, `offset=0.2`, `halfCellX=right`, and `halfCellY=top`
- **THEN** validation MUST accept it as a typed dual-axis Snap snapshot
- **AND** generation MUST combine the X and Y directions without requiring a diagonal variant

#### Scenario: Board or legacy half fields are rejected

- **WHEN** a Snap snapshot contains rows, columns, Heavy, screw, connector, chamfer, `allowHalfCell`, or a diagonal-only field
- **THEN** validation MUST reject the snapshot as a model-parameter mismatch
- **AND** the Worker MUST NOT route it through the existing OpenGrid board builder

### Requirement: Complete reference assembly preservation

For a no-half snapshot where `halfCellX=none` and `halfCellY=none`, the generated Snap result MUST preserve the complete reference assembly, including the eight outer holder solids and the central Snap solid, for a total of nine solids. It MUST remain centered on X/Y and based at Z=0, with the variant-specific Z profile from its supplied reference. Half-cell snapshots MUST instead satisfy the project-owned half-cell quality requirement and MUST NOT be required to retain nine solids after explicit clipping/recomposition.

#### Scenario: Zero-offset Full assembly

- **WHEN** Full is generated with `offset=0` and both half-cell fields are `none`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Full reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 6.8 mm within tolerance

#### Scenario: Zero-offset Lite assembly

- **WHEN** Lite is generated with `offset=0` and both half-cell fields are `none`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Lite reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 3.4 mm within tolerance

#### Scenario: Central-only full-cell output is rejected

- **WHEN** a no-half generated result contains only the central Snap body or has fewer than nine reference solids
- **THEN** the Snap quality gate MUST reject the candidate
- **AND** the candidate MUST NOT become the committed model

### Requirement: Total centered outer offset

`offset` MUST represent one shared total width and depth increment, not a per-side increment. For a no-half axis, its nominal Snap envelope MUST be 25.6 mm; for a selected half-cell axis, its nominal Snap envelope MUST be 12.8 mm. The requested centered bounds MUST be `-(nominalAxisSize + offset)/2` through `+(nominalAxisSize + offset)/2` on each axis. The offset operation MUST preserve the central Snap interface, internal holes, hole diameters, hole centers, fixed internal clearances, and the selected half-cell orientation. The builder MUST NOT scale the complete assembly.

#### Scenario: Symmetric positive full-cell offset

- **WHEN** Full is generated with no half-cell directions and `offset=0.2`
- **THEN** the overall width and depth MUST each increase by 0.2 mm within tolerance
- **AND** the X/Y center of the assembly MUST remain at the origin
- **AND** the central Snap and internal hole probes MUST match the zero-offset fixture

#### Scenario: Shared axis adjustment with half-cell

- **WHEN** a Snap changes from `halfCellX=none` to `halfCellX=right` while keeping `halfCellY=none` and `offset=0`
- **THEN** the requested X nominal envelope MUST change from 25.6 mm to 12.8 mm
- **AND** the Y nominal envelope MUST remain 25.6 mm
- **AND** the central interface and variant Z bounds MUST remain valid

#### Scenario: Valid bounded adjustment

- **WHEN** `offset` is between `0` and `1` mm and lands on a `0.05` mm step
- **THEN** generation MUST apply the requested total dimension delta symmetrically on both axes
- **AND** every selected half-cell axis MUST remain within its 14 mm host pitch
- **AND** fixed internal geometry MUST remain unchanged

#### Scenario: Invalid or intrusive offset

- **WHEN** an offset is non-finite, outside the configured range, off-step, or would make a selected half-cell axis exceed its 14 mm host pitch or intrude into fixed geometry
- **THEN** validation or the geometry gate MUST reject the request with a diagnosable field-specific error
- **AND** no invalid candidate MAY be committed or exported

### Requirement: Reference asset loading and disposal

The Worker MUST bundle and load the two Snap STEP assets from repository-local URLs, cache each validated variant reference at most once per Worker epoch, remove a failed cache promise so a later generation can retry, and release the references during disposal. Production generation MUST NOT read `/Users/.../Desktop` paths.

#### Scenario: Reference cache reuse

- **WHEN** multiple Full or Lite generations run in one Worker epoch
- **THEN** the corresponding STEP asset MUST be imported and validated only once
- **AND** later generations MUST reuse the cached reference without sharing it with the other variant

#### Scenario: Reference load retry

- **WHEN** a reference import or validation fails
- **THEN** the failed promise MUST be removed from the variant cache
- **AND** a later generation MUST be able to retry the asset load

#### Scenario: Worker disposal

- **WHEN** the Worker is disposed while a Snap reference is loaded or loading
- **THEN** the reference MUST be released exactly once when available
- **AND** no later request MAY use the disposed reference

### Requirement: Snap quality and committed exports

Before candidate registration, the Worker MUST verify the requested centered XY envelope, unchanged variant Z bounds, nine-solid topology for no-half snapshots, valid B-Rep, finite non-empty mesh, and fixed central/internal geometry probes. Half-cell snapshots MUST pass the project-owned half-cell quality requirements instead of the nine-solid topology requirement. STEP and binary STL exports MUST use the same committed Snap revision that the viewport displays.

#### Scenario: Valid candidate becomes exportable

- **WHEN** a no-half or half-cell Snap candidate passes its applicable envelope, topology, B-Rep, mesh, fixed-geometry, and generation checks
- **THEN** it MAY be committed
- **AND** the viewport and STEP/STL export MUST refer to that same committed revision

#### Scenario: Quality failure keeps the old preview stale

- **WHEN** a new Snap generation fails an applicable fixed-hole, outer-envelope, topology, or half-cell quality check
- **THEN** the new candidate MUST be discarded
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

### Requirement: Project-owned half-cell Snap derivation

For any snapshot with a non-`none` half-cell direction, the Worker MUST derive the Snap from the validated Full/Lite reference assembly using explicit clipping/recomposition or equivalent native geometry. It MUST preserve the variant Z profile, central embedding interface, non-empty B-Rep, finite mesh, and at least one valid outer support that fits the selected host pitch. It MUST NOT silently fall back to a scaled full Snap, a central-only body, or an unvalidated placeholder.

#### Scenario: Four single-axis directions

- **WHEN** Full and Lite are each generated with `left`, `right`, `top`, and `bottom` as the only selected half-cell direction
- **THEN** every fixture MUST produce a valid committed candidate
- **AND** the selected side MUST be reflected in the corresponding boundary/interface probes
- **AND** the unselected axis MUST retain its 28 mm host compatibility

#### Scenario: Four dual-axis combinations

- **WHEN** a valid Snap selects one X direction and one Y direction
- **THEN** the Worker MUST derive the combined half-cell geometry from those two fields
- **AND** both final axes MUST fit within their 14 mm host pitches
- **AND** no separate diagonal parameter or variant MAY be required

#### Scenario: Half-cell quality failure

- **WHEN** a derived half-cell result loses the central interface, has no valid outer support, exceeds the host envelope, has invalid B-Rep, or produces an empty/non-finite mesh
- **THEN** the quality gate MUST discard the candidate
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

### Requirement: Half-cell Snap file metadata

Deterministic Snap STEP and STL filenames MUST include the variant, offset, and every non-`none` axis direction. Full-cell filenames MUST remain compatible with the existing no-half naming contract or use a documented no-half marker without colliding with any half-cell filename.

#### Scenario: Distinct direction filenames

- **WHEN** two Snap snapshots differ only by `halfCellX=left` versus `halfCellX=right`
- **THEN** their generated filenames MUST be distinct
- **AND** neither export MAY overwrite the other through the filename helper

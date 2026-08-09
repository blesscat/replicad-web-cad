## ADDED Requirements

### Requirement: OpenGrid Snap model contract

The system MUST register an independent `opengrid-snap` model with exactly two variants, `Full` and `Lite`. Its normalized parameter snapshot MUST contain `variant` and one shared `offset`; it MUST NOT reuse the existing OpenGrid board snapshot or expose rows, columns, Heavy, screws, connectors, or chamfers. `Full` MUST use `openGrid hole Snap.step` and `Lite` MUST use `openGrid Bare Lite Snap hold.step` as their zero-offset references.

#### Scenario: Valid Full snapshot

- **WHEN** a complete `opengrid-snap` snapshot has `variant=Full` and `offset=0`
- **THEN** validation MUST accept it as a typed Snap snapshot
- **AND** generation MUST select the Full reference asset

#### Scenario: Valid Lite snapshot

- **WHEN** a complete `opengrid-snap` snapshot has `variant=Lite` and `offset=0`
- **THEN** validation MUST accept it as a typed Snap snapshot
- **AND** generation MUST select the Lite reference asset

#### Scenario: Board parameters are rejected

- **WHEN** a Snap snapshot contains rows, columns, Heavy, screw, connector, or chamfer fields as part of its model contract
- **THEN** validation MUST reject the snapshot as a model-parameter mismatch
- **AND** the Worker MUST NOT route it through the existing OpenGrid board builder

### Requirement: Complete reference assembly preservation

The generated Snap result MUST preserve the complete reference assembly, including the eight outer holder solids and the central Snap solid, for a total of nine solids. The result MUST remain centered on X/Y and based at Z=0, with the variant-specific Z profile from its supplied reference.

#### Scenario: Zero-offset Full assembly

- **WHEN** Full is generated with `offset=0`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Full reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 6.8 mm within tolerance

#### Scenario: Zero-offset Lite assembly

- **WHEN** Lite is generated with `offset=0`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Lite reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 3.4 mm within tolerance

#### Scenario: Central-only output is rejected

- **WHEN** a generated result contains only the central Snap body or has fewer than nine reference solids
- **THEN** the Snap quality gate MUST reject the candidate
- **AND** the candidate MUST NOT become the committed model

### Requirement: Total centered outer offset

`offset` MUST represent one shared total width and depth increment, not a per-side increment. For a nominal 25.6 mm reference envelope, the requested bounds MUST be `-(25.6 + offset)/2` through `+(25.6 + offset)/2` on both X and Y. The offset operation MUST preserve the central Snap body, internal holes, hole diameters, hole centers, and fixed internal clearances. The builder MUST NOT scale the complete assembly.

#### Scenario: Symmetric positive offset

- **WHEN** Full is generated with `offset=0.2`
- **THEN** the overall width and depth MUST each increase by 0.2 mm within tolerance
- **AND** the X/Y center of the assembly MUST remain at the origin
- **AND** the central Snap and internal hole probes MUST match the zero-offset fixture

#### Scenario: Shared axis adjustment

- **WHEN** `offset` changes from zero to a valid value
- **THEN** the outer X and Y envelopes MUST change by the same total amount
- **AND** the Z bounds, central Snap geometry, and internal holes MUST remain unchanged

#### Scenario: Valid bounded adjustment

- **WHEN** `offset` is between `0` and `1` mm and lands on a `0.05` mm step
- **THEN** generation MUST apply the requested total dimension delta symmetrically
- **AND** the fixed internal geometry MUST remain unchanged

#### Scenario: Invalid or intrusive offset

- **WHEN** an offset is non-finite, outside the configured range, or would intrude into the fixed central geometry
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

Before candidate registration, the Worker MUST verify the requested centered XY envelope, unchanged variant Z bounds, nine-solid topology, valid B-Rep, finite non-empty mesh, and fixed central/internal geometry probes. STEP and binary STL exports MUST use the same committed Snap revision that the viewport displays.

#### Scenario: Valid candidate becomes exportable

- **WHEN** a Snap candidate passes envelope, topology, fixed-hole, B-Rep, mesh, and generation checks
- **THEN** it MAY be committed
- **AND** the viewport and STEP/STL export MUST refer to that same committed revision

#### Scenario: Quality failure keeps the old preview stale

- **WHEN** a new Snap generation fails a fixed-hole or outer-envelope quality check
- **THEN** the new candidate MUST be discarded
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

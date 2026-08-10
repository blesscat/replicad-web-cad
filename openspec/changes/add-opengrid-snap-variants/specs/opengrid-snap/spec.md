## MODIFIED Requirements

### Requirement: OpenGrid Snap model contract

The system MUST register the independent `opengrid-snap` model with `Full` and `Lite` variants and `Standard` and `Directional` profiles. Its normalized parameter snapshot MUST contain exactly `variant`, `profile`, `offset`, `halfCellX`, `halfCellY`, `fourCornerLocatingHoles`, and `centerRemoverHole`. `variant` MUST be `Full` or `Lite`; `profile` MUST be `Standard` or `Directional`; `halfCellX` MUST be `none`, `left`, or `right`; and `halfCellY` MUST be `none`, `top`, or `bottom`. The two boolean feature fields MUST be independent. The snapshot MUST NOT reuse the existing OpenGrid board snapshot or expose rows, columns, Heavy, screws, connectors, chamfers, `allowHalfCell`, `footprint`, or diagonal-only half-cell fields. The existing `opengrid-snap` modelId, buildKey, and route MUST remain unchanged. A zero-offset, no-half Standard snapshot MUST use the repository-owned Bare Standard reference or its equivalent programmatic baseline, with optional holes disabled unless explicitly selected.

#### Scenario: Valid solid Standard snapshot

- **WHEN** a complete `opengrid-snap` snapshot has `variant=Full`, `profile=Standard`, `offset=0`, `halfCellX=none`, `halfCellY=none`, `fourCornerLocatingHoles=false`, and `centerRemoverHole=false`
- **THEN** validation MUST accept it as a typed Snap snapshot
- **AND** generation MUST select the Full Bare Standard baseline
- **AND** the body MUST remain solid except for fixed geometry already present in the source profile

#### Scenario: Valid Directional snapshot with independent features

- **WHEN** a complete Snap snapshot has `variant=Lite`, `profile=Directional`, `offset=0.2`, `halfCellX=right`, `halfCellY=bottom`, `fourCornerLocatingHoles=true`, and `centerRemoverHole=false`
- **THEN** validation MUST accept it
- **AND** generation MUST select the Lite Directional profile
- **AND** the four locating-hole option MUST NOT imply the center remover-hole option

#### Scenario: Board or legacy half fields are rejected

- **WHEN** a Snap snapshot contains rows, columns, Heavy, screw, connector, chamfer, `allowHalfCell`, `footprint`, or a diagonal-only field
- **THEN** validation MUST reject the snapshot as a model-parameter mismatch
- **AND** the Worker MUST NOT route it through the existing OpenGrid board builder

### Requirement: Complete reference assembly preservation

For a no-half Standard snapshot, the generated result MUST preserve the complete reference assembly, including one Body, four Side Holder solids, and four Snap solids, for a total of nine solids. It MUST remain based at Z=0 and use the variant-specific Z profile from the Bare Standard reference. Optional body cutters MUST modify the Body without replacing or dropping the surrounding assembly. A no-half Directional snapshot MUST preserve the topology permitted by its Directional profile, including a valid fused B-Rep when the source profile is fused, and MUST preserve its canonical asymmetric directional envelope.

#### Scenario: Zero-offset Full Standard assembly

- **WHEN** Full Standard is generated with `offset=0`, both half-cell directions `none`, and both optional hole fields `false`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Full Bare Standard reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 6.8 mm within tolerance

#### Scenario: Zero-offset Lite Standard assembly

- **WHEN** Lite Standard is generated with `offset=0`, both half-cell directions `none`, and both optional hole fields `false`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Lite Bare Standard reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 3.4 mm within tolerance

#### Scenario: Directional assembly preserves its profile

- **WHEN** Full or Lite Directional is generated with no half-cell directions
- **THEN** the candidate MUST match the selected Directional profile's documented topology and Z bounds
- **AND** its canonical directional asymmetry MUST remain visible in the expected boundary probes
- **AND** it MUST NOT be accepted merely because a rotated Standard assembly has a similar volume

#### Scenario: Central-only full-cell output is rejected

- **WHEN** a no-half generated result contains only the central Body or has lost the required profile assembly members
- **THEN** the Snap quality gate MUST reject the candidate
- **AND** the candidate MUST NOT become the committed model

### Requirement: Total centered outer offset

`offset` MUST represent one shared total width and depth increment, not a per-side increment. For a Standard no-half axis, its nominal Snap envelope MUST be 25.6 mm; for a selected half-cell axis, its nominal host envelope MUST be 12.8 mm. The requested Standard bounds MUST be applied symmetrically around the host center. Directional profiles MUST preserve their documented canonical asymmetry while applying the same shared host-dimension policy. The offset operation MUST preserve the selected profile, central Snap interface, optional hole diameters, optional hole centers, fixed internal clearances, and selected half-cell orientation. The builder MUST NOT uniformly scale the complete assembly or any hole cutter.

#### Scenario: Symmetric positive Standard full-cell offset

- **WHEN** Standard is generated with no half-cell directions and `offset=0.2`
- **THEN** the overall width and depth MUST each increase by 0.2 mm within tolerance
- **AND** the X/Y host center MUST remain at the origin
- **AND** the central Snap and optional-hole probes MUST match the zero-offset fixture

#### Scenario: Shared axis adjustment with half-cell

- **WHEN** a Snap changes from `halfCellX=none` to `halfCellX=right` while keeping `halfCellY=none` and `offset=0`
- **THEN** the requested X nominal host envelope MUST change from 25.6 mm to 12.8 mm
- **AND** the Y nominal host envelope MUST remain 25.6 mm
- **AND** the central interface and variant Z bounds MUST remain valid

#### Scenario: Fixed holes do not scale with offset

- **WHEN** the same profile and feature selection is generated at two valid offsets
- **THEN** every uncut locating hole MUST retain its configured diameter and center
- **AND** the center remover profile MUST retain its configured dimensions
- **AND** only the permitted outer/frame geometry MAY change

#### Scenario: Invalid or intrusive offset

- **WHEN** an offset is non-finite, outside the configured range, off-step, or would make a selected half-cell axis exceed its 14 mm host pitch or intrude into fixed geometry
- **THEN** validation or the geometry gate MUST reject the request with a diagnosable field-specific error
- **AND** no invalid candidate MAY be committed or exported

### Requirement: Reference asset loading and disposal

The Worker MUST resolve each selected `profile` and `variant` through repository-owned OpenGrid Snap assets or profile definitions under the `opengrid-snap` component directory. Standard may use a programmatic baseline, while Directional may initially use a bundled source-backed reference, but production generation MUST NOT read `/Users/.../Downloads` or any other developer-local path. Any imported reference MUST be cached at most once per Worker epoch for its profile/variant key, failed cache promises MUST be removed so a later generation can retry, and loaded references MUST be released during disposal.

#### Scenario: Profile/variant reference cache reuse

- **WHEN** multiple generations use the same profile and variant in one Worker epoch
- **THEN** the corresponding asset or validated profile reference MUST be initialized only once
- **AND** it MUST NOT be shared with a different profile or variant

#### Scenario: Reference load retry

- **WHEN** a source-backed reference import or profile validation fails
- **THEN** the failed promise MUST be removed from the matching cache entry
- **AND** a later generation MUST be able to retry the load

#### Scenario: Worker disposal

- **WHEN** the Worker is disposed while a Snap profile reference is loaded or loading
- **THEN** the reference MUST be released exactly once when available
- **AND** no later request MAY use the disposed reference

### Requirement: Snap quality and committed exports

Before candidate registration, the Worker MUST verify the requested host envelope, selected profile's Z bounds and directional probes, valid B-Rep, finite non-empty mesh, fixed central/internal geometry, and the selected optional-hole state. Standard no-half snapshots MUST pass the nine-solid topology check; Directional snapshots MUST pass their profile-specific topology check. Half-cell snapshots MUST pass the project-owned half-cell quality requirements instead of the Standard nine-solid check. STEP and binary STL exports MUST use the same committed Snap revision that the viewport displays.

#### Scenario: Valid feature/profile candidate becomes exportable

- **WHEN** a Standard or Directional candidate passes its applicable envelope, topology, B-Rep, mesh, fixed-geometry, feature-state, and generation checks
- **THEN** it MAY be committed
- **AND** the viewport and STEP/STL export MUST refer to that same committed revision

#### Scenario: Quality failure keeps the old preview stale

- **WHEN** a new Snap generation fails an applicable hole, profile, outer-envelope, topology, or half-cell quality check
- **THEN** the new candidate MUST be discarded
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

### Requirement: Project-owned half-cell Snap derivation

For any snapshot with a non-`none` half-cell direction, the Worker MUST first build and place the complete selected Body, Snap, and Side Holder assembly, including the selected optional body features. It MUST then apply one common host-shaped boundary operation to all affected solids. That operation MUST include the required outer-frame increment and the OpenGrid-compatible chamfered/locking cut face on every newly exposed boundary. It MUST preserve the variant/profile Z behavior, central embedding interface, fixed hole dimensions, non-empty B-Rep, finite mesh, and at least one valid outer support that fits the selected host pitch. It MUST NOT silently fall back to a uniformly scaled full Snap, a central-only body, a rectangular-only flat cut, or an unvalidated placeholder.

#### Scenario: Four single-axis directions

- **WHEN** Full and Lite are each generated for `left`, `right`, `top`, and `bottom` as the only selected half-cell direction
- **THEN** every fixture MUST produce a valid committed candidate
- **AND** the selected side MUST be reflected in the corresponding boundary/interface probes
- **AND** the unselected axis MUST retain its 28 mm host compatibility

#### Scenario: Four dual-axis combinations

- **WHEN** a valid Snap selects one X direction and one Y direction
- **THEN** the Worker MUST derive the combined quarter-cell geometry from the placed full assembly
- **AND** both final axes MUST fit within their 14 mm host pitches
- **AND** no separate diagonal parameter or variant MAY be required

#### Scenario: Side Holder is clipped with the assembly

- **WHEN** a half-cell or quarter-cell boundary intersects a Side Holder or Snap support
- **THEN** that support MUST first be placed at its complete-assembly position
- **AND** the same boundary operation MUST determine its surviving geometry
- **AND** the resulting exposed face MUST include the required OpenGrid chamfer/locking profile

#### Scenario: Half-cell quality failure

- **WHEN** a derived half-cell result loses the central interface, has no valid outer support, exceeds the host envelope, has invalid B-Rep, has an empty/non-finite mesh, or exposes a flat incompatible cut face
- **THEN** the quality gate MUST discard the candidate
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

## ADDED Requirements

### Requirement: Optional body feature controls

The generated Body MUST start from the selected Bare Standard or Directional baseline. `fourCornerLocatingHoles=true` MUST add exactly four fixed-profile locating-hole cutters at the selected profile's documented centers. `centerRemoverHole=true` MUST add the selected profile's documented center-remover cutter, which MAY be non-circular. The two cutters MUST be independent, MUST NOT change diameter or profile dimensions when the assembly is offset or resized for a host footprint, and MUST NOT duplicate an intrinsic Directional feature already present in the selected source profile.

#### Scenario: Solid body with all optional features disabled

- **WHEN** both optional feature fields are `false`
- **THEN** the output Body MUST match the selected Bare baseline without either optional cut
- **AND** the surrounding Side Holder and Snap assembly MUST remain unchanged

#### Scenario: Four locating holes only

- **WHEN** `fourCornerLocatingHoles=true` and `centerRemoverHole=false`
- **THEN** the Body MUST contain four locating holes with the configured fixed diameter
- **AND** it MUST NOT contain the optional center-remover cut

#### Scenario: Center remover only

- **WHEN** `fourCornerLocatingHoles=false` and `centerRemoverHole=true`
- **THEN** the Body MUST contain the configured center-remover profile
- **AND** it MUST NOT contain optional locating holes

#### Scenario: Both optional features

- **WHEN** both optional feature fields are `true`
- **THEN** the Body MUST contain both the four locating holes and the center-remover profile
- **AND** each feature MUST be independently probeable

### Requirement: Directional Snap profile selection

When `profile=Directional`, generation MUST use the repository-owned Directional Full or Directional Lite profile in its canonical orientation. Directional MUST be modeled or imported as its own profile and MUST NOT be produced by rotating, uniformly scaling, or otherwise substituting the Standard assembly. The profile registry MUST document its asymmetric boundary, variant-specific details, Z bounds, and which features are intrinsic versus optional.

#### Scenario: Full Directional selection

- **WHEN** `variant=Full` and `profile=Directional`
- **THEN** generation MUST use the Directional Full profile
- **AND** its directional boundary and fixed features MUST match the Directional Full fixture within tolerance

#### Scenario: Lite Directional selection

- **WHEN** `variant=Lite` and `profile=Directional`
- **THEN** generation MUST use the Directional Lite profile
- **AND** its directional boundary and fixed features MUST match the Directional Lite fixture within tolerance

#### Scenario: Standard geometry is not rotated into Directional

- **WHEN** a Directional snapshot is generated
- **THEN** the quality gate MUST compare against Directional-specific boundary and feature probes
- **AND** a rotated Standard candidate MUST fail unless it independently satisfies the Directional profile contract

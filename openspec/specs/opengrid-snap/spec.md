## Purpose

定義 OpenGrid Snap 元件的參數契約、參考幾何、profile 與 footprint 衍生幾何、品質驗證、生命週期與匯出一致性。

## Requirements

### Requirement: OpenGrid Snap model contract

The system MUST register the independent `opengrid-snap` model with `Full` and `Lite` variants and `Standard` and `Directional` profiles. Its normalized parameter snapshot MUST contain exactly `variant`, `profile`, `offset`, `footprint`, `fourCornerLocatingHoles`, and `centerRemoverHole`. `variant` MUST be `Full` or `Lite`; `profile` MUST be `Standard` or `Directional`; and `footprint` MUST be `full`, `half`, or `quarter`. The two boolean feature fields MUST be independent. A Snap snapshot MUST NOT contain board rows, columns, Heavy, screws, connectors, chamfers, `halfCellX`, `halfCellY`, `allowHalfCell`, or direction-specific/diagonal fields. The OpenGrid board MAY continue to use its own `halfCellX` and `halfCellY` contract. The existing `opengrid-snap` modelId, buildKey, and route MUST remain unchanged. A zero-offset, full-footprint Standard snapshot MUST use the repository-owned Bare Standard reference or its equivalent programmatic baseline, with optional holes disabled unless explicitly selected.

#### Scenario: Valid full-footprint Standard snapshot

- **WHEN** a complete `opengrid-snap` snapshot has `variant=Full`, `profile=Standard`, `offset=0`, `footprint=full`, `fourCornerLocatingHoles=false`, and `centerRemoverHole=false`
- **THEN** validation MUST accept it as a typed Snap snapshot
- **AND** generation MUST select the Full Bare Standard baseline
- **AND** the body MUST remain solid except for fixed geometry already present in the source profile

#### Scenario: Valid canonical half-footprint snapshot

- **WHEN** a complete Snap snapshot has `variant=Lite`, `profile=Standard`, `offset=0`, `footprint=half`, `fourCornerLocatingHoles=false`, and `centerRemoverHole=false`
- **THEN** validation MUST accept it
- **AND** generation MUST use the project-owned canonical `xleft` half-cell derivation
- **AND** the result MUST fit one 14 mm axis host and one 28 mm axis host

#### Scenario: Valid canonical quarter-footprint snapshot

- **WHEN** a complete Snap snapshot has `variant=Lite`, `profile=Directional`, `offset=0.2`, `footprint=quarter`, `fourCornerLocatingHoles=true`, and `centerRemoverHole=false`
- **THEN** validation MUST accept it
- **AND** generation MUST use the Directional Lite profile in its canonical `xleft + ytop` orientation
- **AND** the four locating-hole option MUST NOT imply the center remover-hole option

#### Scenario: Board or direction fields are rejected by the normalized Snap validator

- **WHEN** a normalized Snap snapshot contains rows, columns, Heavy, screw, connector, chamfer, `halfCellX`, `halfCellY`, `allowHalfCell`, or a direction-specific/diagonal field
- **THEN** validation MUST reject the snapshot as a model-parameter mismatch
- **AND** the Worker MUST NOT route it through the existing OpenGrid board builder

### Requirement: Complete reference assembly preservation

For a full-footprint Standard snapshot, the generated Snap result MUST preserve the complete reference assembly, including one Body, four Side Holder solids, and four Snap solids, for a total of nine solids. It MUST remain centered on X/Y and based at Z=0, with the variant-specific Z profile from the Bare Standard reference. Half and quarter snapshots MUST instead satisfy the project-owned footprint-fit quality requirement and MUST NOT be required to retain nine solids after explicit clipping/recomposition. A full-footprint Directional snapshot MUST preserve the topology permitted by its Directional profile, including a valid fused B-Rep when the source profile is fused, and MUST preserve its canonical asymmetric directional envelope.

#### Scenario: Zero-offset Full Standard assembly

- **WHEN** Full Standard is generated with `offset=0`, `footprint=full`, and both optional hole fields `false`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Full Bare Standard reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 6.8 mm within tolerance

#### Scenario: Zero-offset Lite Standard assembly

- **WHEN** Lite Standard is generated with `offset=0`, `footprint=full`, and both optional hole fields `false`
- **THEN** the candidate MUST contain nine valid solids
- **AND** its XY envelope MUST match the Lite Bare Standard reference within the documented CAD tolerance
- **AND** its Z bounds MUST match approximately 0 through 3.4 mm within tolerance

#### Scenario: Directional assembly preserves its profile

- **WHEN** Full or Lite Directional is generated with `footprint=full`
- **THEN** the candidate MUST match the selected Directional profile's documented topology and Z bounds
- **AND** its canonical directional asymmetry MUST remain visible in the expected boundary probes
- **AND** it MUST NOT be accepted merely because a rotated Standard assembly has a similar volume

#### Scenario: Central-only full-footprint output is rejected

- **WHEN** a full-footprint generated result contains only the central Body or has lost the required profile assembly members
- **THEN** the Snap quality gate MUST reject the candidate
- **AND** the candidate MUST NOT become the committed model

### Requirement: Total centered outer offset

`offset` MUST represent one shared total width and depth increment, not a per-side increment. For a Standard full-footprint axis, its nominal Snap envelope MUST be 25.6 mm; for the selected axis of a half footprint and both axes of a quarter footprint, its nominal host envelope MUST be 12.8 mm. The requested Standard bounds MUST be applied symmetrically around the canonical host center. Directional profiles MUST preserve their documented canonical asymmetry while applying the same shared host-dimension policy. The offset operation MUST preserve the selected profile, central Snap interface, optional hole diameters, optional hole centers, fixed internal clearances, and selected footprint. The builder MUST NOT uniformly scale the complete assembly or any hole cutter.

#### Scenario: Symmetric positive Standard full-footprint offset

- **WHEN** Standard is generated with `footprint=full` and `offset=0.2`
- **THEN** the overall width and depth MUST each increase by 0.2 mm within tolerance
- **AND** the X/Y host center MUST remain at the origin
- **AND** the central Snap and optional-hole probes MUST match the zero-offset fixture

#### Scenario: Canonical half-footprint host adjustment

- **WHEN** a Snap changes from `footprint=full` to `footprint=half` while keeping `offset=0`
- **THEN** the requested canonical X envelope MUST change from 25.6 mm to 12.8 mm
- **AND** the canonical Y envelope MUST remain 25.6 mm
- **AND** the central interface and variant Z bounds MUST remain valid

#### Scenario: Canonical quarter-footprint host adjustment

- **WHEN** a Snap changes from `footprint=full` to `footprint=quarter` while keeping `offset=0`
- **THEN** both canonical host envelopes MUST fit within 14 mm
- **AND** the central interface MUST remain valid
- **AND** no hole diameter or center MAY change

#### Scenario: Fixed holes do not scale with offset

- **WHEN** the same profile and feature selection is generated at two valid offsets
- **THEN** every uncut locating hole MUST retain its configured diameter and center
- **AND** the center remover profile MUST retain its configured dimensions
- **AND** only the permitted outer/frame geometry MAY change

#### Scenario: Invalid or intrusive offset

- **WHEN** an offset is non-finite, outside the configured range, off-step, or would make the selected footprint exceed its 14 mm host pitch or intrude into fixed geometry
- **THEN** validation or the geometry gate MUST reject the request with a diagnosable field-specific error
- **AND** no invalid candidate MAY be committed or exported

### Requirement: Reference asset loading and disposal

The Worker MUST resolve each selected `profile` and `variant` through repository-owned OpenGrid Snap assets or profile definitions under the `opengrid-snap` component directory. Standard may use a programmatic baseline, while Directional may use a bundled source-backed reference or an equivalent repository-owned profile definition, but production generation MUST NOT read `/Users/.../Downloads` or any other developer-local path. Any imported reference MUST be cached at most once per Worker epoch for its profile/variant key, failed cache promises MUST be removed so a later generation can retry, and loaded references MUST be released during disposal.

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

Before candidate registration, the Worker MUST verify the requested host envelope, selected profile's Z bounds and directional probes, valid B-Rep, finite non-empty mesh, fixed central/internal geometry, and the selected optional-hole state. Standard full-footprint snapshots MUST pass the nine-solid topology check; Directional snapshots MUST pass their profile-specific topology check. Half and quarter snapshots MUST pass the project-owned footprint quality requirements instead of the Standard nine-solid check. STEP and binary STL exports MUST use the same committed Snap revision that the viewport displays.

#### Scenario: Valid feature/profile candidate becomes exportable

- **WHEN** a Standard or Directional candidate passes its applicable envelope, topology, B-Rep, mesh, fixed-geometry, feature-state, and generation checks
- **THEN** it MAY be committed
- **AND** the viewport and STEP/STL export MUST refer to that same committed revision

#### Scenario: Quality failure keeps the old preview stale

- **WHEN** a new Snap generation fails an applicable hole, profile, outer-envelope, topology, or footprint quality check
- **THEN** the new candidate MUST be discarded
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

### Requirement: Project-owned half-cell Snap derivation

For any snapshot with `footprint=half` or `footprint=quarter`, the Worker MUST first build and place the complete selected Body, Snap, and Side Holder assembly, including the selected optional body features. It MUST then apply one common official OpenGrid-compatible boundary operation to all affected solids. `footprint=half` MUST use the canonical `halfCellX=left, halfCellY=none` mapping; `footprint=quarter` MUST use the canonical `halfCellX=left, halfCellY=top` mapping. The operation MUST include the required outer-frame increment and the chamfered/locking/capture cut face on every newly exposed boundary. It MUST preserve the variant/profile Z behavior, central embedding interface, fixed hole dimensions, non-empty B-Rep, finite mesh, and at least one valid outer support that fits the selected host pitch. It MUST NOT silently fall back to a uniformly scaled full Snap, a central-only body, a rectangular-only flat cut, or an unvalidated placeholder.

#### Scenario: Canonical half-footprint derivation

- **WHEN** Full or Lite is generated with `footprint=half`
- **THEN** the complete assembly MUST be clipped with the canonical left-edge boundary operation
- **AND** the final result MUST fit one 14 mm host axis and one 28 mm host axis
- **AND** the newly exposed cut face MUST contain the required OpenGrid insertion/locking profile

#### Scenario: Canonical quarter-footprint derivation

- **WHEN** Full or Lite is generated with `footprint=quarter`
- **THEN** the complete assembly MUST be clipped with the canonical left-top corner boundary operation
- **AND** both final axes MUST fit within their 14 mm host pitches
- **AND** the two newly exposed cut faces MUST use the same official edge-compatible profile

#### Scenario: Side Holder is clipped with the assembly

- **WHEN** a half or quarter boundary intersects a Side Holder or Snap support
- **THEN** that support MUST first be placed at its complete-assembly position
- **AND** the same boundary operation MUST determine its surviving geometry
- **AND** the resulting exposed face MUST include the required OpenGrid chamfer, capture, or locking profile

#### Scenario: Footprint quality failure

- **WHEN** a derived half or quarter result loses the central interface, has no valid outer support, exceeds the host envelope, has invalid B-Rep, or exposes a flat incompatible cut face
- **THEN** the quality gate MUST discard the candidate
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the failed generation

### Requirement: Half-cell Snap file metadata

Deterministic Snap STEP and STL filenames MUST include the variant, profile, offset, footprint, and every optional feature state. Full, half, and quarter filenames MUST remain distinct and MUST NOT encode or imply an arbitrary X/Y direction that the Snap UI no longer exposes.

#### Scenario: Distinct footprint filenames

- **WHEN** two Snap snapshots differ only by `footprint=half` versus `footprint=quarter`
- **THEN** their generated filenames MUST be distinct
- **AND** neither export MAY overwrite the other through the filename helper

### Requirement: Optional body feature controls

The generated Body MUST start from the selected Bare Standard or Directional baseline. `fourCornerLocatingHoles=true` MUST add exactly four fixed-profile locating-hole cutters at the selected profile's documented centers, with the documented underside elastic slots connected to those holes. `centerRemoverHole=true` MUST add the selected profile's documented center-remover cutter, which MAY be non-circular. The two cutters MUST be independent, MUST NOT change diameter or profile dimensions when the assembly is offset or resized for a host footprint, and MUST NOT duplicate an intrinsic Directional feature already present in the selected source profile.

#### Scenario: Solid body with all optional features disabled

- **WHEN** both optional feature fields are `false`
- **THEN** the output Body MUST match the selected Bare baseline without either optional cut
- **AND** the surrounding Side Holder and Snap assembly MUST remain unchanged

#### Scenario: Four locating holes only

- **WHEN** `fourCornerLocatingHoles=true` and `centerRemoverHole=false`
- **THEN** the Body MUST contain four locating holes with fixed diameter 5.0 mm at centers `(±7.0, ±7.0)` mm
- **AND** the Body MUST contain four 3.0 mm-wide underside elastic slots, opening from Z=0 through the profile's documented slot-step height
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

### Requirement: OpenGrid Snap footprint control

The `/cad/opengrid-snap` workspace MUST expose one footprint control with exactly the user-facing choices Full、1/2、1/4. It MUST NOT expose separate Snap X-half or Y-half direction controls. Selecting 1/2 MUST submit `footprint=half`; selecting 1/4 MUST submit `footprint=quarter`; selecting Full MUST submit `footprint=full`.

#### Scenario: Full footprint control

- **WHEN** the user selects Full in the Snap footprint control
- **THEN** the accepted normalized snapshot MUST contain `footprint=full`
- **AND** no half-cell boundary operation MAY run

#### Scenario: Half and quarter footprint controls

- **WHEN** the user selects 1/2 or 1/4
- **THEN** the accepted normalized snapshot MUST contain `footprint=half` or `footprint=quarter` respectively
- **AND** no separate X/Y direction input MAY be required or displayed

### Requirement: Official OpenGrid host fit

The project MUST keep a repository-owned copy of `opengrid-lite-2x2-xleft-ytop-official-default-none-corners-none.step` as a geometry fixture. The fixture MUST characterize approximately `70 × 70 × 4 mm` bounds and MUST be used to verify the canonical boundary profile. A canonical half Snap placed at `(-28, 7)` and a canonical quarter Snap placed at `(-28, 28)` MUST fit the corresponding 14/28 mm and 14/14 mm host regions without forbidden solid interference beyond the configured CAD tolerance. The runtime MUST NOT read the original Downloads path.

#### Scenario: Half footprint fits the official edge host

- **WHEN** a generated Lite or Full half Snap is placed at `(-28, 7)` against the official fixture using the documented mating Z reference
- **THEN** forbidden solid interference MUST remain within the configured tolerance
- **AND** the outer boundary clearance and newly exposed locking/capture probes MUST pass

#### Scenario: Quarter footprint fits the official corner host

- **WHEN** a generated Lite or Full quarter Snap is placed at `(-28, 28)` against the official fixture using the documented mating Z reference
- **THEN** forbidden solid interference MUST remain within the configured tolerance
- **AND** both exposed boundary faces MUST pass the official edge profile probes

#### Scenario: Fixture is not a developer-local runtime dependency

- **WHEN** Snap generation runs in the Worker or browser
- **THEN** it MUST resolve only repository-owned assets or programmatic boundary profiles
- **AND** it MUST NOT access `/Users/blesscat/Downloads` or another developer-local absolute path

### Requirement: Experimental footprint notice

The Snap panel MUST display the red warning `格型測試中 不保證可使用` below the footprint control whenever `footprint=half` or `footprint=quarter` is selected. The warning MUST NOT be displayed for `footprint=full`.

#### Scenario: Experimental footprint warning

- **WHEN** the user selects 1/2 or 1/4 in the Snap footprint control
- **THEN** the panel MUST show `格型測試中 不保證可使用` in the warning color below that control

#### Scenario: Full footprint has no experimental warning

- **WHEN** the user selects Full in the Snap footprint control
- **THEN** the experimental footprint warning MUST not be shown

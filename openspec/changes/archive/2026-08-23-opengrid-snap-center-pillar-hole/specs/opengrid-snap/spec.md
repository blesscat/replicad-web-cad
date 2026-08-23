## MODIFIED Requirements

### Requirement: Optional body feature controls

The optional body feature controls apply to Full only. Half and Quarter fixed assets do not apply locating-hole or remover-hole changes.

The generated Body MUST start from the selected Bare Standard or Directional baseline before optional cuts. `fourCornerLocatingHoles=true` MUST add exactly four fixed-profile locating-hole cutters at the selected profile's documented centers, with the documented underside elastic slots connected to those holes. `centerRemoverHole=true` MUST add the selected profile's documented stepped center-remover cutter together with one centered, vertical nominal 5.0 mm diameter circular passage at `(0, 0)`. The circular passage MUST extend through the selected Snap's full Z envelope and MUST be compatible with the nominal Ø5 mm zero-offset positioning pillar. The existing lower remover opening and stepped upper profile MUST remain present around that passage. After any requested non-hole XY assembly scaling, the two cutters MUST be applied independently to the transformed Body. Their diameter, slot width, circular passage diameter, step/profile dimensions, and documented centers MUST remain unchanged for every valid offset and footprint. They MUST NOT duplicate an intrinsic Directional feature already present in the selected source profile.

#### Scenario: Solid body with all optional features disabled

- **WHEN** both optional feature fields are `false`
- **THEN** the output Body MUST match the selected Bare baseline at `offset=0`
- **AND** at a positive offset it MUST match the selected Bare baseline's expected non-hole XY transform
- **AND** the surrounding Side Holder and Snap assembly MUST receive the same transform

#### Scenario: Four locating holes only

- **WHEN** `fourCornerLocatingHoles=true` and `centerRemoverHole=false`
- **THEN** the Body MUST contain four locating holes with fixed diameter 5.0 mm at centers `(±7.0, ±7.0)` mm
- **AND** the Body MUST contain four 3.0 mm-wide underside elastic slots, opening from Z=0 through the profile's documented slot-step height
- **AND** the hole and slot dimensions MUST be identical at zero and positive valid offsets
- **AND** it MUST NOT contain the optional center-remover cut or the central circular passage

#### Scenario: Center remover only

- **WHEN** `fourCornerLocatingHoles=false` and `centerRemoverHole=true`
- **THEN** the Body MUST contain the configured stepped center-remover profile with its existing lower 8 × 8 mm opening and upper 4 × 8 mm opening
- **AND** the Body MUST contain exactly one centered nominal Ø5.0 mm circular passage extending through the full Snap Z envelope
- **AND** a coaxially aligned nominal Ø5 mm positioning pillar with `offset=0` MUST pass through the circular passage without solid interference
- **AND** the stepped profile, circular passage diameter, and center MUST remain unchanged after any non-hole XY scale
- **AND** it MUST NOT contain optional corner locating holes

#### Scenario: Both optional features

- **WHEN** both optional feature fields are `true`
- **THEN** the Body MUST contain both the four locating holes and the stepped center-remover profile with its centered nominal Ø5.0 mm circular passage
- **AND** each feature MUST be independently probeable with unchanged dimensions and centers after scaling

## Purpose

提供鎖定角座與物件定位用自訂長度版的 OpenGrid 定位元件，讓使用者能產生可預覽、可驗證並可匯出的單一 CAD solid。

## Requirements

### Requirement: Pillar parameter contract

The system MUST expose an independent OpenGrid component with stable
`modelId=opengrid-pillar` and `buildKey=opengrid-pillar`. Its normalized
parameter snapshot MUST be either exactly `{ mode: 'detachable-corner-seat' }`
or exactly `{ mode: 'positioning', length, offset }`. `length` MUST be a safe
integer from 3 through 500 mm and MUST be accepted only by `positioning`.
`offset` MUST be a finite numeric millimetre value from -0.5 through 0.5
inclusive, MUST use a 0.05 mm step without automatic rounding, and MUST be
accepted only by `positioning`. The `offset` value MUST be applied as an
additive increment to the positioning body's XY diameter; it MUST NOT
translate the model in world X or Y. The detachable-corner-seat profile MUST
remain fixed to the shared reference geometry and MUST reject adjustable
length or offset fields. The default snapshot MUST be exactly
`{ mode: 'detachable-corner-seat' }`.

The positioning mode MUST retain a nominal Ø5 mm two-end-chamfer profile and
expose only its total length plus the shared XY diameter increment as user
parameters. The locking corner-seat dimensions MUST remain fixed geometry and
MUST NOT be exposed as user parameters.

#### Scenario: Default pillar parameters

- **WHEN** a user opens the pillar component without a valid saved snapshot
- **THEN** the component MUST use `mode=detachable-corner-seat`
- **AND** the generated model MUST use the fixed shared locking corner-seat
  geometry centered on the world XY origin

#### Scenario: Valid pillar modes

- **WHEN** a pillar snapshot contains `mode=positioning` with the
  mode-appropriate fields and a valid shared XY diameter increment, or is
  exactly `{ mode: 'detachable-corner-seat' }`
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST remain centered on the world XY origin
- **AND** the positioning XY diameter MUST equal its nominal diameter plus
  `offset` while the detachable corner seat remains fixed

#### Scenario: Valid detachable corner-seat mode

- **WHEN** a pillar snapshot is exactly `{ mode: 'detachable-corner-seat' }`
- **THEN** validation MUST accept the snapshot
- **AND** the generated model MUST use the fixed shared male corner-seat
  geometry centered on the world XY origin

#### Scenario: XY diameter increment validation

- **WHEN** a positioning pillar snapshot contains a fractional-step,
  non-finite, non-numeric, or out-of-range `offset`
- **THEN** validation MUST reject the snapshot with an `offset`-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Detachable mode rejects adjustable fields

- **WHEN** a detachable-corner-seat snapshot contains `offset`, `length`, or
  another unsupported field
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** it MUST NOT silently resize the shared fit geometry

#### Scenario: Positioning mode length validation

- **WHEN** a positioning snapshot contains a fractional, non-finite, non-numeric, or out-of-range `length`
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Invalid pillar mode

- **WHEN** a pillar snapshot contains a missing, non-string, or unsupported
  `mode`, including the removed `standard` or `thin-shell` values
- **THEN** validation MUST reject the snapshot with a field-specific diagnostic
- **AND** the invalid snapshot MUST NOT be sent as a valid model-generation request

#### Scenario: Legacy pillar snapshot migration

- **WHEN** persistence contains the old `{ length, baseConnection: false }` pillar shape with a valid length
- **THEN** hydration MUST normalize it to `{ mode: 'positioning', length, offset: 0 }`
- **WHEN** persistence contains the old `{ mode, offsetX, offsetY }` shape with equal valid X/Y values
- **THEN** hydration MUST normalize it to the corresponding `{ mode, offset }` shape
- **WHEN** persistence contains the old X/Y shape with unequal values
- **THEN** hydration MUST preserve the valid mode and positioning length when available and normalize the shared offset to `0`
- **WHEN** persistence contains `standard` or `thin-shell` mode data, with or
  without legacy offsets
- **THEN** hydration MUST normalize it to
  `{ mode: 'detachable-corner-seat' }`
- **WHEN** persistence contains an old mode-only snapshot or another malformed
  pillar record
- **THEN** hydration MUST normalize it to
  `{ mode: 'detachable-corner-seat' }` or a corresponding valid positioning
  mode when a valid positioning length is available
- **AND** an old checkbox state MUST NOT remain as an active user parameter

### Requirement: Pillar geometry quality and export identity

Every valid pillar generation MUST produce one connected solid with finite,
non-empty mesh data and a centered XY envelope whose diameter is determined by
the selected profile. The `positioning` mode MUST have X/Y envelope extents of
±`(2.5 + offset / 2)` mm because its body is nominally Ø5 mm; the fixed
`detachable-corner-seat` mode MUST have X/Y envelope extents of ±2.5 mm. The
positioning mode MUST have Z bounds `[0, length]`, and the
detachable-corner-seat mode MUST have Z bounds `[0, 5.3]`.

The deterministic zero-offset positioning export stem MUST be
`pillar-{length}-positioning`; a non-zero shared offset export MUST append a
deterministic `-xy{offset}` value. The fixed locking corner-seat export stem
MUST remain `pillar-5.3-detachable-corner-seat`. Distinct typed geometry MUST
NOT share export metadata. `.step` and `.stl` extensions MUST remain supplied
by the existing export contracts.

#### Scenario: Standard quality gate

- **WHEN** a candidate contains the removed `{ mode: 'standard', offset }`
  shape
- **THEN** validation MUST reject the candidate
- **AND** no standard geometry or export MUST be produced

#### Scenario: Thin-shell quality gate

- **WHEN** a candidate contains the removed `{ mode: 'thin-shell', offset }`
  shape
- **THEN** validation MUST reject the candidate
- **AND** no thin-shell geometry or export MUST be produced

#### Scenario: Shared XY diameter increment

- **WHEN** a valid positioning pillar with `length=25` and `offset=0.5` is
  prepared for commit
- **THEN** its body MUST be Ø5.5 mm
- **AND** its centered bounds MUST be `[-2.75, -2.75, 0]` through
  `[2.75, 2.75, 25]` within the workspace tolerance
- **AND** its Z bounds and axial profile MUST be unchanged from the positioning
  profile

#### Scenario: Positioning quality gate

- **WHEN** a valid positioning pillar with `length=25` and `offset=0.25` is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its centered bounds MUST be `[-2.625, -2.625, 0]` through `[2.625, 2.625, 25]` within the workspace tolerance

#### Scenario: Detachable corner-seat quality gate

- **WHEN** a valid detachable-corner-seat candidate is prepared for commit
- **THEN** it MUST contain exactly one valid connected solid
- **AND** its mesh MUST be finite and non-empty
- **AND** its bounds MUST be `[-2.5, -2.5, 0]` through `[2.5, 2.5, 5.3]`
  within the workspace tolerance
- **AND** its volume MUST match the shared male reference volume within the
  configured B-Rep quality tolerance

#### Scenario: Mode-specific export identity

- **WHEN** a committed positioning pillar with `length=25` and `offset=0` is
  exported
- **THEN** its export stem MUST be `pillar-25-positioning`
- **WHEN** a committed positioning pillar with `length=25` and `offset=0.25` is
  exported
- **THEN** its export stem MUST be
  `pillar-25-positioning-xy0.25`
- **WHEN** a committed locking corner seat is exported
- **THEN** its export stem MUST be `pillar-5.3-detachable-corner-seat`
- **AND** every export MUST use the committed pillar B-Rep rather than a
  viewport mesh reconstruction

### Requirement: Fixed mode-specific pillar geometry

For the `positioning` mode, the generator MUST create one centered cylindrical
body with nominal Ø5 mm and a 45-degree equal-distance chamfer of 0.2 mm at
both the lower and upper ends. Both chamfers MUST be included within the
requested total length, and the effective body diameter MUST equal the nominal
diameter plus `offset`. The complete solid MUST remain centered on the
local/world XY origin.

The `detachable-corner-seat` mode MUST use the shared fixed male geometry. Its
locating section MUST span Z=0 through Z=3.8 with maximum Ø5 mm, beginning with a
0.2 mm-high lead-in chamfer from Ø4.6 mm at Z=0 to Ø5 mm at Z=0.2. Its keyed
45-degree retaining head MUST begin at Z=3.8 and retain the shared 1.94 mm key
width. The head taper MUST end at Z=5.15, followed by a 0.15 mm-high flat wear
surface ending at Z=5.3. No locking corner-seat dimension MUST be user
adjustable.

#### Scenario: Standard pillar geometry

- **WHEN** the generator receives the removed `{ mode: 'standard', offset }`
  shape
- **THEN** the parameter contract MUST reject it before geometry generation
- **AND** the former standard flange and 0.5 mm upper chamfer MUST no longer
  be part of the supported pillar surface

#### Scenario: Standard pillar XY sizing

- **WHEN** the generator receives a removed standard shape with an XY offset
- **THEN** validation MUST reject it rather than creating a flange-based
  profile

#### Scenario: Thin-shell pillar geometry

- **WHEN** the generator receives the removed `{ mode: 'thin-shell', offset }`
  shape
- **THEN** the parameter contract MUST reject it before geometry generation
- **AND** the former thin-shell profile MUST no longer be part of the
  supported pillar surface

#### Scenario: Positioning pillar geometry

- **WHEN** the generator builds `{ mode: 'positioning', length: 25, offset: 0.1 }`
- **THEN** the model MUST span `Z=0` through `Z=25`
- **AND** the body MUST be Ø5.1 mm and remain centered on X/Y
- **AND** the lower end MUST have a 0.2 mm, 45-degree equal-distance chamfer
- **AND** the upper end MUST have a 0.2 mm, 45-degree equal-distance chamfer
- **AND** both chamfers MUST be included within the requested total length

#### Scenario: Detachable corner-seat geometry

- **WHEN** the generator builds `{ mode: 'detachable-corner-seat' }`
- **THEN** the model MUST span `Z=0` through `Z=5.3`
- **AND** the bottom lead-in, Ø5 locating section, keyed retaining head, and
  0.15 mm wear surface MUST match the shared reference geometry

#### Scenario: Fixed dimensions are not user parameters

- **WHEN** a user views or edits the pillar panel
- **THEN** selecting `鎖定角座` MUST select the complete fixed locking
  corner-seat geometry
- **AND** the locking corner-seat mode MUST expose neither length nor offset
  controls
- **AND** selecting `物件定位用` MUST expose only the custom total-length and
  one shared XY diameter increment control
- **AND** the positioning mode MUST NOT expose manual chamfer controls

### Requirement: OpenGrid pillar workspace integration

The runtime-validated component catalog MUST register `opengrid-pillar` as an
independent OpenGrid model definition and MUST route
`/cad/opengrid-pillar` to it. The definition MUST expose exactly one required
radio group with `detachable-corner-seat` and `positioning` choices in that
order, defaulting to `detachable-corner-seat`. The positioning mode MUST
expose one shared numeric `offset` control and its custom integer `length`
field. The detachable-corner-seat mode MUST expose no numeric geometry
controls. The Worker MUST dispatch `modelId=opengrid-pillar` to the pillar
builder, and the CAD workspace MUST not fall through to another component or
expose another component's parameters.

#### Scenario: Pillar initial generation

- **GIVEN** a user opens `/cad/opengrid-pillar` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using a valid saved pillar
  snapshot or `{ mode: 'detachable-corner-seat' }`
- **AND** the Worker MUST route the request to the independent pillar builder
- **AND** the committed model MUST expose pillar bounds, mesh, and model metadata centered on the world XY origin

#### Scenario: Pillar parameter controls

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose a radio group with clearly labeled `鎖定角座` and
  `物件定位用` choices in that order
- **AND** the locking corner-seat choice MUST be selected by default
- **AND** the locking corner-seat choice MUST show the description
  `搭配各元件的鎖定角座插槽使用，壓入後旋轉即可完成定位與鎖定。`
- **AND** positioning MUST expose one shared `offset` control with range
  -0.5–0.5 mm and step 0.05 mm
- **AND** selecting positioning MUST expose a custom integer total-length field
  from 3–500 mm with an initial value of 10 mm
- **AND** selecting detachable corner seat MUST hide both `offset` and `length`
- **AND** no fixed-mode length, diameter, flange-height, or chamfer field MUST
  be exposed

#### Scenario: Mode selection updates the existing model

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the user selects a radio choice or changes a valid field for that
  choice
- **THEN** the workspace MUST validate and generate the corresponding pillar
  mode
- **AND** the accepted typed mode and its mode-appropriate fields MUST be
  persisted under `opengrid-pillar`
- **AND** the generated model MUST remain centered on the world XY origin rather than translating in X or Y

#### Scenario: Pillar route isolation

- **GIVEN** a `model.generate` request carries `modelId=opengrid-pillar`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST accept only the pillar parameter shape for `positioning` or
  `detachable-corner-seat`, with `length` and `offset` allowed only for
  positioning and neither field allowed for locking corner seat
- **AND** it MUST reject removed `standard` and `thin-shell` shapes and other
  mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder or template cache

#### Scenario: Invalid pillar input lifecycle

- **WHEN** a user or external caller supplies a missing, malformed, unsupported
  pillar mode or a mode-inappropriate, invalid length or offset
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that invalid snapshot
- **AND** export MUST remain disabled while the input is invalid or stale

### Requirement: Detachable corner-seat male bottom indicator

When `opengrid-pillar` generates the fixed
`{ mode: 'detachable-corner-seat' }` profile, the exposed Z=0 bottom face MUST
contain the shared 1 mm by 2 mm straight-slot indicator recessed by 0.2 mm. The
indicator MUST remain centered on the male seat's local rotational datum, MUST
not change the outer XY or Z bounds, MUST not change any user parameters, and
MUST preserve the deterministic export identity. The positioning pillar MUST
remain unchanged and MUST NOT receive this indicator.

#### Scenario: Detachable pillar exposes the lock indicator

- **WHEN** the locking corner-seat pillar is generated and viewed from its
  bottom
- **THEN** one readable straight-slot recess MUST be present on the Z=0 face
- **AND** the recess depth MUST be 0.2 mm within geometry tolerance
- **AND** its footprint MUST be nominally 1 mm wide by 2 mm long

#### Scenario: Detachable indicator preserves the fixed pillar contract

- **WHEN** the marked locking corner seat is prepared for mesh, quality checks,
  or export
- **THEN** it MUST remain one valid connected solid with finite non-empty mesh
  data
- **AND** its bounds MUST remain `[-2.5, -2.5, 0]` through
  `[2.5, 2.5, 5.3]` within geometry tolerance
- **AND** its keyed retaining head, 3.8 mm locating section, and hand-fit
  interface MUST remain unchanged
- **AND** its export stem MUST remain
  `pillar-5.3-detachable-corner-seat`

#### Scenario: Other pillar modes remain unmarked

- **WHEN** a positioning pillar is generated, or a removed standard or
  thin-shell shape is supplied
- **THEN** its existing geometry, quality checks, bounds, mesh, and export
  identity MUST remain unchanged apart from the specified 0.2 mm end chamfers
- **AND** no detachable-seat indicator MUST be added
- **AND** removed modes MUST be rejected rather than receiving an indicator

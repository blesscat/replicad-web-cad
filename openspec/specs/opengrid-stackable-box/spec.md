## Purpose

提供一個以 OpenGrid 28 mm 格線為尺寸基準、可固定到底座並能與相同盒體互相堆疊的開口盒模型，讓盒子不需要區分上盒與下盒也能重複使用。
## Requirements
### Requirement: Thin-shell profile

The existing `opengrid-stackable-box` model MUST expose a `thinShellMode` boolean profile flag. `thinShellMode` MUST default to `false`, MUST be mutually exclusive with `basePlateMode`, and MUST preserve the existing model ID, route, X/Y footprint contract, clear-height semantics, four-direction opening fields, corner-hole switch, full bottom-hole grid switch, preview lifecycle, and export workflow. When `thinShellMode=true`, the profile MUST be explicitly non-stackable and MUST NOT claim compatibility with the normal box-to-box sliding interface.

The thin-shell cross-section MUST use a continuous flat outside bottom at Z=0, a fixed 1.5 mm 45° chamfer around the outside bottom perimeter, a 1.6 mm straight side shell away from transitions, an R2 mm inner floor-to-wall fillet, and a 2 mm nominal flat interior floor. Its top opening MUST replace the stepped top rail with one continuous fixed 1.6 mm 45° chamfer whose outer edge is higher than its inner edge, without a horizontal rim plane. The lower inner-rim datum MUST be the inner edge of this top chamfer, and the outer high rim MUST be 1.6 mm above that datum.

#### Scenario: Generate a thin-shell box

- **WHEN** a valid snapshot has `thinShellMode=true`, `basePlateMode=false`, and zero or more valid side openings and bottom-hole settings
- **THEN** the generated result MUST be a non-empty single valid solid centered on the existing OpenGrid footprint
- **AND** its outside bottom MUST be flat at Z=0 except for the specified 1.5 mm perimeter chamfer
- **AND** its clear interior floor MUST be 2 mm above the outside bottom away from the R2 fillet and hole transitions
- **AND** its main side shell MUST measure 1.6 mm away from the intentional top and bottom transitions
- **AND** its inner floor-to-wall transition MUST be an R2 mm fillet
- **AND** its top opening MUST have the continuous outer-high/inner-low 1.6 mm chamfer, MUST NOT contain a horizontal rim plane, and MUST NOT contain the stepped top rail
- **AND** its lower stacking guide, internal grid-seam reliefs, and bottom stacking interface MUST be absent
- **AND** the result MUST remain previewable and exportable through the existing STEP and STL workflows

#### Scenario: Thin-shell height and bounds

- **WHEN** a valid thin-shell snapshot has clear internal `height=H`
- **THEN** the upper surface of the flat floor MUST be at Z=2 mm
- **AND** the lower inner-rim datum MUST be at Z=`2 mm + H`
- **AND** the outer high rim MUST be at Z=`3.6 mm + H` within geometry tolerance
- **AND** the requested clear internal height MUST remain H rather than being interpreted as the external Z bound

#### Scenario: Thin-shell profile selection and migration

- **WHEN** a legacy persisted or imported stackable-box snapshot does not contain `thinShellMode`
- **THEN** hydration and validation MUST normalize `thinShellMode=false`
- **AND** the snapshot MUST retain its existing normal or base-plate geometry and export identity
- **WHEN** both `thinShellMode` and `basePlateMode` are `true`
- **THEN** validation MUST reject the snapshot with a field-specific mode error

### Requirement: OpenGrid stackable box parameters

The system MUST expose an independently validated OpenGrid stackable-box model
with stable `modelId=opengrid-stackable-box`. Its normalized parameters MUST
include `x`, `y`, `height`, the enum `cornerSeatMode`, the boolean
`fullBottomHoleGrid`, the boolean `basePlateMode`, the boolean `thinShellMode`,
and the existing three typed opening fields for each of `+X`, `-X`, `+Y`, and
`-Y`. `cornerSeatMode` MUST be exactly one of `none`, `hole`, or `integrated`.
The user-facing labels MUST be `無角座`, `角座孔`, and `內建角座` respectively.
`x` and `y` MUST be multiples of 0.5 in the inclusive range 0.5–10 grids, the
derived footprint MUST remain within the current 500 mm workspace limit, the
OpenGrid pitch MUST remain 28 mm, and the generated footprint MUST retain the
total 0.15 mm per-axis clearance.

The `height` control MUST remain a safe integer in the inclusive range 10–500
mm and MUST represent clear internal box height. Existing normal, base-plate,
and thin-shell height semantics MUST remain unchanged. The default snapshot
MUST be `x=2`, `y=2`, `height=20`, `cornerSeatMode='hole'`,
`fullBottomHoleGrid=false`, `basePlateMode=false`, and `thinShellMode=false`.
`basePlateMode` and `thinShellMode` MUST NOT both be true.

The four opening triples MUST retain their current names, ranges, defaults, and
geometry semantics. The stackable-box panel MUST expose the existing thin-shell
and stackable profile choices and MUST additionally expose exactly one visible
radio group for the locating seat with the three labels above. The normalized
`basePlateMode` field MUST remain available for legacy or programmatic
snapshots, but MUST NOT become a visible profile choice.

When a legacy snapshot contains `cornerBottomHoles`, hydration MUST map
`false` to `cornerSeatMode='none'` and `true` to `cornerSeatMode='hole'`;
missing legacy values MUST map to `'hole'`. A canonical enum value MUST take
precedence over a stale legacy boolean, and canonical validation MUST reject
other enum values.

#### Scenario: Valid seat mode defaults

- **WHEN** the stackable-box route initializes without valid saved parameters
- **THEN** the model MUST use `cornerSeatMode='hole'`
- **AND** the panel MUST select `角座孔`
- **AND** the existing OpenGrid footprint, height, profile, and opening defaults
  MUST remain unchanged

#### Scenario: Seat mode selection is mutually exclusive

- **WHEN** a user selects one locating-seat radio option
- **THEN** exactly one of `無角座`, `角座孔`, or `內建角座` MUST be selected
- **AND** the normalized snapshot MUST contain the corresponding enum value
- **AND** no `cornerBottomHoles` field MUST be sent in the canonical Worker
  snapshot

#### Scenario: Legacy corner-hole migration

- **WHEN** a persisted snapshot contains `cornerBottomHoles=false` or `true`
- **THEN** hydration MUST produce `cornerSeatMode='none'` or `'hole'`
- **AND** the resulting geometry MUST match the old unchecked or checked
  behavior
- **AND** persistence MUST converge to the canonical enum field after a valid
  update

#### Scenario: Invalid seat mode is rejected

- **WHEN** `cornerSeatMode` is missing from a canonical current snapshot or has
  any value other than `none`, `hole`, or `integrated`
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT replace the last valid revision

#### Scenario: Existing box geometry parameters remain valid

- **WHEN** a valid snapshot changes X/Y, height, profile, full-grid, or any
  opening value without changing the model identity
- **THEN** the existing footprint, clear-height, profile, opening, preview, and
  export contracts MUST continue to apply

### Requirement: Identical box-to-box stacking interface

Normal-mode generated boxes MUST have the same box-to-box interface and MUST be usable as either the lower or upper box without an upper/lower variant or mode switch. The normal stacking guide MUST use the reference-style independent stepped top rail fused into the nominal 1.2 mm side wall and continuous box rim, with the reference 3.75 mm external corner radius and compact 0.8 mm inner rail corner radius. The top rail MUST remain within the derived external envelope and MUST use the fixed reference sequence of a 1.75 mm 45° inner lead-in, 1.2 mm vertical sliding-block segment, 0.8 mm 45° transition, 1.8 mm vertical segment, and 2.0 mm 45° return to the side wall. It MUST mate with the fixed complementary bottom guide profile based on a 0.8 mm bed-facing foot chamfer, a 1.8 mm vertical support segment, and a 1.2 mm 45° guide transition. Each internal cell-seam relief MUST continue the fixed 45° transition to a single central apex and MUST NOT leave a horizontal closure land at the 3.8 mm floor datum. The bottom guide MUST follow the reference cell-boundary and internal-seam relief pattern rather than a separate suspended perimeter plate or an isolated hole-only interface. The top rail and bottom guide MUST provide complementary guide faces, a positive bearing land, and a dedicated sliding clearance of 0.25 mm. The bottom stacking surface MUST NOT rely on permanently protruding positioning posts, a thin unsupported perimeter lip, or a continuous recessed groove around the outer perimeter. Every internal relief MUST end at the lower surface of the supported floor and MUST leave the normal box interior floor continuous. A valid enabled side opening in normal mode MAY interrupt only the selected straight wall span from its sill to the external top-edge datum, including the corresponding selected top-rail span; it MUST NOT remove a corner guide land, bottom guide, supported floor, or any unselected rail/interface span.

Base-plate and thin-shell modes MUST be treated as non-stackable profiles. They MUST NOT claim the normal same-model sliding interface. Base-plate mode retains its existing upper stepped rail as already specified, while thin-shell mode removes the stepped rail and uses its separate continuous 1.6 mm chamfered rim without a horizontal rim plane.

#### Scenario: Same model stacks with itself in normal mode

- **WHEN** one normal-mode generated box is placed above another normal-mode generated box with compatible footprints
- **THEN** the upper box's internal-seam relief MUST remain aligned with the lower box's integrated guide geometry
- **AND** the two boxes MUST remain laterally guided without requiring different model types
- **AND** the upper box MUST mate with the lower box's fused stepped top rail through the fixed bottom guide profile without stacking posts
- **AND** any enabled side opening MUST leave the corner and bottom guide interfaces valid for the same-model mating contract

#### Scenario: Printable integrated guide interface

- **WHEN** a normal-mode stackable-box guide interface is generated
- **THEN** the stepped top rail MUST remain continuously fused to the 1.2 mm side wall and rim, with its 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm reference sequence preserved and the outer stacking datum preserved
- **AND** the fixed bottom assembly MUST measure 5.0 mm from the bed-facing plane to the upper interior floor
- **AND** the bottom guide MUST use a 0.8 mm bed-facing 45° foot, a 1.8 mm vertical segment, and a 1.2 mm 45° transition that continues to a pointed internal-seam closure without a horizontal land at the 3.8 mm datum
- **AND** the guide and internal-seam relief MUST stop at the lower surface of the supported floor without cutting into the box interior or leaving an unconnected overhanging lip
- **AND** the lower floor surface above each relief MUST remain supported and continuous through the fixed 1.2 mm interior floor
- **AND** the mating clearance MUST be independent of the 0.15 mm OpenGrid footprint clearance
- **AND** an enabled side opening MUST preserve the same guide sequence and all required corner bridges outside its selected wall span

#### Scenario: Smaller box slides on a longer box

- **WHEN** a single normal-mode 1×1 box is placed on a normal-mode 1×4 box
- **THEN** the 1×1 box MUST be able to slide continuously along the 1×4 long axis while remaining captured by the guide geometry
- **AND** the interface MUST NOT force the 1×1 box to stop only at isolated 28 mm holes

#### Scenario: Larger box bridges adjacent boxes

- **WHEN** two normal-mode 1×2 boxes are placed side by side to form a 2×2 footprint and a normal-mode 2×2 box is placed above them
- **THEN** the upper 2×2 box MUST be supported by the combined outer guide geometry
- **AND** the seam between the two lower boxes MUST NOT prevent the upper box from seating
- **AND** the upper 2×2 box MUST remain a valid member of the same stackable-box model

#### Scenario: Thin-shell mode does not claim stacking

- **WHEN** a thin-shell box is placed above or below another generated box
- **THEN** the system MUST NOT claim that the pair has a valid box-to-box sliding interface
- **AND** thin-shell generation MUST remain valid as an individual non-stackable shell

### Requirement: OpenGrid Snap base mounting sockets

The box MUST retain its existing fixed bottom profiles: the 5 mm normal bottom
assembly, the clipped 3 mm base-plate body, and the 2 mm thin-shell floor. For
`cornerSeatMode='none'`, it MUST generate no special corner locating geometry.
For `cornerSeatMode='hole'`, it MUST preserve the existing nominal Ø5 mm
base-facing bore followed by the mode-specific Ø7.05 mm retaining seat at the
existing de-duplicated corner positions. For `cornerSeatMode='integrated'`, it
MUST fuse one solid round seat at each of those same positions; every seat MUST
be Ø5 mm in diameter, exactly 3 mm high, and span Z=-3 mm through Z=0 so that
it grows outward from the existing box bottom. An integrated seat MUST NOT be a
stepped hole or a captive-flange opening.

The existing normal, base-plate, and thin-shell hole profiles MUST remain
unchanged in `hole` mode. The four nominal corner positions MUST continue to
be geometrically de-duplicated when a half-cell footprint would overlap them.
The runtime MUST continue to derive positions from the declared OpenGrid
contract and MUST NOT load a Snap STEP reference during normal generation.

When `fullBottomHoleGrid=true`, ordinary holes MUST remain independent from the
seat mode. Ordinary-hole cutters MUST exclude every active special position in
both `hole` and `integrated` modes; at a coincident position the special hole
or integrated seat MUST win. In `none` mode, the ordinary grid MAY use every
nominal grid position.

#### Scenario: No locating seat

- **WHEN** a valid box uses `cornerSeatMode='none'`
- **THEN** no special corner hole or external round seat MUST be generated
- **AND** the ordinary full-bottom-hole grid MUST remain available when enabled

#### Scenario: Existing locating holes

- **WHEN** a valid box uses `cornerSeatMode='hole'`
- **THEN** every existing special corner position MUST contain its mode-specific
  Ø5-to-Ø7.05 two-stage retaining socket
- **AND** the socket MUST retain the existing captive Ø5 mm shaft/Ø7 mm flange
  compatibility behavior

#### Scenario: Integrated locating seats

- **WHEN** a valid normal, base-plate, or thin-shell box uses
  `cornerSeatMode='integrated'`
- **THEN** each existing special corner position MUST contain one fused Ø5 mm
  cylinder with a 3 mm axial span from Z=-3 mm to Z=0
- **AND** the generated shape MUST remain one valid solid
- **AND** the seat MUST extend below the box bottom without changing the upper
  shell, opening, or stacking interface

#### Scenario: Full grid preserves an active special position

- **WHEN** `fullBottomHoleGrid=true` and a nominal ordinary grid point matches a
  special corner position
- **THEN** the generated result MUST contain exactly one special interface at
  that point
- **AND** the ordinary-hole operation MUST NOT cut through an integrated seat or
  replace a stepped socket with a plain hole

#### Scenario: Half-cell positions remain valid

- **WHEN** a half-cell footprint would place two nominal special positions too
  close to coexist
- **THEN** the positions MUST be emitted as one valid special hole or seat
- **AND** the footprint MUST remain unchanged

### Requirement: Optional nominal OpenGrid bottom hole grid

The stackable-box model MUST expose `fullBottomHoleGrid` independently from
`cornerSeatMode`. When enabled, it MUST generate one ordinary straight
Ø5.05 mm through-hole at every centered 14 mm OpenGrid grid intersection based
on the un-cleared nominal footprint. Ordinary holes MUST pass through the
active bottom thickness and MUST NOT contain the Ø7.05 mm retaining seat,
flange capture, or integrated-seat geometry. Active special positions MUST be
removed from the ordinary-hole set when `cornerSeatMode` is `hole` or
`integrated`; when the seat mode is `none`, all nominal positions remain
ordinary holes.

#### Scenario: Full grid with no special seat

- **WHEN** `fullBottomHoleGrid=true` and `cornerSeatMode='none'`
- **THEN** every nominal centered 14 mm position MUST contain one ordinary
  Ø5.05 mm through-hole
- **AND** no special retaining socket or integrated seat MUST be generated

#### Scenario: Full grid with locating holes

- **WHEN** `fullBottomHoleGrid=true` and `cornerSeatMode='hole'`
- **THEN** ordinary holes MUST be present at all non-special grid positions
- **AND** special positions MUST retain their existing two-stage socket profile
- **AND** adjacent ordinary grid centers MUST remain 14 mm apart

#### Scenario: Full grid with integrated seats

- **WHEN** `fullBottomHoleGrid=true` and `cornerSeatMode='integrated'`
- **THEN** ordinary holes MUST be present at all non-special grid positions
- **AND** each special position MUST retain a solid Ø5 mm × 3 mm outward seat
- **AND** no ordinary cutter may remove material from that seat

#### Scenario: Exterior clearance does not move the grid

- **WHEN** a full-grid box applies the existing 0.15 mm exterior clearance
- **THEN** grid centers MUST remain based on the nominal un-cleared footprint
- **AND** the 14 mm spacing and half-cell layout MUST remain unchanged

### Requirement: Full-hole geometry quality and exports

The stackable-box builder MUST validate the selected `cornerSeatMode` and
`fullBottomHoleGrid` as part of the accepted snapshot. A valid result MUST be
watertight, a single solid, previewable, and exportable in every supported
profile. In `hole` mode it MUST retain the mode-specific stepped sockets and
their captive-fixture checks. In `none` mode it MUST contain no special
locating geometry. In `integrated` mode it MUST validate every special seat as
fused Ø5 mm geometry with a 3 mm Z span below the bottom plane, while ordinary
full-grid holes and all existing shell/interface checks remain valid.

#### Scenario: Valid integrated full-grid result

- **WHEN** an integrated-seat full-grid snapshot completes generation
- **THEN** the candidate MUST contain the requested ordinary holes and every
  active Ø5 mm × 3 mm seat
- **AND** it MUST be a valid single solid eligible for preview, STEP export,
  and STL export

#### Scenario: Invalid seat geometry does not commit

- **WHEN** seat fusion, bounds, hole separation, shell integrity, or ordinary
  grid validation fails
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid revision
- **AND** export MUST remain disabled for that revision

### Requirement: Stackable-box geometry quality and exports

The stackable-box builder MUST continue to validate the existing normal,
base-plate, and thin-shell shell, opening, and box-to-box interface contracts.
The selected seat mode MUST be included in that validation: `none` has no
special locating geometry, `hole` has the existing retaining sockets, and
`integrated` has fused outward seats. For `integrated`, the contract bounds
MUST report a minimum Z of -3 mm while preserving the existing maximum Z and
XY bounds; `none` and `hole` MUST retain the existing minimum Z of 0. All
successful results MUST remain previewable and exportable.

#### Scenario: Successful box generation in each seat mode

- **WHEN** a valid normal, base-plate, or thin-shell snapshot uses any of the
  three seat modes
- **THEN** the workspace MUST commit a non-empty single solid with the
  selected shell and opening geometry
- **AND** the reported bounds MUST match the selected seat mode within the
  existing tolerance
- **AND** STEP and STL export MUST be available for the committed revision

#### Scenario: Integrated seats do not change stacking semantics

- **WHEN** a normal-mode box uses `cornerSeatMode='integrated'`
- **THEN** its existing normal box-to-box guide contract MUST remain unchanged
- **AND** the new seats MUST be treated as outward mounting geometry rather
  than a replacement for the top rail or bottom guide

### Requirement: Four independently configurable box side openings

The `opengrid-stackable-box` MUST support one top-open access opening at each cardinal direction `+X`, `-X`, `+Y`, and `-Y` in normal, base-plate, and thin-shell modes. Each direction MUST use its own depth, flat-bottom length, and transition-angle values; changing one direction MUST NOT copy, rotate, or otherwise change another direction's values. An opening with depth zero MUST be omitted while the other directions remain independently generatable. The side-opening angle sliders MUST render in reverse visual direction while preserving their numeric values and geometry semantics.

The panel MUST expose one disclosure labelled `四個方向開口設定`, followed by the same four direction groups and control order as the stackable-cylinder interface: `前方`=`-Y`, `後方`=`+Y`, `左方`=`-X`, and `右方`=`+X`; each group MUST expose depth, bottom length, and angle in that order. The outer disclosure MUST be collapsed on first display; after expansion, `前方` MUST be expanded by default and the other three groups MUST be collapsed. Expanding or collapsing the controls MUST NOT change normalized opening values. Existing bottom-hole controls and the two visible mode controls MUST remain available, while the legacy `basePlateMode` field remains non-selectable in the panel.

#### Scenario: Four directions retain separate settings

- **WHEN** the user assigns distinct valid triples to `+X`, `-X`, `+Y`, and `-Y` in any mode
- **THEN** the generated box MUST contain four openings with the corresponding distinct profiles at those directions
- **AND** changing only the `+X` triple MUST leave the other three normalized triples and generated opening profiles unchanged

#### Scenario: One direction can remain closed

- **WHEN** exactly one direction has zero opening depth and the other directions have valid positive depths
- **THEN** the zero-depth direction MUST retain an uncut rectangular side wall
- **AND** the other directions MUST still contain their requested openings

#### Scenario: Opening controls match the cylinder interface

- **WHEN** a user opens the side-opening disclosure on the stackable-box panel
- **THEN** the visible group labels, direction mapping, field order, degree unit, and angle slider direction MUST match the stackable-cylinder opening interface
- **AND** the box panel MUST NOT expose circular-radius, radial-angle, or cylinder-specific cut controls

### Requirement: Rounded box-native opening profile

Each enabled opening MUST be generated as a box-native prismatic notch through the selected rectangular side wall, with a horizontal flat bottom of the requested length, fixed 2.5 mm tangent/Z transition arcs at the two sill corners and the two top transitions, and two planar straight side faces derived from the requested angle. In normal and base-plate modes, the opening MUST be open through the selected wall and stepped rail at the external top-edge datum. In thin-shell mode, the opening MUST be open through the selected wall and the continuous outer-high/inner-low 1.6 mm top chamfer at the external top-edge datum without leaving a horizontal rim plane. The profile MUST NOT use radial sectors, revolved profiles, circular-coordinate construction, or a cylinder cutter; its fixed local transition arcs are the only curved profile elements. The requested depth MUST be the vertical distance from the selected side's upper inner-rim datum to the lowest flat-bottom plane. The side-wall angle MUST be measured from the flat bottom; 90 degrees MUST produce vertical straight side segments and 45 degrees MUST produce outward-sloping straight side segments. The cutter MUST be oriented by the box's Cartesian side normal and tangent direction, not by a circular or radial coordinate system. For `+X` and `-X`, the flat-bottom length MUST run along Y; for `+Y` and `-Y`, the flat-bottom length MUST run along X. The opening MUST stop at or above the active interior-floor boundary and MUST leave solid material at both adjacent corners.

#### Scenario: Flat bottom and side faces match the controls

- **WHEN** an enabled opening is generated with a valid depth, bottom length, and side-wall angle
- **THEN** its lowest boundary MUST be a straight flat segment with the requested length
- **AND** its lowest boundary MUST be at the requested depth below the selected upper-rim datum within project tolerance
- **AND** its two straight side boundaries MUST be planar faces with the requested angle relative to the flat bottom
- **AND** the profile MUST contain the fixed rounded transitions at the sill and external top edge
- **AND** the opening MUST be open through the selected mode's wall and top-rim profile at the external top-edge datum
- **AND** the profile MUST contain no radial or revolved transition geometry

#### Scenario: Side angle changes the derived slope

- **WHEN** two otherwise identical openings use different valid side-wall angles
- **THEN** their flat-bottom depth and length MUST remain unchanged
- **AND** their straight-side slopes and derived upper widths MUST differ according to the angle
- **AND** neither profile may use a user-visible radius control

#### Scenario: Direction maps to a rectangular wall

- **WHEN** an opening is enabled for one of `+X`, `-X`, `+Y`, or `-Y`
- **THEN** the cut MUST occur only on the corresponding box wall
- **AND** its flat-bottom span MUST follow that wall's tangent axis
- **AND** the opposite wall MUST remain uncut unless its own depth is positive

### Requirement: Side-opening safety and existing box preservation

Every enabled opening MUST remain compatible with the normal, base-plate, and thin-shell floor and rim profiles. Its lowest boundary MUST NOT remove the active interior floor, fixed corner sockets, or ordinary bottom-hole bearing material. In normal mode it MUST also preserve the bottom guide and stacking interface; in thin-shell mode it MUST preserve the flat 2 mm floor, R2 inner transition, and non-stackable outer bottom. The derived opening span MUST leave valid corner bridges and MUST reject any parameter set whose neighboring opening spans overlap, merge, or reduce a required structural bridge below the geometry-safety minimum. The opening feature MUST NOT change the existing 28 mm footprint calculation, 14 mm bottom-hole grid, bottom-hole switches, or unselected top-rim spans. A zero-opening snapshot MUST remain geometrically identical to the existing accepted snapshot for its selected mode.

#### Scenario: Opening depth respects every floor mode

- **WHEN** a valid opening is generated in normal, base-plate, or thin-shell mode
- **THEN** the opening bottom MUST remain at or above the active floor boundary required by that mode
- **AND** the active floor thickness and top-rim profile MUST remain valid
- **AND** the opening MUST NOT cut into the normal bottom guide, ordinary holes, corner sockets, thin-shell R2 transition, or any unselected lower feature

#### Scenario: Neighboring openings do not merge

- **WHEN** independent opening profiles are generated on adjacent or opposite box sides
- **THEN** the builder MUST reject any parameter set whose derived spans overlap or leave an invalid corner or side bridge
- **AND** a valid parameter set MUST preserve a continuous solid between adjacent opening directions

#### Scenario: Existing holes and mode-specific interfaces remain unchanged

- **WHEN** valid side openings are added to a box with corner sockets, ordinary bottom holes, or any selected bottom mode
- **THEN** all existing bottom-hole locations and selected mode profiles MUST remain unchanged
- **AND** the normal upper rail/lower guide outside the selected opening span MUST retain its existing dimensions and mating clearance
- **AND** the thin-shell rim and flat bottom outside the selected opening span MUST retain their declared dimensions

#### Scenario: Legacy parameters normalize to no openings

- **WHEN** browser persistence or an imported parameter record contains a valid legacy box snapshot without the twelve opening fields
- **THEN** hydration MUST add depth `0`, bottom length `1`, and angle `90` for every direction
- **AND** the restored snapshot MUST generate the existing no-opening geometry for its selected mode and remain eligible for the existing export identity

### Requirement: Deterministic stackable-box export metadata

The catalog MUST provide deterministic STEP and STL filenames generated from
typed normalized parameters. In addition to the existing X/Y, height, profile,
and opening identities, every stackable-box filename MUST include exactly one
seat suffix: `-seats-none`, `-seats-hole`, or `-seats-integrated`. The suffix
MUST be emitted even for the default mode so exports with different geometry
cannot overwrite one another. Filenames MUST NOT depend on raw input
formatting, and opening fingerprints MUST retain their existing behavior.

#### Scenario: Box filenames distinguish seat geometry

- **WHEN** two valid boxes have identical dimensions, profile, and opening
  values but different seat modes
- **THEN** their STEP and STL filenames MUST differ by the deterministic seat
  suffix
- **AND** each filename MUST identify the typed normalized mode

#### Scenario: Integrated box export metadata

- **WHEN** an integrated-seat box is exported
- **THEN** both STEP and STL filenames MUST contain `-seats-integrated`
- **AND** the downloaded geometry MUST include the outward Ø5 mm × 3 mm seats

### Requirement: Honeycomb material-saving box mode

The existing `opengrid-stackable-box` model MUST expose a `honeycombMode` boolean profile flag. `honeycombMode` MUST default to `false`, MUST be accepted in legacy hydration as `false` when absent, and MUST preserve the existing model ID `opengrid-stackable-box`, route, footprint, height semantics, normal/base-plate/thin-shell mode semantics, opening fields, bottom-hole fields, preview lifecycle, and STEP/STL export workflow. The parameter panel MUST expose the flag as `省料模式（六角鏤空）` without replacing the existing mutually exclusive box-mode choices.

#### Scenario: Legacy and default snapshots keep the solid profile

- **WHEN** a persisted or imported stackable-box snapshot does not contain `honeycombMode`
- **THEN** hydration and validation MUST normalize `honeycombMode=false`
- **AND** the generated geometry and existing export identity MUST remain the same as the corresponding normal, base-plate, or thin-shell profile

#### Scenario: The user enables honeycomb mode

- **WHEN** a valid stackable-box snapshot has `honeycombMode=true`
- **THEN** the panel MUST retain the existing X/Y, height, bottom-hole, mode, and four-direction opening controls
- **AND** the normalized Worker snapshot MUST contain the typed boolean `honeycombMode=true`
- **AND** the model MUST retain its existing `opengrid-stackable-box` identity and route

#### Scenario: Box side faces use a printable hexagonal lattice

- **WHEN** a valid box has `honeycombMode=true` and an eligible side panel is large enough for a complete cell
- **THEN** the continuous side-wall material in that panel MUST be replaced by connected hexagonal openings and ribs
- **AND** the outer perimeter frame, rounded corners, top rim or rail, lower structural transition, and all active side-opening boundary bridges MUST remain solid
- **AND** the lattice MUST remain within the existing X/Y/Z envelope and MUST NOT change the requested clear internal height

#### Scenario: Box bottom faces use protected hexagonal openings

- **WHEN** a valid box has `honeycombMode=true` and an eligible bottom-floor region is large enough for a complete cell
- **THEN** the eligible bottom-floor material MUST contain connected hexagonal openings and ribs
- **AND** the outer bottom frame, corner structural regions, bottom guide or base-plate support, grid-seam reliefs, and active floor transitions MUST remain solid
- **AND** every existing corner socket and ordinary bottom-grid hole MUST retain its normalized center, diameter, section depth, and through/open state
- **AND** no hexagonal opening may intersect an existing hole or its required structural keep-out region

#### Scenario: Existing box interfaces remain unchanged in honeycomb mode

- **WHEN** a valid honeycomb box is generated with any supported bottom-hole selection, floor mode, and zero or more valid side openings
- **THEN** all selected OpenGrid Snap mounting sockets and ordinary bottom holes MUST remain at their existing positions and profiles
- **AND** the normal-mode box-to-box sliding guide, base-plate printable base, or thin-shell non-stackable profile MUST retain its existing contract
- **AND** every enabled side opening MUST retain its requested direction, bottom, depth, angle, and neighboring structural separation
- **AND** the result MUST remain one valid non-empty solid suitable for preview, STEP export, and STL export

#### Scenario: Small box panels fall back without destructive cuts

- **WHEN** `honeycombMode=true` but a side or bottom region cannot contain a complete hexagonal cell after its edge and protected-region clearances are applied
- **THEN** that region MUST remain solid or use only complete safe cells
- **AND** generation MUST remain valid
- **AND** the builder MUST NOT enlarge, move, merge, or remove any existing hole, opening, or interface feature merely to fit a lattice cell

#### Scenario: Honeycomb box output is distinguishable and materially lighter

- **WHEN** a valid honeycomb box with at least one eligible lattice panel is exported
- **THEN** its STEP and STL filenames MUST identify the honeycomb profile with a deterministic `honeycomb` suffix
- **AND** its B-Rep volume MUST be lower than the otherwise identical non-honeycomb profile within geometry tolerance
- **AND** the existing filename identity MUST remain unchanged when `honeycombMode=false`

### Requirement: Honeycomb box quality protection

The stackable-box quality gate MUST inspect honeycomb-mode candidates separately from solid profiles. It MUST reject a candidate that changes any protected hole profile, cuts a protected interface or opening boundary, creates an invalid or multi-solid result, exceeds the existing bounds, or fails preview/export eligibility. The quality report MUST identify whether honeycomb mode was enabled and MUST distinguish a valid no-cell fallback from a failed lattice construction.

#### Scenario: Honeycomb quality rejects protected-feature damage

- **WHEN** a honeycomb candidate changes a socket center, ordinary bottom-hole center, hole diameter, stepped section, floor-support probe, stacking probe, or enabled side-opening boundary
- **THEN** the candidate MUST be rejected with a diagnosable honeycomb or protected-feature error
- **AND** the last valid committed model MUST remain available

#### Scenario: Honeycomb quality accepts a protected valid result

- **WHEN** a honeycomb candidate contains only safe complete cells and passes all existing box geometry, hole, opening, interface, and export checks
- **THEN** the candidate MUST be eligible for commit, preview, STEP export, and STL export

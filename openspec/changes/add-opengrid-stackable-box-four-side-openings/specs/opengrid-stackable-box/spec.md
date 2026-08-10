## MODIFIED Requirements

### Requirement: OpenGrid stackable box parameters

The system MUST expose an independently validated OpenGrid stackable-box model with stable `modelId=opengrid-stackable-box`. Its user-facing parameters MUST include `x`, `y`, `height`, the boolean `cornerBottomHoles`, the boolean `fullBottomHoleGrid`, the boolean `basePlateMode`, and three typed opening fields for each of `+X`, `-X`, `+Y`, and `-Y`: `openingPlusXDepth`, `openingPlusXBottomLength`, `openingPlusXAngle`, `openingMinusXDepth`, `openingMinusXBottomLength`, `openingMinusXAngle`, `openingPlusYDepth`, `openingPlusYBottomLength`, `openingPlusYAngle`, `openingMinusYDepth`, `openingMinusYBottomLength`, and `openingMinusYAngle`. `x` and `y` MUST be positive multiples of 0.5, and the derived footprint MUST remain within the current 500 mm workspace limit. The standard OpenGrid pitch MUST be 28 mm. The generated footprint MUST apply a total 0.15 mm clearance per axis, so the nominal width and depth are `x × 28 − 0.15 mm` and `y × 28 − 0.15 mm`. The `height` control MUST represent the clear internal box height measured from the upper surface of the fixed 5.0 mm bottom assembly to the upper inner-rim datum, rather than the external Z bound. In the normal mode, the bottom assembly height and reference-style upper interface height MUST remain fixed independently of `height`; the nominal external height MUST therefore be `height + 5.0 mm + 7.55 mm`, excluding only the small top-edge rounding tolerance. `cornerBottomHoles` MUST default to `true`, `fullBottomHoleGrid` MUST default to `false`, and `basePlateMode` MUST default to `false`, preserving the existing default while allowing the three boolean modes to be selected independently.

The four opening triples MUST use the same normalized names and semantics as the stackable-cylinder opening interface. Each depth and flat-bottom length MUST be a finite non-negative integer millimetre value with a 1 mm step. Every bottom-length control MUST default to 1 mm, every depth MUST default to 0 mm, and every angle MUST default to 90 degrees. An opening depth of zero MUST disable that direction, so its default bottom length MUST NOT create geometry. For an enabled direction, the live depth maximum MUST be the clear internal `height` after accounting for the active bottom floor, capped by the configured global maximum; the exact floor boundary MUST be accepted and deeper values MUST be rejected. The live bottom-length maximum MUST be the largest integer that fits the selected rectangular side's straight run while preserving the required corner and neighboring-opening structure, capped by the configured global maximum. An enabled angle MUST be an integer degree from 1 through 90, measured from the flat bottom; 90 degrees MUST produce vertical side walls and 45 degrees MUST produce outward-sloping side walls. The existing model identity, route, footprint calculator, and height semantics MUST remain unchanged.

The parameter panel MUST present the normal `預設模式` and `底版模式` choices as mutually exclusive radio options. The selected normal-mode description MUST read `預設模式：可堆疊滑動，使用標準8mm固定柱` The selected base-plate-mode description MUST read `底版模式：不可堆疊，使用6mm固定柱`

The stackable-box parameter panel MUST provide a width/depth calculator that accepts X/Y dimensions in millimetres and chooses the smallest valid X/Y count on the 0.5-cell step whose generated footprint is not smaller than the requested dimensions. The calculator MUST use the same 28 mm pitch and 0.15 mm total per-axis clearance as the generated model.

#### Scenario: Generate a full-cell box

- **WHEN** a valid `x`, `y`, `height`, `cornerBottomHoles`, `fullBottomHoleGrid`, `basePlateMode`, and complete four-direction opening snapshot is submitted with whole-cell dimensions
- **THEN** the generated box MUST use 28 mm per OpenGrid cell before the 0.15 mm total axis clearance
- **AND** the box MUST remain centered on X/Y with its base aligned to Z=0
- **AND** the clear internal height MUST equal the requested `height`
- **AND** the external Z bound MUST equal the requested internal height plus the fixed bottom and upper-interface heights within geometry tolerance
- **AND** zero-depth opening defaults MUST preserve the no-opening geometry
- **AND** the result MUST expose a non-empty preview and exportable CAD shape

#### Scenario: Generate a half-cell box

- **WHEN** a valid snapshot contains `x=0.5` or `y=0.5` and a complete four-direction opening snapshot
- **THEN** the model MUST accept the value without rounding it to a whole cell
- **AND** the derived footprint MUST use 14 mm for that axis before clearance
- **AND** the model MUST reject only values that fail the half-cell step, positivity, workspace-bound, or enabled-opening fit rules

#### Scenario: Invalid dimensions or grid mode

- **WHEN** `x`, `y`, or `height` is empty, non-finite, negative, zero, not on the permitted step, or outside the workspace limits, or `cornerBottomHoles`, `fullBottomHoleGrid`, or `basePlateMode` is not a boolean
- **THEN** the model snapshot MUST be rejected with a field-specific validation error
- **AND** no invalid shape or export request MUST be committed
- **WHEN** any opening depth or bottom length is fractional, negative, non-finite, or geometrically unsupported, or any opening angle is fractional or outside 1–90 degrees
- **THEN** validation MUST identify the affected opening field
- **AND** the invalid snapshot MUST NOT replace the last valid model revision

#### Scenario: Calculate half-cell counts without undersizing

- **WHEN** a user enters requested X/Y dimensions in millimetres in the stackable-box calculator
- **THEN** the calculator MUST evaluate candidate counts at 0.5-cell increments
- **AND** it MUST return the closest counts whose generated X/Y footprints are greater than or equal to the requested dimensions
- **AND** the returned counts MUST be applied to the stackable-box X/Y parameters without changing height, `cornerBottomHoles`, `fullBottomHoleGrid`, `basePlateMode`, or any opening field

#### Scenario: Printable base-plate mode

- **WHEN** a valid snapshot has `basePlateMode=true`
- **THEN** the generator MUST keep the upper box body, open interior, independent stepped top sliding rail, and all valid side-opening settings
- **AND** it MUST remove all geometry below the fixed 2.0 mm plane, leaving a 3.0 mm bottom shell to the fixed 5.0 mm interior-floor datum
- **AND** the remaining cut face MUST be translated to `Z=0` and form a continuous printable base plate
- **AND** the external height MUST be reduced by exactly 2.0 mm while the requested clear internal height and upper rail dimensions remain unchanged
- **AND** the four corner sockets MUST use an outside/lower Ø5.05 mm bore for 2.0 mm followed by an inside/upper Ø7.05 mm retaining seat for 1.0 mm
- **AND** the base-plate export MUST use a mode-specific filename so it cannot overwrite the normal stackable-box export

### Requirement: Identical box-to-box stacking interface

Every generated stackable box MUST have the same box-to-box interface and MUST be usable as either the lower or upper box without an upper/lower variant or mode switch. The stacking guide MUST use the reference-style independent stepped top rail fused into the nominal 1.2 mm side wall and continuous box rim, with the reference 3.75 mm external corner radius and compact 0.8 mm inner rail corner radius. The top rail MUST remain within the derived external envelope and MUST use the fixed reference sequence of a 1.75 mm 45° inner lead-in, 1.2 mm vertical sliding-block segment, 0.8 mm 45° transition, 1.8 mm vertical segment, and 2.0 mm 45° return to the side wall. It MUST mate with the fixed complementary bottom guide profile based on a 0.8 mm bed-facing foot chamfer, a 1.8 mm vertical support segment, and a 1.2 mm 45° guide transition. Each internal cell-seam relief MUST continue the fixed 45° transition to a single central apex and MUST NOT leave a horizontal closure land at the 3.8 mm floor datum. The bottom guide MUST follow the reference cell-boundary and internal-seam relief pattern rather than a separate suspended perimeter plate or an isolated hole-only interface. The top rail and bottom guide MUST provide complementary guide faces, a positive bearing land, and a dedicated sliding clearance of 0.25 mm. The bottom stacking surface MUST NOT rely on permanently protruding positioning posts, a thin unsupported perimeter lip, or a continuous recessed groove around the outer perimeter. Every internal relief MUST end at the lower surface of the supported floor and MUST leave the box interior floor continuous. A valid enabled side opening MAY interrupt only the selected straight wall span below the upper-rim datum; it MUST NOT remove a corner guide land, bottom guide, supported floor, or any unselected rail/interface span. The receiving geometry MUST provide a continuous sliding path rather than only isolated circular holes.

#### Scenario: Same model stacks with itself

- **WHEN** one generated stackable box is placed above another generated stackable box with compatible footprints
- **THEN** the upper box's internal-seam relief MUST remain aligned with the lower box's integrated guide geometry
- **AND** the two boxes MUST remain laterally guided without requiring different model types
- **AND** the upper box MUST mate with the lower box's fused stepped top rail through the fixed bottom guide profile without stacking posts
- **AND** any enabled side opening MUST leave the corner and bottom guide interfaces valid for the same-model mating contract

#### Scenario: Printable integrated guide interface

- **WHEN** a stackable box guide interface is generated
- **THEN** the stepped top rail MUST remain continuously fused to the 1.2 mm side wall and rim, with its 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm reference sequence preserved and the outer stacking datum preserved
- **AND** the fixed bottom assembly MUST measure 5.0 mm from the bed-facing plane to the upper interior floor
- **AND** the bottom guide MUST use a 0.8 mm bed-facing 45° foot, a 1.8 mm vertical segment, and a 1.2 mm 45° transition that continues to a pointed internal-seam closure without a horizontal land at the 3.8 mm datum
- **AND** the guide and internal-seam relief MUST stop at the lower surface of the supported floor without cutting into the box interior or leaving an unconnected overhanging lip
- **AND** the lower floor surface above each relief MUST remain supported and continuous through the fixed 1.2 mm interior floor
- **AND** the mating clearance MUST be independent of the 0.15 mm OpenGrid footprint clearance
- **AND** an enabled side opening MUST preserve the same guide sequence and all required corner bridges outside its selected wall span

#### Scenario: Smaller box slides on a longer box

- **WHEN** a single 1×1 box is placed on a 1×4 box
- **THEN** the 1×1 box MUST be able to slide continuously along the 1×4 long axis while remaining captured by the guide geometry
- **AND** the interface MUST NOT force the 1×1 box to stop only at isolated 28 mm holes

#### Scenario: Larger box bridges adjacent boxes

- **WHEN** two 1×2 boxes are placed side by side to form a 2×2 footprint and a 2×2 box is placed above them
- **THEN** the upper 2×2 box MUST be supported by the combined outer guide geometry
- **AND** the seam between the two lower boxes MUST NOT prevent the upper box from seating
- **AND** the upper box MUST remain a valid member of the same stackable-box model

### Requirement: Stackable-box geometry quality and exports

The stackable-box builder MUST produce a valid CAD result for every accepted parameter snapshot. In normal mode this includes its open top, fixed 5 mm bottom assembly with a nominal 1.2 mm interior floor, nominal 1.2 mm side wall, fused reference-style stepped top rail with the fixed 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm upper sequence, fixed printable bottom guide with a 0.8 mm foot chamfer, 1.8 mm vertical support segment, and 1.2 mm 45° transition, retaining sockets, supported half-cell layout, and every enabled box-native side opening. In base-plate mode the lower guide is intentionally removed by the fixed 3.8 mm clipping plane and the resulting plate is validated as one solid with its enabled side openings. A successful result MUST be previewable and exportable through the existing STEP and STL workflows, while an invalid or failed mating/geometry validation MUST keep the result stale or invalid and MUST NOT enable export for that snapshot.

#### Scenario: Successful stackable-box generation

- **WHEN** a valid stackable-box snapshot, with zero or more enabled side openings, completes generation and validation
- **THEN** the workspace MUST commit a non-empty preview shape with bounds matching the requested footprint and the derived external height within tolerance
- **AND** the fixed bottom assembly MUST measure 5.0 mm from the bed-facing plane to the upper interior floor
- **AND** the nominal interior floor and main side-wall regions MUST measure 1.2 mm outside the intentional guide and upper-rim transitions
- **AND** every internal 28 mm grid seam MUST use the reference-style supported relief and MUST retain solid floor material above the relief instead of cutting into the box interior
- **AND** every enabled opening MUST be present at only its requested cardinal side with its requested depth, bottom length, and angle within geometry tolerance
- **AND** the stepped top rail, corner bridges, bottom guide, and retaining sockets MUST remain valid
- **AND** STEP and STL export MUST be available for the committed revision

#### Scenario: Successful base-plate generation

- **WHEN** a valid snapshot with `basePlateMode=true` and zero or more enabled side openings completes generation and validation
- **THEN** the workspace MUST commit a non-empty single solid whose minimum Z bound is 0
- **AND** the bottom surface MUST be continuous at the clipped base-plate plane without the lower guide feet or seam relief below it
- **AND** the upper stepped sliding rail, corner bridges, and enabled opening profiles MUST remain present and exportable

#### Scenario: Failed geometry validation

- **WHEN** a generated shape has self-intersections, overlapping retaining sockets, invalid half-cell placement, an opening below the active floor, a merged neighboring opening, a broken corner bridge, or a failed interface quality check
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid committed revision
- **AND** export MUST remain disabled for the failed revision

## ADDED Requirements

### Requirement: Four independently configurable box side openings

The `opengrid-stackable-box` MUST support one top-open access opening at each cardinal direction `+X`, `-X`, `+Y`, and `-Y`. Each direction MUST use its own depth, flat-bottom length, and transition-angle values; changing one direction MUST NOT copy, rotate, or otherwise change another direction's values. An opening with depth zero MUST be omitted while the other directions remain independently generatable. The side-opening angle sliders MUST render in reverse visual direction while preserving their numeric values and geometry semantics.

The panel MUST expose one disclosure labelled `四個方向開口設定`, followed by the same four direction groups and control order as the stackable-cylinder interface: `前方`=`-Y`, `後方`=`+Y`, `左方`=`-X`, and `右方`=`+X`; each group MUST expose depth, bottom length, and angle in that order. The outer disclosure MUST be collapsed on first display; after expansion, `前方` MUST be expanded by default and the other three groups MUST be collapsed. Expanding or collapsing the controls MUST NOT change normalized opening values. Existing bottom-hole controls and the normal/base-plate mode controls MUST remain available.

#### Scenario: Four directions retain separate settings

- **WHEN** the user assigns distinct valid triples to `+X`, `-X`, `+Y`, and `-Y`
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

### Requirement: Straight-sided box-native opening profile

Each enabled opening MUST be generated as a box-native prismatic notch through the selected rectangular side wall, with a horizontal flat bottom of the requested length and two straight side faces derived from the requested angle. The opening MUST be open at the upper-rim datum and MUST use no circular arcs, radial sectors, revolved profiles, or cylinder cutter geometry. The requested depth MUST be the vertical distance from the selected side's upper inner-rim datum to the lowest flat-bottom plane. The side-wall angle MUST be measured from the flat bottom; 90 degrees MUST produce vertical side walls and 45 degrees MUST produce outward-sloping V-like side walls. The cutter MUST be oriented by the box's Cartesian side normal and tangent direction, not by a circular or radial coordinate system. For `+X` and `-X`, the flat-bottom length MUST run along Y; for `+Y` and `-Y`, it MUST run along X. The opening MUST stop at or above the active interior-floor boundary and MUST leave solid material at both adjacent corners.

#### Scenario: Flat bottom and side faces match the controls

- **WHEN** an enabled opening is generated with a valid depth, bottom length, and side-wall angle
- **THEN** its lowest boundary MUST be a straight flat segment with the requested length
- **AND** its lowest boundary MUST be at the requested depth below the selected upper-rim datum within project tolerance
- **AND** its two side boundaries MUST be planar straight faces with the requested angle relative to the flat bottom
- **AND** the opening MUST be open through the selected side wall at the upper-rim datum
- **AND** the profile MUST contain no cylindrical or revolved transition faces

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

Every enabled opening MUST remain compatible with the normal and base-plate floor profiles. Its lowest boundary MUST NOT remove the active interior floor, bottom guide, fixed corner sockets, or ordinary bottom-hole bearing material. The derived opening span MUST leave valid corner bridges and MUST reject any parameter set whose neighboring opening spans overlap, merge, or reduce a required structural bridge below the geometry-safety minimum. The opening feature MUST NOT change the existing 28 mm footprint calculation, 14 mm bottom-hole grid, bottom-hole switches, top-rail dimensions outside the selected wall span, or same-model stacking promise. A zero-opening snapshot MUST remain geometrically identical to the existing accepted snapshot.

#### Scenario: Opening depth respects both floor modes

- **WHEN** a valid opening is generated in normal or base-plate mode
- **THEN** the opening bottom MUST remain at or above the active floor boundary required by that mode
- **AND** the active floor thickness and base-plate clipping boundary MUST remain valid
- **AND** the opening MUST NOT cut into the bottom guide, ordinary holes, corner sockets, or lower external guide profile

#### Scenario: Neighboring openings do not merge

- **WHEN** independent opening profiles are generated on adjacent or opposite box sides
- **THEN** the builder MUST reject any parameter set whose derived spans overlap or leave an invalid corner or side bridge
- **AND** a valid parameter set MUST preserve a continuous solid between adjacent opening directions

#### Scenario: Existing holes and stacking remain unchanged

- **WHEN** valid side openings are added to a box with corner sockets, ordinary bottom holes, or either bottom mode
- **THEN** all existing bottom-hole locations and stepped profiles MUST remain unchanged
- **AND** the upper rail and lower guide outside the selected opening span MUST retain their existing dimensions and mating clearance
- **AND** the box MUST remain a valid member of the same stackable-box model

#### Scenario: Legacy parameters normalize to no openings

- **WHEN** browser persistence or an imported parameter record contains a valid legacy box snapshot without the twelve opening fields
- **THEN** hydration MUST add depth `0`, bottom length `1`, and angle `90` for every direction
- **AND** the restored snapshot MUST generate the existing no-opening geometry and remain eligible for the existing export identity

### Requirement: Deterministic stackable-box export metadata

The catalog MUST provide deterministic filenames that include the model slug, X/Y counts, height, and bottom mode, using `.step` for STEP and `.stl` for STL. The filenames MUST be generated from typed normalized parameters and MUST NOT depend on raw input formatting. When any side opening depth is positive, the filename identity MUST include a deterministic opening-settings fingerprint that changes whenever any of the twelve opening values changes. When all four opening depths are zero, the existing no-opening filename identity MUST remain unchanged.

#### Scenario: Box export filenames preserve the existing identity

- **WHEN** a box with valid dimensions and no enabled side openings is exported
- **THEN** the suggested STEP and STL filenames MUST retain the existing model, X/Y, height, and bottom-mode identity
- **AND** the filenames MUST NOT acquire an opening suffix solely because disabled directions retain their default bottom length or angle

#### Scenario: Opening settings are represented deterministically

- **WHEN** two valid boxes have identical dimensions and bottom settings but different enabled opening values
- **THEN** their suggested STEP and STL filenames MUST have different deterministic opening identities
- **AND** equivalent typed values entered with different raw formatting MUST produce the same filename

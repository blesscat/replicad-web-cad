## Purpose

提供一個以 OpenGrid 28 mm 格線為尺寸基準、可固定到底座並能與相同盒體互相堆疊的開口盒模型，讓盒子不需要區分上盒與下盒也能重複使用。

## Requirements

### Requirement: OpenGrid stackable box parameters

The system MUST expose an independently validated OpenGrid stackable-box model with stable `modelId=opengrid-stackable-box`. Its user-facing parameters MUST include `x`, `y`, `height`, the boolean `cornerBottomHoles`, the boolean `fullBottomHoleGrid`, and the boolean `basePlateMode`; `x` and `y` MUST be positive multiples of 0.5, and the derived footprint MUST remain within the current 500 mm workspace limit. The standard OpenGrid pitch MUST be 28 mm. The generated footprint MUST apply a total 0.15 mm clearance per axis, so the nominal width and depth are `x × 28 − 0.15 mm` and `y × 28 − 0.15 mm`. The `height` control MUST represent the clear internal box height measured from the upper surface of the fixed 5.0 mm bottom assembly to the upper inner-rim datum, rather than the external Z bound. In the normal mode, the bottom assembly height and reference-style upper interface height MUST remain fixed independently of `height`; the nominal external height MUST therefore be `height + 5.0 mm + 7.55 mm`, excluding only the small top-edge rounding tolerance. `cornerBottomHoles` MUST default to `true`, `fullBottomHoleGrid` MUST default to `false`, and `basePlateMode` MUST default to `false`, preserving the existing default while allowing the three boolean modes to be selected independently.

The parameter panel MUST present the normal `預設模式` and `底版模式` choices as mutually exclusive radio options. The selected normal-mode description MUST read `預設模式：可堆疊滑動，使用標準8mm固定柱` The selected base-plate-mode description MUST read `底版模式：不可堆疊，使用6mm固定柱`

The stackable-box parameter panel MUST provide a width/depth calculator that accepts X/Y dimensions in millimetres and chooses the smallest valid X/Y count on the 0.5-cell step whose generated footprint is not smaller than the requested dimensions. The calculator MUST use the same 28 mm pitch and 0.15 mm total per-axis clearance as the generated model.

#### Scenario: Generate a full-cell box

- **WHEN** a valid `x`, `y`, `height`, `cornerBottomHoles`, `fullBottomHoleGrid`, and `basePlateMode=false` snapshot is submitted with whole-cell dimensions
- **THEN** the generated box MUST use 28 mm per OpenGrid cell before the 0.15 mm total axis clearance
- **AND** the box MUST remain centered on X/Y with its base aligned to Z=0
- **AND** the clear internal height MUST equal the requested `height`
- **AND** the external Z bound MUST equal the requested internal height plus the fixed bottom and upper-interface heights within geometry tolerance
- **AND** the result MUST expose a non-empty preview and exportable CAD shape

#### Scenario: Generate a half-cell box

- **WHEN** a valid snapshot contains `x=0.5` or `y=0.5`
- **THEN** the model MUST accept the value without rounding it to a whole cell
- **AND** the derived footprint MUST use 14 mm for that axis before clearance
- **AND** the model MUST reject only values that fail the half-cell step, positivity, or workspace-bound rules

#### Scenario: Invalid dimensions or grid mode

- **WHEN** `x`, `y`, or `height` is empty, non-finite, negative, zero, not on the permitted step, or outside the workspace limits, or `cornerBottomHoles`, `fullBottomHoleGrid`, or `basePlateMode` is not a boolean
- **THEN** the model snapshot MUST be rejected with a field-specific validation error
- **AND** no invalid shape or export request MUST be committed

#### Scenario: Calculate half-cell counts without undersizing

- **WHEN** a user enters requested X/Y dimensions in millimetres in the stackable-box calculator
- **THEN** the calculator MUST evaluate candidate counts at 0.5-cell increments
- **AND** it MUST return the closest counts whose generated X/Y footprints are greater than or equal to the requested dimensions
- **AND** the returned counts MUST be applied to the stackable-box X/Y parameters without changing height, `cornerBottomHoles`, `fullBottomHoleGrid`, or `basePlateMode`

#### Scenario: Printable base-plate mode

- **WHEN** a valid snapshot has `basePlateMode=true`
- **THEN** the generator MUST keep the upper box body, open interior, and independent stepped top sliding rail
- **AND** it MUST remove all geometry below the fixed 2.0 mm plane, leaving a 3.0 mm bottom shell to the fixed 5.0 mm interior-floor datum
- **AND** the remaining cut face MUST be translated to `Z=0` and form a continuous printable base plate
- **AND** the external height MUST be reduced by exactly 2.0 mm while the requested clear internal height and upper rail dimensions remain unchanged
- **AND** the four corner sockets MUST use an outside/lower Ø5.05 mm bore for 2.0 mm followed by an inside/upper Ø7.05 mm retaining seat for 1.0 mm
- **AND** the base-plate export MUST use a mode-specific filename so it cannot overwrite the normal stackable-box export

### Requirement: Identical box-to-box stacking interface

Every generated stackable box MUST have the same box-to-box interface and MUST be usable as either the lower or upper box without an upper/lower variant or mode switch. The stacking guide MUST use the reference-style independent stepped top rail fused into the nominal 1.2 mm side wall and continuous box rim, with the reference 3.75 mm external corner radius and compact 0.8 mm inner rail corner radius. The top rail MUST remain within the derived external envelope and MUST use the fixed reference sequence of a 1.75 mm 45° inner lead-in, 1.2 mm vertical sliding-block segment, 0.8 mm 45° transition, 1.8 mm vertical segment, and 2.0 mm 45° return to the side wall. It MUST mate with the fixed complementary bottom guide profile based on a 0.8 mm bed-facing foot chamfer, a 1.8 mm vertical support segment, and a 1.2 mm 45° guide transition. Each internal cell-seam relief MUST continue the fixed 45° transition to a single central apex and MUST NOT leave a horizontal closure land at the 3.8 mm floor datum. The bottom guide MUST follow the reference cell-boundary and internal-seam relief pattern rather than a separate suspended perimeter plate or an isolated hole-only interface. The top rail and bottom guide MUST provide complementary guide faces, a positive bearing land, and a dedicated sliding clearance of 0.25 mm. The bottom stacking surface MUST NOT rely on permanently protruding positioning posts, a thin unsupported perimeter lip, or a continuous recessed groove around the outer perimeter. Every internal relief MUST end at the lower surface of the supported floor and MUST leave the box interior floor continuous. The receiving geometry MUST provide a continuous sliding path rather than only isolated circular holes.

#### Scenario: Same model stacks with itself

- **WHEN** one generated stackable box is placed above another generated stackable box with compatible footprints
- **THEN** the upper box's internal-seam relief MUST remain aligned with the lower box's integrated guide geometry
- **AND** the two boxes MUST remain laterally guided without requiring different model types
- **AND** the upper box MUST mate with the lower box's fused stepped top rail through the fixed bottom guide profile without stacking posts

#### Scenario: Printable integrated guide interface

- **WHEN** a stackable box guide interface is generated
- **THEN** the stepped top rail MUST remain continuously fused to the 1.2 mm side wall and rim, with its 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm reference sequence preserved and the outer stacking datum preserved
- **AND** the fixed bottom assembly MUST measure 5.0 mm from the bed-facing plane to the upper interior floor
- **AND** the bottom guide MUST use a 0.8 mm bed-facing 45° foot, a 1.8 mm vertical segment, and a 1.2 mm 45° transition that continues to a pointed internal-seam closure without a horizontal land at the 3.8 mm datum
- **AND** the guide and internal-seam relief MUST stop at the lower surface of the supported floor without cutting into the box interior or leaving an unconnected overhanging lip
- **AND** the lower floor surface above each relief MUST remain supported and continuous through the fixed 1.2 mm interior floor
- **AND** the mating clearance MUST be independent of the 0.15 mm OpenGrid footprint clearance

#### Scenario: Smaller box slides on a longer box

- **WHEN** a single 1×1 box is placed on a 1×4 box
- **THEN** the 1×1 box MUST be able to slide continuously along the 1×4 long axis while remaining captured by the guide geometry
- **AND** the interface MUST NOT force the 1×1 box to stop only at isolated 28 mm holes

#### Scenario: Larger box bridges adjacent boxes

- **WHEN** two 1×2 boxes are placed side by side to form a 2×2 footprint and a 2×2 box is placed above them
- **THEN** the upper 2×2 box MUST be supported by the combined outer guide geometry
- **AND** the seam between the two lower boxes MUST NOT prevent the upper box from seating
- **AND** the upper box MUST remain a valid member of the same stackable-box model

### Requirement: OpenGrid Snap base mounting sockets

The box MUST retain a fixed 5 mm bottom assembly in normal mode. When `cornerBottomHoles` is `true`, it MUST provide nominal Ø5 mm base-mounting sockets at the external corner positions used by the OpenGrid Snap interface. When `cornerBottomHoles` is `false`, it MUST NOT cut those special Snap sockets. When `fullBottomHoleGrid` is `true`, the box MUST additionally provide the ordinary holes defined by the optional nominal OpenGrid bottom hole grid requirement; the ordinary grid holes MUST remain available even when `cornerBottomHoles` is `false`. For a full-cell axis with corner sockets enabled, the four special socket centers MUST occupy the outermost positions of the nominal 14 mm hole grid, 7 mm from the corresponding pre-clearance nominal box footprint edge. In normal mode, each special socket MUST have a Ø5.05 mm base-facing bore through the lower/outside 3.0 mm of the fixed bottom assembly followed by a Ø7.05 mm bore through the upper/interior 2.0 mm toward the box interior. In base-plate mode, each retained 3.0 mm base plate socket MUST instead have a Ø5.05 mm outside/lower bore for 2.0 mm followed by a Ø7.05 mm inside/upper retaining seat for 1.0 mm. In both modes, the diameter change MUST be a fixed planar retaining shoulder, not a long graduated lead-in, conical chamfer, or overlaid counterbore. The Ø7.05 mm upper opening MUST also serve as the retaining seat for a Ø5 mm shaft with a Ø5.8 mm flange. After insertion from inside the box, the flange's upper surface MUST be flush with the box interior floor and the shaft MUST extend approximately 3 mm below the box's outside bottom surface. The four nominal corner locations MUST be geometrically de-duplicated when a half-cell axis would otherwise cause overlapping Ø5 mm sockets, without removing the corresponding nominal grid position in full-hole mode. Runtime generation MUST realize these interfaces from the declared OpenGrid geometry contract and MUST NOT require a Snap STEP reference to be downloaded, loaded, or parsed. The bundled dedicated Snap reference MUST be validated separately during integration or CI testing.

#### Scenario: Full-cell base mounting

- **WHEN** a full-cell or multi-cell box is aligned with the supplied OpenGrid Snap base interface, `cornerBottomHoles` is `true`, and `fullBottomHoleGrid` is `false`
- **THEN** its four external corner sockets MUST align with the corresponding nominal 7 mm-offset Ø5 mm Snap positions
- **AND** the fixed 5 mm bottom assembly MUST remain closed between those sockets
- **AND** the socket MUST retain the fixed two-stage bore profile through the 5 mm bottom assembly

#### Scenario: Full grid preserves corner Snap mounting

- **WHEN** a full-cell or multi-cell box is generated with both `cornerBottomHoles` and `fullBottomHoleGrid` set to `true`
- **THEN** the four outermost grid positions MUST use the special corner Snap socket profile
- **AND** the special sockets MUST retain their Ø7.05 mm upper seats, 2 mm shoulders, and captive-cylinder behavior
- **AND** enabling the full grid MUST NOT remove, resize, or replace the four corner Snap interfaces with ordinary holes

#### Scenario: Full grid without corner Snap mounting

- **WHEN** a full-cell or multi-cell box is generated with `cornerBottomHoles` set to `false` and `fullBottomHoleGrid` set to `true`
- **THEN** the ordinary nominal grid holes MUST be present
- **AND** no captive corner Snap socket MUST be generated

#### Scenario: Fixed two-stage mounting-hole profile

- **WHEN** a special corner mounting socket is generated for any accepted box footprint
- **THEN** its base-facing opening MUST measure Ø5.05 mm within the geometry tolerance
- **AND** its lower bore MUST extend 3.0 mm through the floor within the geometry tolerance
- **AND** its upper opening MUST measure Ø7.05 mm and extend 2.0 mm toward the interior
- **AND** the diameter change MUST be a single fixed planar shoulder rather than a long graduated taper or conical transition

#### Scenario: Captive flanged cylinder

- **WHEN** a nominal Ø5 mm cylinder with a larger retaining flange is inserted through a special corner mounting socket from inside the box
- **THEN** the Ø5.8 mm flange MUST seat inside the Ø7.05 mm upper retaining opening above the Ø5.05 mm lower bore
- **AND** the flange MUST be flush with the box interior floor rather than protruding into the box
- **AND** the flange MUST prevent the cylinder from falling through the outside of the box
- **AND** the cylinder shaft MUST extend approximately 3 mm below the outside bottom for Snap engagement

#### Scenario: Half-cell socket layout

- **WHEN** a half-cell dimension would place two nominal corner sockets closer than the Ø5 mm interface can physically allow
- **THEN** coincident or overlapping special socket locations MUST be emitted as one valid retaining socket
- **AND** the geometry MUST remain watertight and free of overlapping cutters
- **AND** the model MUST preserve the valid half-cell footprint instead of silently changing its dimensions

#### Scenario: Snap reference compatibility is checked in test/CI

- **WHEN** the test/CI suite validates the bundled module-relative `opengrid-bare-lite-snap.step` reference against the generated nominal Ø5 mm mounting interface within the declared fit tolerance
- **THEN** a compatible reference MUST pass the dedicated mating-interface validation
- **AND** an incompatible, malformed, or insufficient reference MUST fail with a diagnosable mating-interface error
- **AND** a reference mismatch MUST NOT cause the normal Stackable Box runtime model build to scale or move the box footprint

#### Scenario: Runtime generation without a Snap reference

- **WHEN** valid `opengrid-stackable-box` parameters are sent to the runtime model builder while the Snap reference loader is unavailable
- **THEN** the builder MUST still produce a valid non-empty Stackable Box B-Rep when the declared parameter and geometry contracts are valid
- **AND** the runtime MUST NOT download, load, parse, or validate a Snap STEP reference as part of that build

### Requirement: Optional nominal OpenGrid bottom hole grid

The stackable-box model MUST expose `fullBottomHoleGrid` as an optional bottom-hole mode independent from `cornerBottomHoles`. When enabled, it MUST generate one ordinary straight Ø5.05 mm through-hole at each intersection of the centered 14 mm OpenGrid hole grid defined from the pre-clearance nominal footprint `x × 28 mm` by `y × 28 mm`. The grid MUST be centered on the model origin and MUST use the nominal outer grid positions that define the four corner Snap sockets when `cornerBottomHoles` is enabled, so adjacent hole centers remain exactly 14 mm apart within geometry tolerance. The 0.15 mm total per-axis exterior clearance MUST NOT be used to shift, shorten, or redistribute these hole centers. Ordinary holes MUST pass through the fixed 5 mm bottom assembly, have a different profile from the four special corner sockets, and MUST NOT include the Ø7.05 mm upper retaining seat, flange capture, or Snap-specific underside interface.

#### Scenario: Corner-only mode preserves the existing bottom

- **WHEN** `cornerBottomHoles` is `true` and `fullBottomHoleGrid` is `false`
- **THEN** the bottom MUST contain the four special corner Snap sockets defined by the mounting-socket requirement
- **AND** it MUST NOT add ordinary 14 mm grid holes between those sockets

#### Scenario: Full mode generates all nominal grid positions

- **WHEN** `fullBottomHoleGrid` is `true` and `cornerBottomHoles` is `true` for an accepted X/Y footprint
- **THEN** the bottom MUST contain ordinary Ø5.05 mm through-holes at every centered nominal 14 mm grid intersection within the footprint
- **AND** the outer grid positions MUST coincide with the four special corner socket centers
- **AND** each pair of adjacent ordinary grid centers on either axis MUST be 14 mm apart within geometry tolerance

#### Scenario: Full mode omits corner Snap mounting

- **WHEN** `fullBottomHoleGrid` is `true` and `cornerBottomHoles` is `false` for an accepted X/Y footprint
- **THEN** the bottom MUST contain ordinary Ø5.05 mm through-holes at every centered nominal 14 mm grid intersection
- **AND** no special corner socket profile MUST be generated

#### Scenario: Exterior clearance does not alter grid spacing

- **WHEN** a full-hole box applies the existing 0.15 mm total per-axis exterior clearance
- **THEN** the nominal hole-grid coordinates MUST remain based on the un-cleared `x × 28 mm` and `y × 28 mm` dimensions
- **AND** the hole centers MUST NOT be recomputed from the reduced printed outer footprint
- **AND** the grid MUST NOT introduce a special shorter center interval near the middle of the box

#### Scenario: Ordinary and special holes do not conflict

- **WHEN** an ordinary nominal grid position coincides with a four-corner Snap position while `cornerBottomHoles` is `true`
- **THEN** the generated bottom MUST expose one opening at that position
- **AND** that opening MUST retain the special corner socket profile rather than becoming a plain Ø5.05 mm hole
- **AND** the ordinary-hole operation MUST NOT create a duplicate or enlarge the special socket

#### Scenario: Half-cell full-hole layout

- **WHEN** `fullBottomHoleGrid` is `true` for an accepted half-cell X or Y value
- **THEN** the nominal grid MUST remain centered and use 14 mm spacing on every axis where multiple positions exist
- **AND** coincident corner positions MUST be represented by one special socket when `cornerBottomHoles` is `true`
- **AND** the half-cell footprint MUST remain unchanged

### Requirement: Full-hole geometry quality and exports

The stackable-box builder MUST validate both bottom-hole options as part of the accepted parameter snapshot. A valid full-hole result MUST remain watertight, keep the ordinary holes open through the fixed 5 mm bottom assembly without penetrating the integrated guide rim or walls, preserve the special corner retaining seats when `cornerBottomHoles` is enabled, and remain previewable and exportable through the existing STEP and STL workflows. Each special corner socket MUST use a Ø5.05 mm opening through the outside/lower 3.0 mm of the bottom assembly and a Ø7.05 mm opening through the inside/upper 2.0 mm.

#### Scenario: Full-hole generation succeeds

- **WHEN** a valid full-hole snapshot completes geometry generation and validation
- **THEN** the candidate MUST contain the requested nominal grid and special corner profiles
- **AND** the candidate MUST be eligible for preview, STEP export, and STL export

#### Scenario: Full-hole geometry fails validation

- **WHEN** full-hole generation produces overlapping cutters, a non-watertight result, a non-14 mm ordinary center interval, damage to a special corner retaining seat, or a thin unsupported bottom interface
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid committed revision
- **AND** export MUST remain disabled for the failed revision

### Requirement: Stackable-box geometry quality and exports

The stackable-box builder MUST produce a valid CAD result for every accepted parameter snapshot. In normal mode this includes its open top, fixed 5 mm bottom assembly with a nominal 1.2 mm interior floor, nominal 1.2 mm side wall, fused reference-style stepped top rail with the fixed 1.75 / 1.2 / 0.8 / 1.8 / 2.0 mm upper sequence, fixed printable bottom guide with a 0.8 mm foot chamfer, 1.8 mm vertical support segment, and 1.2 mm 45° transition, retaining sockets, and supported half-cell layout. In base-plate mode the lower guide is intentionally removed by the fixed 3.8 mm clipping plane and the resulting plate is validated as one solid. A successful result MUST be previewable and exportable through the existing STEP and STL workflows, while an invalid or failed mating/geometry validation MUST keep the result stale or invalid and MUST NOT enable export for that snapshot.

#### Scenario: Successful stackable-box generation

- **WHEN** a valid stackable-box snapshot completes generation and validation
- **THEN** the workspace MUST commit a non-empty preview shape with bounds matching the requested footprint and the derived external height within tolerance
- **AND** the fixed bottom assembly MUST measure 5.0 mm from the bed-facing plane to the upper interior floor
- **AND** the nominal interior floor and main side-wall regions MUST measure 1.2 mm outside the intentional guide and upper-rim transitions
- **AND** every internal 28 mm grid seam MUST use the reference-style supported relief and MUST retain solid floor material above the relief instead of cutting into the box interior
- **AND** the stepped top rail MUST be fused to the side wall and remain inside the requested external bounds
- **AND** STEP and STL export MUST be available for the committed revision

#### Scenario: Successful base-plate generation

- **WHEN** a valid snapshot with `basePlateMode=true` completes generation and validation
- **THEN** the workspace MUST commit a non-empty single solid whose minimum Z bound is 0
- **AND** the bottom surface MUST be continuous at the clipped base-plate plane without the lower guide feet or seam relief below it
- **AND** the upper stepped sliding rail MUST remain present and exportable

#### Scenario: Failed geometry validation

- **WHEN** a generated shape has self-intersections, overlapping retaining sockets, invalid half-cell placement, or a failed interface quality check
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid committed revision
- **AND** export MUST remain disabled for the failed revision

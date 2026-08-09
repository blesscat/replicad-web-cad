## Purpose

提供一個以 OpenGrid 28 mm 格線為尺寸基準、可固定到底座並能與相同盒體互相堆疊的開口盒模型，讓盒子不需要區分上盒與下盒也能重複使用。

## ADDED Requirements

### Requirement: OpenGrid stackable box parameters

The system MUST expose an independently validated OpenGrid stackable-box model with stable `modelId=opengrid-stackable-box`. Its user-facing parameters MUST include `x`, `y`, and `height`; `x` and `y` MUST be positive multiples of 0.5, and the derived footprint MUST remain within the current 500 mm workspace limit. The standard OpenGrid pitch MUST be 28 mm. The generated footprint MUST apply a total 0.15 mm clearance per axis, so the nominal width and depth are `x × 28 − 0.15 mm` and `y × 28 − 0.15 mm`. The height control MUST retain the standard open-box height semantics and MUST NOT silently change when stacking interfaces are enabled.

The stackable-box parameter panel MUST provide a width/depth calculator that accepts X/Y dimensions in millimetres and chooses the smallest valid X/Y count on the 0.5-cell step whose generated footprint is not smaller than the requested dimensions. The calculator MUST use the same 28 mm pitch and 0.15 mm total per-axis clearance as the generated model.

#### Scenario: Generate a full-cell box

- **WHEN** a valid `x`, `y`, and `height` snapshot is submitted with whole-cell dimensions
- **THEN** the generated box MUST use 28 mm per OpenGrid cell before the 0.15 mm total axis clearance
- **AND** the box MUST remain centered on X/Y with its base aligned to Z=0
- **AND** the result MUST expose a non-empty preview and exportable CAD shape

#### Scenario: Generate a half-cell box

- **WHEN** a valid snapshot contains `x=0.5` or `y=0.5`
- **THEN** the model MUST accept the value without rounding it to a whole cell
- **AND** the derived footprint MUST use 14 mm for that axis before clearance
- **AND** the model MUST reject only values that fail the half-cell step, positivity, or workspace-bound rules

#### Scenario: Invalid dimensions

- **WHEN** `x`, `y`, or `height` is empty, non-finite, negative, zero, not on the permitted step, or outside the workspace limits
- **THEN** the model snapshot MUST be rejected with a field-specific validation error
- **AND** no invalid shape or export request MUST be committed

#### Scenario: Calculate half-cell counts without undersizing

- **WHEN** a user enters requested X/Y dimensions in millimetres in the stackable-box calculator
- **THEN** the calculator MUST evaluate candidate counts at 0.5-cell increments
- **AND** it MUST return the closest counts whose generated X/Y footprints are greater than or equal to the requested dimensions
- **AND** the returned counts MUST be applied to the stackable-box X/Y parameters without changing height

### Requirement: Identical box-to-box stacking interface

Every generated stackable box MUST have the same box-to-box interface and MUST be usable as either the lower or upper box without an upper/lower variant or mode switch. The top of the box MUST provide a low-profile continuous convex guide rail or flange. The guide rail MUST retain a 45° top lead-in and MUST also have a short 45° chamfer on its lower inner and outer edges so the protruding profile does not create a sharp downward print overhang. The bottom MUST provide the corresponding recessed guide groove with a 45° lead-in. The bottom stacking surface MUST NOT rely on permanently protruding positioning posts. The receiving geometry MUST provide a continuous sliding path rather than only isolated circular holes.

#### Scenario: Same model stacks with itself

- **WHEN** one generated stackable box is placed above another generated stackable box with compatible footprints
- **THEN** the upper box bottom groove MUST receive the lower box top guide rail
- **AND** the two boxes MUST remain laterally guided without requiring different model types
- **AND** the upper box bottom MUST not require permanently protruding stacking posts

#### Scenario: Printable two-sided guide rail

- **WHEN** a stackable box guide rail is generated
- **THEN** its upper lead-in MUST remain a continuous 45° sliding surface
- **AND** its lower inner and outer edges MUST each expose a fixed 45° chamfer
- **AND** the lower chamfers MUST leave the rail continuously connected to the box rim

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

The box bottom MUST retain a closed floor except for four nominal Ø5 mm base-mounting sockets at the external corner positions used by the OpenGrid Snap interface. For a full-cell axis, each socket center MUST be positioned 7 mm from the corresponding box footprint edge. Each socket MUST have a Ø5.05 mm base-facing opening followed by a fixed 0.5 mm deep 45° transition to a Ø6.05 mm opening toward the box interior; it MUST NOT use a long graduated lead-in or an overlaid Ø6.75 mm counterbore. The Ø6.05 mm inner opening MUST also serve as the retaining seat for a Ø5 mm shaft with a Ø5.8 mm flange. After insertion from inside the box, the flange's upper surface MUST be flush with the box interior floor and the shaft MUST extend approximately 3 mm below the box's outside bottom surface. The four nominal corner locations MUST be geometrically de-duplicated when a half-cell axis would otherwise cause overlapping Ø5 mm sockets.

#### Scenario: Full-cell base mounting

- **WHEN** a full-cell or multi-cell box is aligned with the supplied OpenGrid Snap base interface
- **THEN** its four external corner sockets MUST align with the corresponding nominal 7 mm-offset Ø5 mm Snap positions
- **AND** the box floor MUST remain closed between those sockets
- **AND** a compatible shaft MUST be guided by the 45° lead-in rather than requiring a sharp-edged insertion

#### Scenario: Fixed mounting-hole chamfer

- **WHEN** a mounting socket is generated for any accepted box footprint
- **THEN** its base-facing opening MUST measure Ø5.05 mm within the geometry tolerance
- **AND** its inner opening MUST measure Ø6.05 mm after a fixed 0.5 mm deep 45° transition
- **AND** the transition MUST be a single fixed chamfer profile rather than a long graduated taper

#### Scenario: Captive flanged cylinder

- **WHEN** a nominal Ø5 mm cylinder with a larger retaining flange is inserted through a base-mounting socket from inside the box
- **THEN** the Ø5.8 mm flange MUST seat inside the Ø6.05 mm retaining opening
- **AND** the flange MUST be flush with the box interior floor rather than protruding into the box
- **AND** the flange MUST prevent the cylinder from falling through the outside of the box
- **AND** the cylinder shaft MUST extend approximately 3 mm below the outside bottom for Snap engagement

#### Scenario: Half-cell socket layout

- **WHEN** a half-cell dimension would place two nominal corner sockets closer than the Ø5 mm interface can physically allow
- **THEN** coincident or overlapping socket locations MUST be emitted as one valid retaining socket
- **AND** the geometry MUST remain watertight and free of overlapping cutters
- **AND** the model MUST preserve the valid half-cell footprint instead of silently changing its dimensions

#### Scenario: Snap reference mismatch

- **WHEN** the local `public/openGrid Bare Lite Snap hold.step` reference cannot be reconciled with the generated nominal Ø5 mm mounting interface within the declared fit tolerance
- **THEN** geometry validation MUST report a diagnosable mating-interface failure
- **AND** the builder MUST NOT silently scale or move the box footprint to hide the mismatch

### Requirement: Stackable-box geometry quality and exports

The stackable-box builder MUST produce a valid CAD result for every accepted parameter snapshot, including its open top, closed floor, guide interface, retaining sockets, and supported half-cell layout. A successful result MUST be previewable and exportable through the existing STEP and STL workflows, while an invalid or failed mating/geometry validation MUST keep the result stale or invalid and MUST NOT enable export for that snapshot.

#### Scenario: Successful stackable-box generation

- **WHEN** a valid stackable-box snapshot completes generation and validation
- **THEN** the workspace MUST commit a non-empty preview shape with bounds matching the requested footprint and height within tolerance
- **AND** STEP and STL export MUST be available for the committed revision

#### Scenario: Failed geometry validation

- **WHEN** a generated shape has self-intersections, overlapping retaining sockets, invalid half-cell placement, or a failed interface quality check
- **THEN** the candidate MUST be rejected with a diagnosable model error
- **AND** the failed candidate MUST NOT replace the last valid committed revision
- **AND** export MUST remain disabled for the failed revision

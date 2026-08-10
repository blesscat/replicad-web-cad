## Purpose

This capability defines the independently validated OpenGrid stackable-cylinder component, including its typed parameters, printable circular stacking geometry, safe hole layout, lifecycle quality gates, and deterministic exports.

## Requirements

### Requirement: OpenGrid stackable-cylinder identity and parameters

The system MUST expose an independently validated OpenGrid component with `modelId=opengrid-stackable-cylinder`, `buildKey=opengrid-stackable-cylinder`, and route `/cad/opengrid-stackable-cylinder`. Its user-facing display name MUST begin with `OpenGrid `. The normalized parameter snapshot MUST contain exactly integer `diameter` and `height` values. `diameter` MUST represent the outer diameter and MUST be within 20–300 mm; `height` MUST be within 10–500 mm. Both fields MUST use a 1 mm step and decimal, empty, non-finite, zero, negative, and out-of-range values MUST be rejected without rounding.

#### Scenario: Valid cylinder defaults

- **WHEN** the cylinder route initializes without valid persisted parameters
- **THEN** the catalog defaults MUST provide a valid diameter and height snapshot
- **AND** the model MUST be centered on X/Y with its base at Z=0
- **AND** the Worker MUST generate a non-empty previewable B-Rep

#### Scenario: Valid diameter and height changes

- **WHEN** a user enters integer diameter and height values within the declared ranges
- **THEN** the snapshot MUST pass component validation
- **AND** the generated bounds MUST use the requested outer diameter and overall height within the project tolerance

#### Scenario: Invalid cylinder parameters

- **WHEN** diameter or height is fractional, empty, non-finite, non-positive, or outside its declared range
- **THEN** validation MUST return a field-specific error
- **AND** the invalid snapshot MUST NOT be sent to the Worker for generation or export

### Requirement: Cylindrical shell and floor

The generated `opengrid-stackable-cylinder` MUST be an open-top circular container with the requested outer diameter, fixed 2 mm wall thickness, nominal 5 mm cavity-floor thickness, and overall requested height. The inner cavity MUST begin at Z=5 above the nominal floor and MUST remain open at the top. The preview MUST be centered on X/Y and based at Z=0. The bottom protrusion MAY locally shape the outer floor as an intentional stacking feature, but MUST NOT move the cavity start or reduce the 5 mm center and hole-bearing floor.

#### Scenario: Minimum valid shell

- **WHEN** a cylinder with diameter 20 mm and a valid height is generated
- **THEN** the result MUST retain the 2 mm wall and 5 mm floor contract
- **AND** the open cavity MUST be present without penetrating the floor outside the requested mounting holes

#### Scenario: Maximum valid shell

- **WHEN** a cylinder with diameter 300 mm and a valid height is generated
- **THEN** the result MUST retain the requested outer envelope and height
- **AND** the builder MUST NOT silently scale, clamp, or change the diameter

### Requirement: Stepped center mounting hole

Every valid cylinder MUST contain one centered floor hole at `(0, 0)`. From the outside bottom surface toward the interior, the hole MUST have a straight `Ø5.05 mm` section for 3 mm followed by a straight `Ø7.05 mm` section for the remaining 2 mm of the 5 mm floor. The transition MUST be a planar shoulder at the 3 mm depth and MUST NOT be a taper or a chamfer.

#### Scenario: Center hole profile

- **WHEN** a valid cylinder completes generation
- **THEN** its center floor hole MUST expose a `Ø5.05 mm` outside opening
- **AND** the hole MUST change to `Ø7.05 mm` after 3 mm of axial depth
- **AND** the larger section MUST terminate at the interior floor surface

#### Scenario: Center hole remains at the origin

- **WHEN** the diameter changes through the supported range
- **THEN** the center hole MUST remain at X=0 and Y=0
- **AND** changing diameter MUST NOT move, resize, or remove the fixed hole profile

### Requirement: Four outer cardinal holes from the 14 mm grid

In addition to the center hole, the builder MUST calculate the outer-hole index from `n = floor((diameter/2 - 2 - 7.05/2) / 14)`, clamped to zero. When `n >= 1`, it MUST add exactly four outer holes at `(±14n, 0)` and `(0, ±14n)`. When `n=0`, it MUST add no outer holes. Each outer hole MUST use the same stepped `Ø5.05 → Ø7.05 mm` profile as the center hole. No diagonal holes, intermediate grid holes, or additional X/Y holes are permitted.

#### Scenario: Small diameter is center-only

- **WHEN** a valid diameter cannot fit an outer hole while preserving the 2 mm clearance from the outer edge of the `Ø7.05 mm` opening
- **THEN** the generated result MUST contain the center hole only
- **AND** the builder MUST NOT emit an unsafe or off-grid outer hole

#### Scenario: Four outer holes appear at the first safe grid layer

- **WHEN** the computed index is `n=1`
- **THEN** the result MUST contain exactly four outer holes at `(+14,0)`, `(-14,0)`, `(0,+14)`, and `(0,-14)`
- **AND** no other non-center hole may be present

#### Scenario: Maximum diameter uses the outermost safe layer

- **WHEN** diameter is 300 mm
- **THEN** the result MUST place the four outer holes at `(+140,0)`, `(-140,0)`, `(0,+140)`, and `(0,-140)`
- **AND** the hole set MUST contain no additional grid points

### Requirement: Outer-edge hole clearance

The outer circular edge of every `Ø7.05 mm` hole opening MUST remain at least 2 mm from the outer cylindrical boundary in its radial direction. The clearance check MUST use the largest hole section, not only the smaller outside opening, and MUST be applied to every generated outer hole.

#### Scenario: Safe outer-hole placement

- **WHEN** an outer-hole grid point is selected
- **THEN** the radial distance from the hole's `Ø7.05 mm` outer edge to the cylinder boundary MUST be at least 2 mm
- **AND** the hole MUST remain fully inside the floor

#### Scenario: Unsafe grid layer is skipped

- **WHEN** the next 14 mm grid layer would violate the 2 mm outer-edge clearance
- **THEN** that layer MUST NOT be generated
- **AND** the preceding safe layer, or center-only layout, MUST remain unchanged

### Requirement: Same-diameter stacking interface

Every valid `opengrid-stackable-cylinder` MUST include a central bottom protrusion that enters the matching open cavity of a same-diameter cylinder. Two cylinders with the same outer diameter and compatible height placement MUST seat through this protrusion/cavity interface and remain laterally guided without permanent posts or a thickened stacking ring. The interface MUST preserve the nominal cavity start, center/hole-bearing floor, and 2 mm wall geometry. Compatibility between different diameters is explicitly outside this requirement.

The top outer rim MUST remain a normal square 2 mm wall with no added stacking ring, while the top inner rim MUST expose a 2 mm, 45-degree chamfer that guides the mating protrusion. The bottom protrusion MUST be inset 2 mm from the nominal outer radius. The printable lower profile MUST adapt the referenced `box-2-2-3.step` style with a 0.8 mm, 45-degree lower foot bevel, a vertical landing through `Z=2.6`, no external fillet layer, and a direct 2 mm, 45-degree outer transition to the nominal outer radius at `Z=4.6`. The internal floor-to-cavity corner MUST use a 0.6 mm fillet radius. The top and bottom guide chamfers MUST use the same 45-degree angle. The first lower bevel MUST remain within the 0.8 mm stacking engagement depth so it cannot interfere with the mating cavity.

#### Scenario: Same-diameter cylinders stack

- **WHEN** one generated cylinder is placed above another cylinder with the same outer diameter
- **THEN** the upper bottom protrusion MUST enter the lower matching cavity
- **AND** the pair MUST remain guided by the circular protrusion/cavity interface

#### Scenario: Top remains a normal wall and bottom uses the reference-inspired profile

- **WHEN** a valid cylinder completes generation
- **THEN** the top outer rim MUST remain square at 90°
- **AND** the top inner rim MUST expose a 2 mm, 45-degree guide chamfer
- **AND** the bottom outermost foot MUST expose a 0.8 mm, 45° printable bevel
- **AND** the bottom protrusion MUST reach the `R - 2` mating radius before the vertical landing at `Z=2.6`
- **AND** the larger lower transition MUST return directly to the nominal outer radius through the 2 mm transition, without an external fillet layer
- **AND** the internal floor corner MUST use a 0.6 mm fillet radius
- **AND** the top inner and bottom outer guide chamfers MUST use the same 45-degree angle
- **AND** the profile MUST preserve the same-diameter no-interference mating fixture

#### Scenario: Different diameters are not promised

- **WHEN** two cylinders have different outer diameters
- **THEN** the system MUST NOT claim that their stacking interface is compatible
- **AND** generation of either individual cylinder MUST remain valid

### Requirement: Cylinder geometry quality and exports

The builder MUST reject any generated cylinder that is empty, non-finite, not a single valid solid, has invalid B-Rep topology, violates its bounds, violates the stepped hole profile, violates outer-hole clearance, or fails the same-diameter interface probes. A valid committed result MUST remain eligible for preview, STEP export, and binary STL export through the existing Worker lifecycle.

#### Scenario: Valid cylinder is exportable

- **WHEN** a valid parameter snapshot completes geometry and quality validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** STEP and STL export MUST be enabled for that committed revision

#### Scenario: Invalid geometry does not replace the current model

- **WHEN** geometry or interface validation fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

### Requirement: Deterministic cylinder export metadata

The catalog MUST provide deterministic filenames that include the model slug, outer diameter, and height, using `.step` for STEP and `.stl` for STL. The filenames MUST be generated from typed normalized parameters and MUST NOT depend on raw input formatting.

#### Scenario: Cylinder export filenames

- **WHEN** a cylinder with diameter 56 mm and height 30 mm is exported
- **THEN** the suggested STEP filename MUST identify `opengrid-stackable-cylinder`, `d56`, and `h30`
- **AND** the suggested STL filename MUST use the same typed parameter identity with the `.stl` extension

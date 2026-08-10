## MODIFIED Requirements

### Requirement: Cylindrical shell and floor

The generated `opengrid-stackable-cylinder` MUST remain an open-top circular container with the requested outer diameter, fixed 2 mm straight-wall thickness, and overall requested height. Its central flat floor MUST be 3 mm above the outside bottom surface and MUST remain the minimum floor thickness for the center and hole-bearing region. The inner cavity MUST remain open at the top, and its straight inner wall MUST remain at radius `R - 2`, where `R` is the requested outer radius.

The retained external lower transition MUST run at 45 degrees from `(R - 2, Z=2.6)` to `(R, Z=4.6)`. The internal floor-to-cavity transition MUST be a sharp 45-degree conical ramp parallel to that external transition and offset from it by 2 mm in the face-normal direction. It MUST meet the central `Z=3` floor at the derived flat-floor radius and meet the straight inner wall at the derived upper endpoint, approximately `Z=5.43` for the fixed dimensions. The ramp region is intentionally thicker than the central flat floor. No bottom filler or internal floor fillet may be used.

The preview MUST remain centered on X/Y and based at `Z=0`. The bottom protrusion MAY locally shape the outside floor as the stacking feature, but MUST NOT reduce the central flat floor below 3 mm or move the center-hole top surface.

#### Scenario: Minimum valid shell

- **WHEN** a cylinder with diameter 20 mm and a valid height is generated
- **THEN** the result MUST retain the 2 mm straight wall and 3 mm central floor contract
- **AND** the central flat floor MUST be present around the center hole
- **AND** the 45-degree internal ramp MUST connect that flat floor to the straight inner wall without a filler or fillet
- **AND** the open cavity MUST be present without penetrating the floor outside the requested mounting holes

#### Scenario: Maximum valid shell

- **WHEN** a cylinder with diameter 300 mm and a valid height is generated
- **THEN** the result MUST retain the requested outer envelope and height
- **AND** the central flat floor, parallel internal ramp, and 2 mm straight wall MUST remain valid
- **AND** the builder MUST NOT silently scale, clamp, or change the diameter

### Requirement: Stepped center mounting hole

Every valid cylinder MUST contain one centered floor hole at `(0, 0)`. From the outside bottom surface toward the interior, the hole MUST have a straight `Ø5.05 mm` section from nominal `Z=0` through `Z=2`, followed by a straight `Ø7.05 mm` section from nominal `Z=2` through `Z=3`, terminating at the central flat floor. The transition MUST be a planar shoulder at `Z=2` and MUST NOT be a taper or a chamfer.

#### Scenario: Center hole profile

- **WHEN** a valid cylinder completes generation
- **THEN** its center floor hole MUST expose a `Ø5.05 mm` outside opening
- **AND** the hole MUST change to `Ø7.05 mm` after 2 mm of axial depth
- **AND** the larger section MUST terminate at the `Z=3` interior floor surface

#### Scenario: Center hole remains at the origin

- **WHEN** the diameter changes through the supported range
- **THEN** the center hole MUST remain at X=0 and Y=0
- **AND** changing diameter MUST NOT move or resize the fixed two-section hole profile

### Requirement: Four outer cardinal holes from the 14 mm grid

In addition to the center hole, the builder MUST calculate the outer-hole index from both the outer boundary and the central flat-floor boundary. Let `R=diameter/2`, `rH=7.05/2`, `P=14`, `E=2` be the outer-edge clearance, `F=2` be the flat-floor clearance, and `rFlat` be the radial start of the internal ramp at `Z=3`. The index MUST be:

```text
n = max(0, floor(min((R - E - rH) / P,
                     (rFlat - F - rH) / P)))
```

When `n >= 1`, the builder MUST add exactly four outer holes at `(±14n, 0)` and `(0, ±14n)`. When `n=0`, it MUST add no outer holes. Each outer hole MUST use the same `Ø5.05 mm × 2 mm` followed by `Ø7.05 mm × 1 mm` stepped profile as the center hole. No diagonal holes, intermediate grid holes, or additional X/Y holes are permitted.

#### Scenario: Small diameter is center-only

- **WHEN** a valid diameter cannot fit a complete `Ø7.05 mm` outer-hole profile with both required clearances
- **THEN** the generated result MUST contain the center hole only
- **AND** the builder MUST NOT emit an unsafe, off-grid, or ramp-intersecting outer hole

#### Scenario: Four outer holes appear at the first safe grid layer

- **WHEN** the computed index is `n=1`
- **THEN** the result MUST contain exactly four outer holes at `(+14,0)`, `(-14,0)`, `(0,+14)`, and `(0,-14)`
- **AND** no other non-center hole may be present

#### Scenario: Flat-floor threshold is respected

- **WHEN** diameter is 47 mm
- **THEN** the result MUST remain center-only because the `n=1` outer holes cannot retain the required 2 mm margin from the internal ramp
- **WHEN** diameter is 48 mm
- **THEN** the result MUST be eligible for exactly the four `n=1` cardinal holes

#### Scenario: Maximum diameter uses the outermost safe layer

- **WHEN** diameter is 300 mm
- **THEN** the result MUST place the four outer holes at `(+140,0)`, `(-140,0)`, `(0,+140)`, and `(0,-140)`
- **AND** the hole set MUST contain no additional grid points

### Requirement: Outer-edge hole clearance

The outer circular edge of every generated outer `Ø7.05 mm` hole opening MUST remain at least 2 mm from the outer cylindrical boundary in its radial direction. The complete outer-hole profile MUST also remain at least 2 mm inside the radial start of the central flat floor, so no generated outer hole may intersect the 45-degree internal ramp. Both clearance checks MUST use the largest hole section, not only the smaller outside opening.

#### Scenario: Safe outer-hole placement

- **WHEN** an outer-hole grid point is selected
- **THEN** the radial distance from the hole's `Ø7.05 mm` outer edge to the cylinder boundary MUST be at least 2 mm
- **AND** the radial distance from that same outer edge to the internal ramp start MUST be at least 2 mm
- **AND** the complete stepped hole MUST remain within the 3 mm central flat floor

#### Scenario: Unsafe grid layer is skipped

- **WHEN** the next 14 mm grid layer would violate either the 2 mm outer-edge clearance or the 2 mm flat-floor clearance
- **THEN** that layer MUST NOT be generated
- **AND** the preceding safe outermost layer, or center-only layout, MUST remain unchanged

### Requirement: Same-diameter stacking interface

Every valid `opengrid-stackable-cylinder` MUST include a central bottom protrusion that enters the matching open cavity of a same-diameter cylinder. The top cavity radius MUST remain `R - 2`; the bottom protrusion radius MUST be `R - 2.2`, providing a fixed 0.2 mm radial printing clearance while preserving the 2 mm nominal wall. Two cylinders with the same outer diameter and compatible height placement MUST seat through this interface and remain laterally guided without permanent posts or a thickened stacking ring. Compatibility between different diameters is explicitly outside this requirement.

The top outer rim MUST remain a normal square 2 mm wall with no added stacking ring, while the top inner rim MUST expose a 2 mm, 45-degree chamfer that guides the mating protrusion. The bottom printable profile MUST retain a 0.8 mm, 45-degree lower foot bevel and a vertical landing through `Z=2.6`. A short shoulder MAY connect the clearance-reduced protrusion to the retained external main transition at `R - 2`; that main transition MUST run directly at 45 degrees to the nominal outer radius at `Z=4.6`. The internal floor transition MUST be the parallel 45-degree ramp defined by the cylindrical shell and floor requirement, with no internal fillet or filler layer. The top and bottom guide chamfers MUST use the same 45-degree angle.

#### Scenario: Same-diameter cylinders stack with print clearance

- **WHEN** one generated cylinder is placed above another cylinder with the same outer diameter
- **THEN** the upper bottom protrusion MUST enter the lower matching cavity with a nominal 0.2 mm radial clearance
- **AND** the pair MUST remain guided by the circular protrusion/cavity interface
- **AND** the validated solids MUST not have permanent interference at the mating position

#### Scenario: Top remains a normal wall and bottom uses the reference-inspired profile

- **WHEN** a valid cylinder completes generation
- **THEN** the top outer rim MUST remain square at 90 degrees
- **AND** the top inner rim MUST expose a 2 mm, 45-degree guide chamfer
- **AND** the bottom outermost foot MUST expose a 0.8 mm, 45-degree printable bevel
- **AND** the clearance-reduced bottom protrusion MUST remain present through the `Z=2.6` vertical landing
- **AND** the larger lower transition MUST return directly to the nominal outer radius through the 2 mm radial/vertical transition at `Z=4.6`
- **AND** no external fillet layer, internal floor fillet, filler, or thickened stacking ring may be present
- **AND** the profile MUST preserve the same-diameter no-interference mating fixture

#### Scenario: Different diameters are not promised

- **WHEN** two cylinders have different outer diameters
- **THEN** the system MUST NOT claim that their stacking interface is compatible
- **AND** generation of either individual cylinder MUST remain valid

### Requirement: Cylinder geometry quality and exports

The builder MUST reject any generated cylinder that is empty, non-finite, not a single valid solid, has invalid B-Rep topology, violates its bounds, violates the 3 mm central floor or 2 mm straight wall, violates the parallel 45-degree internal ramp contract, violates either outer-hole clearance, violates the stepped hole profile, or fails the same-diameter interface probes. A valid committed result MUST remain eligible for preview, STEP export, and binary STL export through the existing Worker lifecycle.

#### Scenario: Valid cylinder is exportable

- **WHEN** a valid parameter snapshot completes geometry and quality validation
- **THEN** the workspace MUST commit a non-empty preview revision
- **AND** STEP and STL export MUST be enabled for that committed revision
- **AND** exported geometry MUST contain the updated 3 mm central floor and 2+1 mm stepped hole profile

#### Scenario: Invalid geometry does not replace the current model

- **WHEN** geometry, hole, ramp, clearance, or interface validation fails
- **THEN** the candidate MUST be rejected with a diagnosable error
- **AND** the last valid committed revision MUST remain visible
- **AND** export MUST remain disabled for the failed snapshot

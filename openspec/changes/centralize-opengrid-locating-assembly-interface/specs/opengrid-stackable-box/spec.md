## MODIFIED Requirements

### Requirement: OpenGrid Snap base mounting sockets

The box MUST retain a fixed 5 mm bottom assembly in normal mode. When cornerBottomHoles is true, it MUST provide nominal Ø5 mm base-mounting sockets at the external corner positions used by the OpenGrid Snap interface. When cornerBottomHoles is false, it MUST NOT cut those special Snap sockets. When fullBottomHoleGrid is true, the box MUST additionally provide the ordinary holes defined by the optional nominal OpenGrid bottom hole grid requirement; the ordinary grid holes MUST remain available even when cornerBottomHoles is false. For a full-cell axis with corner sockets enabled, the four special socket centers MUST occupy the outermost positions of the nominal 14 mm hole grid, 7 mm from the corresponding pre-clearance nominal box footprint edge. In normal mode, each special socket MUST have a Ø5.05 mm base-facing bore through the lower/outside 3.0 mm of the fixed bottom assembly followed by a Ø4.05 mm shaft opening through the upper/interior 2.0 mm toward the box interior. In base-plate mode, each retained 3.0 mm base plate socket MUST instead have a Ø5.05 mm outside/lower bore for 2.0 mm followed by a Ø4.05 mm shaft opening for 1.0 mm. In both modes, the diameter change MUST be a fixed planar shoulder, not a long graduated lead-in, conical chamfer, or overlaid counterbore. A Ø4 mm shaft inserted from the interior MUST pass through the Ø4.05 mm and Ø5.05 mm openings, while a Ø7 mm flange MUST be stopped by the shoulder-side Ø4.05 mm opening. The four nominal corner locations MUST be geometrically de-duplicated when a half-cell axis would otherwise cause overlapping Ø5 mm sockets, without removing the corresponding nominal grid position in full-hole mode. Runtime generation MUST realize these interfaces from the declared OpenGrid geometry contract and MUST NOT require a Snap STEP reference to be downloaded, loaded, or parsed. The bundled dedicated Snap reference MUST be validated separately during integration or CI testing.

#### Scenario: Full-cell base mounting

- **WHEN** a full-cell or multi-cell box is aligned with the supplied OpenGrid Snap base interface, cornerBottomHoles is true, and fullBottomHoleGrid is false
- **THEN** its four external corner sockets MUST align with the corresponding nominal 7 mm-offset Ø5 mm Snap positions
- **AND** the fixed 5 mm bottom assembly MUST remain closed between those sockets
- **AND** the socket MUST retain the fixed two-stage Ø5.05-to-Ø4.05 bore profile through the 5 mm bottom assembly

#### Scenario: Full grid preserves corner Snap mounting

- **WHEN** a full-cell or multi-cell box is generated with both cornerBottomHoles and fullBottomHoleGrid set to true
- **THEN** the four outermost grid positions MUST use the special corner Snap socket profile
- **AND** the special sockets MUST retain their Ø4.05 mm shoulder-side openings, planar shoulders, and Ø7 mm flange-stop behavior
- **AND** enabling the full grid MUST NOT remove, resize, or replace the four corner Snap interfaces with ordinary holes

#### Scenario: Full grid without corner Snap mounting

- **WHEN** a full-cell or multi-cell box is generated with cornerBottomHoles set to false and fullBottomHoleGrid set to true
- **THEN** the ordinary nominal grid holes MUST be present
- **AND** no captive corner Snap socket MUST be generated

#### Scenario: Fixed two-stage mounting-hole profile

- **WHEN** a special corner mounting socket is generated for any accepted box footprint
- **THEN** its base-facing opening MUST measure Ø5.05 mm within the geometry tolerance
- **AND** its lower bore MUST extend 3.0 mm through the floor within the geometry tolerance
- **AND** its shoulder-side opening MUST measure Ø4.05 mm and extend 2.0 mm toward the interior
- **AND** the diameter change MUST be a single fixed planar shoulder rather than a long graduated taper or conical transition

#### Scenario: Captive flanged cylinder

- **WHEN** a Ø4 mm shaft with a Ø7 mm × 0.8 mm flange is inserted through a special corner mounting socket from inside the box
- **THEN** the Ø4 mm shaft MUST pass through the Ø4.05 mm shoulder-side opening and the Ø5.05 mm lower bore
- **AND** the Ø7 mm flange MUST be stopped by the shoulder-side Ø4.05 mm opening
- **AND** the fixture shaft length MUST equal the active bottom thickness plus 1 mm, giving 4 mm for a 3 mm floor and 6 mm for a 5 mm floor
- **AND** the fixture MUST prevent the shaft from falling through the outside of the box while preserving the declared exterior allowance

#### Scenario: Half-cell socket layout

- **WHEN** a half-cell dimension would place two nominal corner sockets closer than the Ø5 mm interface can physically allow
- **THEN** coincident or overlapping special socket locations MUST be emitted as one valid retaining socket
- **AND** the geometry MUST remain watertight and free of overlapping cutters
- **AND** the model MUST preserve the valid half-cell footprint instead of silently changing its dimensions

#### Scenario: Snap reference compatibility is checked in test/CI

- **WHEN** the test/CI suite validates the bundled module-relative opengrid-bare-lite-snap.step reference against the generated nominal Ø5 mm mounting interface within the declared fit tolerance
- **THEN** a compatible reference MUST pass the dedicated mating-interface validation
- **AND** an incompatible, malformed, or insufficient reference MUST fail with a diagnosable mating-interface error
- **AND** a reference mismatch MUST NOT cause the normal Stackable Box runtime model build to scale or move the box footprint

#### Scenario: Snap reference mismatch

- **WHEN** the bundled module-relative opengrid-bare-lite-snap.step reference cannot be reconciled with the generated nominal Ø5 mm mounting interface within the declared fit tolerance
- **THEN** geometry validation MUST report a diagnosable mating-interface failure
- **AND** the normal kernel model build path MUST NOT silently scale or move the box footprint to hide the mismatch

#### Scenario: Runtime generation without a Snap reference

- **WHEN** valid opengrid-stackable-box parameters are sent to the runtime model builder while the Snap reference loader is unavailable
- **THEN** the builder MUST still produce a valid non-empty Stackable Box B-Rep when the declared parameter and geometry contracts are valid
- **AND** the runtime MUST NOT download, load, parse, or validate a Snap STEP reference as part of that build

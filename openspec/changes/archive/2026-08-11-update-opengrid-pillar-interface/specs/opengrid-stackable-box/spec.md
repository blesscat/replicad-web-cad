## MODIFIED Requirements

### Requirement: OpenGrid Snap base mounting sockets

The box MUST retain the existing fixed 5 mm bottom assembly in normal mode and the existing 3 mm clipped base plate in base-plate mode. In thin-shell mode it MUST use a fixed 2 mm flat bottom. When `cornerBottomHoles` is `true`, it MUST provide nominal Ø5 mm base-mounting sockets at the external corner positions used by the OpenGrid Snap interface. When `cornerBottomHoles` is `false`, it MUST NOT cut those special Snap sockets. When `fullBottomHoleGrid` is `true`, the box MUST additionally provide the ordinary holes defined by the optional nominal OpenGrid bottom hole grid requirement; the ordinary grid holes MUST remain available even when `cornerBottomHoles` is `false`. For a full-cell axis with corner sockets enabled, the four special socket centers MUST occupy the outermost positions of the nominal 14 mm hole grid, 7 mm from the corresponding pre-clearance nominal box footprint edge.

In normal mode, each special socket MUST have a Ø4.55 mm base-facing bore through the lower/outside 3.0 mm of the fixed bottom assembly followed by a Ø7.05 mm bore through the upper/interior 2.0 mm toward the box interior. In base-plate mode, each retained socket MUST have a Ø4.55 mm outside/lower bore for 2.0 mm followed by a Ø7.05 mm inside/upper retaining seat for 1.0 mm. In thin-shell mode, each retained socket MUST have a Ø4.55 mm outside/lower bore for 1.0 mm followed by a Ø7.05 mm inside/upper retaining seat for 1.0 mm. In every mode, the diameter change MUST be a fixed planar retaining shoulder, not a long graduated lead-in, conical chamfer, or overlaid counterbore.

The Ø7.05 mm upper opening MUST serve as the retaining seat for a Ø4.5 mm shaft with a Ø7 mm flange. After insertion from inside the box, the flange MUST be retained by the planar shoulder above the Ø4.55 mm lower passage and its upper surface MUST be flush with the selected mode's interior floor. The compatibility fixture shaft length MUST equal the selected active bottom thickness plus the existing 1 mm exterior allowance; the fixture flange MUST remain Ø7 mm × 0.8 mm. Separate nominal Ø5 mm Snap-reference exposure rules MUST remain unchanged. The four nominal corner locations MUST be geometrically de-duplicated when a half-cell axis would otherwise cause overlapping Ø5 mm sockets, without removing the corresponding nominal grid position in full-hole mode. Runtime generation MUST realize these interfaces from the declared OpenGrid geometry contract and MUST NOT require a Snap STEP reference to be downloaded, loaded, or parsed. The bundled dedicated Snap reference MUST be validated separately during integration or CI testing.

#### Scenario: Full-cell base mounting

- **WHEN** a full-cell or multi-cell box is aligned with the supplied OpenGrid Snap base interface and `cornerBottomHoles=true`
- **THEN** its external corner sockets MUST align with the corresponding nominal 7 mm-offset Ø5 mm Snap positions
- **AND** the selected mode MUST retain its declared fixed bottom thickness between those sockets
- **AND** the socket MUST retain the selected mode's fixed Ø4.55-to-Ø7.05 two-stage bore profile

#### Scenario: Full grid preserves corner Snap mounting

- **WHEN** a full-cell or multi-cell box is generated with both `cornerBottomHoles` and `fullBottomHoleGrid` set to `true`
- **THEN** the four outermost grid positions MUST use the special corner Snap socket profile for the selected mode
- **AND** the special sockets MUST retain their Ø7.05 mm upper seats and captive-cylinder behavior
- **AND** enabling the full grid MUST NOT remove, resize, or replace the four corner Snap interfaces with ordinary holes

#### Scenario: Full grid without corner Snap mounting

- **WHEN** a full-cell or multi-cell box is generated with `cornerBottomHoles=false` and `fullBottomHoleGrid=true`
- **THEN** the ordinary nominal grid holes MUST be present
- **AND** no captive corner Snap socket MUST be generated

#### Scenario: Fixed two-stage mounting-hole profile

- **WHEN** a special corner mounting socket is generated in normal, base-plate, or thin-shell mode
- **THEN** its base-facing opening MUST measure Ø4.55 mm within the geometry tolerance
- **AND** its lower bore MUST extend 3.0 mm in normal mode, 2.0 mm in base-plate mode, or 1.0 mm in thin-shell mode
- **AND** its upper opening MUST measure Ø7.05 mm and extend 2.0 mm in normal mode or 1.0 mm in base-plate and thin-shell modes toward the interior
- **AND** the diameter change MUST be a single fixed planar shoulder rather than a long graduated taper or conical transition

#### Scenario: Captive flanged cylinder

- **WHEN** a Ø4.5 mm shaft with a Ø7 mm flange is inserted through a special corner mounting socket from inside the box
- **THEN** the Ø4.5 mm shaft MUST pass through both the Ø7.05 mm upper seat and the Ø4.55 mm lower passage
- **AND** the Ø7 mm flange MUST be retained above the planar shoulder and MUST NOT fall through the Ø4.55 mm lower passage
- **AND** the flange MUST be flush with the selected mode's interior floor
- **AND** the fixture shaft length MUST equal the active bottom thickness plus 1 mm while the separate nominal Ø5 mm Snap-reference exposure contract remains unchanged

#### Scenario: Half-cell socket layout

- **WHEN** a half-cell dimension would place two nominal corner sockets closer than the Ø5 mm interface can physically allow
- **THEN** coincident or overlapping special socket locations MUST be emitted as one valid retaining socket
- **AND** the geometry MUST remain watertight and free of overlapping cutters
- **AND** the model MUST preserve the valid half-cell footprint instead of silently changing its dimensions

#### Scenario: Snap reference compatibility is checked in test/CI

- **WHEN** the test/CI suite validates the bundled module-relative `opengrid-bare-lite-snap.step` reference against the generated nominal Ø5 mm mounting interface within the declared fit tolerance
- **THEN** a compatible reference MUST pass the dedicated mating-interface validation
- **AND** an incompatible, malformed, or insufficient reference MUST fail with a diagnosable mating-interface error
- **AND** a reference mismatch MUST NOT cause any stackable-box runtime mode to scale or move the box footprint

#### Scenario: Snap reference mismatch

- **WHEN** the bundled module-relative `opengrid-bare-lite-snap.step` reference cannot be reconciled with the generated nominal Ø5 mm mounting interface within the declared fit tolerance
- **THEN** geometry validation MUST report a diagnosable mating-interface failure
- **AND** the normal kernel model build path MUST NOT silently scale or move the box footprint to hide the mismatch

#### Scenario: Runtime generation without a Snap reference

- **WHEN** valid `opengrid-stackable-box` parameters are sent to the runtime model builder while the Snap reference loader is unavailable
- **THEN** the builder MUST still produce a valid non-empty B-Rep for normal, base-plate, and thin-shell modes when the declared parameter and geometry contracts are valid
- **AND** the runtime MUST NOT download, load, parse, or validate a Snap STEP reference as part of that build

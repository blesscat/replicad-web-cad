## MODIFIED Requirements

### Requirement: Grid pitch and feature dimensions are separate

The OpenGrid contract MUST keep the 28 mm grid pitch and 14 mm half-pitch independent from the component feature dimensions. The shared nominal locating diameter MUST be 5 mm. The ordinary grid assembly opening MUST remain 5.05 mm, while the lower connection opening used by the special box/cylinder sockets MUST be exactly 5 mm. The retaining opening MUST remain 7.05 mm, and the quality-test shaft MUST be exactly 5 mm with the existing Ø7 mm × 0.8 mm flange. Changing the locating diameter or lower connection opening MUST NOT silently change the official grid pitch or ordinary assembly opening.

#### Scenario: Shared contract exposes confirmed dimensions

- **WHEN** a component reads the shared OpenGrid locating contract
- **THEN** nominalDiameter MUST equal 5 mm
- **AND** shaftOpeningDiameter MUST equal 5 mm
- **AND** testShaftDiameter MUST equal 5 mm
- **AND** retainingOpeningDiameter MUST equal 7.05 mm
- **AND** testFlangeDiameter MUST equal 7 mm
- **AND** testFlangeHeight MUST equal 0.8 mm

#### Scenario: Ordinary grid opening keeps its clearance

- **WHEN** a component requests an ordinary grid assembly opening
- **THEN** assemblyOpeningDiameter MUST equal 5.05 mm
- **AND** it MUST remain distinct from the exact 5 mm lower connection opening

#### Scenario: Official grid pitch remains stable

- **WHEN** the locating dimensions are consumed by a box or cylinder generator
- **THEN** the 28 mm grid pitch and 14 mm half-pitch MUST remain unchanged
- **AND** the lower special opening MUST be 5 mm without changing the ordinary grid-hole layout

#### Scenario: Fixture contract matches generated sockets

- **WHEN** a quality fixture is generated for a box or cylinder
- **THEN** its shaft MUST be Ø5 mm
- **AND** its flange MUST remain Ø7 mm × 0.8 mm
- **AND** the fixture MUST be suitable for the corresponding 5 mm lower connection opening

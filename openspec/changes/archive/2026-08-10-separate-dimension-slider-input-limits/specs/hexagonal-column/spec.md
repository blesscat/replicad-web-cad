## MODIFIED Requirements

### Requirement: Hexagonal-column height control

The existing `hexagonal-column` component MUST remain independently registered with the same model ID, route, geometry profile, orientation behavior, count domain, gap domain, filenames, and 500 mm row-envelope safety check. Its `height` parameter MUST be an integer in the inclusive range 1–500 mm. The catalog MUST expose `height` as a 1–200 mm slider and a 1–500 mm text input. `gap` MUST remain a 1–10 mm slider with a 1–99 mm text-input range.

#### Scenario: Maximum manual height is valid

- **WHEN** a valid hexagonal-column snapshot has `height=500`, `count=1`, and `gap=99`
- **THEN** validation MUST accept the snapshot
- **AND** the height text input MUST retain `500`
- **AND** the height slider MUST expose a maximum of `200`

#### Scenario: Height above the manual maximum is rejected

- **WHEN** a hexagonal-column snapshot has `height=501`
- **THEN** validation MUST reject the snapshot before CAD generation
- **AND** the existing 500 mm row-envelope validation MUST remain independent of the height control range

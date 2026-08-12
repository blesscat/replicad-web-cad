## MODIFIED Requirements

### Requirement: Grid pitch 與元件特徵尺寸必須分開

The system MUST keep feature-specific dimensions separate from the official OpenGrid grid contract. Hole diameters, locating-hole centers, geometry clearances, edge offsets, and assembly-interface dimensions MUST retain their owning semantics and MUST NOT be reinterpreted as the shared full or half pitch merely because they are numeric multiples or fractions of 28 mm. Shared locating and assembly dimensions MUST resolve from the dedicated OpenGrid locating and assembly interface contract.

#### Scenario: 孔徑不因 grid contract 改變

- **WHEN** an OpenGrid component generates its bottom or locating holes after the shared grid contract and locating-interface contract are applied
- **THEN** nominal locating consumers MUST remain Ø5 mm or radius 2.5 mm as appropriate
- **AND** assembly openings MUST remain Ø5.05 mm
- **AND** shaft openings MUST remain Ø4.55 mm and retaining openings MUST remain Ø7.05 mm
- **AND** hole placement grids or offsets MUST continue to follow their owning component contract

#### Scenario: Ordinary and stopped holes retain different profiles

- **WHEN** a Stackable Box generates ordinary bottom-grid holes and special corner sockets
- **THEN** ordinary bottom-grid holes MUST remain straight Ø5.05 mm holes
- **AND** special corner sockets MUST use the Ø4.55 mm lower opening and Ø7.05 mm shoulder-side retaining opening
- **AND** the grid contract MUST NOT cause either profile to use 28 mm or 14 mm as a hole diameter

#### Scenario: 元件專用偏移不被升格為半格

- **WHEN** a box, Snap, or other OpenGrid component uses a 7 mm locating center, edge offset, or clearance
- **THEN** that value MUST remain a named feature-specific dimension
- **AND** changing or consuming the official half pitch MUST NOT silently rescale that feature

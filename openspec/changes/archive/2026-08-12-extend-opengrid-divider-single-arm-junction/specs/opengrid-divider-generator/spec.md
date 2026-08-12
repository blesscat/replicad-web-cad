## ADDED Requirements

### Requirement: 單臂中心定位柱上方延續牆體

When exactly one of `left`, `right`, `up`, or `down` is non-zero, the generated
divider MUST extend its complete profiled wall from the central arm axis
2.5 mm toward the inactive side. This extension MUST include the 5 mm base
support, any 45-degree transition, and the selected upper wall, so the central
5 mm locating peg has wall directly above its center rather than only on the
active side. The active arm endpoint MUST remain at the existing retracted
station, and the result MUST remain one connected solid.

#### Scenario: 四個方向的單臂中心牆體

- **WHEN** exactly one directional count is non-zero, for any of the four
  directions
- **THEN** the complete wall profile MUST cover the central arm axis and extend
  2.5 mm toward the inactive side
- **AND** the central locating peg MUST have divider wall above its center
- **AND** the active endpoint MUST retain the existing 2.275 mm retraction

#### Scenario: 多臂中心接點維持原狀

- **WHEN** two or more directional counts are non-zero
- **THEN** the central junction MUST use the existing multi-arm wall geometry
- **AND** no single-arm-only 2.5 mm extension MAY be added to an inactive side

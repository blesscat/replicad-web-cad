## MODIFIED Requirements

### Requirement: Per-component parameter state

The system MUST maintain a runtime parameter state entry keyed by the selected component's stable `modelId`. Each entry MUST contain only typed values accepted by that component's parameter validation contract, and values for one component MUST NOT replace or merge into another component's entry. OpenGrid's entry MUST include its variant, rows, columns, screw kind, screw mode, normalized custom screw-position set, and connector-hole mode.

#### Scenario: Component parameter entries are isolated

- **WHEN** a user changes parameters for `box`, `modular-grid-base`, `hsw-cell`, or `opengrid`
- **THEN** the runtime parameter state MUST update only the entry for that component's `modelId`
- **AND** navigating to another component MUST expose that component's own parameters
- **AND** the two grid components MUST remain independent even though both use `rows` and `columns`
- **AND** OpenGrid's custom screw matrix MUST NOT be merged into another component's state

#### Scenario: OpenGrid configuration is typed and complete

- **WHEN** a valid OpenGrid snapshot is accepted for persistence
- **THEN** its rows and columns MUST be numbers, its variant/modes/kind MUST be supported enum values, and its custom positions MUST be a normalized structured list
- **AND** raw input strings, duplicate positions, and invalid partial snapshots MUST NOT be persisted

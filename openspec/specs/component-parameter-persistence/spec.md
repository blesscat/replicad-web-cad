## Purpose

讓每個已註冊 CAD component 的有效參數在同一個瀏覽器與網站 origin 中跨 workspace 初始化保留，同時在沒有可用保存資料時安全地回到 component 預設值。

## Requirements

### Requirement: Per-component parameter state

The system MUST maintain a runtime parameter state entry keyed by the selected component's stable `modelId`. Each entry MUST contain only typed values accepted by that component's parameter validation contract, and values for one component MUST NOT replace or merge into another component's entry.

#### Scenario: Component parameter entries are isolated

- **WHEN** a user changes parameters for `box`, `modular-grid-base`, or `hsw-cell`
- **THEN** the runtime parameter state MUST update only the entry for that component's `modelId`
- **AND** navigating to another component MUST expose that component's own parameters
- **AND** the two grid components MUST remain independent even though both use `rows` and `columns`

### Requirement: Restore valid saved parameters

The system MUST read the versioned browser-persisted parameter record when a model-specific CAD workspace initializes. For the selected `modelId`, a present entry MUST be parsed and validated against the current component definition before it is used; a missing, malformed, or invalid entry MUST fall back to that definition's default parameters.

#### Scenario: First visit uses component defaults

- **GIVEN** no persisted parameter entry exists for the selected component
- **WHEN** the CAD workspace initializes
- **THEN** the parameter controls and generation input MUST use the component definition's default parameters

#### Scenario: Valid saved values are restored

- **GIVEN** a persisted entry for the selected component contains valid values for the current parameter schema
- **WHEN** the CAD workspace initializes
- **THEN** the parameter controls MUST display the persisted values
- **AND** the first generation MUST use those values

#### Scenario: Invalid saved values fall back safely

- **GIVEN** a persisted entry is malformed, has an unknown parameter shape, or fails the current component validation rules
- **WHEN** the CAD workspace initializes
- **THEN** the selected component MUST use its definition's default parameters
- **AND** the invalid entry MUST NOT be sent to the CAD Worker
- **AND** initialization MUST continue without a persistence error being shown as a CAD failure

### Requirement: Persist accepted parameter updates

The system MUST update the runtime parameter state and browser persistence when a component parameter snapshot passes the existing component-specific validation. Persistence MUST contain typed accepted values rather than raw input strings. An invalid or incomplete raw input MUST NOT overwrite the last accepted persisted values.

#### Scenario: Valid input is persisted

- **GIVEN** a user changes a component parameter to a valid value
- **WHEN** the complete snapshot passes component validation
- **THEN** the runtime parameter entry for that component MUST be updated
- **AND** the typed values MUST be written to the versioned browser persistence record

#### Scenario: Invalid input does not overwrite saved values

- **GIVEN** a component has a previously accepted persisted parameter snapshot
- **WHEN** the user enters an empty, fractional, non-finite, or out-of-range value
- **THEN** the existing invalid-input behavior MUST remain in effect
- **AND** the previous accepted persisted snapshot MUST remain unchanged

### Requirement: Persistence failures do not block CAD

The system MUST treat browser persistence as an optional enhancement. If browser storage is unavailable or a read/parse operation fails during initialization, the workspace MUST use the selected component's definition defaults for any unavailable saved entry. If a write operation fails after a valid update, the runtime MUST retain the accepted values in memory. In either case, the storage failure MUST NOT prevent CAD generation, preview, or export and MUST NOT be reported as a CAD Worker or model error.

#### Scenario: Storage is unavailable during initialization

- **GIVEN** browser storage cannot be accessed while the workspace initializes
- **WHEN** the selected component starts
- **THEN** the workspace MUST use the component's default parameters
- **AND** CAD initialization and generation MUST continue normally

#### Scenario: Storage write fails after valid input

- **GIVEN** a valid parameter update is accepted
- **WHEN** browser storage rejects the persistence write
- **THEN** the runtime parameter state MUST still retain the accepted values
- **AND** CAD generation MUST continue without treating the storage failure as a Worker or model error

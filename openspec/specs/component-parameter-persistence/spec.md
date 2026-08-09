## Purpose

讓每個已註冊 CAD component 的有效參數在同一個瀏覽器與網站 origin 中跨 workspace 初始化保留，同時在沒有可用保存資料時安全地回到 component 預設值。

## Requirements

### Requirement: Per-component parameter state

The system MUST maintain a runtime parameter state entry keyed by the selected component's stable `modelId`. Each entry MUST contain only typed values accepted by that component's parameter validation contract, and values for one component MUST NOT replace or merge into another component's entry.

#### Scenario: Component parameter entries are isolated

- **WHEN** a user changes parameters for `box`, `box-normal`, `modular-grid-base`, `hsw-cell`, or `hexagonal-column`
- **THEN** the runtime parameter state MUST update only the entry for that component's `modelId`
- **AND** navigating to another component MUST expose that component's own parameters
- **AND** the two grid components MUST remain independent even though both use `rows` and `columns`

### Requirement: box-normal parameters are persisted independently

The existing versioned browser persistence MUST store valid `box-normal` parameters under the stable `box-normal` model id. The persisted entry MUST contain typed integer `x`, `y`, and `height` values plus typed boolean `cornerPosts`; it MUST NOT merge with the entries for `box`, `modular-grid-base`, `hsw-cell`, or `hexagonal-column`.

#### Scenario: Restore saved box-normal parameters

- **GIVEN** browser localStorage contains a valid `box-normal` entry
- **WHEN** the user opens `/cad/box-normal`
- **THEN** the controls MUST display the saved X/Y/height values and checkbox state
- **AND** the first generation MUST use those typed values

#### Scenario: Persist a valid box-normal update

- **GIVEN** a box-normal parameter snapshot passes component validation
- **WHEN** the workspace accepts the update
- **THEN** localStorage MUST update only the `box-normal` entry
- **AND** the stored values MUST be typed values rather than raw input strings

#### Scenario: Invalid box-normal input does not overwrite persistence

- **GIVEN** a previously accepted box-normal snapshot exists in localStorage
- **WHEN** the user enters an invalid or incomplete box-normal value
- **THEN** the previous accepted `box-normal` entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker

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

### Requirement: OpenGrid Snap parameters are persisted independently

The versioned browser persistence MUST store valid Snap parameters under the stable `opengrid-snap` model id. The entry MUST contain only typed `variant` and `offset` values accepted by the Snap validator, and it MUST remain independent from the existing `opengrid` board entry.

#### Scenario: Restore saved Snap parameters

- **GIVEN** browser persistence contains a valid `opengrid-snap` entry
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the control MUST display the saved variant and shared total X/Y offset
- **AND** the first generation MUST use those typed values

#### Scenario: Persist a valid Snap update

- **GIVEN** a Snap parameter snapshot passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-snap` entry
- **AND** the stored values MUST be typed values rather than raw input strings

#### Scenario: Invalid Snap input does not overwrite persistence

- **GIVEN** a previously accepted Snap snapshot exists in persistence
- **WHEN** the user enters an invalid or incomplete variant or offset
- **THEN** the previous accepted `opengrid-snap` entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

### Requirement: Invalid or legacy Snap persistence falls back safely

The persistence reader MUST reject malformed Snap entries, entries with board OpenGrid fields, and entries with unsupported variants or offsets. When such an entry is found, the Snap workspace MUST use its definition defaults without affecting the existing `opengrid` board entry or other model entries.

#### Scenario: Legacy board entry is not reused for Snap

- **GIVEN** persistence contains an `opengrid` board snapshot but no valid `opengrid-snap` snapshot
- **WHEN** the user opens `/cad/opengrid-snap`
- **THEN** the workspace MUST use the Snap defaults
- **AND** it MUST NOT merge board rows, screws, connectors, or variant values into the Snap snapshot

#### Scenario: Malformed Snap entry falls back

- **GIVEN** the stored `opengrid-snap` entry fails the current validator
- **WHEN** the Snap workspace initializes
- **THEN** it MUST use the Snap definition defaults
- **AND** initialization MUST continue without a CAD failure

### Requirement: Stackable-box parameters are persisted independently

The versioned browser persistence MUST store valid `opengrid-stackable-box` parameters under that stable model id. The entry MUST contain typed `x`, `y`, and `height` values accepted by the stackable-box validator, plus typed boolean `fullBottomHoleGrid`, and MUST remain independent from both `opengrid` board parameters and `box-normal` parameters. When an older persisted stackable-box entry does not contain `fullBottomHoleGrid`, the workspace MUST interpret the missing field as `false` for backward compatibility. Invalid or incomplete stackable-box input MUST NOT overwrite the last accepted entry.

#### Scenario: Restore saved stackable-box parameters

- **GIVEN** browser persistence contains a valid `opengrid-stackable-box` entry
- **WHEN** the user opens `/cad/opengrid-stackable-box`
- **THEN** the controls MUST display the saved typed X/Y/height values and full-hole mode state
- **AND** the first generation MUST use those values

#### Scenario: Restore a legacy stackable-box entry

- **GIVEN** browser persistence contains a valid stackable-box entry created before `fullBottomHoleGrid` existed
- **WHEN** the user opens `/cad/opengrid-stackable-box`
- **THEN** the workspace MUST restore the saved typed X/Y/height values
- **AND** it MUST use `fullBottomHoleGrid=false`
- **AND** it MUST NOT reject the entry only because the new field is absent

#### Scenario: Persist a valid stackable-box update

- **GIVEN** a stackable-box snapshot passes its component validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `opengrid-stackable-box` entry
- **AND** half-cell values MUST remain typed numeric values without rounding
- **AND** `fullBottomHoleGrid` MUST remain a typed boolean

#### Scenario: Invalid stackable-box input does not overwrite persistence

- **GIVEN** a previously accepted stackable-box snapshot exists
- **WHEN** the user enters an invalid, incomplete, or out-of-range X/Y/height value, or a non-boolean full-hole mode value is supplied
- **THEN** the previous accepted stackable-box entry MUST remain unchanged
- **AND** the invalid snapshot MUST NOT be used for initialization or sent to the Worker

## ADDED Requirements

### Requirement: OpenGrid 分隔器參數獨立保存

The versioned browser-local parameter record MUST store valid `opengrid-divider` snapshots under the stable `opengrid-divider` model id. The entry MUST contain typed `left`, `right`, `up`, `down`, and `height` values and MUST remain isolated from both `opengrid` and `opengrid-stackable-box` entries.

#### Scenario: 恢復分隔器參數

- **GIVEN** browser persistence contains a valid `opengrid-divider` entry
- **WHEN** the user opens `/cad/opengrid-divider`
- **THEN** the controls MUST display the saved directional counts and height
- **AND** the first generation MUST use those validated typed values

#### Scenario: 保存合法更新

- **WHEN** a divider snapshot passes component validation
- **THEN** only the `opengrid-divider` persistence entry MUST be updated
- **AND** raw input strings, derived labels, and invalid partial values MUST NOT be persisted

#### Scenario: 無效保存值安全回退

- **GIVEN** the stored divider entry is malformed, has an unknown shape, or fails current validation
- **WHEN** the divider workspace initializes
- **THEN** it MUST use the divider definition defaults
- **AND** it MUST NOT send the invalid snapshot to the Worker
- **AND** existing entries for other components MUST remain unchanged

### Requirement: Pillar parameters are persisted independently

The versioned browser persistence MUST store valid pillar parameters under the stable `pillar` model id. Each entry MUST contain only typed integer `length` and typed boolean `baseConnection` values accepted by the pillar validator. The pillar entry MUST remain independent from every other component's parameter entry.

#### Scenario: Restore saved pillar parameters

- **GIVEN** browser persistence contains `{ length: 12, baseConnection: true }` under `pillar`
- **WHEN** the user opens `/cad/pillar`
- **THEN** the controls MUST display 12 mm and a checked `連接底版用` checkbox
- **AND** the first generation MUST use those typed values

#### Scenario: Persist a valid pillar update

- **GIVEN** a pillar snapshot passes validation
- **WHEN** the workspace accepts the update
- **THEN** persistence MUST update only the `pillar` entry
- **AND** the stored values MUST remain typed values rather than raw input strings

#### Scenario: Invalid pillar input does not overwrite persistence

- **GIVEN** a previously accepted pillar snapshot exists in persistence
- **WHEN** the user enters an empty, fractional, non-finite, out-of-range, or invalid boolean value
- **THEN** the previous accepted `pillar` entry MUST remain unchanged
- **AND** the invalid value MUST NOT be sent to the Worker as `model.generate`

#### Scenario: Missing or malformed pillar entry falls back safely

- **GIVEN** the persisted `pillar` entry is missing, malformed, or fails the current validator
- **WHEN** the pillar workspace initializes
- **THEN** it MUST use `{ length: 5, baseConnection: false }`
- **AND** the invalid entry MUST NOT be sent to the Worker
- **AND** initialization MUST continue without treating persistence failure as a CAD failure

## ADDED Requirements

### Requirement: Component-specific behavior has a single normative owner

The generic CAD workspace specification MUST own only lifecycle behavior that is
shared by every runtime-validated catalog component. Route-specific controls,
component parameter ranges, component builder dispatch, component-specific preview
invariants, and component-specific export metadata MUST be normatively defined in
the corresponding component capability specification.

#### Scenario: A component contract changes

- **WHEN** a future change modifies a component route, control, validator, builder,
  preview, or export rule
- **THEN** the corresponding component capability spec MUST be updated
- **AND** `cad-workspace` MUST remain unchanged unless the shared lifecycle changes

#### Scenario: Shared lifecycle applies to every component

- **WHEN** any registered catalog component is initialized, generated, committed,
  invalidated, previewed, or exported
- **THEN** the generic lifecycle in `cad-workspace` MUST apply
- **AND** the component capability spec MUST provide the component-specific inputs
  and acceptance criteria

#### Scenario: Existing identities remain compatible

- **WHEN** the ownership refactor is applied
- **THEN** existing model IDs, OpenGrid build keys, route slugs, persistence keys,
  and export filename formats MUST remain unchanged

## MODIFIED Requirements

### Requirement: 參數驗證與 generation

The workspace MUST ask the selected component definition to validate every
parameter snapshot before sending a model request to the Worker. Every snapshot,
including an invalid snapshot, MUST receive a new generation. A valid snapshot
MUST send `model.generate` only after all fields stop changing for 150 ms; an
invalid snapshot MUST send `model.invalidate`, show the component-defined
diagnostic, and keep export disabled. Component-specific ranges, bounds, and
normalization rules MUST be owned by the corresponding catalog or component
capability specification.

#### Scenario: Valid component snapshot generates after debounce

- **WHEN** a selected component snapshot passes its owning validator and all fields stop changing for 150 ms
- **THEN** the workspace MUST send a `model.generate` request with a generation greater than the previous snapshot
- **AND** the Worker request MUST retain the selected stable `modelId`
- **AND** the component-specific capability MUST define the accepted parameters and bounds

#### Scenario: Invalid component snapshot is invalidated

- **WHEN** a snapshot is empty, non-finite, out of range, mismatched, or otherwise rejected by its owning validator
- **THEN** the workspace MUST show the component-defined diagnostic
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the invalid or stale generation

#### Scenario: Debounce keeps only the latest valid snapshot

- **WHEN** the user changes a parameter repeatedly within the 150 ms settling window
- **THEN** the workspace MUST assign generations to the snapshots
- **AND** it MUST send at most one `model.generate` for the latest valid settled snapshot
- **AND** intermediate snapshots MUST NOT each start CAD generation


### Requirement: Separate slider and manual-input limits

For a numeric field that exposes both a slider and a text input, the workspace
MUST treat the slider as a navigation aid rather than as the component's
validation contract. The owning catalog or component capability MUST define the
manual-input domain; a valid manual value above the slider's navigation maximum
MUST remain acceptable when that capability permits it. Fields with a smaller
existing domain MUST retain that domain, and text-only fields MUST use their
owner's manual-input rules.

#### Scenario: Slider and text input expose distinct limits

- **WHEN** a user views a numeric field whose component spec allows manual values beyond the slider range
- **THEN** the range input MUST expose the component-defined navigation maximum
- **AND** the text input MUST accept every valid value in the component-defined manual domain
- **AND** entering a valid value above the slider maximum MUST remain possible

#### Scenario: Smaller domains remain bounded

- **WHEN** a numeric control has an existing smaller domain
- **THEN** its slider and manual input MUST retain the component's declared limits
- **AND** the workspace MUST NOT create values outside that domain

#### Scenario: Planar workspace limits remain independent

- **WHEN** a component has separate planar and height/length limits
- **THEN** the component MUST validate each domain independently
- **AND** a valid height or length MUST NOT bypass an invalid planar footprint

### Requirement: STEP 匯出

The system MUST generate STEP from the selected component's pinned committed model
revision in the Worker and MUST never reconstruct STEP from the viewport mesh.
The selected catalog or component capability MUST supply the export metadata and
deterministic filename; the generic workspace MUST not hardcode a
component-specific filename.

#### Scenario: Component STEP 匯出成功

- **Given** workspace 為 ready，且指定 component model revision 仍存在
- **When** 使用者按下 STEP 下載
- **Then** UI 必須建立綁定該 component model revision 的 export request
- **And** Worker 必須由該 revision 的 B-Rep 產生非空 STEP bytes
- **And** 下載檔名 MUST come from the selected component capability

#### Scenario: STEP 匯出失敗

- **Given** Worker 無法由指定 component revision 產生 STEP
- **When** export operation 結束
- **Then** UI 必須顯示可理解錯誤
- **And** 不得產生空檔或宣稱下載成功

#### Scenario: 匯出期間 component 更新

- **Given** 使用者對 component revision R1 開始 STEP 匯出
- **When** 新的參數 snapshot 產生 revision R2
- **Then** R1 export MUST continue using R1's pinned revision
- **And** R2 MUST NOT 竄改進行中的 R1 export

#### Scenario: Prototype 瀏覽器範圍

- **When** 測試完整的初始化、component 建模、預覽與 STEP 匯出流程
- **Then** 測試 MUST use the selected component's documented export metadata
- **And** Worker MUST remain the only owner of B-Rep and STEP generation

#### Scenario: Export 尚未被接受

- **Given** 使用者對 component revision 發出 STEP export request，但 Worker 尚未接受該 request
- **When** request 尚未進入 accepted state
- **Then** UI MUST NOT report a successful download
- **And** export gate MUST remain tied to the accepted committed revision

### Requirement: Fine-grained Worker progress

The versioned Worker contract MUST allow `operation.progress` to carry optional
`completed`, `total`, and `unit` fields in addition to its existing stage
and operation-correlation fields. A component with logical assembly work MUST
report valid completed/total counts at cell or batch boundaries; stages without a
natural count MAY report only their stage. The UI MUST show the current stage
and, when counts are available, a determinate progress value without presenting
stale or unrelated operation progress.

#### Scenario: Component assembly reports completed work

- **GIVEN** the Worker is generating a component with measurable assembly work
- **WHEN** a logical cell or batch completes
- **THEN** it MUST emit `operation.progress` with the current operationId and generation
- **AND** completed MUST be a non-negative integer no greater than total
- **AND** total MUST be a positive integer representing the current assembly work
- **AND** the UI MUST update the visible progress indicator with the current stage and count

#### Scenario: Progress from an older generation is ignored

- **GIVEN** generation G2 is the latest input and G1 progress arrives after G2 starts
- **WHEN** the main thread handles the G1 progress event
- **THEN** it MUST ignore the event
- **AND** it MUST keep displaying G2 progress or its current status

### Requirement: 明確非目標

The system MUST expose the runtime-validated component catalog and the component
capabilities documented by this project, including their STEP and STL download
flows. It MAY preserve validated component parameter preferences in
browser-local persistence as defined by the component-parameter-persistence
capability, but MUST NOT add arbitrary CAD file import, 3MF/G-code workflows,
saving generated CAD files or models, authentication, collaboration, automatic
Bambu Studio launching, or native desktop-app integration.

#### Scenario: Prototype 功能清單

- **Given** 使用者查看 Prototype UI 與文件
- **When** 檢查模型與輸出功能
- **Then** 每個 catalog entry MUST expose only its own documented parameters, preview, and export actions
- **And** component parameter persistence MAY exist under the persistence capability
- **And** 不得出現 arbitrary import、3MF、G-code、generated CAD file/model saving、auth、collaboration、自動啟動 Bambu Studio 或 native desktop bridge 入口

## REMOVED Requirements

### Requirement: Prototype 方塊模型
**Reason**: Baseline catalog registration and route-locking are catalog concerns, not Worker lifecycle concerns.
**Migration**: Use `cad-component-catalog`.

### Requirement: OpenGrid board workspace integration
**Reason**: OpenGrid board controls and lifecycle are component-specific.
**Migration**: Use `opengrid-generator`.

### Requirement: OpenGrid board controls
**Reason**: OpenGrid board controls and lifecycle are component-specific.
**Migration**: Use `opengrid-generator`.

### Requirement: OpenGrid board persistence and stale preview
**Reason**: OpenGrid board controls and lifecycle are component-specific.
**Migration**: Use `opengrid-generator`.

### Requirement: HSW component catalog and route
**Reason**: HSW route and integration behavior belongs with the HSW capability.
**Migration**: Use `hsw-cell`.

### Requirement: HSW slider controls and contract validation
**Reason**: HSW route and integration behavior belongs with the HSW capability.
**Migration**: Use `hsw-cell`.

### Requirement: HSW Worker preview and revision contract
**Reason**: HSW route and integration behavior belongs with the HSW capability.
**Migration**: Use `hsw-cell`.

### Requirement: HSW STEP metadata
**Reason**: HSW route and integration behavior belongs with the HSW capability.
**Migration**: Use `hsw-cell`.

### Requirement: OpenGrid stackable-box workspace integration
**Reason**: Stackable-box integration is component-specific.
**Migration**: Use `opengrid-stackable-box`.

### Requirement: OpenGrid Snap workspace controls
**Reason**: Snap and half-cell controls are component-specific.
**Migration**: Use `opengrid-snap` or `opengrid-half-cell`.

### Requirement: OpenGrid half-cell workspace controls
**Reason**: Snap and half-cell controls are component-specific.
**Migration**: Use `opengrid-snap` or `opengrid-half-cell`.

### Requirement: OpenGrid Snap workspace lifecycle and preview
**Reason**: Snap and half-cell controls are component-specific.
**Migration**: Use `opengrid-snap` or `opengrid-half-cell`.

### Requirement: OpenGrid 分隔器 CAD workspace
**Reason**: Divider route and input lifecycle are component-specific.
**Migration**: Use `opengrid-divider-generator`.

### Requirement: 分隔器輸入生命週期
**Reason**: Divider route and input lifecycle are component-specific.
**Migration**: Use `opengrid-divider-generator`.

### Requirement: OpenGrid pillar workspace integration
**Reason**: Pillar route and controls are component-specific.
**Migration**: Use `opengrid-pillar-generator`.

### Requirement: OpenGrid locating model descriptions
**Reason**: The locating-seat description is shared by two OpenGrid products.
**Migration**: Use `opengrid-locating-assembly-interface`.

### Requirement: OpenGrid stackable-cylinder workspace integration
**Reason**: Stackable-cylinder integration is component-specific.
**Migration**: Use `opengrid-stackable-cylinder`.

### Requirement: Cylinder workspace lifecycle and export gates
**Reason**: Stackable-cylinder integration is component-specific.
**Migration**: Use `opengrid-stackable-cylinder`.

### Requirement: System context controls initial CAD generation
**Reason**: Context resolution and labels are system-entry behavior.
**Migration**: Use `opengrid-system-entry-context`.

### Requirement: System-aware restore defaults
**Reason**: Context-specific reset and presentation belong with system-entry semantics.
**Migration**: Use `opengrid-system-entry-context`.

### Requirement: Active system label on the CAD edit page
**Reason**: Context-specific reset and presentation belong with system-entry semantics.
**Migration**: Use `opengrid-system-entry-context`.

### Requirement: Open Shelf workspace integration
**Reason**: Open Shelf integration and raw input lifecycle are component-specific.
**Migration**: Use `opengrid-open-shelf`.

### Requirement: Open Shelf raw input validation follows the workspace lifecycle
**Reason**: Open Shelf integration and raw input lifecycle are component-specific.
**Migration**: Use `opengrid-open-shelf`.

### Requirement: Honeycomb render performance warning
**Reason**: This is a cross-component presentation rule, not a generic workspace lifecycle rule.
**Migration**: Use `cad-render-performance-warning`.

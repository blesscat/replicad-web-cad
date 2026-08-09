# cad-loading-layout Specification

## Purpose

本文件定義 CAD workspace 在 loading、模型生成與 responsive layout 狀態下的 viewport 邊界與可觀察行為，確保左側進度內容變動時不會拉伸或推移右側預覽區域。

## Requirements

### Requirement: CAD viewport loading layout stability

The system MUST keep the CAD viewport as a stable layout region while adjacent loading or generation content changes. The viewport frame, Canvas and no-mesh/WebGL fallback MUST use the same explicit height boundary, and the viewport MUST NOT stretch to match the changing height of the parameter panel.

#### Scenario: Loading progress appears in a desktop workspace

- **GIVEN** the CAD workspace is using its two-column layout and the CAD engine or model generation is loading
- **WHEN** the progress indicator appears or changes stage in the left parameter panel
- **THEN** the viewport's top position and height MUST remain unchanged
- **AND** the viewport MUST remain aligned to the top of its grid area
- **AND** the progress panel MUST remain readable without overlapping the viewport or its controls

#### Scenario: Viewport frame and rendering surface share a boundary

- **GIVEN** the viewport has no committed mesh, has a committed mesh, or is showing a stale preview
- **WHEN** the viewport renders its Canvas or its no-mesh/WebGL fallback
- **THEN** the outer viewport frame and rendering surface MUST use the same explicit height boundary
- **AND** model, dimension annotations and stale indicators MUST remain clipped within that frame

#### Scenario: Loading transitions to ready or error

- **GIVEN** a CAD operation transitions from loading or generating to ready, recoverable error, fatal worker error or stale preview
- **WHEN** the progress content is added, updated or removed
- **THEN** the viewport MUST NOT change size as a side effect of the adjacent panel content
- **AND** existing status, retry, export and stale-preview behavior MUST remain available according to the current state

#### Scenario: Responsive workspace keeps its layout boundary

- **GIVEN** the viewport is rendered at or below the existing `760px` breakpoint or above it
- **WHEN** loading progress is visible
- **THEN** the workspace MUST retain one column at or below the breakpoint and two columns above it
- **AND** the viewport MUST keep its explicit height in either layout without horizontal overflow caused by the progress content

### Requirement: Desktop CAD workspace contains parameter scrolling

The two-column CAD workspace above the existing `760px` breakpoint MUST keep the document within the visible viewport when a parameter panel is taller than the available desktop height. The parameter panel MUST own vertical overflow, and the CAD viewport MUST retain an independent explicit height and top alignment rather than stretching to the panel's intrinsic content height. The single-column layout at or below `760px` MUST remain allowed to scroll the document normally so stacked controls and the viewport are reachable.

#### Scenario: Wide OpenGrid page has no outer vertical overflow

- **WHEN** a user opens `/cad/opengrid` at a desktop viewport of 1600 × 1394 and the workspace is visible
- **THEN** the document's scroll height MUST be no greater than its client height
- **AND** the OpenGrid parameter panel MUST be visible with its own vertical overflow behavior
- **AND** the CAD viewport MUST remain visible beside the panel

#### Scenario: Long OpenGrid controls scroll inside the panel

- **WHEN** the OpenGrid parameter content is taller than the desktop panel's available height
- **THEN** the panel's scroll height MUST be greater than its client height
- **AND** the panel MUST expose vertical scrolling
- **AND** scrolling the panel MUST NOT change the viewport's document position

#### Scenario: Desktop viewport remains independently bounded

- **WHEN** the desktop workspace is rendered with a long or short parameter panel
- **THEN** the viewport's top position MUST remain aligned to the workspace row's top
- **AND** the viewport height MUST remain bounded by the desktop height budget and the existing 520 px cap
- **AND** the viewport MUST NOT stretch to match the panel's full content height

#### Scenario: Stacked layout retains normal document scrolling

- **WHEN** a user opens a CAD route at or below the existing 760 px breakpoint and the stacked workspace content is taller than the viewport
- **THEN** the document MUST remain scrollable so all controls and the viewport can be reached
- **AND** the desktop panel height cap MUST NOT hide or clip the stacked parameter content

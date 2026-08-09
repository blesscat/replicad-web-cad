## ADDED Requirements

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

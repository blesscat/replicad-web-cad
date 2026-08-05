## ADDED Requirements

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

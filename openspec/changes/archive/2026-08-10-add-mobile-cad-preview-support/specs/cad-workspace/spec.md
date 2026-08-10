## ADDED Requirements

### Requirement: Mobile CAD viewport touch interaction

At or below the existing `760px` responsive breakpoint, a CAD viewport with a committed model MUST support continuous touch interaction without requiring the user to lift their finger during a gesture. Touch handling MUST be scoped to the preview surface so normal page scrolling remains available outside the viewport.

#### Scenario: Continuous one-finger orbit on a mobile viewport

- **WHEN** a user touches a committed CAD preview at or below the `760px` breakpoint and drags with one finger without lifting it
- **THEN** the model orientation MUST continue updating for the full drag until the finger is released
- **AND** the gesture MUST NOT stop after a short movement or require a second touch to continue

#### Scenario: Preview touch handling is scoped to the preview surface

- **WHEN** a user starts a vertical scroll on mobile outside the CAD preview surface
- **THEN** the document MUST continue scrolling normally
- **AND** the preview interaction behavior MUST NOT lock or disable scrolling for the rest of the page

#### Scenario: Existing multi-touch viewport controls remain available

- **WHEN** a user performs the existing supported two-finger viewport gesture on a mobile preview
- **THEN** the viewport MUST continue to provide its existing zoom or pan behavior
- **AND** the mobile touch support MUST NOT replace or disable the existing viewport control mapping

#### Scenario: Desktop viewport interaction remains compatible

- **WHEN** a user operates the CAD preview above the `760px` breakpoint with the existing mouse orbit interaction
- **THEN** the model MUST remain rotatable through the existing desktop interaction
- **AND** the mobile touch support MUST NOT change model generation, camera framing, dimension annotations, or committed revision behavior

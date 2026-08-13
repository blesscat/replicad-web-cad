## ADDED Requirements

### Requirement: Thin-shell render performance warning

The CAD workspace MUST show a red, user-visible performance warning when the
thin-shell profile is selected in each existing OpenGrid stackable-box,
stackable-cylinder, and pillar parameter panel. The warning MUST use the exact
text `注意：薄殼模式會明顯降低模型渲染速度。建議先使用一般模式確認形狀，下載前再切換至薄殼模式。`
and MUST be placed with the selected thin-shell mode's explanatory content.
The warning MUST be informational only: it MUST NOT prevent mode selection,
preview generation, parameter persistence, or STEP/STL downloads.

#### Scenario: Stackable-box thin-shell warning

- **WHEN** a user selects `薄殼模式` in `/cad/opengrid-stackable-box`
- **THEN** the parameter panel MUST display the exact red warning text below
  the selected mode's description

#### Scenario: Stackable-cylinder thin-shell warning

- **WHEN** a user selects `薄殼模式` in `/cad/opengrid-stackable-cylinder`
- **THEN** the parameter panel MUST display the exact red warning text below
  the selected mode's description

#### Scenario: Pillar thin-shell warning

- **WHEN** a user selects `薄殼版` in `/cad/opengrid-pillar`
- **THEN** the parameter panel MUST display the exact red warning text with
  the selected thin-shell version details

#### Scenario: Warning follows the active profile

- **WHEN** a user switches from a thin-shell profile to a non-thin-shell
  profile in any of the three OpenGrid panels
- **THEN** the thin-shell performance warning MUST no longer be visible

#### Scenario: Warning does not block existing workflow

- **WHEN** the thin-shell performance warning is visible
- **THEN** the user MUST still be able to edit parameters, generate the
  preview, persist the selected profile, and request STEP or STL downloads

## Purpose

This capability defines the shared, user-visible performance warning for material-saving honeycomb modes across the OpenGrid components. It keeps that warning consistent without making it part of the generic CAD lifecycle.

## ADDED Requirements

### Requirement: Honeycomb render performance warning

The CAD workspace MUST show a red, user-visible performance warning when
`省料模式（六角鏤空）` is enabled in each existing OpenGrid stackable-box,
stackable-cylinder, and Open Shelf parameter panel. The warning MUST use the
exact text `注意：省料模式會明顯降低模型渲染速度。建議先使用一般模式確認形狀，下載前再啟用省料模式。`
and MUST be placed below the saving-mode checkbox. The warning MUST be
informational only: it MUST NOT prevent mode selection, preview generation,
parameter persistence, or STEP/STL downloads.

#### Scenario: Stackable-box honeycomb warning

- **WHEN** a user enables `省料模式（六角鏤空）` in `/cad/opengrid-stackable-box`
- **THEN** the parameter panel MUST display the exact red warning text below
  the saving-mode checkbox

#### Scenario: Stackable-cylinder honeycomb warning

- **WHEN** a user enables `省料模式（六角鏤空）` in `/cad/opengrid-stackable-cylinder`
- **THEN** the parameter panel MUST display the exact red warning text below
  the saving-mode checkbox

#### Scenario: Open Shelf honeycomb warning

- **WHEN** a user enables `省料模式（六角鏤空）` in `/cad/opengrid-open-shelf`
- **THEN** the parameter panel MUST display the exact red warning text below
  the saving-mode checkbox

#### Scenario: Warning follows the saving-mode checkbox

- **WHEN** a user disables `省料模式（六角鏤空）` in any of the three OpenGrid panels
- **THEN** the honeycomb performance warning MUST no longer be visible

#### Scenario: Warning does not block existing workflow

- **WHEN** the honeycomb performance warning is visible
- **THEN** the user MUST still be able to edit parameters, generate the
  preview, persist the selected profile, and request STEP or STL downloads

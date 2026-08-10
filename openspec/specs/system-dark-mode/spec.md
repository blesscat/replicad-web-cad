# system-dark-mode Specification

## Purpose

讓 Shape Shortcut 在 desktop 與 mobile 都能一致地跟隨使用者的系統／瀏覽器 dark preference，並讓網站 UI 與 CAD 3D viewport 維持可讀、可操作的對比。

## Requirements

### Requirement: Site appearance follows the system color scheme

The site MUST select its light or dark appearance from the user's active system or browser color-scheme preference. The selected appearance MUST apply consistently to the shared navigation, static Astro pages, CAD workspace panels, form controls, status messages, and viewport container without changing their existing information architecture or interaction behavior.

#### Scenario: Light preference keeps the existing light appearance

- **WHEN** the browser reports a light color scheme
- **THEN** the site MUST render the existing light palette across shared navigation, pages, panels, controls, and viewport container
- **AND** existing navigation, model selection, parameter editing, restore, validation, and export interactions MUST remain available

#### Scenario: Dark preference applies to the desktop workspace

- **WHEN** the browser reports a dark color scheme at a viewport wider than 760px
- **THEN** the shared navigation, page surfaces, parameter panel, controls, status messages, and viewport container MUST render using the dark palette
- **AND** the CAD workspace MUST remain a usable two-column layout with the existing desktop overflow and viewport boundaries

#### Scenario: Dark preference applies to the mobile workspace

- **WHEN** the browser reports a dark color scheme at a viewport of 760px or narrower
- **THEN** the shared navigation, page surfaces, parameter panel, controls, status messages, and viewport container MUST render using the dark palette
- **AND** the CAD workspace MUST retain the existing stacked responsive layout without horizontal overflow

### Requirement: Dark controls and states remain readable

The site MUST expose sufficient visual contrast for body text, muted text, borders, fields, buttons, links, focus indicators, validation errors, stale-preview indicators, disabled controls, and native form-control UI in both color schemes. The dark appearance MUST use the same semantic control states as the light appearance rather than requiring a separate interaction model.

#### Scenario: Dark form controls remain operable

- **WHEN** a user opens a CAD workspace while the browser reports a dark color scheme
- **THEN** text inputs, range controls, select controls, buttons, restore controls, and links MUST have readable labels and visible boundaries
- **AND** keyboard focus MUST remain visibly distinguishable

#### Scenario: Dark status and validation states remain distinguishable

- **WHEN** a CAD workspace displays a validation error, disabled action, stale preview, or progress state in dark appearance
- **THEN** the state MUST remain visually distinguishable from the surrounding dark surface
- **AND** its text or indicator MUST remain readable without relying on color alone for the associated message

### Requirement: CAD viewport follows the selected appearance

The CAD viewport MUST adapt its rendered background, grid, orientation gizmo, model edge overlay, dimension annotations, and lighting to the selected color scheme. Theme adaptation MUST NOT change the committed model geometry, dimension values, camera framing, orbit controls, model revision, stale state, or export behavior.

#### Scenario: Dark viewport remains legible on desktop

- **WHEN** a committed model is displayed in a desktop viewport while the browser reports a dark color scheme
- **THEN** the viewport background and grid MUST provide a dark, non-distracting surface
- **AND** the model shading, geometric edge overlay, dimension annotations, and XYZ orientation gizmo MUST remain distinguishable against that surface
- **AND** the user MUST be able to orbit the model and inspect the same committed geometry

#### Scenario: Changing the system preference updates the viewport

- **WHEN** the active browser color-scheme preference changes while the CAD workspace is open
- **THEN** the site UI and CAD viewport appearance MUST update to the new scheme without requiring a model regeneration or page navigation
- **AND** the current model revision, camera pose, and parameter values MUST remain unchanged

### Requirement: Responsive layout remains independent of theme

The system MUST preserve the existing 760px responsive breakpoint and layout behavior in both color schemes. Dark appearance MUST be a palette change applied to both responsive branches, not a separate desktop or mobile implementation.

#### Scenario: Theme does not alter the breakpoint contract

- **WHEN** the same route is rendered once in light appearance and once in dark appearance at the same viewport width
- **THEN** the layout branch selected at that width MUST be the same in both renders
- **AND** the page MUST not gain horizontal overflow solely because dark appearance is active

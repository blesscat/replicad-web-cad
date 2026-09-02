# system-dark-mode Specification

## Purpose

讓 Shape Shortcut 在 desktop 與 mobile 都能一致地跟隨使用者的系統／瀏覽器色彩偏好，並允許使用者從共用導覽列選擇 light 或 dark mode；網站 UI 與 CAD 3D viewport 都必須維持可讀、可操作的對比。

## Requirements

### Requirement: Site appearance follows the system or user color scheme

The site MUST use an explicit light or dark choice made through the shared navigation when one exists; otherwise it MUST select its appearance from the user's active system or browser color-scheme preference. The light appearance MUST follow the **Kinetic Utility** design system (neutral `#f8f9fa` surfaces, white cards with 1px `outline-variant` borders, Neon Blue `#3b82f6` primary, Hanken Grotesk UI text with JetBrains Mono technical labels). The dark appearance MUST follow the **Minimalist Futurism / Cyber-CAD Industrial** design system (deep-space `#0b1326` surfaces, `#38bdf8` neon-blue primary with cyan and purple accents, glassmorphic surfaces, cyan-tinted background grid, glow accents, Inter UI text with Fira Code technical labels). The selected appearance MUST apply consistently to the shared navigation, static Astro pages, CAD workspace panels, form controls, status messages, and viewport container, and the page layout MUST follow the active design system's layout vocabulary (section order and alignment), without changing any existing interaction behavior, content, routes, or model catalog. An explicit user choice MUST persist across localized route navigation and page reloads until the user chooses the other mode.

#### Scenario: Light preference keeps the existing light appearance

- **WHEN** the browser reports a light color scheme and the user has not selected an explicit mode
- **THEN** the site MUST render the Kinetic Utility light palette across shared navigation, pages, panels, controls, and viewport container
- **AND** existing navigation, model selection, parameter editing, restore, validation, and export interactions MUST remain available

#### Scenario: Dark preference applies to the desktop workspace

- **WHEN** the browser reports a dark color scheme at a viewport wider than 760px and the user has not selected an explicit mode
- **THEN** the shared navigation, page surfaces, parameter panel, controls, status messages, and viewport container MUST render the Minimalist Futurism dark palette
- **AND** the CAD workspace MUST remain a usable two-column layout with the existing desktop overflow and viewport boundaries

#### Scenario: Dark preference applies to the mobile workspace

- **WHEN** the browser reports a dark color scheme at a viewport of 760px or narrower and the user has not selected an explicit mode
- **THEN** the shared navigation, page surfaces, parameter panel, controls, status messages, and viewport container MUST render the Minimalist Futurism dark palette
- **AND** the CAD workspace MUST retain the existing stacked responsive layout without horizontal overflow

#### Scenario: User-selected appearance overrides the system preference

- **WHEN** the browser reports one color scheme and the user selects the other mode through the shared navigation
- **THEN** the shared navigation, static pages, CAD workspace panels, controls, status messages, and viewport container MUST render using the selected mode
- **AND** the selected mode MUST remain active after navigating to another localized route or reloading the page
- **AND** the theme control MUST remain keyboard accessible and expose a localized label for switching to the other mode

### Requirement: Dark controls and states remain readable

The site MUST expose sufficient visual contrast for body text, muted text, borders, fields, buttons, links, focus indicators, validation errors, stale-preview indicators, disabled controls, and native form-control UI in both color schemes. Neon-tinted and gradient controls in the dark appearance MUST meet the same contrast thresholds as solid controls. The dark appearance MUST use the same semantic control states as the light appearance rather than requiring a separate interaction model. Decorative glow, grid, and glass effects MUST NOT reduce the contrast of text or control boundaries below these thresholds.

#### Scenario: Theme control remains operable

- **WHEN** a user opens a supported localized route
- **THEN** the shared navigation MUST expose a light/dark theme control with a localized accessible name
- **AND** activating the control MUST update the selected appearance without requiring a full page navigation
- **AND** the native control color scheme MUST match the selected appearance

#### Scenario: Dark form controls remain operable

- **WHEN** a user opens a CAD workspace while the browser reports a dark color scheme
- **THEN** text inputs, range controls, select controls, buttons, restore controls, and links MUST have readable labels and visible boundaries
- **AND** keyboard focus MUST remain visibly distinguishable

#### Scenario: Dark status and validation states remain distinguishable

- **WHEN** a CAD workspace displays a validation error, disabled action, stale preview, or progress state in dark appearance
- **THEN** the state MUST remain visually distinguishable from the surrounding dark surface
- **AND** its text or indicator MUST remain readable without relying on color alone for the associated message

#### Scenario: Static homepage CTA remains readable in dark appearance

- **WHEN** a user views a localized homepage while the browser reports a dark color scheme
- **THEN** the final call-to-action label MUST have at least 4.5:1 contrast against its surface, including any neon or gradient button fill
- **AND** the CTA's hover state MUST preserve at least 4.5:1 contrast between its label and surface
- **AND** the CTA MUST remain visible, keyboard-focusable, and linked to the localized model-selection page

### Requirement: CAD viewport follows the selected appearance

The CAD viewport MUST adapt its rendered background, grid, orientation gizmo, model edge overlay, dimension annotations, and lighting to the selected system or user color scheme. In the dark appearance the viewport scene MUST use the Cyber-CAD Industrial accent treatment: a dark non-distracting surface with neon-cyan-tinted grid lines, edge overlay, and gizmo consistent with the Minimalist Futurism palette. Theme adaptation MUST NOT change the committed model geometry, dimension values, camera framing, orbit controls, model revision, stale state, or export behavior.

#### Scenario: Dark viewport remains legible on desktop

- **WHEN** a committed model is displayed in a desktop viewport while the browser reports a dark color scheme
- **THEN** the viewport background and grid MUST provide a dark, non-distracting surface with the Cyber-CAD accent treatment
- **AND** the model shading, geometric edge overlay, dimension annotations, and XYZ orientation gizmo MUST remain distinguishable against that surface
- **AND** the user MUST be able to orbit the model and inspect the same committed geometry

#### Scenario: Changing the active theme source updates the viewport

- **WHEN** the active browser color-scheme preference changes without an explicit user choice, or the user changes the explicit theme choice while the CAD workspace is open
- **THEN** the site UI and CAD viewport appearance MUST update to the new scheme without requiring a model regeneration or page navigation
- **AND** the current model revision, camera pose, and parameter values MUST remain unchanged

### Requirement: Responsive layout remains independent of theme

The system MUST preserve the existing 760px responsive breakpoint and layout behavior in both color schemes. Dark appearance MUST be a palette change applied to both responsive branches, not a separate desktop or mobile implementation.

#### Scenario: Theme does not alter the breakpoint contract

- **WHEN** the same route is rendered once in light appearance and once in dark appearance at the same viewport width
- **THEN** the layout branch selected at that width MUST be the same in both renders
- **AND** the page MUST not gain horizontal overflow solely because dark appearance is active

### Requirement: Decorative theme effects respect reduced motion

The dark appearance MUST present animated decorative effects (pulsing or pinging status dots, scanline and glow pulse animations) as static decoration when the user requests reduced motion through `prefers-reduced-motion`. Decorative layers MUST NOT intercept pointer input, obscure interactive content, or introduce horizontal overflow in either color scheme.

#### Scenario: Reduced motion stills animated decorations

- **WHEN** a user with `prefers-reduced-motion: reduce` opens a localized page in dark appearance
- **THEN** decorative dots and accents MUST render without looping animation
- **AND** the page content, navigation, and controls MUST remain fully visible and operable

#### Scenario: Decorations never block interaction

- **WHEN** a user interacts with any navigation item, button, card, or form control while decorative layers are rendered
- **THEN** the decoration MUST NOT intercept the pointer event or cover the control's hit target

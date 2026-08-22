## MODIFIED Requirements

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

#### Scenario: Static homepage CTA remains readable in dark appearance

- **WHEN** a user views a localized homepage while the browser reports a dark color scheme
- **THEN** the final call-to-action label MUST have at least 4.5:1 contrast against its surface
- **AND** the CTA's hover state MUST preserve at least 4.5:1 contrast between its label and surface
- **AND** the CTA MUST remain visible, keyboard-focusable, and linked to the localized model-selection page

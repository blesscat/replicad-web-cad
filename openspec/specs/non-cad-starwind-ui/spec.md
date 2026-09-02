# non-cad-starwind-ui Specification

## Purpose

Provide a consistent, accessible, and source-owned UI foundation for the
localized Astro pages outside the CAD workspace while preserving the existing
Svelte CAD experience, routes, content, and interaction contracts.

## Requirements

### Requirement: Non-CAD pages share a consistent UI foundation

The localized homepage, model-selection page, documentation page, and About
page MUST use a consistent visual treatment for their page surfaces,
interactive actions, status labels, and content groupings. The shared
treatment MUST expose readable hover, disabled, and keyboard-focus states
without requiring a client-side CAD runtime.

#### Scenario: Localized non-CAD page renders its shared UI treatment

- **WHEN** a user opens a supported localized homepage, model-selection page, documentation page, or About page
- **THEN** the page MUST render its page-local buttons, cards, labels, dialogs, and separators with the shared non-CAD UI treatment
- **AND** the page MUST remain renderable without initializing a CAD Worker, WebAssembly CAD kernel, WebGL renderer, or Svelte CAD workspace

#### Scenario: Non-CAD controls expose usable interaction states

- **WHEN** a user hovers, focuses, disables, or activates a page-local control on a supported non-CAD page
- **THEN** the control MUST expose a visually distinguishable state
- **AND** its accessible name, destination, and existing action semantics MUST remain understandable

### Requirement: Existing non-CAD content and routing remain compatible

The UI foundation MUST preserve the existing localized page content, translated
strings, metadata, route paths, model links, static preview fallbacks, and
external support-provider boundary. Visual component adoption MUST NOT require
React or change the public model IDs, locale route structure, or navigation
destinations.

#### Scenario: Localized model selection remains behaviorally equivalent

- **WHEN** a user opens either localized model-selection page and interacts with a model card, details action, fallback link, or edit link
- **THEN** the same model names, descriptions, previews, details, and model CAD destinations MUST remain available
- **AND** the page MUST continue to avoid CAD runtime initialization

#### Scenario: Localized static pages retain their public contract

- **WHEN** a user opens the localized homepage, documentation page, or About page after the UI adoption
- **THEN** the existing headings, translated copy, links, metadata, image alternative text, and support actions MUST remain available in the selected locale
- **AND** external support choices MUST continue to open on the configured provider pages without collecting payment data in Shape Shortcut

### Requirement: Non-CAD theme, user preference, and localization remain complete

The non-CAD UI treatment MUST work with the light or dark appearance selected by
the system preference or the shared header theme control and MUST preserve the
existing responsive layout behavior. Every
new visible label, accessible name, state message, and component text
introduced by the UI treatment MUST be available in Traditional Chinese and
English through the existing localization contract.

#### Scenario: Non-CAD pages remain readable in both color schemes

- **WHEN** a user views a supported non-CAD page with either a light or dark system color preference or an explicit header theme selection
- **THEN** page surfaces, text, muted text, borders, controls, links, dialogs, and focus indicators MUST remain readable and distinguishable
- **AND** the page MUST not gain horizontal overflow solely because the color scheme changed

#### Scenario: Non-CAD theme selection persists across localized pages

- **WHEN** a user selects light or dark mode from the shared header on a supported non-CAD page
- **THEN** the page MUST update its surfaces, text, controls, borders, and focus indicators to the selected mode
- **AND** the selected mode MUST remain active after navigating between `/en/` and `/zh-Hant/` routes or reloading the page
- **AND** the page MUST remain renderable without initializing a CAD Worker, WebAssembly CAD kernel, WebGL renderer, or Svelte CAD workspace

#### Scenario: English and Traditional Chinese render equivalent UI states

- **WHEN** a user opens the same non-CAD route under `/en/` and `/zh-Hant/`
- **THEN** the page structure, controls, accessible names, and interaction states MUST be equivalent
- **AND** user-visible copy and metadata MUST use the selected locale

### Requirement: CAD workspace remains isolated from the non-CAD adoption

The CAD route MUST retain its existing Svelte island boundary, CAD workspace
layout, parameter editing, worker lifecycle, viewport behavior, persistence,
validation, and export behavior. The non-CAD UI adoption MUST NOT introduce a
React integration or require Starwind components to render inside the Svelte
CAD component tree.

#### Scenario: CAD route continues to load the existing workspace

- **WHEN** a user opens a valid localized CAD route
- **THEN** the route MUST continue to mount the existing Svelte CAD workspace
- **AND** parameter editing, model generation, viewport interaction, restore, validation, and export actions MUST remain available with their existing semantics

#### Scenario: CAD route is not a target of non-CAD component replacement

- **WHEN** the non-CAD UI change is built and tested
- **THEN** no Svelte CAD component, Threlte/Three.js viewport component, CAD worker module, CAD state module, or CAD parameter store MUST be required to use the non-CAD UI foundation

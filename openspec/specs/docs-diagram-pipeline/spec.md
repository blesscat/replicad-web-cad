## Purpose

Defines the contract for generating the localized Desk System documentation
diagrams from a single data-driven source, emitting both light and dark
appearance variants as committed static assets.

## Requirements

### Requirement: Diagrams are generated from a single data source per diagram

The desk-system documentation diagrams MUST be produced by a single generation
command that emits every diagram variant for every supported locale and both
appearances (light and dark). Each diagram MUST be defined by one data source
covering all locales — shared geometry with per-locale strings and typography
overrides — so that editing a diagram's layout or copy happens in exactly one
place per diagram.

#### Scenario: Generation emits the complete variant matrix

- **WHEN** the diagram generation command runs
- **THEN** a static SVG file MUST be written for every diagram, every supported
  locale, and both appearances under the public documentation asset directory
- **AND** light file names MUST match the existing committed light asset names

#### Scenario: A locale edit does not require geometry duplication

- **WHEN** a diagram's localized text changes
- **THEN** only that locale's string data MUST need editing
- **AND** the shared geometry MUST NOT be duplicated per locale

### Requirement: Light generation output is byte-stable

Regenerating diagrams MUST leave the committed light-appearance SVGs
byte-identical — same file names and same file content — so that a regeneration
run with no data changes produces an empty diff and transcription drift against
the existing hand-authored light assets is detectable mechanically.

#### Scenario: Regeneration with no changes is a no-op

- **WHEN** the diagram generation command runs without any data or palette
  changes
- **THEN** every committed light SVG MUST remain byte-identical to its previous
  committed version

### Requirement: Both appearances derive from one semantic palette

Diagram colors MUST come from a semantic slot palette where every slot defines
both a light and a dark value. The dark palette MUST keep the diagram's
color-coded step identity (deep tints of the same hue family rather than
collapsing to neutral grays) and MUST align with the site's dark theme tokens.
Generation MUST fail closed when a slot is missing a value for either
appearance or when a locale is missing any localized string.

#### Scenario: Incomplete palette fails generation

- **WHEN** a semantic color slot lacks a light or dark value
- **THEN** the generation command MUST fail with an error identifying the slot
- **AND** no partial asset set MUST be treated as a successful run

#### Scenario: Incomplete locale strings fail generation

- **WHEN** a diagram's data lacks a localized string for any supported locale
- **THEN** the generation command MUST fail with an error identifying the
  diagram, locale, and missing string slot

#### Scenario: Dark variants use the dark palette only

- **WHEN** a dark-appearance SVG is generated
- **THEN** its background and card colors MUST come from the dark palette values
- **AND** the light-only background color MUST NOT appear in dark output

### Requirement: Generated assets are committed static assets

Diagram generation MUST run as an explicit developer command, not as part of
the site build. Generated SVGs MUST be version-controlled under the public
documentation asset directory and served as static files, so pages render them
without any build-time or client-side generation step.

#### Scenario: Build does not regenerate diagrams

- **WHEN** the site build runs
- **THEN** the build MUST NOT invoke diagram generation
- **AND** the committed SVG assets MUST be served unchanged as static files

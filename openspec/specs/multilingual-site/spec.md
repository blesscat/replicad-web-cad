## Purpose

Provide a consistent Traditional Chinese and English experience across the static
site and interactive CAD workspace while keeping model behavior and persisted CAD
data independent of the displayed language.

## Requirements

### Requirement: Locale-specific routes

The site SHALL expose the supported public pages under both `/zh-Hant/` and `/en/`
locale prefixes, including the home page, model selection, documentation, and each
existing CAD model route. Model IDs, route slugs, query parameter names, and
parameter enum values MUST remain unchanged between locales.

#### Scenario: User opens an English model route directly

- **WHEN** a user navigates directly to `/en/cad/box`
- **THEN** the page SHALL load the box CAD workspace with English visible copy and
  SHALL preserve the `box` model ID

#### Scenario: User follows a locale-neutral legacy route

- **WHEN** a user navigates to an existing unprefixed route such as `/models` or
  `/cad/box`
- **THEN** the site SHALL redirect to the equivalent `/zh-Hant/` route without
  changing the model ID or query parameters

### Requirement: Complete locale-aware user interface

Every user-visible string, document string, page title, alternative text,
accessible name, validation label, option label, and status message rendered by a
locale-specific page SHALL come from that locale's translation resources. The
interface MUST NOT silently fall back to another supported locale for a missing
translation.

#### Scenario: English CAD workspace has localized accessible names

- **WHEN** a user opens an English CAD workspace
- **THEN** buttons, parameter labels, option descriptions, empty states, progress
  labels, and accessible names SHALL be English

#### Scenario: Translation resource is incomplete

- **WHEN** the translation completeness check runs with a missing required key
- **THEN** the check SHALL fail and identify the missing locale and key before the
  build is considered valid

#### Scenario: Attribution notice uses the selected locale

- **WHEN** a user opens the OpenGrid board or Snap generator page under either
  supported locale
- **THEN** the attribution heading, credit text, license labels, modification
  statement, and accessible names SHALL use that page's locale
- **AND** the source revision, license URLs, model IDs, and download filenames
  SHALL remain unchanged between locales

### Requirement: Locale switching preserves CAD context

The language switch SHALL navigate to the equivalent page in the selected locale,
preserve the current model route and query parameters, and retain persisted
component parameters under the existing storage compatibility rules.

#### Scenario: User switches language from a system-specific CAD route

- **WHEN** a user switches from `/zh-Hant/cad/opengrid?system=desk` to English
- **THEN** the browser SHALL navigate to `/en/cad/opengrid?system=desk` and the CAD
  workspace SHALL restore the same desk-scoped parameters

#### Scenario: User switches language from the model chooser

- **WHEN** a user switches language on the model selection page
- **THEN** the equivalent chooser page SHALL open with the selected locale and all
  model IDs and model entry links SHALL remain behaviorally equivalent

### Requirement: Stable domain identifiers remain locale-neutral

The implementation SHALL keep model IDs, OpenGrid IDs, build keys, localStorage
keys, export filenames, Worker protocol values, and CAD parameter values
locale-neutral. Existing OpenGrid component IDs SHALL remain unchanged.

#### Scenario: Same model is generated in both locales

- **WHEN** a user generates and exports the same model configuration in either
  supported locale
- **THEN** the Worker command values, generated geometry, and export filename SHALL
  be identical apart from user-facing status text

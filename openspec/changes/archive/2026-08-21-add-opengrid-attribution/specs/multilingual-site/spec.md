## MODIFIED Requirements

### Requirement: Complete locale-aware user interface

Every user-visible string, document string, page title, alternative text,
accessible name, validation label, option label, and status message rendered by
a locale-specific page SHALL come from that locale's translation resources. The
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

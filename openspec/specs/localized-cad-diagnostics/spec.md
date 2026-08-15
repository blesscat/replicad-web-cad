## Purpose

Make CAD validation, progress, and Worker diagnostics understandable in the active
locale without coupling the CAD kernel or cross-thread protocol to a UI language.

## Requirements

### Requirement: Locale-neutral diagnostic descriptors

Validation results, progress state, and Worker error events SHALL expose stable
diagnostic identifiers and structured interpolation parameters rather than
locale-specific user-facing sentences. The Worker and CAD contract MUST NOT select
or depend on the active UI locale.

#### Scenario: Worker reports a recoverable model error

- **WHEN** a model operation fails with a known CAD error
- **THEN** the event SHALL contain the stable error code, stage, recoverability, and
  any message parameters needed by the UI, without embedding a translated sentence

#### Scenario: Validation reports a numeric range error

- **WHEN** a parameter is outside its supported range
- **THEN** the validation result SHALL identify the field, stable message key or
  reason, and numeric bounds needed for localized rendering

### Requirement: Diagnostics render in the active locale

The CAD UI SHALL resolve diagnostic descriptors through the active locale and SHALL
render equivalent meaning, interpolation values, and accessibility text in both
supported locales.

#### Scenario: The same error is shown in Traditional Chinese and English

- **WHEN** the same known CAD error is displayed once in each supported locale
- **THEN** the title, message, retry affordance, and accessible alert text SHALL be
  localized while the error code and recovery behavior remain the same

#### Scenario: Progress includes dynamic counts

- **WHEN** a build reports completed and total counts, a boolean operation, or
  elapsed time
- **THEN** the progress UI SHALL localize the labels and preserve the numeric
  values, operation kind, ordering, and progress semantics

### Requirement: Safe unknown-diagnostic fallback

Unknown or malformed diagnostic identifiers SHALL render a generic localized
message and SHALL NOT expose raw internal exception text as the primary user-facing
message. Correlation metadata MAY remain available for debugging.

#### Scenario: Unknown Worker error code reaches the UI

- **WHEN** the UI receives an error code without a translation entry
- **THEN** it SHALL show the generic localized CAD error message, keep the recovery
  behavior defined by the event, and make the missing code observable to tests or
  diagnostics

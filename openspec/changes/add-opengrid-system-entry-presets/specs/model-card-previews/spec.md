## MODIFIED Requirements

### Requirement: Canonical generator preview asset set

The project MUST provide one static preview image for every visible catalog entry rendered by `/models`. A context-free entry MUST use the corresponding model definition's default parameters and the existing `<modelId>.png` asset identity. A Desk or Wall OpenGrid entry MUST use its validated system preset and a deterministic `<modelId>-<system>.png` asset identity. Every preview MUST be generated from the corresponding model generator using a stable canonical viewport, served from the same origin, and referenced through the metadata of the exact visible entry. Existing model ids, build keys, and CAD route slugs MUST remain unchanged.

#### Scenario: Every visible entry has a serviceable preview asset

- **WHEN** the static site is built and `/models` is rendered
- **THEN** every visible entry MUST resolve to a non-empty preview image asset
- **AND** the asset MUST be served from the same origin as `/models`
- **AND** a duplicated model id MUST resolve to the asset for its own system context

#### Scenario: Context preview uses the effective preset

- **WHEN** a context preview asset is captured
- **THEN** the generator MUST use the context preset when no valid scoped value is present
- **AND** the normal capture workflow MUST use a fresh or cleared browser storage context so developer state cannot alter the result
- **AND** the capture MUST use a stable initial camera and thumbnail presentation

### Requirement: Repeatable preview capture and verification workflow

The project MUST provide a repeatable Chromium/Playwright workflow that derives its targets from the complete visible catalog entry set, including duplicated context entries. For each target it MUST visit the model route with its system query when present, clear or isolate browser storage, wait for the corresponding generator to reach a ready state, write the entry's production static asset, and fail verification when an expected asset is missing, empty, or invalid.

#### Scenario: Capture regenerates context preview assets

- **WHEN** a developer runs the preview capture workflow
- **THEN** it MUST visit every visible context-free and context-aware entry
- **AND** it MUST write one preview asset per visible entry
- **AND** Desk and Wall entries for the same model id MUST produce separate assets

#### Scenario: Verification rejects an incomplete context asset set

- **GIVEN** a visible context preview asset is missing, empty, or cannot be decoded as an image
- **WHEN** the preview verification workflow runs
- **THEN** verification MUST fail
- **AND** the failure MUST identify the model id, context, or asset path

### Requirement: Preview assets remain presentation-only

Preview assets MUST represent the generator's visual output without introducing a second model-building or export implementation. The preview workflow MUST reuse the existing model-specific CAD generation and viewport rendering path, and preview assets MUST NOT become inputs to the Worker protocol, STEP export, STL export, or model validation logic.

#### Scenario: Context asset changes do not change CAD identity

- **WHEN** a system-specific preview is recaptured
- **THEN** only the presentation asset and entry metadata MAY change
- **AND** the model id, CAD route slug, Worker contract, and export contract MUST remain unchanged

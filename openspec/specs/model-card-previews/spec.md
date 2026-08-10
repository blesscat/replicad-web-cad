## Purpose

本文件定義模型選擇頁預覽圖片的來源、產生流程與靜態資產限制，確保使用者在進入 CAD workspace 前能辨識模型，同時維持模型 generator 與 export contract 的單一來源。

## Requirements

### Requirement: Canonical generator preview asset set

The project MUST provide one static preview image for every model rendered by `/models`: `opengrid`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-snap`, `opengrid-snap-remover`, and `hsw-cell`. Each preview MUST be generated from the corresponding model generator using that model definition's default parameters and a stable canonical viewport. The preview assets MUST be served from the same origin and referenced through model-catalog metadata. Existing model IDs and CAD route slugs MUST remain unchanged.

#### Scenario: 每個可見模型都有可服務的預覽資產

- **WHEN** the static site is built and `/models` is rendered
- **THEN** every visible model definition MUST resolve to a non-empty preview image asset
- **AND** the asset MUST be served from the same origin as `/models`
- **AND** the asset MUST use the catalog entry for the same model id rather than a different model's image

#### Scenario: 預覽使用 canonical 預設模型

- **WHEN** a preview asset is captured for a model
- **THEN** the generator MUST use that model's validated default parameter snapshot
- **AND** the capture MUST use a stable initial camera and viewport presentation
- **AND** the capture MUST NOT use parameters persisted from an end user's browser session

### Requirement: Repeatable preview capture and verification workflow

The project MUST provide a repeatable Chromium/Playwright workflow that can capture and verify the complete visible preview asset set. The workflow MUST derive its target model routes from the visible model catalog, wait for each generator to reach a ready state before capturing, write assets to the production static-asset location, and fail verification when an expected asset is missing, empty, or invalid.

#### Scenario: Capture regenerates the visible preview set

- **WHEN** a developer runs the preview capture workflow
- **THEN** the workflow MUST visit every visible model route
- **AND** it MUST wait until the corresponding generator reports a ready preview before capturing
- **AND** it MUST write one preview asset for each visible model id

#### Scenario: Verification rejects an incomplete asset set

- **GIVEN** a visible model preview asset is missing, empty, or cannot be decoded as an image
- **WHEN** the preview verification workflow runs
- **THEN** verification MUST fail
- **AND** the failure MUST identify the affected model id or asset path

#### Scenario: Capture is isolated from user state

- **GIVEN** a developer has previously changed and persisted parameters in a browser session
- **WHEN** the preview capture workflow runs
- **THEN** the captured preview MUST still use the model definition's default parameters
- **AND** the workflow MUST use a fresh or explicitly cleared browser storage context

### Requirement: Preview assets remain presentation-only

Preview assets MUST represent the generator's visual output without introducing a second model-building or export implementation. The preview workflow MUST reuse the existing model-specific CAD generation and viewport rendering path, and preview assets MUST NOT become inputs to the Worker protocol, STEP export, STL export, or model validation logic.

#### Scenario: Generator changes flow into the next capture

- **WHEN** a model generator or canonical viewport presentation changes
- **AND** the preview capture workflow is run again
- **THEN** the corresponding static preview asset MUST be replaceable without changing the model id, CAD route, or export contract

#### Scenario: Preview assets do not initialize CAD on the chooser

- **WHEN** a user opens `/models`
- **THEN** the page MUST load preview assets as static resources only
- **AND** it MUST NOT initialize the CAD Worker or invoke model generation to display those assets

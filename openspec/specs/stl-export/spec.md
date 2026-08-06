## Purpose

本文件定義目前 CAD component 的 STL 產生、驗證、命名、下載生命週期與 Bambu Studio 一般檔案匯入相容性。

## Requirements

### Requirement: STL is generated from the committed B-Rep

The system MUST generate STL bytes inside the CAD Worker from the selected component's pinned committed B-Rep revision. It MUST NOT reconstruct STL from the viewport mesh or run the CAD writer on the main thread.

#### Scenario: Successful STL export uses the current revision

- **WHEN** the workspace is ready and the user requests STL for committed revision R1
- **THEN** the Worker MUST validate and pin R1 before writing STL bytes
- **AND** the Worker MUST produce non-empty binary STL bytes from R1's B-Rep
- **AND** a later model revision MUST NOT silently replace R1 as the export source

#### Scenario: STL writer failure preserves the model

- **WHEN** the STL writer fails, returns an empty buffer, or the requested revision is missing
- **THEN** the system MUST emit a structured recoverable STL export error
- **AND** the system MUST NOT trigger a download
- **AND** the committed model and viewport MUST remain available unless Worker recovery is required

### Requirement: STL export contract and metadata are validated

The versioned Worker contract MUST support an `export.stl` command and an STL export-ready response carrying the request correlation, worker epoch, model revision, `format: stl`, `.stl` filename, `model/stl` MIME, and ArrayBuffer bytes. Runtime validation MUST reject unknown, mismatched, empty, stale, or malformed STL export payloads.

#### Scenario: Valid STL response is accepted

- **WHEN** the main thread receives an STL response matching the active operation, worker epoch, model revision, filename, MIME, and non-empty bytes
- **THEN** the response MUST pass validation and trigger exactly one `.stl` browser download

#### Scenario: Invalid STL response is rejected

- **WHEN** the STL response has the wrong format, MIME, extension, request correlation, worker epoch, model revision, or empty bytes
- **THEN** the main thread MUST reject the response
- **AND** the system MUST NOT trigger a download
- **AND** the UI MUST show a diagnosable STL metadata/export error

### Requirement: STL output uses explicit binary tessellation settings

The Worker MUST request binary STL output with explicit STL tessellation tolerance and angular tolerance configuration values. STL settings MUST be separate from preview mesh settings and MUST be applied consistently to every catalog model.

#### Scenario: STL settings are independent from preview settings

- **WHEN** the preview mesh uses its configured viewport tolerance
- **THEN** an STL request MUST use the configured STL tolerance and angular tolerance
- **AND** changing preview-only tessellation settings MUST NOT silently change the STL contract without updating the STL configuration

#### Scenario: STL output follows the project unit convention

- **WHEN** a model is exported to STL
- **THEN** the exported coordinates MUST use the model's millimetre convention
- **AND** the generated filename MUST identify the selected model parameters

### Requirement: STL filenames are defined by the model catalog

Every supported model definition MUST provide a deterministic STL filename. The box filename MUST be `box-{width}x{depth}x{height}.stl`, the modular-grid-base filename MUST be `modular-grid-base-{columns}x{rows}.stl`, and the HSW filename MUST be `hsw-cell-{columns}x{rows}.stl`.

#### Scenario: Box STL filename

- **WHEN** a 20 × 30 × 40 mm box is exported
- **THEN** the suggested filename MUST be `box-20x30x40.stl`

#### Scenario: Modular grid STL filename

- **WHEN** a 2-column × 2-row modular grid is exported
- **THEN** the suggested filename MUST be `modular-grid-base-2x2.stl`

#### Scenario: HSW STL filename

- **WHEN** a 2-column × 2-row HSW grid is exported
- **THEN** the suggested filename MUST be `hsw-cell-2x2.stl`

### Requirement: STL download follows existing model lifecycle gates

The STL download action MUST be enabled only for the latest successfully committed model revision. It MUST be disabled during initial loading, model generation, invalid input, stale preview state, Worker recovery/error states, and another active export. The export request MUST be correlated to the selected model revision and Worker epoch.

#### Scenario: STL is available when the model is ready

- **GIVEN** the workspace has a current committed revision and status `ready`
- **WHEN** the user views the export actions
- **THEN** `下載 STL` MUST be enabled
- **AND** selecting it MUST start an STL export for the current revision

#### Scenario: STL is disabled for stale or unavailable models

- **GIVEN** the current input is invalid, a newer generation is building, the Worker is unavailable, or the preview is stale
- **WHEN** the user views the export actions
- **THEN** `下載 STL` MUST be disabled
- **AND** the UI MUST NOT send an STL export request

#### Scenario: STEP and STL remain independent formats

- **WHEN** the user selects either export action while the model is ready
- **THEN** only the selected format MUST be requested and downloaded
- **AND** the existing STEP export behavior MUST remain unchanged

### Requirement: STL export is suitable for normal Bambu Studio import

The system MUST download a non-empty binary `.stl` file that can be opened through Bambu Studio's normal local-file import workflow. This capability MUST NOT claim to launch or control the Bambu Studio desktop application from the browser.

#### Scenario: Downloaded STL is available for slicer import

- **WHEN** STL download completes successfully
- **THEN** the browser MUST receive a `.stl` file with the selected model's dimensions and geometry
- **AND** the user MUST be able to open or import that file in Bambu Studio through its normal file workflow

#### Scenario: No automatic desktop-app integration

- **WHEN** the STL download action completes
- **THEN** the web app MUST only trigger the browser download
- **AND** it MUST NOT require a backend upload, custom URL protocol, native helper, or Bambu Studio installation

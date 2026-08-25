## Purpose

定義瀏覽器端 CAD Worker 如何把可分色的 Snap body 與平面文字 part 封裝成可驗證、可下載且可交給一般切片器匯入的 3MF 檔案。

## Requirements

### Requirement: 3MF is generated from the committed multipart revision

For a committed `opengrid-wall-cover` revision with valid body and flat-text
parts, the system MUST generate 3MF bytes inside the CAD Worker from the pinned
body and text B-Rep parts. It MUST NOT reconstruct the package from the
viewport mesh alone or run CAD export on the main thread. The initial POC MUST
reject unsupported models or Wall Cover configurations with a structured
recoverable export error. The former `opengrid-snap` `topText=SNAP` path MUST
not be an export target.

#### Scenario: Successful Snap 3MF export

- **WHEN** the workspace is ready and the user requests 3MF for a committed
  `opengrid-wall-cover` revision
- **THEN** the Worker MUST pin that revision before writing the package
- **AND** the package MUST be non-empty and contain a body object and a flat
  text object with their relative placement preserved
- **AND** the main thread MUST receive one validated `.3mf` download

#### Scenario: Unsupported 3MF export is rejected

- **WHEN** the user requests 3MF for a revision without supported Wall Cover
  multipart data, including an `opengrid-snap` revision
- **THEN** the Worker MUST emit a structured recoverable 3MF export error
- **AND** it MUST NOT emit export-ready bytes or trigger a download

### Requirement: 3MF package carries distinct parts and material metadata

The generated 3MF package MUST be a valid ZIP-based 3MF package with a model
part, package relationships, content types, and a separate object model. Its
Bambu-compatible model MUST contain one parent object with distinct cover-body
and flat-text component mesh objects, two deterministic material entries, and
preserved body/text coordinates. The parent object MUST be the only build item;
the body and text parts MUST remain independently addressable through
`Metadata/model_settings.config`. The package MUST use millimetres without a
hidden scale or translation. It MUST also carry a valid Bambu project
configuration in `Metadata/project_settings.config` identifying a supported
Bambu printer and two project filament slots. Bambu Studio metadata MUST
assign model part `1` (body) to extruder/filament slot `1`, model part `2`
(text) to extruder/filament slot `2`, and declare the plate filament map `1 2`.

#### Scenario: Body and text have separate material assignments

- **WHEN** a generated Wall Cover 3MF package is inspected
- **THEN** it MUST contain two non-empty mesh objects for the body and text
- **AND** it MUST contain two material entries with different deterministic
  display colours
- **AND** the text object MUST be assigned to the accent material while the
  body object MUST be assigned to the base material

#### Scenario: Body and text remain independently selectable

- **WHEN** a slicer imports a generated Wall Cover 3MF package
- **THEN** the build MUST expose one parent item containing independently
  addressable body and text parts
- **AND** the package MUST NOT flatten the two color parts into one mesh or
  emit unrelated body/text build items

#### Scenario: Package structure is importable

- **WHEN** a 3MF response is passed to a ZIP/XML structural validator
- **THEN** it MUST contain `[Content_Types].xml`, `_rels/.rels`,
  `3D/3dmodel.model`, `3D/_rels/3dmodel.model.rels`,
  `3D/Objects/object_1.model`, `Metadata/project_settings.config`, and
  `Metadata/model_settings.config`
- **AND** the model XML MUST declare millimetre units, finite vertices, and
  valid triangle indices

#### Scenario: Bambu Studio receives distinct default filament assignments

- **WHEN** Bambu Studio imports the generated Wall Cover package
- **THEN** its model settings MUST map body part `1` to filament slot `1`
- **AND** its model settings MUST map text part `2` to filament slot `2`
- **AND** the plate metadata MUST contain `filament_maps=1 2`

### Requirement: 3MF export metadata and response are validated

The versioned Worker contract MUST support an `export.3mf` command and an
export-ready response carrying request correlation, Worker epoch, model
revision, `format: 3mf`, a `.3mf` filename, `model/3mf` MIME, and non-empty
ArrayBuffer bytes. Runtime validation MUST reject unknown, mismatched, empty,
stale, or malformed 3MF metadata and MUST NOT trigger a download for a rejected
response. The contract MUST identify the Wall Cover model when the export is
requested and MUST not treat a Snap revision as a supported multipart export.

#### Scenario: Valid 3MF metadata is accepted

- **WHEN** the main thread receives a 3MF response matching the active
  operation, Worker epoch, model revision, filename, MIME, and non-empty
  package bytes for a Wall Cover
- **THEN** the response MUST pass validation
- **AND** the browser MUST trigger exactly one `.3mf` download

#### Scenario: Invalid 3MF metadata is rejected

- **WHEN** a 3MF response has the wrong format, MIME, extension, request
  correlation, Worker epoch, model revision, empty bytes, unsupported model,
  or invalid package structure
- **THEN** the main thread MUST reject the response
- **AND** the system MUST show a diagnosable 3MF metadata/export error
- **AND** no download MUST be triggered

### Requirement: 3MF download follows existing model lifecycle gates

The 3MF action MUST be enabled only for the latest successfully committed
supported `opengrid-wall-cover` revision while the workspace is ready, not
stale, and not already exporting. The request MUST be correlated to the
selected model revision and Worker epoch. The action MUST be unavailable for
`opengrid-snap`, including any legacy `topText=SNAP` snapshot. STEP and STL
actions MUST remain independent and their existing lifecycle behavior MUST
remain unchanged.

#### Scenario: 3MF is available for the supported POC

- **GIVEN** the current revision is a committed, ready, non-stale
  `opengrid-wall-cover` with valid body/text parts
- **WHEN** the user views the export actions
- **THEN** `下載 3MF` / `Download 3MF` MUST be enabled
- **AND** selecting it MUST start an `export.3mf` request for that revision

#### Scenario: 3MF is disabled outside the supported lifecycle

- **GIVEN** the input is invalid, the preview is stale, the Worker is loading
  or recovering, the model is `opengrid-snap`, the Wall Cover parts are
  missing, or another export is active
- **WHEN** the user views the export actions
- **THEN** the 3MF action MUST be disabled
- **AND** the Worker MUST NOT receive an `export.3mf` request

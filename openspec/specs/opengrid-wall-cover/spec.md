## Purpose

提供一個只隸屬於 Wall、可貼合既有表面的獨立 cover 元件，讓本體與平面文字能以不同材料列印，並保留未來以正式 STEP 幾何替換暫用模型的穩定契約。

## Requirements

### Requirement: OpenGrid Wall Cover model contract

The system MUST register a new independent model with `modelId=opengrid-wall-cover`, `buildKey=opengrid-wall-cover`, route slug `opengrid-wall-cover`, and user-facing display name beginning with `OpenGrid `. The model MUST belong to the Wall system only and MUST NOT be offered as a Desktop model. Its prototype configuration MUST use the Snap Lite Standard full-footprint geometry with offset zero and all optional holes/connectors disabled, while keeping the cover body and its flat text as separate printable parts. The prototype MUST not expose unrelated Snap parameters or an editable arbitrary-text field.

#### Scenario: Wall catalog exposes the cover

- **WHEN** the user opens the Wall component catalog
- **THEN** the catalog MUST list `OpenGrid Wall Cover`
- **AND** the model MUST use `opengrid-wall-cover` consistently for its modelId, buildKey, route slug, and component directories
- **AND** the Desktop catalog MUST NOT list the cover

#### Scenario: Prototype uses Snap Lite without Snap-only features

- **WHEN** a new Wall Cover revision is generated before the replacement STEP is supplied
- **THEN** generation MUST use the Snap Lite Standard full-footprint placeholder at zero offset
- **AND** generation MUST leave OpenConnect, magnet holes, locating holes, remover holes, and other optional Snap features disabled
- **AND** the result MUST contain a cover body part and a separate flat text part

### Requirement: Wall Cover is a surface-level two-part assembly

The Wall Cover MUST represent the text as a separate printable solid seated in a shallow surface recess of the cover body. The text top surface MUST be coplanar with the cover top within the documented CAD tolerance; it MUST NOT be raised above the surface, embossed, or represented only by a viewport material. The two parts MUST remain independently addressable for material or extruder assignment.

#### Scenario: Text is coplanar rather than embossed

- **WHEN** a valid prototype Wall Cover is quality-checked
- **THEN** the body and text maximum Z values MUST match within the documented CAD tolerance
- **AND** the text MUST occupy the surface recess without extending above the cover
- **AND** the cover MUST preserve the Snap Lite placeholder outer bounds

#### Scenario: Body and text remain independently selectable

- **WHEN** a Wall Cover revision is committed
- **THEN** the committed revision MUST retain separate body and text parts
- **AND** a downstream preview or export MUST be able to assign different colors or extruders to those parts
- **AND** no operation MAY require flattening them into one display-only mesh

### Requirement: Wall Cover live preview renders both part colors

When a Wall Cover revision is committed and its body/text parts are available, the CAD workspace preview MUST render the body and text as separate meshes with deterministic distinct base and accent colors. The preview MUST use the same part boundaries and relative placement as the printable revision, and the text MUST remain visually flush with the cover surface.

#### Scenario: Committed cover preview shows two colors

- **WHEN** the Wall Cover preview is ready
- **THEN** the viewport MUST show the cover body in the base color and the flat text in the accent color
- **AND** the text color MUST not depend only on a color painted onto a combined mesh
- **AND** the preview geometry MUST match the revision that can be sent to export

#### Scenario: Preview falls back safely when a part is unavailable

- **WHEN** a Wall Cover candidate does not contain a valid body/text part pair
- **THEN** the candidate MUST NOT be committed as a two-color-ready revision
- **AND** the preview MUST report the generation as stale or failed according to the existing CAD lifecycle
- **AND** a two-color export action MUST remain unavailable

### Requirement: Wall Cover placeholder supports a future STEP replacement

The Wall Cover MUST keep its stable modelId, route, parameter contract, preview part contract, and export contract when its placeholder geometry is replaced by the user-provided STEP. The replacement geometry MUST remain scoped to the Wall Cover component and MUST preserve the surface-level, separate-body/text semantics unless a later change explicitly revises them.

#### Scenario: Placeholder is replaced without changing the public model

- **WHEN** the official Wall Cover STEP asset is added
- **THEN** the production geometry source MAY change from the Snap Lite placeholder to that STEP
- **AND** existing Wall Cover snapshots and routes MUST continue to identify the same `opengrid-wall-cover` model
- **AND** the viewport and export consumers MUST continue receiving the same logical body/text part roles

#### Scenario: Missing replacement asset keeps the prototype usable

- **WHEN** the official STEP asset is not present
- **THEN** the system MUST continue to use the Snap Lite placeholder for the prototype
- **AND** it MUST NOT silently substitute the existing `opengrid-snap` model as the Wall catalog entry

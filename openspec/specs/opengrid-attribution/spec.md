## Purpose

Give users of the OpenGrid board and Snap generator pages the attribution,
source, modification, and license information needed to understand the
upstream-derived CAD work and its downloadable outputs.

## Requirements

### Requirement: OpenGrid and Snap generator pages expose upstream attribution

The localized generator pages for the existing model IDs `opengrid` and
`opengrid-snap` SHALL display a static, user-visible attribution notice in the
generator and download context. The notice MUST identify the applicable pinned
upstream source, the relevant design/OpenSCAD credits, the upstream source-code
license, and the derived/generated-parts license. Each license MUST link to its
corresponding Creative Commons license page.

#### Scenario: OpenGrid board attribution is visible in both locales

- **WHEN** a user opens `/zh-Hant/cad/opengrid` or `/en/cad/opengrid`
- **THEN** the page MUST show the attribution notice at the end of the
  generator/download context, after the interactive CAD workspace when it is
  rendered
- **AND** the notice MUST link to the pinned OpenGrid source revision
- **AND** the notice MUST identify the upstream source-code license as
  CC BY-NC-SA 4.0 and the derived/generated-parts license as CC BY 4.0

#### Scenario: Snap attribution covers the original and modified downloads

- **WHEN** a user opens `/zh-Hant/cad/opengrid-snap` or
  `/en/cad/opengrid-snap`
- **THEN** the page MUST identify the pinned upstream Snap source and its
  design/OpenSCAD credits
- **AND** the notice MUST state that `snap-half` and `snap-quarter` are
  modified derivatives of the upstream Snap design
- **AND** the notice MUST identify the derived/generated-parts CC BY 4.0
  license without changing the existing `Half.step` and `Quarter.step`
  download contracts

#### Scenario: Attribution scope excludes other OpenGrid-compatible models

- **WHEN** a user opens a generator page for an OpenGrid-compatible model other
  than `opengrid` or `opengrid-snap`
- **THEN** the page MUST NOT present the OpenGrid board/Snap notice as if that
  model were covered by this upstream attribution

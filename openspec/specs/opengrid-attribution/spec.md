## Purpose

Give users of the OpenGrid board and Snap generator pages the attribution,
modification, and license information needed to understand the OpenGrid and
OpenConnect upstream-derived CAD work and its downloadable outputs.

## Requirements

### Requirement: OpenGrid and Snap generator pages expose upstream attribution

The localized generator pages for the existing model IDs `opengrid` and
`opengrid-snap` SHALL display a static, user-visible attribution notice in the
generator and download context. The notice MUST identify the relevant
design/OpenSCAD credits, the upstream source-code license, and the
derived/generated-parts licenses. For `opengrid-snap`, the notice MUST also
identify the OpenConnect creator and project and its source license. Each
license MUST link to its corresponding Creative Commons license page.

#### Scenario: OpenGrid board attribution is visible in both locales

- **WHEN** a user opens `/zh-Hant/cad/opengrid` or `/en/cad/opengrid`
- **THEN** the page MUST show the attribution notice at the end of the
  generator/download context, after the interactive CAD workspace when it is
  rendered
- **AND** the notice MUST identify the upstream source-code license as
  CC BY-NC-SA 4.0 and the derived/generated-parts license as CC BY 4.0

#### Scenario: Snap attribution covers the original and modified downloads

- **WHEN** a user opens `/zh-Hant/cad/opengrid-snap` or
  `/en/cad/opengrid-snap`
- **THEN** the page MUST identify the relevant design/OpenSCAD credits
- **AND** the notice MUST state that `snap-half` and `snap-quarter` are
  modified derivatives of the upstream Snap design
- **AND** the notice MUST identify the derived/generated-parts CC BY 4.0
  license without changing the existing `Half.step` and `Quarter.step`
  download contracts
- **AND** the notice MUST credit `mitufy` and link to the OpenConnect project
- **AND** the notice MUST identify the OpenConnect source material as CC BY 4.0

#### Scenario: OpenConnect asset provenance is documented

- **WHEN** the repository-local OpenGrid Snap asset documentation is reviewed
- **THEN** it MUST identify the OpenConnect project and `mitufy` as the source
  of the OpenConnect interface reference
- **AND** it MUST link to the CC BY 4.0 license
- **AND** it MUST distinguish the supplied STEP runtime asset from the
  non-runtime STL placement references

#### Scenario: Attribution scope excludes other OpenGrid-compatible models

- **WHEN** a user opens a generator page for an OpenGrid-compatible model other
  than `opengrid` or `opengrid-snap`
- **THEN** the page MUST NOT present the OpenGrid board/Snap notice as if that
  model were covered by this upstream attribution

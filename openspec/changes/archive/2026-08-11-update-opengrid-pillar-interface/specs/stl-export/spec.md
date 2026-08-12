## MODIFIED Requirements

### Requirement: Pillar STL metadata

The catalog MUST provide deterministic STL metadata for the `opengrid-pillar` component. The filename MUST use the existing `.stl` extension and `model/stl` MIME, and MUST be `pillar-9-standard.stl` or `pillar-5-thin-shell.stl` according to the normalized `mode` value. STL generation MUST continue to use the latest successfully committed OpenGrid pillar B-Rep and the existing export lifecycle gates.

#### Scenario: Standard pillar STL filename

- **WHEN** a committed pillar with `mode=standard` is exported as STL
- **THEN** the filename MUST be `pillar-9-standard.stl`
- **AND** the response MUST carry `format=stl`, MIME `model/stl`, and non-empty binary bytes

#### Scenario: Thin-shell pillar STL filename

- **WHEN** a committed pillar with `mode=thin-shell` is exported as STL
- **THEN** the filename MUST be `pillar-5-thin-shell.stl`
- **AND** the response MUST be generated from the committed pillar revision

#### Scenario: Pillar STL follows readiness gates

- **WHEN** the pillar mode is invalid, stale, still generating, or has no committed revision
- **THEN** the STL action MUST be disabled
- **AND** the Worker MUST NOT receive an STL export request

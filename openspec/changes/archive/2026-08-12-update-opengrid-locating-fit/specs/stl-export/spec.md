## MODIFIED Requirements

### Requirement: Pillar STL metadata

The catalog MUST provide deterministic STL metadata for the `opengrid-pillar` component. The filename MUST use the existing `.stl` extension and `model/stl` MIME. A zero-offset standard pillar MUST use `pillar-9-standard.stl`, a zero-offset thin-shell pillar MUST use `pillar-6-thin-shell.stl`, and a zero-offset positioning pillar MUST use `pillar-{length}-positioning.stl`. When either XY offset is non-zero, the filename MUST append deterministic `-x{offsetX}-y{offsetY}` values before the `.stl` extension. STL generation MUST continue to use the latest successfully committed OpenGrid pillar B-Rep and the existing export lifecycle gates.

#### Scenario: Standard pillar STL filename

- **WHEN** a committed pillar with `mode=standard`, `offsetX=0`, and `offsetY=0` is exported as STL
- **THEN** the filename MUST be `pillar-9-standard.stl`
- **AND** the response MUST carry `format=stl`, MIME `model/stl`, and non-empty binary bytes

#### Scenario: Thin-shell pillar STL filename

- **WHEN** a committed pillar with `mode=thin-shell`, `offsetX=0`, and `offsetY=0` is exported as STL
- **THEN** the filename MUST be `pillar-6-thin-shell.stl`
- **AND** the response MUST be generated from the committed pillar revision

#### Scenario: Positioning pillar STL filename

- **WHEN** a committed pillar with `mode=positioning`, `length=25`, `offsetX=0`, and `offsetY=0` is exported as STL
- **THEN** the filename MUST be `pillar-25-positioning.stl`
- **AND** the response MUST be generated from the committed pillar revision

#### Scenario: Offset pillar STL filename

- **WHEN** a committed pillar with `mode=positioning`, `length=25`, `offsetX=0.25`, and `offsetY=-0.15` is exported as STL
- **THEN** the filename MUST be `pillar-25-positioning-x0.25-y-0.15.stl`
- **AND** the filename MUST distinguish the typed XY position from the zero-offset export

#### Scenario: Pillar STL follows readiness gates

- **WHEN** the pillar mode, length, or offsets are invalid, stale, still generating, or have no committed revision
- **THEN** the STL action MUST be disabled
- **AND** the Worker MUST NOT receive an STL export request

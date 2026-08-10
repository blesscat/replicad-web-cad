## MODIFIED Requirements

### Requirement: Shared half-cell axis contract

OpenGrid board normalized snapshots MUST continue to use typed axis fields: `halfCellX` MUST be `none`, `left`, or `right`, and `halfCellY` MUST be `none`, `top`, or `bottom`. Snap normalized snapshots MUST instead use `footprint=full`, `half`, or `quarter`; they MUST NOT persist or expose independent Snap X/Y axis fields. `full` MUST map internally to `none/none`, `half` MUST map internally to `left/none`, and `quarter` MUST map internally to `left/top`. The board and Snap mappings MUST remain isolated, and a Snap footprint MUST NOT be inferred from a board snapshot.

#### Scenario: Full board and full Snap

- **WHEN** a valid OpenGrid board uses `halfCellX=none` and `halfCellY=none` and a valid Snap uses `footprint=full`
- **THEN** the board MUST represent its existing full-cell behavior
- **AND** the Snap MUST generate no half-cell boundary geometry

#### Scenario: Board keeps arbitrary supported axis directions

- **WHEN** a valid OpenGrid board uses any supported single or dual axis directions
- **THEN** the board MUST retain its existing direction, dimension, and boundary behavior
- **AND** those directions MUST NOT appear in or modify the Snap footprint snapshot

#### Scenario: Canonical Snap half and quarter mapping

- **WHEN** a valid Snap uses `footprint=half` or `footprint=quarter`
- **THEN** the builder MUST use `left/none` or `left/top` as its internal mapping respectively
- **AND** the mapping MUST be deterministic and independent of any OpenGrid board entry

#### Scenario: Invalid Snap axis fields

- **WHEN** a normalized Snap snapshot contains `halfCellX`, `halfCellY`, opposing directions, `allowHalfCell`, or an independent diagonal field
- **THEN** Snap validation MUST reject it before native CAD work
- **AND** the OpenGrid board validator MUST remain responsible for board axis validation

### Requirement: Snap host pitch compatibility

The shared half-cell geometry contract MUST define the Snap host pitch as 28 mm on an internal canonical axis whose footprint dimension is full and 14 mm on an internal canonical axis whose footprint dimension is half. A generated Snap with `footprint=full` MUST fit a 28 × 28 host; `footprint=half` MUST fit a 14 × 28 host; and `footprint=quarter` MUST fit a 14 × 14 host. Its local bounds MUST remain centered on X/Y, and its canonical boundary orientation MUST match the official `xleft/ytop` OpenGrid edge mapping.

#### Scenario: Full-footprint Snap host fit

- **WHEN** a Snap uses `footprint=full`
- **THEN** its final X and Y envelopes MUST fit within 28 mm host pitches
- **AND** its local bounds MUST remain centered on the origin

#### Scenario: Half-footprint Snap host fit

- **WHEN** a Snap uses `footprint=half`
- **THEN** its final X envelope MUST fit within the 14 mm canonical left host pitch
- **AND** its final Y envelope MUST fit within the 28 mm host pitch
- **AND** its left-side interface orientation MUST match the OpenGrid left half-cell contract
- **AND** all four local footprint corners MUST retain the OpenGrid diagonal locking profile through the selected assembly height

#### Scenario: Quarter-footprint Snap host fit

- **WHEN** a Snap uses `footprint=quarter`
- **THEN** its final X and Y envelopes MUST each fit within 14 mm host pitches
- **AND** its canonical left-top boundary interfaces MUST match the official OpenGrid edge profile
- **AND** it MUST remain a valid non-empty B-Rep with a usable central embedding interface
- **AND** all four local footprint corners MUST retain a full-height diagonal locking profile so the result can enter the 1/4 host opening

## MODIFIED Requirements

### Requirement: Open Shelf parameters are persisted independently

The versioned browser-local parameter record MUST store valid `opengrid-open-shelf` snapshots under that stable model id. The entry MUST contain typed `x`, `y`, `height`, `cellX`, `cellZ`, `angle`, and `honeycombMode` values accepted by the current validator and MUST remain independent from every other OpenGrid component and from the Wall scope. A legacy six-field entry MUST hydrate with `honeycombMode=false`; a missing, malformed, or otherwise invalid entry MUST fall back to the Open Shelf definition defaults.

#### Scenario: Restore valid or legacy Desk Open Shelf parameters

- **GIVEN** browser persistence contains a valid Desk-scoped `opengrid-open-shelf` snapshot
- **WHEN** the user opens `/cad/opengrid-open-shelf?system=desk`
- **THEN** the controls and first generation MUST use its six geometric values and typed material-mode value
- **AND** a legacy snapshot without the toggle MUST restore it as disabled
- **AND** no fields from another component may be merged into the snapshot

#### Scenario: Persist a valid Open Shelf update

- **WHEN** a new Open Shelf snapshot passes validation
- **THEN** only the active `opengrid-open-shelf` persistence entry MUST be updated
- **AND** the stored values MUST remain typed numbers and a boolean rather than raw input strings

#### Scenario: Invalid Open Shelf input does not overwrite persistence

- **GIVEN** a previously accepted Open Shelf snapshot exists
- **WHEN** the user enters an invalid or incomplete value
- **THEN** the previous accepted entry MUST remain unchanged
- **AND** the invalid snapshot MUST not be used for initialization or sent to the Worker

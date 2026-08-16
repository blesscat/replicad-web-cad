## ADDED Requirements

### Requirement: OpenGrid locating model descriptions

The system MUST ensure that the OpenGrid stackable-box and stackable-cylinder
panels and model descriptions describe the three locating-seat choices with the
exact labels `無角座`,
`角座孔`, and `內建角座`. The integrated description MUST communicate that the
selected positions receive a solid Ø5 mm round seat extending 3 mm outward
from the bottom. Existing model display names and OpenGrid identities MUST
remain unchanged.

#### Scenario: Integrated seat description is visible

- **WHEN** the user selects `內建角座` in either OpenGrid stackable model
- **THEN** the panel MUST identify the result as a Ø5 mm, 3 mm-high outward
  round seat
- **AND** the panel MUST continue to show the other two mutually exclusive
  choices

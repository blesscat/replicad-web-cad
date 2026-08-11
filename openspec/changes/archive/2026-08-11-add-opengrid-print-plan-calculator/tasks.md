## 1. Print-plan domain model

- [x] 1.1 Add typed OpenGrid print-plan inputs, piece-group outputs, primary-piece output, and field-level error results without changing the existing shared calculator result contract.
- [x] 1.2 Implement target/printer parsing, 28 mm full-cell conversion, printer-axis limits, existing OpenGrid maximum clamping, and invalid-input handling.
- [x] 1.3 Implement the practical uniform-span selection, fallback main spans, repeated edge/corner grouping, physical-dimension reporting, and footprint/count invariants.

## 2. OpenGrid planner UI integration

- [x] 2.1 Create the OpenGrid-specific print-plan calculator with accessible target X/Y and printer X/Y millimetre inputs, calculation action, field errors, and responsive layout.
- [x] 2.2 Render target footprint, printer limit, primary recommendation, every piece group, physical dimensions, quantities, and total piece count in an understandable live result.
- [x] 2.3 Replace only the OpenGrid panel's shared calculator usage with the print-plan calculator, apply the primary piece through the existing parameter flow, and preserve half-cell and unrelated OpenGrid parameters.
- [x] 2.4 Verify the helper is not a new CAD/catalog component: preserve the existing OpenGrid model ID, build key, route, export identity, and catalog registration.

## 3. Verification and regression coverage

- [x] 3.1 Add unit tests for target/printer validation, 35-cell uniform 7×7 planning, practical 34-cell fallback planning, one-axis and two-axis remainders, printer/model caps, and footprint/count invariants.
- [x] 3.2 Update OpenGrid end-to-end coverage for the four planner inputs, result summary, primary-piece application, manual controls, half-cell preservation, and narrow-viewport accessibility.
- [x] 3.3 Run focused unit and end-to-end tests plus the project build/type checks, then resolve any regressions in unchanged HSW, modular-grid-base, and stackable-box calculator coverage.

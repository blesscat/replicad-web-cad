## 1. Lock the revised pillar geometry contract

- [x] 1.1 Update the pillar contract tests and fixed geometry configuration to represent a 1 mm lower chamfer and a 0.5 mm upper chamfer while keeping the exact `{ length, baseConnection }` parameter shape, defaults, range, bounds, and export names.
- [x] 1.2 Add or update CAD-kernel integration assertions for both plain and base-connection pillars so the 5 mm default has a 1 mm lower chamfer, a 0.5 mm upper chamfer, a 3.5 mm plain straight section, and a 3.7 mm base-connection straight section.
- [x] 1.3 Refactor the `opengrid-pillar` builder to apply the lower and upper chamfer distances independently, preserve the Ø7 × 0.8 mm base flange and requested total height, and keep stale-generation and single-solid safeguards intact.

## 2. Add the common length controls

- [x] 2.1 Add clearly labeled 6 mm and 8 mm quick-action controls to the OpenGrid pillar length panel, derive their pressed state from the current raw length, and route activation through the existing `onInputChange` callback.
- [x] 2.2 Update the pillar catalog description and panel explanatory copy to describe the 0.5 mm upper chamfer without exposing a new adjustable chamfer field.
- [x] 2.3 Extend the OpenGrid pillar E2E coverage to activate both quick options, verify the existing length input and model lifecycle update, confirm custom length entry remains available, and verify persistence/export identity still uses the selected length and base mode.

## 3. Update quality gates and verify the change

- [x] 3.1 Update pillar quality probes and integration tests to derive upper transition checks from the 0.5 mm constant while retaining the 1 mm lower checks for plain mode and the sharp base-flange checks for base mode.
- [x] 3.2 Run focused unit and CAD-kernel tests for the pillar contract, catalog, builder, quality, and workspace lifecycle; resolve any assumptions that still describe a 1 mm upper chamfer.
- [x] 3.3 Run TypeScript checking, formatting checks, and the relevant Playwright test; confirm the final diff changes only the scoped pillar implementation, tests, and OpenSpec artifacts.

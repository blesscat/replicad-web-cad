## Why

The locating post currently exposes independent X and Y offset controls even though the intended adjustment is one shared XY size increment. This makes the panel and persisted contract more complex than needed and should be simplified while keeping the complete post, including its Ø7 mm flange, concentric and centered.

## What Changes

- **BREAKING** Replace the locating post's independent `offsetX` and `offsetY` parameters with one shared `offset` value that applies equally to X and Y.
- Expose one `XY 直徑增量` control for all locating post modes, retaining the existing range and 0.05 mm step.
- Apply the shared offset as an additive XY diameter increment to the complete generated locating post: `offset=0.5` makes Ø7 become Ø7.5 and Ø5 become Ø5.5. The post remains centered, and all Z dimensions and total lengths remain unchanged.
- Migrate legacy persisted snapshots with equal X/Y values to the shared offset; reset incompatible legacy snapshots with unequal X/Y values to zero rather than silently changing their position.
- Update deterministic export metadata, validation, bounds, persistence, worker generation, and behavior-focused tests for the shared offset contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-pillar-generator`: change the locating post parameter contract and geometry scenarios from independent X/Y offsets to one shared XY diameter increment while preserving the existing `opengrid-pillar` model ID, build key, route, modes, axial dimensions, and centered full-solid geometry.

## Impact

- Affected parameter contract and validation in `src/cad-contract/units/opengrid-pillar.ts` and workspace raw-parameter parsing.
- Affected locating post panel and model catalog schema.
- Affected worker geometry sizing, quality bounds, export filename identity, persistence hydration, and related unit, worker, and end-to-end tests.
- No new dependencies; existing public model identity and routes remain unchanged.

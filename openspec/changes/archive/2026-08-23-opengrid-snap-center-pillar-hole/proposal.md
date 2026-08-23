## Why

The optional Snap center-remover opening is currently a stepped rectangular profile whose 4 mm upper width blocks the existing nominal Ø5 mm positioning pillar. Adding a fixed centered circular passage makes the remover opening usable with the shared locating-pillar geometry without changing the Snap's public parameter contract.

## What Changes

- Extend the `centerRemoverHole=true` body cutter with a centered, vertical nominal Ø5 mm circular passage.
- Preserve the existing 8 × 8 mm lower remover opening, 4 × 8 mm upper stepped profile, center, Z behavior, outer envelope, and other optional features.
- Keep the feature tied to the existing remover-hole control; add no new parameter, route, filename, or persistence field.
- Leave Half and Quarter fixed-footprint assets and their existing disabled optional-feature behavior unchanged.
- Add geometry and compatibility quality coverage for Standard and Directional profiles in Full and Lite variants, including valid XY offsets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-snap`: Require the optional center-remover profile to include a fixed centered nominal Ø5 mm passage compatible with the zero-offset positioning pillar.

## Impact

- CAD kernel: update the OpenGrid Snap center-remover cutter and its quality probes.
- Tests: extend Snap builder/profile integration coverage for the circular passage and preserve the stepped remover geometry.
- No Worker message, parameter validation, catalog, UI, export filename, or canonical asset changes are expected.

## Why

The OpenGrid stackable cylinder currently has a fixed cylindrical wall profile, so it cannot provide the four-sided access openings shown in the reference shape. Users need to tune each opening independently while preserving the existing floor holes, printable bottom profile, and same-diameter stacking interface.

## What Changes

- Add four independently configurable top-open side openings at the `+X`, `-X`, `+Y`, and `-Y` directions.
- Give each opening three typed controls: downward cut depth, flat bottom length, and side-wall angle in degrees.
- Define each opening as an open-top U/V-shaped notch with a flat bottom, fixed 2.5 mm rounded transitions at both the lower and upper edges, and straight side walls whose slope is controlled by the angle. At 90° the sides are vertical and the profile is ㄩ-like; at 45° the sides flare outward and the profile is V-like. These are not circular holes.
- Validate each opening against the requested height, active floor thickness, wall/stacking geometry, and neighboring openings so invalid or overlapping cuts are rejected.
- Preserve the existing 2 mm wall, bottom-hole layout and shared hole switch, three bottom modes, printable lower profile, and same-diameter stacking contract.
- Preserve the existing `opengrid-stackable-cylinder` model ID, build key, route, and display identity; extend its normalized parameters and deterministic export identity for the new opening settings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-cylinder`: extend the cylinder parameter contract, UI, B-Rep generation, quality checks, and export metadata with four independent top-open side openings.

## Impact

- Affected typed contract and validation: `src/cad-contract/units/opengrid-stackable-cylinder.ts` and its public exports.
- Affected CAD builder and geometry quality diagnostics: `src/cad-kernel/components/opengrid-stackable-cylinder/builder.ts` and related Worker generation checks.
- Affected cylinder parameter panel, persistence normalization, restore behavior, and export filename generation.
- Affected unit, Worker integration, and browser E2E coverage for parameter validation, independent directions, geometry quality, and deterministic exports.
- No new dependency or component identity is introduced; the existing OpenGrid component ID remains intentionally preserved.

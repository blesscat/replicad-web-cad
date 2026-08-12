## Why

A single-arm divider currently starts its complete wall profile at the central
construction axis, so the central locating peg is covered by wall on only one
side. The resulting center junction looks visually incomplete even though the
peg and wall remain connected.

## What Changes

- Extend the complete single-arm profile across the central axis toward the
  inactive side by half of the 5 mm base width (2.5 mm).
- Apply the extension to the 5 mm base, the 45-degree transition, and the
  selected upper wall so the central locating peg has wall directly above it.
- Preserve the existing retracted active endpoint, single-solid result, and
  all geometry for L, T, straight, and cross dividers.
- Add Worker integration coverage for the center extension and the unchanged
  active terminal endpoint.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-divider-generator`: add the single-arm central-junction wall
  coverage requirement.

## Impact

The Worker-only OpenGrid Divider CAD builder and its geometry integration tests
are affected. The existing `modelId=opengrid-divider`, build key, route,
parameter schema, persistence format, export identity, and multi-arm geometry
remain unchanged.

## Why

The Organizer Box currently offers only permanently fused corner feet or the
full stacking interface, so worn feet cannot be replaced independently. A
shared detachable corner-seat interface lets the Organizer Box be the first
physical fit trial before the same proven socket is adopted by other OpenGrid
models.

## What Changes

- Add a third, mutually exclusive Organizer Box bottom-interface mode for four
  detachable corner seats while preserving the existing fixed-foot and
  stackable modes.
- Form each keyed, retaining-tab female socket directly in the Organizer Box
  solid at the existing four corner locations; no separately printable socket
  holder is emitted.
- Rotate the four sockets deterministically with their corners (0°, 90°, 180°,
  and 270° around the footprint) so their internal tab orientation follows the
  box perimeter consistently.
- Add a fixed detachable-corner-seat mode to the existing OpenGrid Pillar
  generator. The male seat preserves the reference STEP geometry, including
  the 3 mm locating section, 0.2 mm-high Ø4.6-to-Ø5 insertion chamfer, keyed
  retaining head, and 0.15 mm raised wear surface for a total 4.5 mm height.
- Keep the supplied male and female STEP geometry as the initial fixed fit
  contract without a user-facing clearance adjustment. Require a hand
  press-fit that stays attached when the box is lifted and remains removable
  by hand.
- Scope initial model integration to `opengrid-organizer-box`; rollout to other
  socket-bearing models remains a follow-up after physical print validation.
- Preserve all existing OpenGrid model IDs, build keys, and route slugs; this
  change adds modes to existing components and does not introduce or rename a
  component.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-organizer-box`: Add the third detachable-corner-seat bottom mode,
  integrated four-socket geometry, deterministic corner rotations, validation,
  persistence, preview, and export identity.
- `opengrid-pillar-generator`: Add a fixed, independently exportable male
  detachable-corner-seat mode with the reference profile and no adjustable
  offset or length.
- `opengrid-locating-assembly-interface`: Publish the shared fixed male/female
  detachable-seat geometry and fit/quality contract consumed by both models.

## Impact

- Organizer Box parameter contracts, catalog controls, validation, persistence,
  export naming, bounds, and Worker B-Rep construction.
- OpenGrid Pillar parameter union, controls, validation, persistence, export
  naming, quality gates, and Worker builder.
- Shared locating-assembly constants/reference assets and compatibility tests.
- Existing component identities and existing mode geometry remain unchanged.

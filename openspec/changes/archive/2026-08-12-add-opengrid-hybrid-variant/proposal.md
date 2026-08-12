## Why

The OpenGrid board route currently exposes the official Full, Lite, and Heavy
profiles, but it cannot generate the community `openGrid Hybrid` board. The
published Hybrid definition combines a Heavy outer perimeter with standard
OpenGrid cells inside, trading some of Heavy's material and print time for a
stiffer perimeter; adding it to the existing board generator makes that
documented variant available without changing the OpenGrid interface.

## What Changes

- Add `Hybrid` as a normalized OpenGrid board variant while preserving the
  existing `opengrid` model id, route, persistence key, and Worker protocol.
- Generate a Hybrid board with a one-cell-wide Heavy perimeter and standard
  Full-profile cells in the interior. A board with no interior cells is
  Heavy-equivalent because every cell is part of the perimeter.
- Add the reference model's one-sided sloped transition on the inward-facing
  edge where the Heavy perimeter rises from the Full interior height to the
  Heavy envelope height; the outside perimeter edge remains Heavy's vertical
  profile.
- Preserve the 28 mm pitch, 1–17 full-cell range, optional 14 mm half-cell
  extensions, centered envelope, chamfer controls, connector-hole controls,
  screw lattice, preview, quality gate, STEP export, and binary STL export.
- Expose the Hybrid choice and its derived 13.8 mm maximum thickness in the
  OpenGrid panel and user-facing descriptions.
- Extend contract, geometry, lifecycle, benchmark, and regression coverage to
  prove that Hybrid's interior remains standard while its perimeter uses the
  Heavy profile and all existing feature controls remain valid.
- Record the external definition and comparison limits in the design and
  specs; the product runtime MUST NOT depend on MakerWorld or OpenSCAD.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-generator`: Extend the existing OpenGrid variant contract and
  geometry with the published Hybrid perimeter/interior assembly.
- `cad-workspace`: Extend the existing `/cad/opengrid` controls and derived
  dimensions to include Hybrid while preserving the existing route lifecycle.

## Impact

- Affected normalized contract and bounds: `src/cad-contract/units/opengrid.ts`.
- Affected Replicad profile and product builder:
  `src/cad-kernel/components/opengrid/`.
- Affected catalog/panel/docs and OpenGrid unit, Worker, benchmark, and E2E
  tests.
- No new model id, route, dependency, persistence namespace, or Worker
  protocol version is introduced; existing Full, Lite, and Heavy snapshots
  remain valid.
- Reference definition: MakerWorld design `1863562`,
  `https://makerworld.com/en/models/1863562-opengrid-hybrid-28-sizes`, whose
  public design description states that Hybrid has one Heavy perimeter and
  standard grids inside.

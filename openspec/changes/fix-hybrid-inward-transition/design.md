## Context

The Hybrid builder already creates one transition piece for each exposed side
of a Heavy perimeter cell and fuses those pieces spatially. The target local
profile starts at the Full-side origin and rises toward the Heavy perimeter
boundary across one full pitch. The existing spatial assembly and feature-cut
ordering are useful constraints and should remain unchanged.

The centered OpenGrid coordinate system places the top and right perimeter
boundaries at the negative-local side of their perimeter cells, and the bottom
and left boundaries at the positive-local side. The transition can therefore
be moved without changing side enumeration: shift its origin by the configured
full-pitch span from the Heavy boundary into the adjacent interior cell and
reverse only the local origin side as needed. Because a full-pitch extrusion
crosses an opening after this move, the transition footprint is clipped by the
adjacent cell's 25 mm opening.

## Goals / Non-Goals

**Goals:**

- Construct a full-pitch sloped Hybrid transition from the Full interior to
  the Heavy perimeter boundary.
- Keep the existing side grouping, spatial fuse tree, Heavy/Full layer
  assembly, feature subtraction, and public model contracts.
- Add an inner-corner ramp that joins the two side transitions toward the
  interior while remaining on the existing corner-node material.
- Update quality probes and behavior tests to inspect the new surface location
  and preserve the through-openings.

**Non-Goals:**

- Do not introduce a new OpenGrid variant or model id.
- Do not change Full, Lite, Heavy, bridge, connector, screw, chamfer, or
  half-cell semantics.
- Do not replace the existing lower-surface cell-balanced assembly with a new
  assembly algorithm.

## Decisions

### Use a full-pitch inward span

The transition span is defined as `gridPitch`, exposed through the existing
OpenGrid configuration so tests and quality checks share one source of truth.
The local profile retains the existing Full-to-Heavy thickness interpolation
and seam overlap. This keeps the change limited to the transition's location
and extent instead of inventing another profile.

For a perimeter cell center `(cx, cy)` and half pitch `h`, the boundary and
profile origin are:

| Side | Heavy boundary | Full-side profile origin | Direction to boundary |
| --- | --- | --- | --- |
| top | `cy - h` | `cy - h - span` | `+Y` |
| right | `cx - h` | `cx - h - span` | `+X` |
| bottom | `cy + h` | `cy + h + span` | `-Y` |
| left | `cx + h` | `cx + h + span` | `-X` |

The profile's low endpoint is at the Full-side origin and its high endpoint is
at the Heavy boundary. The initial tangential extrusion remains one full cell
pitch, matching the existing side piece; clipping it by the adjacent opening
preserves the through-opening while retaining the edge rails.

### Add an inner-corner ramp

Corner cells continue to emit their two side pieces. After the inward shift,
an inner-corner ramp is added in the adjacent inner cell. It rises from the
existing Full corner-node support to the Heavy boundary height. Its footprint
is clipped by the same through-opening envelope, so it creates a diagonal
join without closing the opening. The corner piece is placed in its own
spatial region and fused through the existing spatial tree. Spatial assembly
centers for all transition pieces are shifted with the geometry to keep region
partitioning local to the actual transition.

### Keep transition assembly after feature cuts

The existing product order remains: build lower and upper surfaces, apply the
bridge cut, then fuse transitions. This preserves connector, screw, and
chamfer behavior while making the new transition a final structural join.

### Validate geometry behavior rather than implementation details

Tests will measure section/intersection volumes and Z heights at inward and
outward probe positions, and will check corner diagonals and openings. They
will use the shared OpenGrid configuration for pitch, thickness, and transition
span rather than duplicating geometry constants.

## Risks / Trade-offs

- [Risk] Moving the wedge into the Full cell could cover an opening or capture
  ledge. → Run the Hybrid quality gate and opening probes on 3 by 3 and
  rectangular boards; adjust only the transition footprint if a regression is
  observed.
- [Risk] A longer wedge increases overlap with neighboring Full geometry and
  native fuse cost. → Preserve the existing spatial grouping and compare the
  focused Hybrid integration runtime with the current regression suite.
- [Risk] The two corner pieces could leave a seam or invalid multi-solid join.
  → Require single-solid validity and add diagonal corner occupancy checks.

## Migration Plan

No persisted migration is required. The configuration value and internal
quality probes change together, while existing model ids and normalized
snapshots remain compatible. If the geometry gate fails, revert the transition
origin/span change without changing the public OpenGrid contract.

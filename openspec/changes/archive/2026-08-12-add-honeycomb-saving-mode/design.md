## Context

The existing `opengrid-stackable-box` and `opengrid-stackable-cylinder` builders first create their profile shell and then apply existing stacking, mounting-hole, bottom-hole, and side-opening features. Those features are already covered by geometry quality gates and must remain the source of truth for functional interfaces. See `proposal.md` and the two delta specs for the user-visible contract.

The change is an internal profile extension to the existing OpenGrid models. It does not add a model ID, route, Worker command, external dependency, or new persisted storage format.

## Goals / Non-Goals

**Goals:**

- Add one normalized `honeycombMode` flag to both existing model contracts with legacy `false` hydration.
- Generate connected, support-friendly hexagonal openings in eligible vertical and bottom panels for both rectangular and circular containers.
- Keep existing holes, side openings, floor profiles, mounting sockets, and stacking interfaces unchanged by deriving conservative geometric keep-outs before creating cutters.
- Keep the normal, base-plate, thin-shell, thin-bottom, and no-hole branches behaviorally unchanged when the flag is disabled.
- Batch lattice cutters into a small number of compound Boolean operations and expose enough structural metrics for focused quality tests and benchmarks.

**Non-Goals:**

- Do not add a new model, route, user-configurable lattice-density panel, slicer integration, or printer-specific G-code settings.
- Do not replace the existing shell with a separate collection of hexagonal columns or change the OpenGrid stacking contract.
- Do not promise a fixed wall thickness or print-time reduction across printers; the feature is validated by exported volume and geometry correctness, while slicer time remains printer/profile dependent.
- Do not apply lattice cells that are clipped by an edge, opening, hole keep-out, stacking feature, seam, or active floor transition.

## Decisions

### 1. Use a shared internal lattice utility, not a new OpenGrid component

Add a Worker-only geometry helper under `src/cad-kernel/lattice/` and a shared contract configuration under `src/cad-contract/units/`. The helper owns regular-hex profiles, local-plane extrusion, candidate-center generation, conservative overlap checks, and compound cutter ownership. The two existing component directories continue to own their builders and quality gates; no `opengrid-*` model ID, catalog entry, or route is introduced.

**Alternative rejected:** Create an `opengrid-honeycomb` component and compose it as a third model. That would split persistence, catalog, Worker routing, and export identity for a profile that belongs to both existing container models.

### 2. Apply lattice cuts after existing functional features

Each builder keeps its current sequence intact and invokes a final honeycomb stage only when `honeycombMode=true`:

```text
profile shell
  → existing stacking / base profile
  → existing mounting and bottom holes
  → existing side openings
  → honeycomb cutters restricted to eligible panels
  → existing quality gate plus honeycomb checks
```

The final stage still derives all protected regions from the normalized parameters. Applying it last makes any accidental intersection with a functional feature observable in the same candidate, while the conservative candidate filter prevents the cut from reaching that feature.

### 3. Anchor the pattern to the existing 14 mm OpenGrid half-pitch

The internal configuration uses the existing 14 mm half-pitch as the lattice center spacing anchor, a fixed printable hex opening size, a perimeter frame, and a feature clearance. These are implementation constants rather than user controls. The pattern is phase-stable for equivalent dimensions, and candidate centers are generated only when a complete hex fits inside the panel after the frame and keep-outs.

The first version uses a flat-sided regular hexagon on planar box walls and bottom faces. For the cylinder wall, the same local hex profile is extruded through the wall along the local radial normal and rotated around Z for each angular column. This preserves the circular outer envelope while producing visibly hexagonal openings without polygonalizing the container boundary.

**Alternative rejected:** Use slicer infill or a mesh-only perforation. The exported STEP must contain the actual material-saving geometry, and the existing Worker exports are B-Rep based.

### 4. Derive protected regions instead of cutting around holes afterward

The lattice utility receives a panel-specific protected-region description and rejects a candidate before a cutter is created when its hex footprint overlaps any protected region. Protection is conservative:

- box side panels reserve the outer frame, rounded corners, top rail or chamfer, lower structural band, and the tangent/height envelope of every enabled side opening;
- box bottom panels reserve the perimeter, corner sockets, ordinary bottom-hole centers, grid-seam relief bands, bottom guide or base-plate support, and the central floor probe area;
- cylinder side panels reserve the top and lower rims, radial edge frame, and angular/height envelopes of enabled cardinal openings;
- cylinder bottom panels reserve the outer circular frame, the lower mating skin/profile, every center/cardinal stepped-hole keep-out, and the thin-profile ramp or floor transition; eligible cells are recessed only through the floor material above that preserved lower interface, with a no-cell fallback when no safe vertical span remains.

The resulting cutters are strictly contained in the intended wall or floor span and extend only through that material thickness with a small Boolean margin. Cylinder bottom cutters stop above the lower mating skin so the original external mating surface and lower profile remain unchanged. A hex cell that does not fit is omitted rather than clipped.

### 5. Batch cutter construction and native-resource ownership

The utility creates one compound cutter per logical panel group where practical: box sides, box bottom, cylinder circumferential wall, and cylinder bottom. The builders perform measured compound cuts through the existing Boolean progress reporter, check generation currency between groups, and delete all temporary sketches, prisms, compounds, and failed candidates. No lattice cell is cut through a sequential `shape.cut(cell)` loop.

If a panel has no safe cells, the group is a no-op and the original shape is returned. If a compound Boolean fails, the builder reports a honeycomb-stage error and rejects the candidate; it never silently falls back to a partially cut shape.

### 6. Keep the public parameter and UI layers explicit

Add `honeycombMode` to each typed parameter key union, default snapshot, exact-key validation forms, raw/typed workspace conversion, legacy hydration, and model filename fingerprint. The model definitions keep the boolean outside their numeric schema, and each component panel renders a custom checkbox labeled `省料模式（六角鏤空）`. The existing mode radio groups and all hole/opening controls remain unchanged.

When disabled, filenames and normalized geometry remain byte-for-byte contract-compatible with the current profile. When enabled, both STEP and STL names append a deterministic `-honeycomb` mode marker before any existing opening or no-hole suffix according to each model's current filename ordering.

### 7. Extend quality checks through protected-feature comparison

Honeycomb integration tests build identical parameter snapshots with the flag off and on, then compare:

- model bounds and requested height/diameter/footprint;
- box socket and ordinary-hole centers, diameters, step depths, and captive retention probes;
- cylinder center/cardinal hole records, clearances, and stepped sections;
- all existing side-opening boundary and neighbor probes;
- box sliding/base/thin-shell interface probes and cylinder same-diameter mating probes;
- single-solid validity, B-Rep validity, non-empty mesh, STEP/STL output, and lower volume when at least one cell is eligible.

The quality report gains a honeycomb-enabled indicator and safe-cell count so a valid no-cell fallback is distinguishable from a failed lattice operation. Existing profile assertions remain active; honeycomb-specific checks are additive and only run when the flag is enabled.

### 8. Validate the feature in TDD-sized slices

Implement contract and raw-parameter tests first, then geometry helper tests for cell fit and protected-region rejection, followed by one box and one cylinder integration fixture. Add combinations for full bottom holes, disabled holes, side openings, thin/base profiles, and dimensions too small for a cell. Finish with focused Worker/export and panel tests, then the repository typecheck, formatter, build, and relevant full test suite.

## Risks / Trade-offs

- **Compound Boolean operations can fail on dense disconnected cutters** → group cutters by panel, use the existing measured Boolean scopes, keep cell count bounded by the existing 500 mm envelope, and reject invalid candidates through the quality gate.
- **A curved-wall tangent cutter may look less uniform near the cylinder's curvature** → use local radial placement with an unchanged circular envelope, leave a generous frame, and validate representative angular and radial probes rather than approximating the entire cylinder as a polygon.
- **A lattice hole may accidentally weaken a functional bridge or seam** → reserve parameter-derived keep-outs before creating cutters and compare protected probes against the solid baseline in integration tests.
- **More open-cell boundaries can increase mesh triangles or slicer travel** → keep lattice density fixed, measure B-Rep/mesh timing and volume separately, and avoid claiming print-time improvement as a hard invariant.
- **Existing quality probes may land in a new safe opening** → retain a central/edge protected probe area and add honeycomb-aware safe-cell metrics before relaxing any existing quality assertion.

## Migration Plan

1. Add `honeycombMode=false` to defaults and normalize its absence in persisted/imported snapshots.
2. Add the shared configuration, typed/raw/UI/catalog changes, and deterministic filename marker.
3. Add the shared lattice utility and integrate the final protected cutter stage into both existing builders.
4. Add additive quality reporting and behavior-focused unit, Worker, UI, mesh, and export coverage.
5. Run targeted CAD tests, typecheck, formatting, build, and the full relevant suite.
6. If the feature must be rolled back, remove the final honeycomb stage and keep the field normalized to `false`; existing snapshots and filenames remain compatible.

## Open Questions

None. Cell density is intentionally fixed for this first switch-based release, and the bottom lattice scope is included with protected holes and interfaces as agreed during exploration.

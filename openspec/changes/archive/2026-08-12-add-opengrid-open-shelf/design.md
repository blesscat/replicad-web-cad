## Context

OpenGrid component registration is split across the typed CAD contract, model catalog, Svelte parameter panels, CAD-kernel model registry, Worker lifecycle, browser-local parameter store, and preview capture workflow. Existing OpenGrid stackable-box geometry already defines the official full pitch and the `x*28 - 0.15` / `y*28 - 0.15` footprint clearance, but its stepped Ø7.05 mm retaining feature is intentionally not suitable for this component.

The new component must preserve a physically meaningful side profile: the front is `-Y`, the bottom is horizontal, the backboard is vertical, and the full cell depth reaches the rear. The sloped shelves, internal X dividers, and top panel share one inclination toward the front. The user-provided height is the complete world-Z envelope, so increasing the angle lowers the rear end and reduces the available cell height.

## Goals / Non-Goals

**Goals:**

- Add a stable `opengrid-open-shelf` component that follows the repository's OpenGrid naming convention in every catalog, route, build, and component directory.
- Provide typed, independently persisted controls for outer X/Y grid counts, inclusive overall height, internal X cell count, internal Z cell count, and a 0–75° front-up angle.
- Generate one valid solid with the specified plate thicknesses and four plain Ø4.5 mm × 3 mm downward pegs.
- Keep the existing OpenGrid pitch, footprint clearance, preview, export, latest-wins, and system-context contracts coherent.
- Add behavior-focused contract, geometry, integration, persistence, and preview coverage.

**Non-Goals:**

- Do not change any existing model id, build key, route slug, geometry, retaining-hole contract, or saved snapshot.
- Do not add a Wall Related catalog entry or a second system-specific model implementation.
- Do not add ornamental fillets, chamfers, holes, stackable shoulders, or a configurable material/thickness editor in this first version.
- Do not shorten the depth of individual cells or reinterpret the opening as a top opening.

## Decisions

### 1. Use a new component-local contract and builder

The stable id, build key, route slug, catalog component directory, and CAD-kernel directory will all be `opengrid-open-shelf`. The contract will own validation, derived footprint/angle geometry, bounds, peg centers, and deterministic export names; the builder will consume only that contract.

This is preferred over extending `opengrid-stackable-box` because the two components have different height semantics, plate topology, angle behavior, and locating interface. Reusing the box builder would also risk importing its Ø7.05 mm retaining shoulder.

### 2. Keep the public parameter snapshot small and typed

The persisted snapshot is:

```text
{ x, y, height, cellX, cellZ, angle }
```

`x` and `y` use the stackable-box OpenGrid half-grid step and the shared 28 mm pitch. `height` is an integer mm value. `cellX`, `cellZ`, and `angle` are safe integers. Defaults are `{ x: 4, y: 3, height: 50, cellX: 1, cellZ: 2, angle: 15 }`.

Validation will reject non-finite, fractional, out-of-range values, a footprint beyond the existing 500 mm workspace envelope, and any angle/height combination that leaves a non-positive rear clear cell height. The UI cap remains 75°; the validator provides the effective lower cap for a particular footprint and height with a field-specific diagnostic.

This keeps persistence and the Worker protocol independent from derived values. The builder derives the front-to-rear elevation difference as `depth * tan(angle)` and distributes cell boundaries from the bottom-board top to the sloped top-board inner surface.

### 3. Build the profile with planar solids and fuse once

The builder will create:

- a horizontal 2 mm bottom board;
- two vertical side-wall profiles, each 1.6 mm in X, whose upper edge follows the common sloped plane;
- a vertical 1.2 mm backboard at the rear;
- sloped 1.2 mm horizontal shelves and sloped 1.2 mm internal X dividers spanning the complete Y depth;
- a sloped 1.6 mm top panel spanning the complete Y depth; and
- four plain Ø4.5 mm cylinders extending from Z=-3 mm into the bottom board.

YZ planar profiles will be extruded along X so the plate thickness is measured normal to the relevant sloped plane. All sloped boards use the same front-up angle. The parts will overlap at their joints and be fused into a single solid, with generation-current checks at the same safe boundaries used by existing component builders. The final shape will be bounded to the declared footprint where plate-edge normal offsets would otherwise protrude by a fraction of a millimetre.

The top-panel outer front surface is the Z=`height` datum. The rear top is lower by the derived elevation difference; the bottom-board top remains at Z=2 mm. Thus the model's expected Z bounds are `[-3, height]`, while the requested height never includes the pegs below the base.

### 4. Reuse the existing system-context and preview model

The catalog will expose the component in the Desk subgroup only. The existing generic OpenGrid context rule already keeps other visible OpenGrid entries out of Wall Related; the new component will use its definition defaults unless a valid Desk-scoped snapshot exists. The preview metadata will point to `opengrid-open-shelf-desk.png` and the existing Playwright capture workflow will generate it from the same component generator.

### 5. Register through the existing route and Worker boundaries

The component will be added to the existing `ModelId`/parameter union, model validation and bounds/file-name dispatch, catalog definitions, parameter-key parsing, default state, panel dispatch, kernel definition list, and route/catalog lookup. No new Worker protocol message or export path is introduced. The existing candidate-ready → commit → mesh/export gates remain authoritative.

## Risks / Trade-offs

- [Risk] A high angle combined with a short overall height can make the rear cell degenerate. → Mitigation: validate the derived rear clear height before generation and report the angle/height constraint without replacing the last committed preview.
- [Risk] Fusing many sloped plates can be slower or fail at coincident seams. → Mitigation: use deliberate overlap, a bounded number of planar parts, generation-current checks, and geometry quality tests at default and edge configurations.
- [Risk] Normal thickness offsets can slightly exceed the nominal Y envelope at the front or rear. → Mitigation: use a final footprint envelope operation and assert bounds against the contract tolerance.
- [Risk] The existing preview capture suite is catalog-driven and a missing asset can fail the full visible set. → Mitigation: register preview metadata and generate/verify the Desk asset before the change is considered complete.

## Migration Plan

No migration of existing ids or saved values is required. Add the new definition and its assets, then run unit, Worker, integration, and preview verification suites. Existing persisted records remain untouched; a missing or malformed `opengrid-open-shelf` entry falls back to the new defaults. If the feature must be rolled back, remove the new registration and asset while leaving all existing entries and versioned persistence buckets unchanged.

## Open Questions

None for this first implementation. The user confirmed the total-height datum, front opening direction, full-depth cells, 75° UI cap, four plain Ø4.5 mm × 3 mm pegs, and the existing OpenGrid footprint/positioning semantics.

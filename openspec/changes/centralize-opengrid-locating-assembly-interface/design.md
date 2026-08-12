## Context

The completed grid-contract change centralized the official 28 mm and 14 mm pitches, but intentionally left feature-specific hole dimensions in their owning contracts. The remaining OpenGrid locating and assembly dimensions are now confirmed: Snap, Divider, Stackable Box, and the Pillar positioning mode use a nominal Ø5 mm locating interface; fixed Pillar standard/thin-shell bodies use the shared Ø4.5 mm test-shaft dimension; ordinary Stackable Box holes use a Ø5.05 mm assembly opening; special Box sockets and Cylinder bottom holes use a Ø4.55 mm shaft opening followed by a Ø7.05 mm retaining opening; and the compatibility fixture uses a Ø4.5 mm shaft with a Ø7 mm × 0.8 mm flange.

These dimensions are implementation and specification details that must remain centralized so the generated shoulder, the compatibility fixture, and the quality gates describe the same physical interface.

The Desk System query context is an entry and preset concern, not the correct owner for CAD interface dimensions. The shared contract belongs in src/cad-contract/units and may be consumed by both Desk-visible OpenGrid components and their Worker-only geometry validators.

## Goals / Non-Goals

**Goals:**

- Create one shared OpenGrid locating and assembly interface contract.
- Keep the nominal Ø5 mm locating dimension as the source for Snap hole radius, Divider pegs, Pillar positioning body diameter, Stackable Box nominal base-hole diameter, and the Box socket de-duplication threshold. Keep fixed Pillar standard/thin-shell body diameter on the shared Ø4.5 mm test-shaft dimension.
- Derive the Ø5.05 mm assembly opening from the Ø5 mm nominal dimension plus the shared 0.05 mm assembly increment.
- Define the Ø4.55 mm shaft opening from the Ø4.5 mm test shaft plus the same 0.05 mm increment, and retain the Ø7.05 mm flange-side opening.
- Keep the current Ø4.55 mm lower passage and Ø7.05 mm retaining section in the Stackable Box special socket and Stackable Cylinder bottom-hole profiles.
- Keep the Box and Cylinder quality fixture as a Ø7 mm × 0.8 mm flange and Ø4.5 mm shaft whose length is derived from the active floor thickness; a 2 mm thin floor uses a 3 mm shaft, a 3 mm base plate uses a 4 mm shaft, and a 5 mm normal floor uses a 6 mm shaft.
- Preserve stable model IDs, routes, parameter snapshots, the official grid contract, and the user-facing Ø5 mm OpenGrid Pillar geometry.

**Non-Goals:**

- Do not change the official 28 mm or 14 mm grid pitch.
- Do not change the OpenGrid system-entry context, Desk/Wall routing, or persistence scopes.
- Do not change the ordinary Stackable Box bottom-hole profile into a stepped or stopped hole; it remains a straight Ø5.05 mm hole.
- Do not change the current Pillar mode geometry: standard/thin-shell bodyDiameter remains Ø4.5 mm and positioningBodyDiameter remains Ø5 mm. The Ø4.5 mm shaft is shared by the fixed Pillar body and the compatibility-test fixture.
- Do not merge the shared 0.05 mm assembly increment with Box's 0.25 mm validation tolerance, hole depths, 7 mm positional offsets, or other component-specific clearances.

## Decisions

### 1. Add a dedicated interface contract

Add a module under src/cad-contract/units for the shared locating and assembly interface. The contract exposes the nominal locating diameter of 5 mm, the assembly increment of 0.05 mm, the derived assembly opening of 5.05 mm, the test shaft diameter of 4.5 mm, the derived shaft opening of 4.55 mm, the retaining opening of 7.05 mm, the test flange diameter of 7 mm, and the test flange height of 0.8 mm.

The contract is a geometry specification, not a user parameter schema. Consumers keep their existing descriptive field names where changing them would expand the compatibility surface, but their values resolve from the shared contract.

### 2. Map each consumer by physical meaning

- Snap profile locating-hole radius resolves to half of the shared nominal diameter.
- Divider pegDiameter, Pillar positioningBodyDiameter, and Stackable Box baseHoleDiameter resolve to the shared nominal diameter; fixed Pillar bodyDiameter resolves to the shared test-shaft diameter.
- Stackable Box bottomGridHoleDiameter resolves to the shared assembly opening. Stackable Box baseHoleBottomOpeningDiameter and Stackable Cylinder bottomHoleDiameter resolve to the shared shaft opening.
- Stackable Box baseHoleTopOpeningDiameter and Stackable Cylinder innerHoleDiameter resolve to the shared retaining opening. Their names may be retained temporarily for compatibility, but their meaning is the flange-side retaining section after the lower shaft passage.
- Stackable Box socketDeduplicationDistance resolves to the shared nominal diameter while remaining a positional de-duplication threshold. It must not be used as an assembly-hole clearance.

### 3. Use a shoulder-stop profile for the new insert

The Stackable Box special socket and Stackable Cylinder bottom hole retain their existing lower-to-upper axial segmentation and planar shoulder. The lower/outside section is Ø4.55 mm and the upper/interior retaining section is Ø7.05 mm. A Ø4.5 mm shaft can pass through both sections, while a Ø7 mm flange is retained by the shoulder-side profile.

The ordinary Stackable Box bottom grid remains a straight Ø5.05 mm through-hole and does not receive the Ø7.05 mm retaining section.

### 4. Derive the compatibility fixture from active floor thickness

The Box quality fixture uses a Ø4.5 mm shaft and a Ø7 mm × 0.8 mm flange. Its shaft length is the active floor or base-plate thickness plus the agreed 1 mm exterior allowance: the 2 mm thin-shell floor uses a 3 mm shaft, the 3 mm base-plate floor uses a 4 mm shaft, and the 5 mm normal floor uses a 6 mm shaft. The same rule applies to the Cylinder default, thin-bottom, and bottom-plate modes.

The fixture is used to validate the physical mounting interface; it is not emitted as part of the runtime Box or Cylinder B-Rep. Existing Snap reference compatibility continues to use the nominal Ø5 mm interface, while the fixed Pillar body continues to use its declared Ø4.5 mm mode geometry.

### 5. Keep validation responsibilities separate

The Box quality gate continues to check non-overlapping socket locations using the actual flange envelope where spacing matters, while the layout helper uses the shared nominal Ø5 mm de-duplication threshold to collapse coincident or physically overlapping nominal socket locations. Tests must cover both responsibilities instead of treating the two values as interchangeable.

### 6. Preserve stable external contracts

No model ID, build key, route, parameter snapshot field, export filename contract, or system-entry context changes. The implementation keeps the current Box special socket, Cylinder stepped hole, and related quality fixture dimensions while centralizing their shared source.

## Risks / Trade-offs

- **The lower shaft passage and flange-side retaining section could be conflated** → Keep Ø4.55 mm, Ø7.05 mm, and the Ø7 mm flange as separate named contract values and validate each profile independently.
- **Existing tests and specs could drift from the shared interface** → Update every behavior assertion and the Box/Cylinder quality fixture in the same change; do not leave duplicate dimension sources.
- **A Ø7 mm flange is larger than the nominal Ø5 mm socket interface** → Keep flange envelope spacing validation separate from nominal socket de-duplication and cover half-cell footprints.
- **The value 0.05 mm could be confused with Box's 0.25 mm quality tolerance** → Give the shared increment and component-specific tolerances distinct names and preserve their separate uses.
- **The Ø4.5 mm fixture could be mistaken for a Pillar mode change** → Keep PILLAR_CONFIGURATION.bodyDiameter at Ø4.5 mm and positioningBodyDiameter at Ø5 mm, and cover fixture behavior through Box/Cylinder compatibility tests.

## Migration Plan

1. Add and export the shared interface contract.
2. Migrate nominal Ø5 consumers and derive Stackable Box socket de-duplication from it.
3. Migrate ordinary Ø5.05 assembly openings and Box/Cylinder Ø4.55／Ø7.05 stepped sections to the shared contract.
4. Keep the Box/Cylinder quality fixture at Ø7 × 0.8 plus Ø4.5, deriving shaft length from the active floor thickness.
5. Update quality gates, Worker builders, unit tests, integration tests, and the affected OpenSpec delta requirements.
6. Run formatting, contract tests, Box/Cylinder Worker integration suites, and OpenSpec validation.

Rollback consists of reverting the shared-contract consumers and restoring the old Box/Cylinder inner-hole and fixture values; no data migration is required because the user parameter snapshots remain unchanged.

## Open Questions

None. The nominal, assembly, stop-hole, flange, and floor-thickness-dependent fixture dimensions were confirmed during exploration.

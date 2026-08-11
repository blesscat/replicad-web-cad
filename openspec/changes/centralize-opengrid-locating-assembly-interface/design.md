## Context

The completed grid-contract change centralized the official 28 mm and 14 mm pitches, but intentionally left feature-specific hole dimensions in their owning contracts. The remaining OpenGrid locating and assembly dimensions are now confirmed: Snap, Divider, Pillar, and Stackable Box share a nominal Ø5 mm locating interface; Stackable Box and Stackable Cylinder use a Ø5.05 mm assembly opening; and the new thin-shell test insert uses a Ø4 mm shaft, a Ø4.05 mm shaft opening, and a Ø7 mm × 0.8 mm flange.

The current Stackable Box and Cylinder stepped profiles still use an inner Ø7.05 mm section. The Box quality fixture also models an older Ø5 mm shaft with a Ø5.8 mm × 0.5 mm flange. These are implementation and specification details that must be migrated together so the generated shoulder, the compatibility fixture, and the quality gates describe the same physical interface.

The Desk System query context is an entry and preset concern, not the correct owner for CAD interface dimensions. The shared contract belongs in src/cad-contract/units and may be consumed by both Desk-visible OpenGrid components and their Worker-only geometry validators.

## Goals / Non-Goals

**Goals:**

- Create one shared OpenGrid locating and assembly interface contract.
- Keep the nominal Ø5 mm locating dimension as the source for Snap hole radius, Divider pegs, Pillar body diameter, Stackable Box nominal base-hole diameter, and the Box socket de-duplication threshold.
- Derive the Ø5.05 mm assembly opening from the Ø5 mm nominal dimension plus the shared 0.05 mm assembly increment.
- Define the Ø4.05 mm shaft opening from the Ø4 mm test shaft plus the same 0.05 mm increment.
- Replace the old Ø7.05 mm inner section with the Ø4.05 mm shaft opening in the Stackable Box special socket and Stackable Cylinder bottom-hole profiles.
- Replace the old Box quality fixture with a Ø7 mm × 0.8 mm flange and Ø4 mm shaft whose length is derived from the active floor thickness; a 3 mm thin floor uses a 4 mm shaft.
- Preserve stable model IDs, routes, parameter snapshots, the official grid contract, and the user-facing Ø5 mm OpenGrid Pillar geometry.

**Non-Goals:**

- Do not change the official 28 mm or 14 mm grid pitch.
- Do not change the OpenGrid system-entry context, Desk/Wall routing, or persistence scopes.
- Do not change the ordinary Stackable Box bottom-hole profile into a stepped or stopped hole; it remains a straight Ø5.05 mm hole.
- Do not change Pillar bodyDiameter from Ø5 mm. The Ø4 mm shaft is a compatibility-test fixture dimension, not the Pillar model contract.
- Do not merge the shared 0.05 mm assembly increment with Box's 0.25 mm validation tolerance, hole depths, 7 mm positional offsets, or other component-specific clearances.

## Decisions

### 1. Add a dedicated interface contract

Add a module under src/cad-contract/units for the shared locating and assembly interface. The contract exposes the nominal locating diameter of 5 mm, the assembly increment of 0.05 mm, the derived assembly opening of 5.05 mm, the test shaft diameter of 4 mm, the derived shaft opening of 4.05 mm, the test flange diameter of 7 mm, and the test flange height of 0.8 mm.

The contract is a geometry specification, not a user parameter schema. Consumers keep their existing descriptive field names where changing them would expand the compatibility surface, but their values resolve from the shared contract.

### 2. Map each consumer by physical meaning

- Snap profile locating-hole radius resolves to half of the shared nominal diameter.
- Divider pegDiameter, Pillar bodyDiameter, and Stackable Box baseHoleDiameter resolve to the shared nominal diameter.
- Stackable Box baseHoleBottomOpeningDiameter and bottomGridHoleDiameter, plus Stackable Cylinder bottomHoleDiameter, resolve to the shared assembly opening.
- Stackable Box baseHoleTopOpeningDiameter and Stackable Cylinder innerHoleDiameter resolve to the shared shaft opening. Their names may be retained temporarily for compatibility, but their meaning is an inner shaft passage followed by a flange shoulder, not a larger retaining counterbore.
- Stackable Box socketDeduplicationDistance resolves to the shared nominal diameter while remaining a positional de-duplication threshold. It must not be used as an assembly-hole clearance.

### 3. Use a shoulder-stop profile for the new insert

The Stackable Box special socket and Stackable Cylinder bottom hole retain their existing lower-to-upper axial segmentation and planar shoulder. The lower section remains Ø5.05 mm; the upper/interior section becomes Ø4.05 mm. A Ø4 mm shaft can pass through both sections, while a Ø7 mm flange cannot pass through the Ø4.05 mm upper section and is stopped at the shoulder.

The ordinary Stackable Box bottom grid remains a straight Ø5.05 mm through-hole and does not receive the Ø4.05 mm stop section.

### 4. Derive the compatibility fixture from active floor thickness

The Box quality fixture uses a Ø4 mm shaft and a Ø7 mm × 0.8 mm flange. Its shaft length is the active floor or base-plate thickness plus the agreed 1 mm exterior allowance: 3 mm floor modes use a 4 mm shaft, and 5 mm floor modes use a 6 mm shaft. The same rule applies to the Cylinder default 5 mm floor and thin/bottom-plate 3 mm floor modes.

The fixture is used to validate the physical mounting interface; it is not emitted as part of the runtime Box or Cylinder B-Rep. Existing Snap reference compatibility continues to use the nominal Ø5 mm interface.

### 5. Keep validation responsibilities separate

The Box quality gate continues to check non-overlapping socket locations using the actual flange envelope where spacing matters, while the layout helper uses the shared nominal Ø5 mm de-duplication threshold to collapse coincident or physically overlapping nominal socket locations. Tests must cover both responsibilities instead of treating the two values as interchangeable.

### 6. Preserve stable external contracts

No model ID, build key, route, parameter snapshot field, export filename contract, or system-entry context changes. The explicit geometry break is limited to the Box special socket and Cylinder stepped hole changing from an inner Ø7.05 mm section to an inner Ø4.05 mm shaft opening, plus the related quality fixture.

## Risks / Trade-offs

- **The Ø4.05 mm shaft opening is a tighter interface than the old Ø7.05 mm section** → Validate the Ø4 mm shaft and shoulder with the repository's existing geometry tolerances, and report a diagnosable fixture failure when the fit is invalid.
- **Existing tests and specs describe the old Ø7.05 mm / Ø5.8 mm captive insert** → Update every behavior assertion and the Box quality fixture in the same change; do not leave a mixed old/new interface.
- **A Ø7 mm flange is larger than the nominal Ø5 mm socket interface** → Keep flange envelope spacing validation separate from nominal socket de-duplication and cover half-cell footprints.
- **The value 0.05 mm could be confused with Box's 0.25 mm quality tolerance** → Give the shared increment and component-specific tolerances distinct names and preserve their separate uses.
- **The Ø4 mm fixture could be mistaken for a Pillar model change** → Keep PILLAR_CONFIGURATION.bodyDiameter at Ø5 mm and cover the fixture through Box/Cylinder compatibility tests only.

## Migration Plan

1. Add and export the shared interface contract.
2. Migrate nominal Ø5 consumers and derive Stackable Box socket de-duplication from it.
3. Migrate Ø5.05 assembly openings and replace the Box/Cylinder inner sections with Ø4.05.
4. Update the Box quality fixture to Ø7 × 0.8 plus Ø4, deriving shaft length from the active floor thickness.
5. Update quality gates, Worker builders, unit tests, integration tests, and the affected OpenSpec delta requirements.
6. Run formatting, contract tests, Box/Cylinder Worker integration suites, and OpenSpec validation.

Rollback consists of reverting the shared-contract consumers and restoring the old Box/Cylinder inner-hole and fixture values; no data migration is required because the user parameter snapshots remain unchanged.

## Open Questions

None. The nominal, assembly, stop-hole, flange, and floor-thickness-dependent fixture dimensions were confirmed during exploration.

## 1. Shared interface contract

- [x] 1.1 Add and export the shared OpenGrid locating and assembly interface contract with nominal Ø5, shared +0.05 increment, Ø5.05 assembly opening, Ø4.5 test shaft, Ø4.55 shaft opening, Ø7.05 retaining opening, and Ø7 × 0.8 test flange dimensions.
- [x] 1.2 Add unit coverage for the shared values and derived relationships, including assemblyOpeningDiameter = 5.05, shaftOpeningDiameter = 4.55, and retainingOpeningDiameter = 7.05.

## 2. Nominal locating consumers

- [x] 2.1 Migrate Snap locating-hole radius, Divider pegDiameter, Pillar positioningBodyDiameter, and Stackable Box baseHoleDiameter to the shared nominal Ø5 value; keep fixed Pillar bodyDiameter on the shared Ø4.5 test-shaft value without changing public model contracts.
- [x] 2.2 Migrate Stackable Box socketDeduplicationDistance to the shared nominal Ø5 value while preserving its positional de-duplication semantics.
- [x] 2.3 Add behavior-focused contract tests proving the nominal consumers remain Ø5, Snap remains radius 2.5, and fixed Pillar modes use Ø4.5 while positioning uses Ø5.

## 3. Assembly and stop-hole geometry

- [x] 3.1 Migrate Stackable Box ordinary bottom-grid holes to the shared Ø5.05 assembly opening and keep the special Box/Cylinder lower passages on the shared Ø4.55 shaft opening.
- [x] 3.2 Keep Stackable Box special upper/interior sections and Stackable Cylinder inner bottom-hole sections on the shared Ø7.05 retaining opening while preserving the existing mode-specific axial depths and planar shoulders.
- [x] 3.3 Keep ordinary Stackable Box bottom-grid holes straight Ø5.05 holes with no Ø7.05 retaining section, and add regression coverage for both ordinary and special profiles.

## 4. Compatibility fixture and quality gates

- [x] 4.1 Keep the Stackable Box quality fixture at a Ø4.5 shaft and Ø7 × 0.8 flange; remove duplicate or legacy 5.8-specific assumptions.
- [x] 4.2 Derive fixture shaft length from active floor thickness plus the agreed 1 mm exterior allowance, covering 2 mm thin-shell floors with 3 mm shafts, 3 mm base-plate floors with 4 mm shafts, and 5 mm normal floors with 6 mm shafts.
- [x] 4.3 Update Box quality gates, spacing checks, and insertion probes so flange-envelope validation remains independent from the nominal 5 mm socket de-duplication threshold.
- [x] 4.4 Update Cylinder quality checks and mode-specific hole measurements for the Ø4.55 shaft opening, Ø7.05 retaining opening, and the shared fixture dimensions.

## 5. Test, specification, and verification migration

- [x] 5.1 Update Box and Cylinder unit/integration tests and fixed-dimension assertions to the current Ø5.05/Ø4.55/Ø7.05 interface and Ø7 × 0.8/Ø4.5 fixture.
- [x] 5.2 Add thin-floor, normal-floor, base-plate, and half-cell behavior coverage for derived fixture lengths, shoulder stopping, ordinary-hole preservation, and socket de-duplication.
- [x] 5.3 Update affected runtime messages or metadata so they describe the Ø4.55 shaft opening and Ø7.05 retaining section without changing stable model identifiers or routes.
- [x] 5.4 Run formatting, targeted unit and Worker integration tests, OpenSpec validation, and diff checks; record any unrelated baseline failures separately.

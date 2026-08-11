## 1. Shared interface contract

- [x] 1.1 Add and export the shared OpenGrid locating and assembly interface contract with nominal Ø5, shared +0.05 increment, Ø5.05 assembly opening, Ø4 test shaft, Ø4.05 shaft opening, and Ø7 × 0.8 test flange dimensions.
- [x] 1.2 Add unit coverage for the shared values and derived relationships, including assemblyOpeningDiameter = 5.05 and shaftOpeningDiameter = 4.05.

## 2. Nominal locating consumers

- [x] 2.1 Migrate Snap locating-hole radius, Divider pegDiameter, Pillar bodyDiameter, and Stackable Box baseHoleDiameter to the shared nominal Ø5 value without changing their public model contracts.
- [x] 2.2 Migrate Stackable Box socketDeduplicationDistance to the shared nominal Ø5 value while preserving its positional de-duplication semantics.
- [x] 2.3 Add behavior-focused contract tests proving the four nominal consumers remain Ø5 and Snap remains radius 2.5; keep the OpenGrid Pillar body at Ø5.

## 3. Assembly and stop-hole geometry

- [x] 3.1 Migrate Stackable Box special lower bores, ordinary bottom-grid holes, and Stackable Cylinder lower bottom-hole sections to the shared Ø5.05 assembly opening.
- [x] 3.2 Replace Stackable Box special upper/interior sections and Stackable Cylinder inner bottom-hole sections with the shared Ø4.05 shaft opening while preserving the existing mode-specific axial depths and planar shoulders.
- [x] 3.3 Keep ordinary Stackable Box bottom-grid holes straight Ø5.05 holes with no Ø4.05 stop section, and add regression coverage for both ordinary and special profiles.

## 4. Compatibility fixture and quality gates

- [x] 4.1 Replace the Stackable Box quality fixture's Ø5 shaft and Ø5.8 × 0.5 flange with a Ø4 shaft and Ø7 × 0.8 flange; remove the legacy 5.8-specific assumptions.
- [x] 4.2 Derive fixture shaft length from active floor thickness plus the agreed 1 mm exterior allowance, covering 3 mm floors with 4 mm shafts and 5 mm floors with 6 mm shafts.
- [x] 4.3 Update Box quality gates, spacing checks, and insertion probes so flange-envelope validation remains independent from the nominal 5 mm socket de-duplication threshold.
- [x] 4.4 Update Cylinder quality checks and mode-specific hole measurements for the Ø4.05 shaft opening and the shared fixture dimensions.

## 5. Test, specification, and verification migration

- [x] 5.1 Update Box and Cylinder unit/integration tests, fixed-dimension assertions, and failure expectations from the old Ø7.05/Ø5.8 interface to the Ø5.05/Ø4.05 and Ø7 × 0.8/Ø4 fixture.
- [x] 5.2 Add thin-floor, normal-floor, base-plate, and half-cell behavior coverage for derived fixture lengths, shoulder stopping, ordinary-hole preservation, and socket de-duplication.
- [x] 5.3 Update affected runtime messages or metadata so they describe a Ø4.05 shaft opening and Ø7 flange stop without changing stable model identifiers or routes.
- [x] 5.4 Run formatting, targeted unit and Worker integration tests, OpenSpec validation, and diff checks; record any unrelated baseline failures separately.

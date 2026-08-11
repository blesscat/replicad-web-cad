## MODIFIED Requirements

### Requirement: Grid pitch 與元件特徵尺寸必須分開

The system MUST keep feature-specific dimensions separate from the official OpenGrid grid contract. Ordinary bottom-grid holes MUST remain straight Ø5.05 mm holes, special Stackable Box and Stackable Cylinder shaft passages MUST use the shared Ø4.55 mm opening, retaining shoulders MUST use Ø7.05 mm openings, and locating-hole centers, geometry clearances, and edge offsets MUST retain their existing component-specific semantics. These values MUST NOT be reinterpreted as the shared full or half pitch merely because they are numeric multiples or fractions of 28 mm.

#### Scenario: Ordinary and special hole diameters remain distinct

- **WHEN** an OpenGrid component generates its existing ordinary bottom grid or special stepped mounting holes
- **THEN** an ordinary Stackable Box bottom-grid hole MUST remain Ø5.05 mm and straight through
- **AND** a Stackable Box special socket or Stackable Cylinder stepped hole MUST use Ø4.55 mm for its shaft passage and Ø7.05 mm for its retaining section
- **AND** hole placement grids or offsets MUST continue to follow their owning component contract

#### Scenario: Feature dimensions do not become grid pitch

- **WHEN** a box, cylinder, Snap, or other OpenGrid component uses a 4.55 mm shaft opening, 7 mm locating center, edge offset, or clearance
- **THEN** each value MUST remain a named feature-specific dimension
- **AND** changing or consuming the official full or half pitch MUST NOT silently rescale that feature

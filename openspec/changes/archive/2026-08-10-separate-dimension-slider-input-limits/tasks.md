## 1. Confirm shared manual limits and workspace safety

- [x] 1.1 Keep the shared basic-box and planar workspace maxima at 500 mm; do not couple the new slider limits to a wider manual-input maximum.
- [x] 1.2 Add unit coverage proving `box` accepts 500 mm dimensions and rejects 501 mm dimensions, while grid/layout footprints beyond the 500 mm workspace limit remain invalid.

## 2. Update component contracts and catalog slider metadata

- [x] 2.1 Keep box-normal height validation at 10–500 mm, add a 200 mm height slider maximum, and update its model-catalog field metadata.
- [x] 2.2 Keep OpenGrid pillar length validation at 3–500 mm, add a 200 mm slider maximum, and preserve the existing `opengrid-pillar` model ID, route, and geometry constants.
- [x] 2.3 Keep OpenGrid divider height validation at 2–500 mm and add a 200 mm height slider maximum while preserving the 500 mm planar footprint limit.
- [x] 2.4 Keep OpenGrid stackable-box height validation at 10–500 mm and add a 200 mm height slider maximum while preserving the 500 mm X/Y footprint limit.
- [x] 2.5 Keep OpenGrid stackable-cylinder height validation at 10–500 mm and add a 200 mm height slider maximum while preserving the existing 20–300 mm diameter domain.
- [x] 2.6 Change hexagonal-column manual height validation from 1–999 mm to 1–500 mm, retain its 1–200 mm slider, and preserve its 500 mm row-envelope safety check.
- [x] 2.7 Add or update catalog and contract tests for each affected field so text-input `max` and range-input `max` are asserted separately, including valid manual value 500 and invalid value 501.

## 3. Synchronize user-facing descriptions and documentation

- [x] 3.1 Update component-panel descriptions, model catalog descriptions, README, and documentation text to state the 500 mm manual / 200 mm slider ranges.
- [x] 3.2 Ensure descriptions continue to identify the 500 mm planar footprint limits where those limits still apply, without implying that they cap height or length.

## 4. Verify end-to-end controls and generation

- [x] 4.1 Update affected E2E expectations for text inputs (`max=500`) and sliders (`max=200`) on box, box-normal, OpenGrid pillar, divider, stackable-box, stackable-cylinder, and hexagonal-column routes.
- [x] 4.2 Add E2E coverage that manually enters a value above 200 mm, including 500 mm on representative targeted routes, and confirms the value is accepted and reaches a ready/exportable model.
- [x] 4.3 Add E2E or integration coverage that an out-of-range 501 mm value remains invalid and that planar footprint values beyond 500 mm remain rejected.

## 5. Run validation and regression checks

- [x] 5.1 Run formatting and type checks, then run the affected unit, Worker, and model-generation test suites.
- [x] 5.2 Run the affected Chromium E2E suites and confirm existing persistence, export naming, stale-generation, and latest-wins behavior remains intact.
- [x] 5.3 Run `openspec validate "separate-dimension-slider-input-limits" --type change --strict --no-interactive` and resolve any artifact or requirement-format errors.

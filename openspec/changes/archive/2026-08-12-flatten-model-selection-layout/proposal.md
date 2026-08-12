## Why

The `/models` chooser now exposes the OpenGrid system contexts, but its fixed page width and nested panel treatment make the desktop layout underuse available space and make the mobile layout feel overly boxed-in. The chooser should retain its clear OpenGrid/HSW and Desk/Wall organization while reducing visual nesting and improving responsive card density.

## What Changes

- Remove the visual outer panel around the model-selection page while preserving the semantic selection section and its accessible heading.
- Allow `/models` to use the available page width instead of the shared `1200px` content cap, without changing the width behavior of other pages.
- Flatten the OpenGrid family and Desk/Wall subgroup presentation into headings, spacing, and separators rather than nested bordered panels and a left accent rail.
- Remove redundant `系統入口` and subgroup-level `OpenGrid` badges; the family and system headings remain visible.
- Replace the fixed two-column chooser grid with an adaptive grid that uses more columns on wide screens and one column on narrow screens.
- Preserve catalog-driven ordering, model names, static previews, fallback behavior, edit links, system-context routes, and the no-CAD-runtime behavior of `/models`.
- Preserve all existing model IDs, build keys, route slugs, preview asset identities, and OpenGrid naming conventions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `home-model-selection`: update the observable `/models` layout hierarchy and responsive arrangement while retaining the existing visible model set, catalog-driven links, accessibility behavior, and static chooser constraints.

## Impact

- Affects the `/models` Astro page, the page-layout width option used only by that route, and chooser E2E assertions that currently depend on nested panel geometry.
- May update model-selection presentation tests, but does not change model catalog data, CAD routes, system-context persistence, preview generation, or Worker behavior.
- No new OpenGrid component is introduced; all existing OpenGrid IDs, display-name prefixes, build keys, and routes remain unchanged.

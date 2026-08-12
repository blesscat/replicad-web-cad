## Context

The current `/models` page uses the default `SiteLayout` content cap, an outer panel, a bordered OpenGrid family panel, a left accent rail, and bordered Desk/Wall subgroup panels. The model catalog already provides the required family and context grouping, so this change only needs to alter presentation around that data. Existing preview, link, fallback, accessibility, and static-page behavior are defined by the current model-selection and preview specifications.

## Goals / Non-Goals

**Goals:**

- Give `/models` access to the available viewport width without changing the shared layout defaults for home, docs, or CAD pages.
- Make the page hierarchy readable through typography, whitespace, and light separators instead of nested visual containers.
- Fit more model cards on wide screens while keeping cards usable and single-column on narrow screens.
- Keep the existing catalog data shape, context-specific entries, stable selectors, accessible headings, preview behavior, and route links.

**Non-Goals:**

- Do not add chooser descriptions, introductory copy, filters, tabs, or new interaction state.
- Do not change `groupModelDefinitions`, model ordering, model IDs, build keys, route slugs, system-context query handling, or preview assets.
- Do not change the global `max-w-[1200px]` behavior for pages other than `/models`.
- Do not add or rename an OpenGrid component.

## Decisions

### 1. Opt `/models` into the existing full-width layout option

Pass `fullWidth` to `SiteLayout` from the models page. The shared layout continues to apply its existing responsive padding, while only this page skips the global `max-w-[1200px]` cap. This keeps the width decision route-scoped and avoids making the home, docs, or CAD workspace unexpectedly wider.

An alternative would be to change the global cap or add a second page-specific max-width value. Both would either affect unrelated pages or preserve the same arbitrary width constraint, so they are not used.

### 2. Preserve semantic wrappers but remove their visual containers

Keep the model-selection section, family sections, subgroup sections, `aria-labelledby` relationships, `data-testid` hooks, and `data-entry-key` card identity. Remove the outer panel, OpenGrid family background/border, left rail, subgroup panel backgrounds/borders, and redundant badges. Series headings remain the primary hierarchy, while subgroup headings use spacing and a subtle divider to separate Desk and Wall entries.

This separates accessibility and test structure from decorative containers. Removing the DOM sections entirely would reduce visual nesting but would also make the existing family/context semantics and behavior-focused tests less stable without improving the rendered result.

### 3. Use one adaptive card-grid rule for every subgroup

Replace the fixed `sm:grid-cols-2` class with an auto-fitting CSS grid whose minimum card width is approximately `15rem` and whose narrowest state is one column. The page width then determines the useful column count: the wide view can show at least three cards per row, a medium view naturally uses fewer, and a mobile view stacks cards.

The first two OpenGrid entries remain adjacent whenever two columns fit, preserving the current ordering contract while allowing wider rows. The preview keeps its existing 16:10 aspect ratio so the larger grid does not distort generated assets.

### 4. Keep cards as the interaction boundary

Retain each model card's preview image, accessible alt text, selection-only heading, fallback, and `編輯 →` link. Change only the card surface styling to use the page panel color, a light border, and a restrained shadow/hover state that remains visible in light and dark color schemes. Do not introduce a new full-card click target or a second description hierarchy in this change.

### 5. Verify user-visible layout without testing source shape

Update the chooser E2E coverage to assert the visible family and subgroup headings, preserved entry order and routes, and responsive card placement at wide and narrow viewports. Replace the existing assertion that subgroup boxes must be geometrically nested and the fixed two-column assumption with observable checks that the wide layout has three or more cards in its first row and the narrow layout has one card per row. Keep the preview-image failure and static-runtime checks intact.

## Risks / Trade-offs

- **Auto-fitting can produce different column counts at intermediate widths** → Use a minimum card width and assert only the required wide/narrow behaviors, not one exact count for every viewport.
- **A full-width page can feel too sparse on an unusually wide monitor** → Keep a meaningful minimum card width so cards do not become arbitrarily narrow; the grid, rather than a page-level max-width, controls density.
- **Removing panel boundaries can weaken grouping in low-contrast themes** → Retain strong heading typography, spacing, and a divider between subgroups, and verify both system color schemes through the existing browser coverage.
- **Existing E2E tests encode the previous nesting** → Update those tests to observable heading, order, route, and responsive-layout contracts while leaving catalog and preview tests unchanged.

## Migration Plan

1. Update the models page to use the full-width layout option and the flatter family/subgroup/card classes.
2. Update chooser E2E assertions for the new visual hierarchy and responsive grid behavior.
3. Run formatting, type checking, unit tests, the targeted chooser/preview E2E tests, the full E2E suite as practical, and OpenSpec validation.
4. Rollback requires only reverting the models-page layout classes, the `fullWidth` prop, and the corresponding presentation assertions; no persisted data or route migration is needed.

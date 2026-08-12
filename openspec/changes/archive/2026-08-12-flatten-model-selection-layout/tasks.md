## 1. Flatten the model-selection presentation

- [x] 1.1 Opt `/models` into the existing full-width `SiteLayout` mode while preserving the shared responsive page padding and leaving other routes unchanged.
- [x] 1.2 Remove the outer chooser panel styling and flatten the OpenGrid family and Desk/Wall subgroup containers into semantic headings, spacing, and separators while preserving `aria-labelledby`, `data-testid`, and catalog-driven grouping.
- [x] 1.3 Replace the fixed two-column model-card grid with an auto-fitting grid whose minimum card width keeps wide layouts at three or more columns when possible and narrow layouts at one column.
- [x] 1.4 Update card surface styling and remove redundant family/system badges while preserving preview assets, alt text, fallback behavior, selection labels, edit links, system-context query routes, and all existing model IDs/build keys.

## 2. Update behavior-focused chooser coverage

- [x] 2.1 Update the model-selection E2E assertions to cover the flattened family/subgroup headings, preserved model order and routes, and the absence of the previous nested visual geometry assumption.
- [x] 2.2 Add or update responsive chooser checks so a wide viewport exposes at least three cards in the first applicable row and a narrow viewport stacks cards in one column; retain static-page, no-CAD-runtime, and preview-fallback coverage.

## 3. Verify and finalize

- [x] 3.1 Run formatter, TypeScript checks, relevant unit tests, and the targeted model-selection/preview E2E tests; fix any regressions within the scoped files.
- [x] 3.2 Run the broader available test/build checks and strict validation for `flatten-model-selection-layout`; confirm all change tasks and artifacts are complete and stable IDs/routes remain unchanged.

## 1. Regression coverage

- [x] 1.1 Add behavior-focused homepage E2E coverage for the localized final CTA in light and dark color schemes, including its destination, visibility, keyboard focus, normal-state contrast, and hover-state contrast.
- [x] 1.2 Run the targeted homepage regression test against the current implementation and confirm it fails because the dark-mode CTA foreground is too close to its light surface.

## 2. Theme-safe implementation

- [x] 2.1 Move the inherited anchor color baseline into the theme's base cascade so explicit link text utilities remain effective without changing unstyled-link inheritance.
- [x] 2.2 Update the final homepage CTA to use the existing semantic navigation foreground/background tokens and a hover treatment that preserves readable contrast in both themes.
- [x] 2.3 Re-run the targeted homepage regression test and confirm both localized homepages pass the contrast and navigation behavior contract without changing routes, copy, or layout.

## 3. Verification and scope

- [x] 3.1 Run formatting checks, TypeScript checking, the relevant unit/E2E tests, and the production build; resolve only regressions within this change's scope.
- [x] 3.2 Verify the diff introduces no new OpenGrid component, model ID, build key, route slug, catalog entry, dependency, or unrelated file change.

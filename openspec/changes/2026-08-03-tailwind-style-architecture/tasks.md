## 1. CSS tooling and global entry

- [x] 1.1 Add `tailwindcss`, `@tailwindcss/vite`, and `sass` with pnpm and commit the resolved versions to `pnpm-lock.yaml`.
- [x] 1.2 Register the Tailwind Vite plugin in `astro.config.mjs` while preserving the existing port, host, allowed host, WebSocket, and preview settings.
- [x] 1.3 Create `src/styles/global.css` with the Tailwind import, named theme tokens for the existing palette and exact 760px responsive behavior, plus only the required reset/base rules.
- [x] 1.4 Verify the new CSS entry can be built before migrating page and component markup.

## 2. Shared Astro layout

- [x] 2.1 Create `src/layouts/SiteLayout.astro` with typed title/description inputs, shared document head, site shell, primary navigation, and page content container.
- [x] 2.2 Migrate `src/pages/index.astro` and `src/pages/docs/index.astro` to `SiteLayout.astro`, preserving content, metadata, links, language, and accessible navigation semantics.
- [x] 2.3 Migrate `src/pages/cad.astro` to `SiteLayout.astro`, preserving the CAD heading, fallback id/behavior, and `CadWorkspace client:only="react"` island boundary.
- [x] 2.4 Remove direct imports of the legacy stylesheet from pages and confirm all three routes still render through the shared layout.

## 3. Tailwind-first UI migration

- [x] 3.1 Convert shared shell, navigation, page content, muted text, cards, links, and responsive page layout styles to Tailwind utilities using the global theme tokens.
- [x] 3.2 Convert `CadWorkspace.tsx` workspace grid, controls, fieldsets, labels, inputs, validation errors, actions, status, and disabled states to Tailwind utilities without changing CAD state or event logic.
- [x] 3.3 Preserve input `aria-invalid`, error association, button disabled behavior, status messaging, and the existing fallback visibility behavior while changing only styling ownership.
- [x] 3.4 Remove the corresponding unused selectors from `src/styles.css` and delete or reduce the file once no page/component depends on it.

## 4. Scoped CAD viewport styling

- [x] 4.1 Create `src/features/cad/viewport/CadViewport.module.scss` for the viewport canvas descendant height rule that cannot be expressed cleanly without a scoped selector.
- [x] 4.2 Update `CadViewport.tsx` to keep only the canvas CSS module class and express stale state, empty state, and badge overlay with complete Tailwind utility classes.
- [x] 4.3 Verify the viewport preserves the 520px canvas/empty-state height, stale border, badge position, WebGL fallback, and `aria-label` behavior.

## 5. Documentation and test migration

- [x] 5.1 Update `README.md` architecture and folder rules to document the global Tailwind entry, `SiteLayout.astro`, Tailwind-first component styling, and the limited `.module.scss` exception for complex selectors.
- [x] 5.2 Correct README links that still point to the pre-archive OpenSpec change path while updating the architecture references.
- [x] 5.3 Update E2E selectors that depend on styling class names to use accessible roles, labels, status text, or narrowly scoped `data-testid` values where no semantic target exists.
- [x] 5.4 Review the diff for unused legacy CSS, dynamic utility fragments, accidental CAD logic changes, and duplicated layout markup.

## 6. Verification

- [x] 6.1 Run `pnpm run check` and fix type or Astro integration errors.
- [x] 6.2 Run `pnpm run build` and verify the generated routes/assets include the Tailwind output and SCSS module styles.
- [x] 6.3 Run `pnpm run test` and the affected Playwright E2E suite, including the CAD fallback and core parameter/export flows.
- [x] 6.4 Smoke-test `/`, `/docs/`, and `/cad/` at desktop and at the existing 760px responsive boundary, confirming visual parity and no console/runtime regressions.

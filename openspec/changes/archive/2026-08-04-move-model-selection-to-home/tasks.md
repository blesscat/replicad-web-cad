## 1. Catalog metadata and model routes

- [x] 1.1 Extend the shared model definition metadata with a concise selection description and populate it for `box` and `modular-grid-base`.
- [x] 1.2 Build the homepage model chooser from the registered catalog, showing each model's name, description, adjustable parameters and accessible link to its model-specific CAD route.
- [x] 1.3 Add static model-specific CAD routes for `/cad/box` and `/cad/modular-grid-base`, pass the validated route model id into `CadWorkspace`, and reject unknown model paths without starting CAD.
- [x] 1.4 Change `/cad/` to redirect to the homepage with an accessible fallback link when a static redirect is unavailable.

## 2. Lock the CAD workspace to the route model

- [x] 2.1 Initialize the CAD controller/state from the route model id and that model definition's default parameters while preserving the existing Worker generation and validation flow.
- [x] 2.2 Remove the in-workspace model selector and `onModelChange` path; render only the selected component's parameter panel and show its name.
- [x] 2.3 Add a "返回首頁選擇其他模型" navigation entry from every model-specific workspace without changing parameter editing, stale preview, or STEP export behavior.

## 3. Update navigation and user-facing copy

- [x] 3.1 Update the homepage title and description to describe multiple CAD models/components and explain the homepage selection flow.
- [x] 3.2 Update CAD page headings/fallbacks, global navigation and documentation links so they no longer describe the product as only a box and point users to the model chooser where appropriate.
- [x] 3.3 Update README or other repository-facing route documentation to use the model-specific CAD routes and explain that switching returns to the homepage.

## 4. Behavior-focused verification

- [x] 4.1 Add unit coverage for catalog selection metadata and the route-to-model mapping, including unknown model ids.
- [x] 4.2 Update static route tests to verify the homepage has no CAD workspace, `/cad/` returns to the homepage, and unknown model routes do not initialize CAD.
- [x] 4.3 Add browser coverage for homepage selection into both valid routes, selected-model-only controls, return-home navigation, model-specific previews, and STEP filenames.
- [x] 4.4 Preserve and update the existing box/grid parameter, stale-preview, accessibility, responsive, and JavaScript-disabled fallback coverage for the new routes.

## 5. Quality gates

- [x] 5.1 Make the Playwright base URL and dev server port configurable with `PLAYWRIGHT_PORT` so concurrent worktrees do not collide.
- [x] 5.2 Run formatting, type-check, unit tests, production build and the existing browser test gates; resolve failures.
- [x] 5.3 Run `openspec validate --changes --strict` and review the final change status and diff.

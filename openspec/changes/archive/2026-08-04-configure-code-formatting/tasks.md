## 1. Add formatter tooling

- [x] 1.1 Add compatible Prettier and Astro formatter development dependencies to `package.json`, update `pnpm-lock.yaml`, and preserve the existing `pnpm-workspace.yaml` user modification.
- [x] 1.2 Create the shared Prettier configuration with `semi: false`, the existing double-quote convention, Astro support, and only the explicitly required formatting options.
- [x] 1.3 Create `.prettierignore` and define the shared in-scope file globs so source, tests, styles, and root configuration are formatted while generated output, reports, WASM, and the entire `openspec/` directory are excluded.
- [x] 1.4 Add `pnpm format` and `pnpm format:check` scripts that use the same file set, with write and check behavior respectively.
- [x] 1.5 Add VS Code workspace settings that select the Prettier extension and enable format-on-save for supported file types.

## 2. Apply the formatting policy

- [x] 2.1 Run `pnpm format` across the scoped source, test, style, and root configuration files and remove statement-terminating semicolons from JavaScript-family code.
- [x] 2.2 Review the formatting diff to confirm it contains only formatter changes and does not modify CAD behavior, Worker contracts, generated assets, any file under `openspec/`, or the pre-existing workspace configuration change.

## 3. Verify the change

- [x] 3.1 Run `pnpm format:check` and confirm it succeeds without modifying files; verify an intentionally unformatted in-scope file makes the check fail, then restore the file.
- [x] 3.2 Run `pnpm check`, `pnpm test`, and `pnpm build` to verify type safety, unit/worker behavior, and production compilation after formatting.
- [x] 3.3 Run the existing `pnpm test:e2e` gate and confirm routes, fallback, responsive behavior, WebGL workspace, parameter handling, and STEP download remain unchanged. The default bundled-browser run was attempted but its headless Chromium/Firefox lack WebGL in this environment; an equivalent production-preview Chromium run with system Chrome and software WebGL passed all 8 scenarios.
- [x] 3.4 Run `openspec validate --changes --strict` and review the final change status and diff for complete artifacts and preserved user changes.

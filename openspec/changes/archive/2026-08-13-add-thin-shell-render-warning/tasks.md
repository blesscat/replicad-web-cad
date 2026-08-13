## 1. Add behavior-focused regression coverage

- [x] 1.1 Extend the stackable-box Playwright workspace test to assert the exact warning appears only while `薄殼模式` is selected.
- [x] 1.2 Extend the stackable-cylinder Playwright workspace test to assert the exact warning appears only while `薄殼模式` is selected.
- [x] 1.3 Extend the pillar Playwright workspace test to assert the exact warning appears only while `薄殼版` is selected.
- [x] 1.4 Run the focused warning assertions before implementing the UI and confirm they fail for the missing warning behavior.

## 2. Implement the shared warning presentation

- [x] 2.1 Add a shared CAD panel warning component with the exact Chinese copy, existing red text token, accessible status semantics, and a stable user-facing test id.
- [x] 2.2 Render the shared warning below the active mode explanation in the stackable-box and stackable-cylinder panels only for their thin-shell profile.
- [x] 2.3 Render the shared warning with the selected `薄殼版` details in the pillar panel only when the thin-shell mode is active.

## 3. Verify the complete change

- [x] 3.1 Run the focused OpenGrid box, cylinder, and pillar Playwright tests and confirm the new warning assertions pass without changing existing mode or export behavior.
- [x] 3.2 Run the repository validation/build checks required for the changed Svelte components and tests, then run `openspec validate add-thin-shell-render-warning --type change --strict`.

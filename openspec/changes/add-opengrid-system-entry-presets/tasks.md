## 1. OpenSpec artifacts

- [x] 1.1 Write the proposal for Desktop/Wall entry presets and context-specific preview assets.
- [x] 1.2 Add the new system-entry-context capability spec and deltas for selection, persistence, workspace, and model previews.
- [x] 1.3 Record the catalog, persistence, and capture design decisions.

## 2. Context and catalog

- [x] 2.1 Add the `desktop`/`wall` context type, query parser, preset resolver, and context-aware CAD path helper.
- [x] 2.2 Extend visible catalog grouping with Desktop System and Wall Related entries without duplicating canonical model definitions.
- [x] 2.3 Add context-aware preview metadata and render subgroup cards/links on `/models`.

## 3. Workspace and persistence

- [x] 3.1 Upgrade parameter persistence to explicit legacy and system-scoped buckets with safe version-1 migration.
- [x] 3.2 Make CAD workspace initialization and restore-defaults resolve the active context preset while preserving legacy behavior.
- [x] 3.3 Add unit tests for preset values, invalid context fallback, scoped isolation, and restore-defaults precedence.

## 4. Preview capture and assets

- [x] 4.1 Update the preview capture/verification workflow to iterate visible context entries and preserve system query parameters.
- [x] 4.2 Add behavior-focused catalog and E2E coverage for distinct Desktop/Wall preview metadata and routes.
- [x] 4.3 Generate and verify all context-specific static PNG assets.

## 5. Validation

- [x] 5.1 Run formatting, type checking, unit tests, and focused Playwright tests.
- [x] 5.2 Validate the OpenSpec change and review the final diff for unrelated changes.

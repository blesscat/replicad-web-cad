## 1. Plan and ownership map

- [x] 1.1 Confirm the proposal lists every modified and new capability path.
- [x] 1.2 Record the one-owner behavior matrix in `design.md`.
- [x] 1.3 Verify existing OpenGrid IDs, routes, build keys, and directories remain unchanged.

## 2. Move normative requirements

- [x] 2.1 Keep only component-agnostic lifecycle requirements in `cad-workspace`.
- [x] 2.1a Move baseline catalog registration, route-locking, and baseline validation requirements into `cad-component-catalog`.
- [x] 2.2 Move HSW integration requirements into `hsw-cell`.
- [x] 2.3 Move OpenGrid board integration requirements into `opengrid-generator`.
- [x] 2.4 Move Snap and half-cell integration requirements into `opengrid-snap` and `opengrid-half-cell`.
- [x] 2.5 Move divider, pillar, stackable-box, stackable-cylinder, and Open Shelf integration requirements into their component specs.
- [x] 2.6 Move system-context and locating-seat presentation requirements into their existing cross-cutting specs.
- [x] 2.7 Add the dedicated `cad-render-performance-warning` capability and keep its warning scenarios intact.

## 3. Validate the documentation refactor

- [x] 3.1 Check every migrated requirement and scenario heading appears exactly once in its intended main spec.
- [x] 3.2 Run OpenSpec strict validation and inspect all warnings.
- [x] 3.3 Run an independent compliance review against the proposal and design.
- [x] 3.4 Run `git diff --check` and confirm the changed-file list contains only OpenSpec artifacts/specs.

## 4. Sync, archive, and publish

- [x] 4.1 Sync each verified delta into the corresponding main spec and re-check the comparison.
- [x] 4.2 Archive `refactor-spec-ownership` with all artifacts complete.
- [x] 4.3 Commit the documentation-only change on a focused branch.
- [x] 4.4 Publish a draft PR targeting `main` and verify its URL, commit, and changed-file list.

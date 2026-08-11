## 1. Toast state contract

- [x] 1.1 Add a behavior-focused helper for selecting operation errors and deriving a correlation key, with unit tests for recoverable/fatal visibility, invalid-input filtering, replacement, and clearing.

## 2. Workspace presentation

- [x] 2.1 Add an accessible CAD error toast component that renders the failure type and `userMessage`, supports dismissal, and remains responsive without changing workspace layout.
- [x] 2.2 Wire the toast to workspace snapshots so new errors replace old ones and successful input/recovery clears dismissed state while existing stale/export/retry behavior remains unchanged.

## 3. Regression coverage

- [x] 3.1 Add an end-to-end regression that forces a model asset generation failure and verifies the reason toast is visible while export remains disabled.
- [x] 3.2 Run formatting, type-checking, targeted unit/e2e tests, and the full unit suite.

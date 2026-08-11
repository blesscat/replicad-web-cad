## Why

When CAD model generation fails, the runtime records a diagnosable user message but the workspace does not display it. Users can see that the preview is stale and that retry is available, but cannot tell why the requested model was rejected.

## What Changes

- Add a workspace toast that displays the latest recoverable model-generation failure message.
- Show the toast for model build, mesh, Worker, and timeout failures that reach the workspace error state.
- Dismiss or replace the toast when a newer input, successful model generation, or Worker recovery changes the active state.
- Keep the existing stale-preview and export-disable behavior unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities

- `cad-workspace`: The workspace must visibly communicate the user-facing reason when model generation enters an error state.

## Impact

- Affected main-thread CAD runtime state and workspace UI components.
- Adds a small toast presentation component and behavior-focused UI/runtime tests.
- No Worker protocol or CAD kernel contract changes.

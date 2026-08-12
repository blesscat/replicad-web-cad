## Why

The CAD progress indicator currently reports only that preview meshing has
started. For large models that use the existing per-face meshing path, users
cannot tell whether work is progressing or stalled. The runtime already knows
the face count, so it can expose honest face-level progress without adding a
geometry prepass.

## What Changes

- Add a generation-correlated mesh subphase that reports completed faces and
  total faces when the per-face meshing path is active.
- Throttle Worker-to-UI progress updates by elapsed time or meaningful count
  change, and always publish the final face count.
- Keep global meshing indeterminate/elapsed-only because the native global
  mesher does not provide a reliable inner progress callback.
- Display the mesh subphase in the existing four-stage progress indicator
  without turning face counts into a fake end-to-end percentage.
- Add behavior-focused unit, Worker, and end-to-end coverage plus a targeted
  performance comparison for representative large meshes.
- Preserve all existing model IDs, routes, geometry behavior, export behavior,
  and OpenGrid naming conventions.

## Capabilities

### New Capabilities

- `cad-mesh-face-progress`: Honest, throttled face-level progress for the
  per-face CAD preview meshing path.

### Modified Capabilities

<!-- The existing cad-workspace contract remains compatible; this change adds
     a new mesh subphase rather than changing its existing stage semantics. -->

## Impact

- CAD kernel mesh traversal and Worker progress event emission.
- Shared CAD progress state, event validation, and progress indicator copy.
- Unit, Worker/runtime, and browser-facing progress tests.
- No new dependency, public model identifier, route, or persisted-data change.

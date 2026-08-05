## Why

The CAD workspace currently exports only STEP, which is useful for CAD tools but adds an unnecessary conversion step before sending generated models to Bambu Studio for slicing. The project already produces a validated B-Rep and preview mesh inside the CAD Worker, so it can add a first-class STL download without introducing a backend or moving CAD work onto the main thread.

## What Changes

- Add binary STL export from the committed B-Rep in the CAD Worker.
- Add versioned Worker messages, validation, error handling, and download metadata for STL exports while preserving the existing STEP flow.
- Add a `下載 STL` action to each CAD workspace alongside `下載 STEP`.
- Use explicit STL tessellation settings suitable for 3D-printing output instead of treating the viewport preview mesh as the export source.
- Validate STL bytes, format metadata, filename, revision, worker epoch, and single-download behavior.
- Add unit, Worker/integration, and browser-level coverage for STL export and representative model dimensions.
- Update CAD documentation to distinguish STEP for CAD exchange from STL for slicer workflows.

The change does not automatically launch or communicate with the Bambu Studio desktop application. Users will download the STL and open/import it through Bambu Studio's normal local-file workflow.

## Capabilities

### New Capabilities

- `stl-export`: Generate and download a validated binary STL from the current committed CAD model revision.

### Modified Capabilities

- `cad-workspace`: Add STL as an available export action while retaining existing STEP behavior, revision gating, stale-model protection, progress, errors, and download lifecycle requirements.

## Impact

- `src/cad-contract/messages/`: add STL export command/event contract and validation.
- `src/cad-contract/errors/`: add STL-specific export and metadata error codes as needed.
- `src/cad-contract/units/`: add STL extension, MIME, filename, and tessellation configuration.
- `src/cad-kernel/export/`: add the Worker-only B-Rep-to-binary-STL writer.
- `src/workers/cad.worker.ts`: route STL export through the existing revision pinning and lifetime rules.
- `src/components/cad/workspace/runtime/` and `src/features/cad/download/`: add STL request handling, validation, and browser download behavior.
- `src/components/cad/CadWorkspacePanel.tsx`: expose the STL download action.
- Tests and README/OpenSpec documentation will gain STL export coverage and usage guidance.

No new runtime backend, database, CAD import pipeline, 3MF package writer, G-code generator, Bambu Studio protocol integration, or production hosting dependency is introduced.

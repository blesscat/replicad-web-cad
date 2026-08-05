## Context

The current CAD workspace builds and owns the committed B-Rep in a dedicated Worker. STEP export already pins a model revision, writes bytes from that B-Rep, validates the response on the main thread, and triggers one browser download. The workspace also creates a preview mesh for React Three Fiber, but that mesh uses preview-oriented tessellation settings and is not the canonical CAD export source.

The installed replicad version provides `Shape3D.blobSTL`, which performs native tessellation and writes an STL Blob. The new export must remain browser-only and Worker-owned. It is intended for the normal local-file import workflow in Bambu Studio; it is not a desktop-app integration.

## Goals / Non-Goals

**Goals:**

- Generate a non-empty binary STL from the pinned committed B-Rep in the CAD Worker.
- Preserve the existing STEP export contract and behavior.
- Reuse the existing revision lifetime, export pinning, timeout, stale-model, and one-download guarantees.
- Expose STL download for every catalog model with deterministic filenames and mm geometry.
- Validate STL metadata and representative binary STL structure before triggering a browser download.
- Keep STL tessellation settings explicit and separate from preview mesh settings.

**Non-Goals:**

- Automatically launching or controlling Bambu Studio from a browser button.
- Generating 3MF projects, printer profiles, filament profiles, G-code, or slicer settings.
- Importing STL or other CAD formats into the web app.
- Adding a backend, upload service, database, account, or native desktop bridge.
- Replacing STEP export or changing the existing CAD exchange workflow.

## Decisions

### 1. Add a parallel STL export operation

Add an `export.stl` Worker command and an STL-capable export-ready event rather than replacing the existing `export.step` command with a broad untyped format field. This keeps the existing STEP contract stable, makes runtime validation explicit, and allows the Worker and UI to report format-specific errors.

Shared export lifecycle helpers may be extracted for revision pinning, timeouts, response correlation, and browser download cleanup. Format-specific writer and metadata validation remain explicit.

**Alternatives considered:**

- A single `export.model` command with a `format` field: smaller long-term surface, but it broadens the versioned contract and makes existing STEP validation easier to weaken accidentally.
- Main-thread STL generation from the preview mesh: rejected because it moves export responsibility across the CAD boundary and couples print output to viewport tessellation.

### 2. Generate binary STL from the pinned B-Rep

The Worker will call `shape.blobSTL({ binary: true, tolerance, angularTolerance })` for the pinned revision, convert the Blob to an ArrayBuffer, and emit it as STL bytes. The writer will not consume the transferred preview mesh. The initial STL tessellation settings will be explicit configuration values, starting with a finer tolerance than the preview mesh and using the replicad-compatible angular tolerance; benchmark results can tune them before implementation is finalized.

The browser-facing metadata will use `.stl` and `model/stl`, regardless of the internal Blob MIME returned by the CAD library.

**Alternatives considered:**

- ASCII STL: rejected because binary STL is smaller and Bambu Studio does not require ASCII for ordinary model import.
- Reuse the preview mesh and write STL manually: retained only as a possible future fallback; it is not the initial path.

### 3. Extend model definitions with STL filenames

Each catalog definition will provide an STL filename pattern parallel to its existing STEP filename pattern. This avoids deriving a slicer filename from UI labels and ensures `box` and `modular-grid-base` remain consistent across both export formats.

### 4. Keep the existing export state machine and add format-aware requests

The main-thread runtime will track the requested export format in its export request. Both STEP and STL buttons will use the same ready/stale/error gating, and both will be disabled while a model is generating, input is invalid, a Worker is unavailable, or another export is active. The response handler will dispatch to format-specific validation and download adapters while sharing correlation and cleanup logic.

### 5. Validate binary STL structure before download

In addition to revision, Worker epoch, format, MIME, filename, and non-empty byte checks, STL validation will verify the binary STL minimum layout and triangle-count-derived byte length. This catches truncated or mismatched writer responses before a file reaches Bambu Studio. Geometry dimension and solid/watertight validation remain CAD-kernel/integration concerns rather than being inferred from the STL header.

## Risks / Trade-offs

- **[STL tessellation can be expensive for large modular grids]** → Keep generation in the Worker, add exporting progress/timeouts, benchmark representative grid sizes, and use explicit bounded settings.
- **[A preview mesh may not be suitable for printing]** → Generate from the pinned B-Rep with separate STL settings; never use the viewport buffer as the canonical export source.
- **[STL has no reliable embedded unit metadata]** → Document and test the project convention that model coordinates are millimetres; verify known model bounds in integration tests.
- **[A browser cannot reliably pass an in-memory Blob to Bambu Studio]** → Scope this change to downloading STL and explicitly exclude protocol/native-app integration.
- **[A format-specific contract can duplicate export code]** → Share lifecycle and browser download helpers only after keeping the format discriminants and validators explicit.

## Migration Plan

No data migration or deployment migration is required. Existing STEP downloads remain available. The new STL action is additive; if STL generation fails, the UI reports a recoverable export error without changing the committed model or disabling future STEP exports after recovery.

## Measurement Record

The selected settings were measured against the real B-Rep writer in the Node/OpenCascade integration environment and retained as `tolerance = 0.001 mm` and `angularTolerance = 0.1`:

| Fixture | Binary bytes | Triangles | STL export time |
| --- | ---: | ---: | ---: |
| box 20×30×40 | 684 | 12 | 10.3 ms |
| modular grid 2×2 | 459,084 | 9,180 | 311.6 ms |
| modular grid 5×5 | 2,697,684 | 53,952 | 2,513.6 ms |

All outputs had a positive triangle count and matched the binary STL length formula `84 + triangleCount × 50`. The UI label remains `下載 STL`; the adjacent help text explains the Bambu Studio local-file workflow.

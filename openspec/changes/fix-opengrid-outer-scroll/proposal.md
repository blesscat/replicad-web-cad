## Why

At wide desktop viewports such as 1600 × 1394, the OpenGrid parameter panel reaches its `calc(100vh - 15rem)` limit while the page shell still needs space for the navigation bar, page padding, header, and workspace gap. The resulting document is taller than the viewport by about 13 px, so the browser shows an unwanted outer scroll even though the parameter panel already has its own scroll container.

## What Changes

- Adjust the desktop CAD workspace height contract so the parameter panel consumes only the vertical space actually available inside the page shell.
- Keep OpenGrid's long parameter list scrollable inside the parameter panel instead of extending the document on wide desktop viewports.
- Preserve the viewport's stable top alignment and fixed rendering boundary while the parameter panel scrolls independently.
- Preserve normal document scrolling for the single-column layout at or below the existing 760 px breakpoint, where the controls and viewport are intentionally stacked.
- Add an end-to-end regression scenario for a wide 1600 × 1394 OpenGrid workspace and retain coverage for the existing desktop panel-scroll behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cad-loading-layout`: Define the desktop workspace's outer document overflow boundary while preserving independent parameter-panel scrolling and the existing responsive layout.

## Impact

- CAD page shell and Svelte workspace layout styles.
- Desktop OpenGrid parameter-panel scrolling behavior.
- Browser end-to-end layout regression coverage.
- No Worker protocol, CAD geometry, persistence, export, or model-generation changes.

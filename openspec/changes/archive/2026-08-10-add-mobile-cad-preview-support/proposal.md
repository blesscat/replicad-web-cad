## Why

在手機版 CAD 頁面中，3D preview 的觸控 surface 目前仍是 `touch-action: auto`。使用者以單指拖曳模型時，瀏覽器會在短距離後取消 pointer stream，導致 OrbitControls 停止旋轉，必須抬起手指後重新拖曳。手機版的堆疊布局已存在，因此現在需要補齊 preview 的觸控互動契約。

## What Changes

- 讓 CAD preview surface 明確接管觸控手勢，確保單指旋轉在整段拖曳期間持續收到 pointer move。
- 保留 OrbitControls 的預設單指旋轉與雙指縮放/平移行為；preview 以外的手機頁面仍可正常捲動。
- 新增手機 viewport 的行為回歸測試，驗證連續拖曳不會被 `pointercancel` 中斷。
- 不改變模型生成、參數輸入、匯出、gizmo 或既有桌面滑鼠操作。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cad-workspace`: 補充手機 CAD preview 的連續觸控旋轉與頁面捲動邊界要求。

## Impact

- 影響 `src/features/cad/viewport/CadViewport.svelte` 的 preview surface 觸控樣式。
- 影響 `tests/e2e/` 的手機 viewport 與觸控手勢回歸覆蓋。
- 不新增 runtime dependency、API 或 CAD Worker contract；既有 component model IDs 與 OpenGrid IDs 維持不變。

## Why

拖曳 CAD 參數 slider 時，尚未 commit 新模型前，右側 3D viewport 會不預期地重新調整 camera，造成模型看起來跟著旋轉或跳動。這不是使用者操作 3D viewport 的結果，而是參數狀態更新讓目前已 commit 的 mesh 被錯誤視為新物件，進而重建 `Bounds` 並重新 fit camera；需要修正以維持穩定且可預期的編輯體驗。

## What Changes

- 讓 viewport 的模型重建判斷使用穩定的 committed model identity（例如 `modelRevision`），不使用每次 Svelte snapshot 更新都可能改變的 nested proxy identity。
- 使用者調整 slider 或其他參數、而新 generation 尚未 commit 時，保留目前 viewport 的 camera pose、模型 framing 與尺寸標註位置。
- 只有真正替換 committed model 時才重新 fit viewport camera，並維持既有 geometry、material、dimension annotation 與 GPU resource cleanup 行為。
- 新增回歸驗收，涵蓋 slider 拖曳、鍵盤調整參數、stale preview，以及新模型 commit 後仍可正確 framing 與旋轉。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cad-workspace`: 補充參數輸入期間 viewport camera 必須保持穩定，以及 committed model 替換時才允許重新 framing 的行為要求。

## Impact

- 影響 `src/components/cad/CadWorkspace.svelte`、`src/features/cad/viewport/CadViewport.svelte` 與 `src/features/cad/viewport/CadViewportScene.svelte` 的資料傳遞、keying 與 camera-fit lifecycle。
- 影響 CAD workspace 的 viewport E2E 測試；不改變 Worker message contract、CAD kernel、模型生成流程、匯出格式或公開 route。
- 不新增 runtime dependency，也不預期有 breaking API change。

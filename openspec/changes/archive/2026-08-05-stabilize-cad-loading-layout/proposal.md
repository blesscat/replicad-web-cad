## Why

CAD workspace 在載入 CAD engine、建立 B-Rep 或產生 mesh 時，左側 panel 會條件式加入處理進度卡片。外層 CSS Grid 目前會依左側內容高度拉伸右側 viewport，而 viewport 外框與 Canvas 又使用不同的高度規則，造成 loading 期間顯示區域被拉大、版面跳動或內容錯位。這會讓使用者誤以為 3D 預覽本身發生異常，尤其在模組化網格需要較長生成時間時更明顯。

## What Changes

- 建立 CAD viewport 在 loading、generating、ready、stale 與 error 狀態下都保持穩定尺寸與頂端對齊的 layout contract。
- 讓 workspace grid 不因左側處理進度內容變高而拉伸右側 viewport。
- 統一 viewport 外框、Canvas 與無 mesh/WebGL fallback 的高度來源，避免容器與內部畫布尺寸不一致。
- 保留既有 loading progress、status、stale preview、參數編輯與 STEP export 行為；本變更不修改 CAD Worker、camera 或模型生成邏輯。
- 增加 loading 期間的 viewport 尺寸穩定性與既有 responsive layout 行為測試。

## Capabilities

### New Capabilities

- `cad-loading-layout`: 定義 CAD workspace 在非 ready 狀態與進度內容變化期間的穩定 viewport layout 與可驗證行為。

### Modified Capabilities

本變更不修改既有 capability 的模型或 Worker requirements。

## Impact

- 影響 `CadWorkspace` 的 grid layout、`CadViewport` 的容器與 Canvas sizing，以及 loading progress 相關的 E2E 測試。
- 不新增 API、依賴或 Worker message；不改變模型尺寸、預覽內容、相機控制或匯出格式。
- 主要驗證範圍是桌面雙欄 workspace、loading progress 出現前後的 viewport 高度，以及 760px responsive column boundary。

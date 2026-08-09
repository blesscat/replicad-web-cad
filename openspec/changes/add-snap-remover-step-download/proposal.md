## Why

上一版把 `snap remover.step` 做成首頁獨立下載，無法進入既有的 CAD preview，也沒有反映它是 OpenGrid 的固定 component。需求是沿用目前的 model catalog 與 `/cad/<modelId>` 路由，讓它能預覽與下載，但側邊不提供任何可調整參數，同時保留現有模型入口。

## What Changes

- 將 `/Users/blesscat/Downloads/snap remover.step` 原封不動納入 `opengrid-snap-remover` 的 component-local Worker asset，runtime 不依賴使用者的 Downloads 路徑。
- 依目前 catalog 架構新增 `opengrid-snap-remover`，首頁與其他 component 並列，並由 `/cad/opengrid-snap-remover` 進入 preview。
- 讓 CAD Worker 載入、快取並 clone 該 STEP B-Rep，產生 preview mesh 與可下載的 STEP。
- `opengrid-snap-remover` 使用空參數 `{}`；側邊保留 component 名稱、狀態、重試與下載，但不渲染參數控制項。
- 移除首頁獨立 static download card，避免同一個檔案同時出現在 catalog 外與 catalog 內。
- 保留 `box`、`modular-grid-base` 及其既有 route、參數、preview 與 STEP export 行為。
- 將 OpenGrid 元件的 `opengrid-` 命名規則寫入 `openspec/config.yaml`，供後續變更沿用。

## Capabilities

### New Capabilities

- `opengrid-snap-remover-preview`: 提供沒有可調參數的 OpenGrid STEP component preview 與 STEP 下載。

### Modified Capabilities

<!-- Existing box and modular-grid-base requirements remain compatible; this is an additive catalog entry. -->

## Impact

- 影響 `src/cad-contract/units`、`src/features/cad/model-catalog`、`src/cad-kernel/components`、CAD Worker、workspace panel 與首頁 catalog。
- 需要新增 component-local asset loader、Worker cache/clone、空參數 validation、preview route、無參數 sidebar 與 behavior-focused tests。
- 不新增 runtime dependency，不改變 versioned Worker message shape；只擴充既有 `ModelId`/`ModelParameters` union。
- 既有 `box`、`modular-grid-base` 的 model IDs 與 routes 不變，不需要 backend、database 或資料 migration。

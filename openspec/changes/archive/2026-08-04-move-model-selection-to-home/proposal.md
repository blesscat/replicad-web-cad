## Why

模型選擇目前混在 CAD workspace 的參數控制中，讓「選擇要編輯的模型」與「調整目前模型」兩種不同操作混在同一頁。將模型選擇移到首頁，可以讓使用者先決定工作內容，再進入只針對該模型的編輯流程；同時也需要修正首頁仍只描述方塊的文案，讓入口反映目前已有多個 CAD component。

## What Changes

- 在首頁提供目前 catalog 模型的選擇入口與簡短說明，至少包含 `box` 與 `modular-grid-base`。
- 將模型編輯器改為模型專屬路由：`/cad/box` 與 `/cad/modular-grid-base`。
- **BREAKING** 將沒有指定模型的 `/cad/` 導回首頁，要求使用者先選擇模型。
- 移除 CAD workspace 內的模型 selector；進入 workspace 後只能調整路由指定模型的參數。
- 在 CAD workspace 提供返回首頁、重新選擇模型的導覽入口。
- 更新首頁、CAD 頁面與文件中仍以「方塊」或「單一 box」描述整個產品的文案。
- 保留既有各 component 的參數驗證、3D 預覽、stale 狀態與 STEP 匯出行為。

## Capabilities

### New Capabilities

- `home-model-selection`: 在首頁展示可用模型、建立模型專屬 CAD 路由，並提供返回首頁切換模型的流程。

### Modified Capabilities

- `cad-workspace`: workspace 必須依路由鎖定模型，移除頁內模型切換，並顯示目前模型與返回選擇入口。

## Impact

- 影響 Astro 首頁、CAD route、全域導覽與文件頁文案。
- 影響 React CAD workspace 的初始 model state、路由到 catalog definition 的傳遞，以及參數面板的組裝方式。
- 需要更新 route、首頁選擇、模型專屬 CAD 載入、無 JavaScript fallback 與 accessibility 的 E2E 測試。
- 不新增 runtime dependency，不改變 CAD Worker message contract 或 CAD kernel 資源生命週期。

## Why

目前 CAD prototype 只能建立固定尺寸的 box，無法描述可重複排列的 component。新增模組化網格底板後，可以用預先切除完成的單格 STEP template 生成任意 rows × columns 的底板，也為後續加入更多可選 component 建立一致的架構。

## What Changes

- 新增 `modular-grid-base` component：單格 20×20 mm、固定高度 5 mm，可調整 rows 與 columns。
- 將預先切除完成的 `cell-template.step` 作為精確 B-Rep runtime asset；生成時只複製、平移並融合單格，最後對外側四個垂直角做 R2.5 mm 圓角。
- 將 component function 與其 STEP asset 放在同一個 component 目錄，並建立可擴充的 component catalog。
- 將 UI、Worker command、參數驗證與輸出命名從 box-only 改為支援可選 component 及 component-specific parameters。
- 在 Worker 內載入並快取 STEP template，維持 CAD kernel、資源生命週期及最新請求優先的邊界。
- 更新 CAD 預覽尺寸、模型 bounds、STEP 匯出與相關測試，使其反映所選 component 的實際生成結果。
- **BREAKING**：Worker 的 model generation contract 不再只接受 `modelId: 'box'` 與 `BoxParameters`；contract/state/catalog 需要改成可表達多種 component 的形式。

## Capabilities

### New Capabilities

- `modular-grid-base`: 以預切除單格 template 生成可調整 rows × columns 的模組化網格底板。

### Modified Capabilities

- `cad-workspace`: 從單一 box prototype 擴充為可選 component、可依 component 生成與匯出的 CAD workspace。

## Impact

- 主要影響 `src/cad-contract`、`src/cad-kernel`、`src/workers/cad.worker.ts`、`src/features/cad` 與 `src/components/cad`。
- 新增 component-local 的 TypeScript builder 及由使用者提供的 `cell-template.step` canonical runtime asset。
- 需要處理 Vite/Worker 對 STEP asset URL 的打包方式，以及 Worker 內 STEP 載入、快取和 dispose。
- 需要補上 geometry、contract、Worker lifecycle、UI 互動與 STEP export 的行為測試；不需要後端或資料庫變更。

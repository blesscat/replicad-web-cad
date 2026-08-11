## Why

OpenGrid 的官方尺度是整格 28 mm、半格 14 mm，但目前數值散落在多個 CAD contract，且 `opengrid-divider` 仍使用自製的 14 mm 整格／7 mm 半格，造成同一套 OpenGrid 元件之間的尺度不一致。現在集中定義這項共用規格，可以讓新元件與既有元件都從同一個來源取得間距，並使 Divider 與 OpenGrid 生態相容。

## What Changes

- 建立一個可供所有 OpenGrid CAD contract 使用的官方 grid contract，統一定義 28 mm 整格與 14 mm 半格。
- 讓 OpenGrid、half-cell、Snap、stackable box、stackable cylinder 等既有元件的 grid 相關設定引用共用 contract，避免同一數值在多處獨立維護。
- **BREAKING** 將 `opengrid-divider` 從 14 mm 整格／7 mm 半格改為 28 mm 整格／14 mm 半格，並更新其 500 mm 外形上限與驗證行為。
- 更新 Divider 的規格文件、品質錯誤訊息、單元／整合測試與必要的 UI 文案，明確說明它繼承官方 OpenGrid 尺度。
- 保留既有元件 ID、build key、route、catalog 路徑與匯出介面；Divider 的幾何長度會因尺度修正而改變，這是刻意的相容性變更。
- 保留孔徑 `7.05 mm`／`5.05 mm`、元件專用的 7 mm 邊界或定位偏移，以及 Snap 的 nominal／fixed clearance；這些不是本次要合併的共用 grid pitch。

## Capabilities

### New Capabilities

- `opengrid-grid-contract`: 定義官方 OpenGrid 的 28 mm 整格／14 mm 半格共用尺度，以及所有 OpenGrid CAD 元件遵循此尺度的契約。

### Modified Capabilities

- `opengrid-divider-generator`: 將 Divider 的整格／半格及其可用尺寸上限改為官方 OpenGrid 28/14 尺度，移除 14/7 自製底座的排他性規則。

## Impact

- 主要影響 `src/cad-contract/units` 中的 OpenGrid、Snap、stackable box/cylinder 與 Divider 設定，以及其 CAD builder、quality validation、worker 訊息與測試。
- Divider 目前以數格表示的參數格式維持不變，但相同數值代表的實際毫米長度會變大；最大可用 arm count 需按 500 mm 上限重新計算。
- OpenSpec 會新增共用 grid contract 規格，並修改 `opengrid-divider-generator` 規格；既有 OpenGrid 元件規格的 28/14 行為保持不變。
- 不新增 OpenGrid 元件，也不改動既有穩定命名；依專案規則，所有受影響元件仍使用既有的 `opengrid-<component-slug>` ID 與顯示名稱。

## Context

目前官方 28 mm／14 mm grid contract 已集中在 `src/cad-contract/units/opengrid-grid.ts`，OpenGrid、stackable box/cylinder 與 Divider 的 contract 都引用同一來源。Divider 使用 `gridStep=0.5`、每方向 `maxArmCount=10` 與 500 mm 合併平面 envelope；Snap profile registry 中未被 runtime 使用的固定 `hostPitch: [14, 14]` 欄位也已移除，避免 metadata 與實際 host pitch 契約混淆。

本變更需要跨 CAD contract、CAD kernel、Worker、測試與 OpenSpec 規格同步，且必須保留既有 OpenGrid 元件的穩定命名與匯出介面。

## Goals / Non-Goals

**Goals:**

- 建立唯一的官方 OpenGrid grid contract，明確提供 28 mm full pitch 與 14 mm half pitch。
- 讓所有 OpenGrid grid 相關 consumer 從該 contract 取得尺度，包括 Divider。
- 將 Divider 的 arm 長度、半格語義與 500 mm 平面上限重新對齊官方尺度；目前每一方向最多 10 格，且合併後的平面 envelope 仍須獨立通過 500 mm 檢查。
- 讓 runtime metadata、品質檢查、Worker 訊息、測試與規格文件一致。
- 保留 `opengrid-divider` 既有參數欄位與所有 OpenGrid 元件的 `modelId`、build key、route、catalog 路徑及匯出介面。

**Non-Goals:**

- 不合併或重命名 `7.05 mm`／`5.05 mm` 孔徑；孔徑仍由各元件的孔幾何 contract 管理。
- 不把元件專用的 7 mm 邊界偏移、定位孔中心或其他 clearance 強行當成 half pitch。
- 不重設 Snap、box、cylinder 的既有幾何設計或外部 STEP asset；只修正其 grid 來源與矛盾 metadata。
- 不新增 OpenGrid 元件，也不改變保存快照的參數 schema。

## Decisions

### 1. 新增專用的官方 grid contract

在 `src/cad-contract/units/opengrid-grid.ts` 建立 `OPENGRID_GRID_CONFIGURATION`，只放官方尺度：`fullPitch: 28` 與 `halfPitch: 14`。`HALF_CELL_CONFIGURATION` 改為引用這兩個值，並繼續保存 Snap 的 nominal／fixed 尺寸；這樣 half-cell 的幾何 helper 仍維持原有 API，但 28/14 不再由它單獨持有。

選擇獨立模組而不是把所有元件直接依賴 `half-cell.ts`，是因為 stackable 與 Divider 並不是 half-cell helper 的 consumer。把孔徑、7 mm 偏移或 clearance 放進同一個設定物件則會模糊「官方 grid」與「元件特徵尺寸」的邊界，因此不採用。

### 2. 以語義欄位引用 contract

- `opengrid` 的 `gridPitch` 與依 500 mm 上限計算的 grid count 使用 `fullPitch`。
- stackable box 的 footprint 使用 `fullPitch`，底孔格距使用 `halfPitch`；stackable cylinder 的底孔格距使用 `halfPitch`。
- Divider 的 `gridPitch` 使用 `fullPitch`，`halfGridPitch` 使用 `halfPitch`，`pegCenterSpacing` 使用 `fullPitch`。
- half-cell host helper 與 Snap boundary 繼續提供 full／half／quarter footprint 所需的 28/14 行為；Snap profile 中無 runtime consumer 的固定 `hostPitch` 欄位移除，避免以 `[14, 14]` 表示所有 footprint。實際 host pitch 以 shared contract 與 `halfCellHostPitch` 為準。

這些改動保留既有設定欄位名稱，降低 builder 與外部呼叫面的變更；改變的是欄位值的來源與 Divider 的尺度語義。

### 3. Divider 的上限與平面 envelope

Divider 使用 `gridStep=0.5`、每一方向 `maxArmCount=10` 與 `maxDimension=500`。單一方向的 10 格上限與多方向合併後的 500 mm 平面 envelope 是兩個獨立檢查：前者限制輸入欄位，後者限制生成結果的整體寬／深。Peg 仍以每 28 mm 放置；它代表每一個官方 full grid，而不是兩個舊的 14 mm full grids。

### 4. 以行為測試驗證尺度遷移

測試應驗證 shared contract 的 28/14 數值、各 consumer 的公開幾何結果，以及 Divider 的 10／10.5 單方向邊界、28 mm full arm、14 mm half arm 與合併平面 envelope。既有孔徑、定位偏移與 Snap asset 尺寸測試維持原意。測試不以搜尋原始碼文字作為 centralization 的唯一證據；centralization 由 code review 加上各 consumer 的行為與 contract 測試共同保護。

## Risks / Trade-offs

- **Divider 幾何會變大** → 參數 count 格式維持不變，但同一個 count 會對應新的毫米長度；更新 preview、測試與說明，並把這項行為列為明確的 breaking change。
- **浮點步進造成邊界誤差** → 使用既有 normalize／tolerance 邏輯，並針對 10、10.5 與多方向 500 mm envelope 建立明確邊界測試。
- **7 mm 數值被誤認為 half pitch** → 保留描述性欄位名稱與元件專用設定，明確在 spec／design 中區分孔徑、定位中心、邊界偏移與 grid pitch。
- **移除 Snap 的未使用 metadata 可能影響未知消費者** → 先以 repository-wide search 確認沒有 runtime 或 test 以外的 consumer，再更新型別與 registry 測試；若發現外部序列化需求，改為以 shared contract 推導並標明語義，而不保留硬編碼 `[14, 14]`。

## Migration Plan

1. 新增 shared grid contract，讓既有 half-cell helper 轉為引用它。
2. 依 consumer 語義更新 OpenGrid、stackable、Snap metadata／boundary 與 Divider contract，並更新 Divider 上限計算。
3. 更新 CAD quality、Worker 訊息、UI／catalog 文案、unit／worker／e2e 測試與 OpenSpec specs。
4. 執行格式、型別、單元、Worker、E2E 與 OpenSpec validation；確認既有 model IDs 與匯出路徑不變。

本變更不需要資料 migration；若需 rollback，回退 shared contract 引用與 Divider 尺度變更即可，既有快照欄位仍可解析。

## Open Questions

無。Snap 的固定 `hostPitch` 已確認為 repository 內未使用的矛盾 metadata，本設計將移除它而以實際 half-cell host contract 作為唯一來源。

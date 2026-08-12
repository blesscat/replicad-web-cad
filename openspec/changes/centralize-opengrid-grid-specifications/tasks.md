## 1. 建立官方 OpenGrid grid contract

- [x] 1.1 新增 `src/cad-contract/units/opengrid-grid.ts`，公開唯一的 `OPENGRID_GRID_CONFIGURATION`，定義 `fullPitch=28` 與 `halfPitch=14`。
- [x] 1.2 更新 `src/cad-contract/units/index.ts` 與 `half-cell.ts` 的 exports／引用，讓既有 half-cell helper 維持原有 API 並從 shared contract 取得 28/14。
- [x] 1.3 更新 `opengrid.ts` 的 `gridPitch` 與 grid count 計算，確認 500 mm 上限使用 shared full pitch，且既有 `opengrid` 識別與輸出介面不變。

## 2. 遷移既有 OpenGrid consumers

- [x] 2.1 更新 stackable box contract，使 footprint 使用 shared full pitch、底孔格距使用 shared half pitch，並保留 `7.05`／`5.05` 孔徑與元件專用 7 mm offset 的原有語義。
- [x] 2.2 更新 stackable cylinder contract，使底部孔層使用 shared half pitch，並確認孔徑與其他幾何尺寸沒有被 grid migration 改變。
- [x] 2.3 檢查 half-cell host helper、Snap boundary 與所有 full／half／quarter footprint 路徑，補上 shared contract 引用與 28/14 行為測試。
- [x] 2.4 移除未被 runtime 使用且固定為 `[14, 14]` 的 Snap profile `hostPitch` metadata，或在發現序列化 consumer 時改為由 shared contract 推導並明確標示語義；同步更新型別、registry 與 profile tests。

## 3. 將 OpenGrid Divider 對齊官方尺度

- [x] 3.1 更新 `opengrid-divider.ts`，讓 `gridPitch`／`halfGridPitch`／`pegCenterSpacing` 分別引用 shared full／half／full pitch。
- [x] 3.2 將單一方向 `maxArmCount` 固定為 10，並保留多方向合併後的 500 mm planar-envelope 檢查與 field-specific validation diagnostics。
- [x] 3.3 檢查 Divider builder、quality validation、bounds 與 export path，確認所有 arm 長度與半格運算都使用更新後的 contract，且仍產生單一連通 solid。
- [x] 3.4 更新 Worker 錯誤訊息、catalog／UI 文案與其他使用 14 mm full／7 mm half 描述的文字，改為官方 28 mm full／14 mm half；保留 `opengrid-divider` 的 modelId、build key、route、catalog 路徑與匯出檔名契約。

## 4. 更新規格與行為測試

- [x] 4.1 更新 Divider unit tests，覆蓋 28 mm full arm、14 mm half arm、官方尺度下的形狀 spans、10 上限與 10.5 rejection，並保留 peg placement、fillet、chamfer 與 solid quality 覆蓋。
- [x] 4.2 更新 Divider worker integration、CAD quality、preview／export 與 E2E tests，確認新的幾何尺寸、錯誤文案及既有 OpenGrid 元件不受影響。
- [x] 4.3 新增 shared grid contract 與 consumer behavior tests，確認 `opengrid`、half-cell、Snap、stackable box/cylinder、Divider 的 full／half mapping 一致，並確認 `7.05`／`5.05` 孔徑及元件專用 7 mm offset 未被改動。
- [x] 4.4 依已建立的 change specs 更新 repository 的 OpenSpec source-of-truth，確認 `opengrid-divider-generator` 不再宣告 14/7 自製尺度，並保留既有 OpenGrid 元件的穩定命名規則。

## 5. 驗證與交付

- [x] 5.1 執行 formatter、TypeScript typecheck、相關 unit tests、worker integration tests、E2E tests 與 `openspec validate`，修正所有因 28/14 遷移造成的失敗。
- [x] 5.2 檢查 git diff，確認本變更沒有修改無關的孔徑／clearance 規格、沒有新增元件命名、且只在 Divider 明確範圍內接受 breaking geometry change。

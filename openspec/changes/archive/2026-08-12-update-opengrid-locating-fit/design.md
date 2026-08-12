# Design: OpenGrid 定位介面與定位柱尺寸更新

## Context

目前 OpenGrid 的共用定位契約把測試軸徑設為 Ø4.5 mm、特殊下段孔設為 Ø4.55 mm，而定位柱固定模式本體仍是 Ø4.5 mm。這使固定定位柱、方盒四角孔、圓盒中心／外側孔與品質 fixture 使用不同於已確認的 Ø5 mm 連接標準。

定位柱目前只有模式與 positioning 長度參數，沒有可持久化的 XY 位置調整；固定版長度也仍是堆疊版 8 mm、薄殼版 5 mm。這次變更需要同步處理幾何、共用 contract、Worker 品質檢查、模型卡、workspace parser／panel、參數保存、匯出識別與測試，避免只改單一 builder 造成契約漂移。

## Goals / Non-Goals

### Goals

- 將確認範圍內的定位本體、特殊下段孔與品質 fixture 軸徑統一為 Ø5 mm。
- 將固定定位柱長度更新為堆疊版 9 mm、薄殼版 6 mm，並保持 Z=0 底面基準。
- 讓 standard、thin-shell、positioning 三種定位柱都支援 `offsetX`／`offsetY`，合法值為 -0.5～0.5 mm、步進 0.05 mm。
- 讓 offset 影響完整幾何的 XY 世界座標與 bounds，但不改變截面、長度、倒角或 Z 尺寸。
- 同步更新模型卡描述、參數保存、品質 fixture、匯出檔名／metadata、規格與行為測試。

### Non-Goals

- 不改變官方 28 mm 網格 pitch、14 mm half-pitch 或一般網格孔的 Ø5.05 mm 裝配開口。
- 不改變 retaining 開口 Ø7.05 mm、法蘭 Ø7 mm × 0.8 mm、既有 component ID、route、build key 或 storage key。
- 不新增可調直徑、法蘭高度、倒角或固定模式手動長度控制。
- 不新增 component，也不執行 OpenSpec archive、commit、push 或 pull request。

## Decisions

### 1. 共用尺寸契約採「精確 Ø5」與「一般孔保留 Ø5.05」並存

共用 locating contract 將維持 nominal diameter 5 mm、assembly increment 0.05 mm、ordinary assembly opening 5.05 mm 與 retaining opening 7.05 mm；`testShaftDiameter` 與特殊下段使用的 `shaftOpeningDiameter` 都改為精確 5 mm。`shaftOpeningDiameter` 不再由 test shaft diameter 加 assembly increment 推導，因為這次確認的是特殊連接孔本身為 Ø5 mm。

這個拆分讓一般 28／14 mm 網格孔保留既有裝配間隙，同時讓方盒／圓盒的特殊下段孔和測試軸符合確認尺寸。品質 fixture 繼續使用 Ø7 mm × 0.8 mm 法蘭，軸長仍由地板厚度加 1 mm 推導。

### 2. 定位柱以 normalized `offsetX`／`offsetY` 保存，三種模式共用

定位柱的 normalized snapshot 改為：

- fixed：`{ mode, offsetX, offsetY }`
- positioning：`{ mode, length, offsetX, offsetY }`

offset 以數字保存，預設為 0，必須是有限值、落在 -0.5～0.5 mm 且為 0.05 mm 的整數倍。validator 直接拒絕不合規值，不在 parser 內自動四捨五入；UI 的 `min`／`max`／`step` 只負責協助輸入，Worker 還是以同一份 runtime contract 驗證。

舊有只含 `mode` 或 `mode`／`length` 的 snapshot 在 normalize 時補上兩個 0 mm offset；舊式 positioning legacy shape 也沿用既有轉換後補零。這樣既有保存資料不會失效，新 snapshot 則在所有模式都明確包含 offset。

### 3. 先建立本地幾何，再做完整 XY translation

Pillar builder 仍以局部座標建立完整幾何，最後對整個 Shape3D 套用 `(offsetX, offsetY, 0)` translation。固定模式的 body diameter 改為 Ø5 mm，固定總長改為 9／6 mm；positioning 維持 Ø5 mm 與既有 chamfer／長度限制。translation 不會拆分套用到單一 body 或 flange，確保所有面、倒角和品質 probe 一起移動。

`boundsForPillar` 以 local bounds 加上 offset 計算世界 bounds：fixed 的 XY half extent 仍為 3.5 mm，positioning 仍為 2.5 mm；Z 範圍分別為 0～9、0～6 或 0～length。品質檢查的幾何探針要使用相同 offset，並額外驗證 offset 不會改變直徑與 Z 基準。

### 4. 匯出檔名只在非零 offset 時增加 deterministic suffix

固定模式的 zero-offset 檔名更新為 `pillar-9-standard` 與 `pillar-6-thin-shell`；positioning 的 zero-offset stem 維持 `pillar-{length}-positioning`。非零 offset 在 stem 後附加 `-x{offsetX}-y{offsetY}`，例如 `offsetX=0.25`、`offsetY=-0.15` 時使用 `pillar-25-positioning-x0.25-y-0.15`。

數值格式化要避免 `-0`，並以 normalized numeric value 產生穩定的小數表示。zero-offset 不加 suffix，以保留未調整定位柱的既有下載識別習慣；非零值加 suffix，避免不同幾何共用同一匯出 metadata 或下載檔名。

### 5. 方盒與圓盒只改特殊下段孔，保留上段 retaining profile

方盒四角 special socket cutter 和圓盒中心／四個外側 cardinal hole cutter 都讀取同一個精確 Ø5 mm lower opening；上段仍為 Ø7.05 mm，深度、薄殼／堆疊模式差異與 hole center 佈局不變。圓盒五個 stepped hole 的中心孔與四個外側孔共用這個 lower diameter，避免只更新外側孔而留下中心孔的舊尺寸。

模型卡描述以使用者可辨識的語意同步更新：方盒說明四角連接孔為 Ø5 mm；圓盒說明中心加四個外側連接孔為 Ø5 mm；定位柱說明 9／6 mm、Ø5 mm 與 XY offset 範圍。

## Risks / Trade-offs

- 精確 Ø5 mm 下段孔搭配 Ø5 mm fixture shaft 不保留舊有 0.05 mm 名目差值；這是已確認的尺寸要求，但可能使實際製造對公差更敏感。品質測試需改以 Ø5 mm fixture 驗證，並保留尺寸／穿透失敗時的可診斷錯誤。
- fixed pillar 的零偏移下載檔名會因長度改變而從 8／5 變成 9／6；所有 filename、catalog、runtime 與 E2E 斷言必須同批更新，避免舊識別被誤認為目前幾何。
- offset 會讓 bounds 不再固定置中；若任何 consumer 假設 XY 原點置中，需改讀 runtime bounds，而不能硬編碼 ±2.5／±3.5。穩定 model identity 不受 offset 影響。
- 舊保存資料缺少 offset 欄位；normalize 補零可維持相容，但 malformed 或超界 offset 必須走既有 invalidation 流程，不能靜默生成錯誤幾何。
- 非零 offset 檔名增加識別資訊，會使下載檔名與既有只依 length／mode 的消費者不同；zero-offset 保留 compact stem 可降低不必要的相容性影響。

## Migration Plan

1. 先更新共用 contract、pillar contract 與各 component config，使所有 builder／quality fixture 使用同一組尺寸常數。
2. 加入 normalized offset 驗證、legacy snapshot 補零、UI 控制與 workspace generate／invalidate lifecycle。
3. 更新 pillar translation、bounds、quality probe、catalog schema／description 與 box／cylinder model-card description。
4. 更新 unit、Worker integration、export runtime、catalog、persistence 與 E2E 行為測試；特別覆蓋圓盒五個下段孔和三種 pillar mode 的 offset。
5. 執行 OpenSpec validation 與相關測試。若需回滾，回復本 change 的 application commits 即可；保存資料仍可由舊版讀取，因為新版新增欄位只在 normalize 層補入。

## Open Questions

None. The diameter scope, fixture shaft scope, fixed lengths, offset range, step, and affected descriptions were confirmed during exploration.

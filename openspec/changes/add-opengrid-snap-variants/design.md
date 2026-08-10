## Context

目前 `opengrid-snap` 的 contract 只有 `variant`、`offset`、`halfCellX`、`halfCellY`，builder 以兩個已存在的 STEP 作為來源，並在半格路徑中對抽出的 solids 做外框處理。這個來源模型把部分功能孔洞與基準 body 綁在一起，且現有半格裁切不能保證 Side Holder、Snap 與 body 在同一個 OpenGrid 邊界操作中留下可安裝的斜角切除面。

四個新的 Bare STEP 是幾何校驗來源：Standard Full/Lite 匯入為 Body、四個 Side Holder、四個 Snap，共九個 solids；Directional Full/Lite 的匯出拓撲是融合的單一 solid，並具有不對稱方向與 variant-specific 細節。因此不能用一個「旋轉 Standard」的路徑涵蓋兩個 profile。

## Goals / Non-Goals

**Goals:**

- 將 Bare Standard Full/Lite 定義為實心 body 基準，並以兩個獨立 cutter 控制四周定位孔與中心 remover 孔。
- 以穩定的 `opengrid-snap` identity 擴充 profile、feature、offset 與半格軸向 contract。
- 將完整 Body、Side Holder、Snap 組裝與定位完成後，再對所有受影響 solids 套用共同的 OpenGrid host boundary、外框增量與斜角卡入面。
- 為 Standard 與 Directional 建立明確的 profile/variant registry，讓 Full/Lite 高度與局部細節不依賴不安全的 uniform scale。
- 讓參數保存、預覽、品質檢查與 STEP/STL export 使用同一份已驗證的 normalized snapshot。

**Non-Goals:**

- 不新增另一個 component modelId，也不修改 OpenGrid board generator 的 rows、columns、screw 或 connector API。
- 不在本 change 開放 Directional 的任意旋轉方向；先固定四個 Directional STEP 的 canonical orientation。
- 不把所有 Directional BSpline 細節強行轉成與 Standard 共用的幾何 primitive；初期可使用 repository-owned source-backed profile 作為回歸基準。
- 不把 hole diameter、hole center 或固定 body 細節當成 offset/half-cell 的縮放參數。

## Decisions

### 1. 保留既有 Snap identity，沿用 half-cell 軸向欄位

normalized snapshot 擴充為：

```ts
{
  variant: 'Full' | 'Lite',
  profile: 'Standard' | 'Directional',
  offset: number,
  halfCellX: 'none' | 'left' | 'right',
  halfCellY: 'none' | 'top' | 'bottom',
  fourCornerLocatingHoles: boolean,
  centerRemoverHole: boolean,
}
```

選擇既有的 `halfCellX`/`halfCellY` 而不是新建 `footprint` enum，因為這組欄位已經同時被 OpenGrid board、Snap quality 與 host-pitch 規則使用；兩軸同時選取自然代表四分之一格。`profile` 與兩個 boolean 會成為 normalized snapshot 的必要欄位，舊 snapshot 在 persistence normalization 階段補上預設值。

替代方案是新增獨立 `footprint` 與方向欄位，但會造成既有 half-cell contract 重複、檔名與保存格式分裂，因此不採用。

### 2. Standard 使用實心 Bare 基準，功能孔洞使用獨立 cutter

建立 profile registry，至少包含 `Standard/Full`、`Standard/Lite`、`Directional/Full`、`Directional/Lite` 四個 profile key。每個 key 提供高度、host envelope、固定細節 probes、assembly 組成與可選 feature 的幾何定義。

Standard 的第一階段實作優先將 Body、Side Holder 與可參數化的外框幾何改成程式生成，Bare STEP 只作為 repository-owned regression fixture。Body 建立後依序套用：

1. 四周定位孔 cutter（若啟用）；
2. center remover cutter（若啟用）；
3. 固定 body 細節與 B-Rep 驗證。

四周孔依原始 hole fixture 定義為四個直徑 5.0 mm、中心位於 (±7.0, ±7.0) mm 的固定圓孔；每個孔在 Body 底部再與 3.0 mm 寬的十字環形彈性槽相接。彈性槽的四個臂位於 `x∈[-5,5], y∈[±5.5,±8.5]` 與 `x∈[±5.5,±8.5], y∈[-5,5]`，Full 開到 Z=4.8 mm，Lite 開到 Z=1.9 mm。center remover 使用原始 hole fixture 量測出的 Z-stepped rectangular profile，不假設它是圓孔：下段為 8 × 8 mm、上段為 4 × 8 mm，Full 在 Z=4.8 mm 變階，Lite 在 Z=1.9 mm 變階。這樣可以保證「無孔」真的回到實心 Bare body，也避免把孔徑、彈性槽或階梯輪廓誤放進 scaling 或 offset 流程。

替代方案是繼續以已挖孔 STEP 作為母體再用填補幾何復原實心 body；這會依賴不可逆的拓撲假設，且容易留下錯誤面，故不採用。

### 3. Directional 使用獨立 profile，不由 Standard 旋轉推導

Directional Full/Lite 各自註冊自己的 assembly source/profile。Directional builder 必須保存其 canonical asymmetric boundary、Full/Lite 的高度與內建方向性細節；若初期仍使用 STEP，必須把檔案包在 `src/cad-kernel/components/opengrid-snap/assets` 或對應的 profile-local 目錄，不能讀下載資料夾。

Quality gate 對 Directional 使用 profile-specific topology、bounds 與 feature probes。這是因為原始 Directional STEP 可能匯入成融合的單一 solid，不能依賴 TopExp solid 順序去猜 Body、Side Holder、Snap 的語意組成。

替代方案是把 Directional 視為 Standard 的旋轉或鏡射；這會抹掉不對稱外框與 variant-specific 細節，故不採用。

### 4. 先組裝定位，再做一次共同的半格/四分之一格裁切

builder pipeline 固定為：

```text
resolve profile
→ build Body + optional cutters
→ build Side Holder ×4
→ build Snap ×4 或 Directional profile assembly
→ apply rotations/translations
→ apply shared host-shaped boundary operation
→ validate B-Rep/mesh/bounds/features
```

共同 boundary operation 必須包含：

- 所選 half-cell 軸的 14 mm host pitch 限制；
- offset 對外框的總增量，不得縮放整組 assembly；
- 被切面所需的 OpenGrid 斜角／卡入面；
- Body、Side Holder、Snap 所有相交 solids 的同一套裁切語意。

這會取代目前只用矩形 box 的簡化裁切。若 cutter 與 hole 相交，結果是固定孔輪廓的自然裁切，不是先縮小孔徑。Half-cell 與 quarter-cell 的差異只由 X/Y 軸選擇決定，不增加 diagonal variant。

### 5. 以 profile fixture 與行為測試共同驗證

四個 Bare STEP 會被當成只讀 fixture，先完成一次 characterization，記錄 bounds、Z 高度、solid topology、固定孔／曲面 probes、Directional asymmetry 與 assembly 方向。runtime 測試則驗證：

- 2 profiles × 2 variants；
- 4 種 optional-hole 組合；
- full、四個 single-axis half-cell 方向、四個 dual-axis quarter-cell 組合；
- offset 0 與代表性的合法非零 offset；
- B-Rep、finite mesh、孔徑／孔中心、外框增量、切除面卡入幾何與 export revision 一致性。

測試以生成結果的行為、幾何量測與 mesh/STEP 可用性為主，不以實作字串或 TopExp 順序作為產品契約。

### 6. 保存格式以安全 normalization 過渡

新的 persistence entry 只保存完整 normalized snapshot。讀到舊版 `opengrid-snap` entry 時，保留其合法的 variant、offset、half-cell 方向，補上 `profile=Standard`、`fourCornerLocatingHoles=false`、`centerRemoverHole=false`；讀不到或驗證失敗則使用 component defaults。`opengrid` board entry 永遠不參與 Snap 欄位合併。

這是明確的視覺行為變更：舊資料不再隱含挖孔模型，若需要孔洞必須由使用者選取並保存。

## Risks / Trade-offs

- **[Directional STEP 拓撲融合，難以拆成三個語意零件]** → 將 Directional 設為獨立 profile；初期保留 source-backed assembly，使用 profile-specific quality probes，不依賴 solid order。
- **[Snap 的 BSpline/斜角細節難以一次精確程式重建]** → Standard 先重畫可維護的 Body/Side Holder；Directional 和高風險 Snap 曲面保留 fixture oracle，逐步替換成經量測的 profile primitive。
- **[OCC fuse/intersect/chamfer 在邊界相切時產生無效 B-Rep]** → 先用完整 assembly 做 boundary operation，集中管理 tolerances；每個候選在 commit 前跑 B-Rep、mesh、bounds、feature probes。
- **[舊版保存資料與新實心預設的視覺結果不同]** → migration 明確補上關閉孔洞的 defaults，並以 UI 顯示目前 profile/feature state；失敗保存資料只回退 defaults，不阻斷 CAD。
- **[四個 profile 的資產載入增加 Worker 記憶體壓力]** → 以 profile/variant key 做 epoch 內快取，失敗移除 promise，dispose 時只釋放已建立的 reference。

## Migration Plan

1. 先將四個外部 STEP 複製為 repository-owned fixture 或完成等價 profile 定義，並寫 characterization 報告與測試資料。
2. 更新 contract、catalog panel、workspace raw-input parsing、model routing 與 persistence normalization；保持 `opengrid-snap` identity 不變。
3. 實作 Standard Body/Side Holder 基準與兩個 optional cutters，通過 full-cell Full/Lite 四種孔洞組合。
4. 實作 Standard Snap 與完整 assembly placement，接著加入共同 half-cell/quarter-cell boundary operation 與斜角切除面。
5. 接入 Directional Full/Lite profile 與 canonical orientation probes。
6. 更新 Worker quality gate、STEP/STL filenames、viewport/export revision consistency，以及 unit/worker/e2e regression matrix。
7. 若品質 gate 失敗，candidate 不取代既有 committed revision；若需要回滾，回復本 change 的 contract/profile registry 與 assets 即可，不需要資料庫 migration。

## Open Questions

- center remover 的差異已由既有 Full/Lite hole fixtures 確認；Standard 與 Directional 共用同一組 XY 輪廓，並依 Full/Lite 使用各自的 Z 階梯高度。
- Directional STEP 中已存在的方向性圓柱／曲面哪些屬於 intrinsic profile、哪些應由兩個 optional body feature 控制，需在 characterization 階段明確標記，避免重複 cutter。
- Standard Full/Lite 的 Body 可共用多少 XY 輪廓與固定細節，需以面／孔 probes 驗證後再決定是共用 builder 加高度參數，還是保留兩個 profile implementation。

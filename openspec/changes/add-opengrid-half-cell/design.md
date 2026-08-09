## Context

目前進行中的 OpenGrid generator 以 28 mm 為單位，`rows`／`columns` 是整數，底板 bounds 置中於 X/Y。尺寸計算器只會向下取完整格數。OpenGrid Snap 則使用 Full/Lite 的 25.6 mm 完整格 reference assembly，透過一個共用 `offset` 調整外框；現有 contract 嚴格限制為 `variant` 與 `offset`。

這次半格是本專案的自訂擴充，不是官方 OpenGrid 或官方 Snap profile。它必須和既有官方 28 mm board profile、Snap Full/Lite reference、Worker latest-wins lifecycle、candidate ownership、persistence 與 export gate 分開處理，避免把自訂半格誤標成官方相容性。

## Goals / Non-Goals

**Goals:**

- 用兩個 typed axis 欄位表達所有半格狀態：X 軸 `none`／`left`／`right`，Y 軸 `none`／`top`／`bottom`。
- 讓單軸與雙軸半格共用同一個 contract，不增加 `allowHalfCell`、half-cell mode 或獨立對角線 enum。
- 讓 OpenGrid board 的每個選定軸增加固定 14 mm 半格，保留既有完整格數、28 mm pitch、置中 bounds 與官方 tile profile。
- 讓尺寸計算器依目前 X/Y 方向選擇計算最大合法 board，且不超過目標尺寸。
- 讓 Snap 以相同的方向欄位產生可嵌入半格的自訂幾何；沒有半格時維持目前 Full/Lite 九 solid reference 行為。
- 讓半格 snapshot 通過同一套 runtime validation、Worker candidate/commit、quality gate、STEP/STL revision pinning 與 persistence 流程。

**Non-Goals:**

- 不修改官方 OpenGrid 28 mm tile profile、Full/Lite/Heavy 厚度、官方螺絲、connector 或 chamfer 語義。
- 不新增任意小數格、四分之一格以外的比例、可變半格尺寸、旋轉方向或額外 Snap variant。
- 不新增專門的左上、右上、左下、右下參數；雙軸狀態永遠由兩個 axis 欄位組合而成。
- 不宣稱半格 Snap 來自官方 asset，也不把 OpenSCAD 或外部 CAD runtime 帶入 browser/Worker production path。
- 不改變沒有半格的既有 Snap asset、offset 範圍、Full/Lite 高度或其他模型的參數契約。
- 不在這個 change 中實作多個 component 的組合裝配或自動放置；兩個 generator 各自輸出以原點為中心的模型，嵌入相容性由相同的局部尺寸與方向契約保證。

## Decisions

### 1. 用 axis side enum 取代 boolean 與獨立 mode

OpenGrid 與 Snap 的 normalized parameters 都加入：

```ts
halfCellX: 'none' | 'left' | 'right'
halfCellY: 'none' | 'top' | 'bottom'
```

`none` 表示該軸沒有半格；非 `none` 表示該軸增加一個半格，並指定外側位置。X 軸的 `left` 對應負 X、`right` 對應正 X；Y 軸的 `top` 對應正 Y、`bottom` 對應負 Y。每個 axis 欄位只有一個 enum 值，因此左右與上下天然互斥。

這個方案選擇兩個欄位而不是 `allowHalfCell + side`，是因為有無與方向可以由同一個欄位直接判定；也選擇兩個欄位而不是八個對角線值，避免單軸與雙軸需要兩套互相漂移的 contract。`halfCellX !== 'none'` 與 `halfCellY !== 'none'` 是唯一的衍生 mode 判定。

### 2. 固定 14 mm 半格並保留完整格數

OpenGrid board 的有效尺寸定義為：

```text
width  = columns × 28 + (halfCellX === 'none' ? 0 : 14)
depth  = rows × 28    + (halfCellY === 'none' ? 0 : 14)
```

`rows`／`columns` 仍代表至少一個完整官方格，合法範圍與 500 mm workspace 上限沿用 OpenGrid generator contract。半格位於指定的外側邊，完整格區仍使用官方 28 mm profile。最終 board bounds 維持 X/Y 置中與 Z=0；side 選項只決定半格相對於中心化 bounds 的哪一側。

底板 builder 不會把整片 board scale 成目標尺寸。它會先建立完整格的官方 profile，再在選定外側建立半格邊界／接口，並以 bounds probe 驗證 14 mm 的軸向增量、指定側位置與完整格接口仍正確。

### 3. 尺寸計算尊重目前方向選擇

尺寸計算器沿用現有 X=columns、Y=rows 語義，但計算時讀取目前的 `halfCellX`／`halfCellY`：

- axis 為 `none` 時，選擇最大的 `count × 28` 不超過目標。
- axis 選定 side 時，選擇最大的 `count × 28 + 14` 不超過目標。
- `count` 仍從 1 開始；若選定半格後目標連一個完整格加半格都放不下，該軸顯示 field error 並保留原本 rows/columns，不偷偷取消使用者的 side 選擇。

計算器不自動替使用者猜測 left/right/top/bottom；side control 保持使用者選擇，計算只更新合法的完整格數與 derived dimensions。這使同一個目標尺寸在不同安裝方向下仍有明確、可重現的結果。

UI 的 X／Y grid controls 以 X 在前、Y 在後排列。當某軸選定 half side 時，
control 顯示該軸的 total cell count（完整格數加 `0.5`），因此 `columns=3`、
`halfCellX=left` 會顯示 `3.5 格`；snapshot 仍保存整數 `columns=3` 與獨立的
`halfCellX`，避免把 UI 顯示值誤當成新的 CAD parameter schema。

### 4. Snap 使用半格 envelope 衍生幾何，不使用縮放

沒有半格時，Snap 仍直接使用目前已驗證的 Full/Lite STEP assembly；其 nominal envelope 維持 25.6 × 25.6 mm、九個 solids、variant-specific height 與現有 offset。

有半格時，builder 先載入相同的 Full/Lite reference，依 `halfCellX`／`halfCellY` 的 host footprint 建立 14 mm axis envelope，再以布林裁切與必要的邊界支撐重組半格 assembly。半格 nominal Snap envelope 在選定軸為 12.8 mm，未選定軸為 25.6 mm；`offset` 仍是 X/Y 共用的 total increment，並且必須讓每個選定軸的最終 envelope 留在 14 mm host pitch 內。builder 禁止透過 scale 改變中央接口、孔徑或 Z profile。

半格組件以 local origin 為中心輸出。裁切後可保留的 holder solids 數量由 half-cell 狀態決定，但必須保留中央嵌入接口與至少一個有效外側支撐；half-cell quality gate 會檢查非空 B-Rep、方向邊界、中央接口 probe、host envelope、variant 高度與 finite mesh。Full/Lite 無半格仍使用九-solid gate，避免新路徑影響既有 reference parity。

### 5. 將半格欄位貫穿 catalog、Worker 與 persistence

OpenGrid 與 Snap 的 parameter schema、default、validator、bounds/file-name helper、catalog display schema、panel state、Worker `model.generate` payload、quality report 與 persistence record 必須使用相同欄位名稱與 enum。`allowHalfCell`、`halfCellMode`、`diagonal` 或未知 side 值在 runtime boundary 拒絕。

舊的無半格 persistence 可以在 reader 層補上 `none`／`none` 後再交給新的 validator；含有未知半格欄位或 `allowHalfCell` 的 record 必須回退到 component default，且不得污染另一個 modelId。新的 normalized snapshot 永遠包含兩個 axis 欄位，避免 Worker、export filename 與 localStorage 出現兩種形狀。

### 6. 保持既有 candidate lifecycle 與 full reference cache

半格狀態視為一般 typed snapshot。任何方向改變都產生較新的 generation，經 debounce 後送 `model.generate`；非法方向送 `model.invalidate`。Snap reference cache 仍按 variant 在 Worker epoch 內各載入一次，半格 builder 使用 cloned reference，所有裁切、支撐與重組結果由 candidate ownership 管理，失敗或 stale 時完整釋放。

STEP/STL export 只能使用通過 half-cell quality gate 且已 commit 的 model revision。deterministic filename 需包含 variant、offset 與非 `none` 的 axis side，避免不同半格方向覆蓋同一下載檔名。

### 7. 在最終 board fuse 後計算半格 features

OpenGrid 的 connector 與 screw 座標以完整格和半格 extension fuse 完成後的
centered board envelope 為準。選定的外側 connector 使用最終 board edge；半格
新增的 boundary seam 也加入 eligible side locations。非 custom screw mode 會把
半格的 boundary seam 納入計算：`corners` 模式在有半格的軸上以半格與完整格的
交界 seam 取代靠近半格側的原本 corner 座標，並保留遠側完整格 corner 座標；
例如 `columns=3`、`halfCellX=left`、`rows=5` 時，螺絲中心為
`[-35,-42]`、`[-35,42]`、`[21,-42]` 與 `[21,42]`，中間完整格接縫不開孔。
`everywhere` 與 `by-row-column` 則保留既有完整格 lattice 並加入該 seam；custom
positions 維持使用者明確指定的集合，不自動擴張。若使用者另外選取既有的 center
或 interval modifier，該 modifier 仍照原本 contract 生效。

Builder 先完成完整格／半格 assembly，再在 board level 套用 connector、chamfer
與 screw cutters；screw cutters 是最後一個 feature operation。這樣跨越完整格與
半格接縫的孔不會在局部 tile 還未 fuse 時被截斷，也可確保半格外側新增的孔真正
切穿最終 solid。

## Risks / Trade-offs

- **[裁切完整 Snap assembly 可能移除過多 holder 或產生不合法拓撲]** → 為 Full/Lite 的 full、四種 single-axis、四種 dual-axis 組合建立 fixture；half gate 必須要求中央接口、有效支撐、B-Rep、mesh 與 envelope 全部通過，失敗不得 fallback 到縮放或 central-only。
- **[中心化 bounds 讓 half side 的局部接口容易鏡像錯位]** → 固定 left/right/top/bottom 的世界座標定義，對每個 side 建立 bounds 與接口 probe；不要用 UI 顯示順序推導 CAD 座標。
- **[half offset 可能侵入 14 mm host pitch]** → validator 以每軸 host pitch 和 half nominal envelope 檢查 `offset`，在 native work 前拒絕超界 snapshot。
- **[OpenGrid generator 仍在另一個 change 中進行]** → 將 half-cell contract 與官方 profile extension 明確拆開，implementation task 先更新 typed contract，再在官方 tile assembly 完成後接入半格 geometry；不得修改官方 profile 參數來掩蓋半格邊界問題。
- **[舊 persistence 形狀與新 exact-key validator 不相容]** → 在 component-specific reader 做明確的 no-half normalization；未知 `allowHalfCell`、錯誤 enum 與跨 component 欄位仍回退 defaults，並保留其他 modelId。
- **[半格 fixture 數量增加 Worker CAD 測試時間]** → unit tests 先覆蓋 contract、bounds、direction matrix 與 persistence；E2E/geometry fixtures 在有限代表性 Full/Lite 組合上驗證，並重用 Worker epoch reference cache。

## Migration Plan

1. 在新 branch 先加入 shared half-cell enums、OpenGrid/Snap typed contract、bounds helper、filename 與 validator tests。
2. 更新 OpenGrid model definition、dimension calculator 與 panel，讓方向選擇能產生單軸／雙軸 snapshot。
3. 更新 Snap model definition、panel、persistence 與 Worker builder；先保證無半格 reference path 完全維持現況，再接入 half-cell derived geometry。
4. 加入 half-cell quality probes、Full/Lite direction matrix、candidate lifecycle、export 與 persistence regression tests。
5. 執行 unit、typecheck、build 與相關 E2E；若 half geometry gate 失敗，保留原本 full Snap path，讓 change 以可診斷錯誤停止，不提交不合格候選。
6. 部署／合併時，舊的無半格 persistence 由 reader 轉成 `none`／`none`；無法安全解析或含未知 half 欄位的 entry 回到 component defaults。回滾只需撤回 half-cell route/contract，既有 full OpenGrid/Snap fixtures 與非相關 model entries 不受影響。

## Open Questions

目前沒有需要阻擋 proposal 的 contract 問題。半格 Snap 的詳細支撐數量與裁切邊界由既有 Full/Lite reference 的幾何 probe 與 quality fixture 決定，但不得改變上面的 axis、14 mm host pitch、centered bounds 或 no-scale 約束。

## Verification Notes

- **OpenGrid direction matrix:** Full、Lite、Heavy 均驗證四種 single-axis 與四種 dual-axis 1×1 envelope；Full、Lite、Heavy 另以 X-right + Y-top 驗證螺絲、connector、chamfer 與 Heavy 雙層結構。
- **Snap direction matrix:** Full 與 Lite 均驗證四種 single-axis 與四種 dual-axis 組合；兩種 variant 均驗證 offset=1 的 dual-axis envelope，以及無半格時的原始九 solid reference path。
- **Quality tolerances:** contract bounds 使用 0.05 mm 比對；Snap reference import 使用 0.01 mm asset tolerance；generated Snap envelope 使用 0.1 mm tolerance，零 offset 的未重組 reference 使用 0.15 mm OCC envelope tolerance；half-cell 重組使用 0.14 mm outer trim compensation 並以 0.2 mm boundary supports 保留 envelope。
- **Known limitations:** OpenGrid 仍要求每個軸至少一個完整 28 mm 格；Snap 半格是本專案從 Full/Lite reference 裁切重組的自訂 assembly，不保證九 solid 數量，僅保證中央接口、外側支撐、host pitch、B-Rep、mesh 與 export quality gates。無半格 Snap 仍完全走既有 reference path。
- **Filename marker:** `xnone-ynone` is the documented no-half marker in both OpenGrid and Snap STEP/STL filenames; selected directions replace the corresponding axis marker and therefore cannot collide.
- **Generator dependency:** half-cell OpenGrid extension 保留目前官方 complete-cell profile；既有無半格 profile 與官方 prototype asset 行為不變。若後續合併 `add-opengrid-generator`，只需維持這些 shared contract、bounds 與 profile probes，半格欄位即可沿用。
- **Boundary features:** final-board connector and screw cutter regression covers the selected right/top dual-axis case; the shared coordinate helper preserves the same rule for left/bottom directions.

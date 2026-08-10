## Context

目前 `opengrid-snap` 已有 Full/Lite 與 Standard/Directional profile，Builder 仍以 `halfCellX`/`halfCellY` 作為公開參數，並用 Snap 自身 envelope 建立八角形裁切 prism。這條路徑可以產生尺寸正確的半格結果，但不能描述官方 OpenGrid 邊緣的 rail/capture 互補面。

已對使用者提供的 Lite 官方板做唯讀幾何量測：板 bounds 約為 `70 × 70 × 4 mm`，`xleft + ytop` 的 canonical quarter host 區域為 `x=-35..-21、y=21..35`，中心為 `(-28, 28)`；canonical half host 可放在 `(-28, 7)`。現有簡化裁切放入這些位置後仍有可量測的 B-Rep 重疊，因此需要以官方板邊緣為 oracle 的互補 boundary profile。

這是跨 contract、UI、persistence、Worker B-Rep、quality gate 與 export 的變更。既有 `opengrid-snap` modelId、buildKey、route 與 OpenGrid 底板本身的 axis API 都必須保持穩定。

## Goals / Non-Goals

**Goals:**

- 讓 Snap 使用單一 `footprint` 選項：`full`、`half`、`quarter`。
- 將 `half` 固定映射到 `halfCellX=left, halfCellY=none`，將 `quarter` 固定映射到 `halfCellX=left, halfCellY=top`；這些 axes 只作為內部 canonical geometry mapping，不再顯示給 Snap 使用者。
- 先完成 Body、Side Holder、Snap 與 optional body features 的完整組裝，再用一個共同的官方邊緣互補操作切所有受影響 solids。
- 讓 cut face 保留 OpenGrid 可插入的斜角、capture/locking 面與外框增量語意。
- 以 repository-owned 官方 Lite 2×2 STEP 作為 fit oracle，驗證 canonical half/quarter 的位置、間隙、B-Rep 與 mesh。
- 讓孔徑、孔中心、底部彈性槽、中心 remover 階梯與 Directional intrinsic geometry 不被 footprint 或 offset 縮放。
- 對既有 Snap persistence 做 deterministic、isolated、可回退的 axis-to-footprint migration。

**Non-Goals:**

- 不改 OpenGrid 底板的 `halfCellX`/`halfCellY`、rows、columns、connector 或 screw API。
- 不提供 Snap 的任意旋轉、鏡射或 X/Y 方向選項；canonical orientation 是本 change 的固定產品行為。
- 不把官方整張 70 × 70 mm 板加入每次 Worker generation 的 runtime boolean pipeline；只在測試保留完整 STEP oracle，runtime 使用由 oracle 量測出的最小 boundary profile。
- 不在本 change 重建所有 Standard 或 Directional 的原始自由曲面；本 change 只改 footprint derivation 與 fit boundary。
- 不修改 `opengrid-snap` 的 stable identity，也不新增另一個 component。

## Decisions

### 1. Snap 使用 footprint contract，底板保留 axis contract

Snap normalized snapshot 改為保存 `footprint: 'full' | 'half' | 'quarter'`，與 `variant`、`profile`、`offset`、兩個 optional-hole boolean 一起形成完整 snapshot。`halfCellX`/`halfCellY` 不再是 Snap 的公開或保存欄位；OpenGrid 底板仍維持既有兩個 axis 欄位。

Builder 入口先將 footprint 轉成不可變的 canonical axes：

| footprint | internal halfCellX | internal halfCellY | nominal host envelope |
| --- | --- | --- | --- |
| `full` | `none` | `none` | 25.6 × 25.6 mm |
| `half` | `left` | `none` | 12.8 × 25.6 mm |
| `quarter` | `left` | `top` | 12.8 × 12.8 mm |

Directional 使用相同的 footprint mapping，但保留其既有 asymmetric Y envelope；每一個 footprint 仍必須通過 14 mm host-pitch 驗證。

Alternative：只改 UI、繼續保存任意 X/Y axes。這會讓 `right/bottom` 的舊方向仍然存在，卻無法由新 UI 再現，也會繼續把「四分之一格」誤解成任意 diagonal 組合，因此不採用。

### 2. Persistence 使用一次性 legacy normalization

Persistence reader 接受新的 exact Snap shape，並在 reader 邊界處理舊 shape：

- `halfCellX=none` 且 `halfCellY=none` → `footprint=full`。
- 恰有一個 axis 非 `none` → `footprint=half`。
- 兩個 axes 都非 `none` → `footprint=quarter`。
- 任一 legacy axis 非法、snapshot 混入 board 欄位或有未允許的 extra field → 使用 Snap defaults。

轉換結果只寫入 `opengrid-snap` entry，絕不從 `opengrid` entry 補值。新的保存值只包含 typed footprint 與目前 profile/variant/offset/feature 欄位，避免新 UI 再產生方向資料。

Alternative：保留舊方向並在 UI 隱藏。這會造成保存結果與畫面選項不一致，且同一個 `half` 可能代表四種不同外框，故不採用。

### 3. Boundary profile 以官方板為 oracle、runtime 只保留最小幾何

將使用者提供的官方 Lite STEP 複製到 repository-owned test fixture，characterize 其 bounds、outer rail、capture shoulder、斜角與 z-level。由 characterization 固化一個小型 `opengrid-snap` boundary profile module，包含：

- canonical half/quarter 的 local host bounds 與 placement center；
- 外框與 half-cell seam 的 XY profile；
- 上下插入 bevel、對角 locking corner 與 rail/capture 需要的 z 層；
- 四個 footprint corner 都要保留延伸至完整組件高度的對角 locking cut face；
- offset 可擴張的外框區域與不得侵入的固定區域。

Builder 以這個最小 profile 產生一個 allowed host volume／boundary cutter。完整 assembly 完成後，所有 Body、Side Holder、Snap solids 共用同一個 cutter；不再以每個 solid 各自猜測切面。若 cutter 與 optional hole 相交，保留固定 cutter 的自然交集結果，絕不重算或縮放孔徑。

Alternative：runtime 每次直接 import 整張官方板再做 boolean。這較容易得到 oracle 一致結果，但會增加 Worker payload、載入與 OCC boolean 成本，且把測試用 board fixture 變成 runtime dependency，因此不採用。

### 4. Assembly 與 offset 的 pipeline

Pipeline 固定為：

```text
normalize footprint
→ resolve profile/variant reference
→ build Body and optional features
→ place Side Holder and Snap parts
→ apply shared total outer offset
→ apply canonical OpenGrid boundary operation to the complete assembly
→ validate envelope, fit, B-Rep, mesh, features and revision
```

`full` 不執行 footprint clip，保持現有 no-half assembly。`half` 與 `quarter` 先在完整 assembly 上切除；Side Holder 和 Snap 若被邊界切到，必須保留與 Body 相同的官方斜角／卡入語意。offset 只改允許的外框區域，仍代表總寬度／深度增量；不得 uniform-scale assembly 或任何 hole/central fixed geometry。

### 5. Fit quality gate 採行為與幾何量測

測試 fixture 放置如下：

- half：canonical local Snap 放在官方板的左側 14 × 28 host，中心 `(-28, 7)`；
- quarter：canonical local Snap 放在左上 14 × 14 host，中心 `(-28, 28)`。

Fit assertion 使用 OCC 幾何量測，而不是比對實作字串：

- Snap 與官方板的 forbidden solid interference volume 不得超過明確 CAD tolerance；允許的面接觸不得被誤判為體積干涉。
- 受切邊的外框間隙、斜角與 locking/capture probe 必須存在。
- 結果必須是有效、非空、finite 的 B-Rep/mesh，且至少保留一個可用 outer support。
- optional holes、底部彈性槽、center remover 與 Directional asymmetric probes 必須維持既有尺寸／狀態。

測試矩陣涵蓋 Full/Lite、Standard/Directional、三種 footprint、兩個代表性 offset、四種 optional-hole 組合，以及同一 committed revision 的 STEP/STL export。

### 6. Stable identity 與 asset boundary

不新增 component，因此不產生新的 modelId、route 或 catalog directory。官方 board fixture 放在測試可讀的 repository-owned 路徑；runtime boundary module 與現有 `src/cad-kernel/components/opengrid-snap` 對齊，不讀取 Downloads 絕對路徑。現有四個 Snap reference assets 的 profile/variant cache 與 dispose 行為保持不變。

## Risks / Trade-offs

- **Legacy Snap snapshot 會由任意方向收斂成 canonical footprint。** → migration 明確以 axis cardinality 決定 full/half/quarter，初始化後只保存新 footprint；不把底板方向帶入 Snap。
- **官方板 edge profile 可能含 OCC 難以穩定重建的複合斜面。** → 先以完整 STEP fixture characterize，將最小必要輪廓隔離成 boundary module，並在每個 footprint 做 B-Rep、mesh、fit regression；若邊界 tolerance 失敗，candidate 不提交。
- **Directional 的 asymmetric envelope 使 quarter Y 尺寸不同。** → footprint mapping 固定，但 bounds/fit profile 由 selected Directional definition 提供，不用 Standard 的尺寸常數硬套。
- **共同 cutter 可能把邊界附近的 Side Holder 或 optional feature 切成多個小 solid。** → 在 quality gate 檢查剩餘 support、孔洞與非空 solids；不符合就丟棄 candidate，不用自動補形或縮放。
- **新 contract 會造成 catalog、workspace raw-input、export filename 與測試同步修改。** → 先完成 contract/persistence migration，再切換 UI 與 builder，最後以完整 worker/e2e matrix 驗證。

## Migration Plan

1. 將官方板 STEP 複製成 repository-owned fixture，完成 characterization 與 boundary constants；確認 fixture ownership/permission。
2. 更新 Snap contract、bounds、validation、filename helpers 與 catalog schema，讓新 snapshot 只保存 footprint。
3. 更新 persistence reader/writer，加入舊 `halfCellX`/`halfCellY` snapshot 的 isolated normalization 與 defaults fallback。
4. 將 panel 的兩個 X/Y select 改為 full/half/quarter 單一 select，並移除方向 raw-input/state 路徑。
5. 實作最小官方 boundary profile，將完整 Body/Side Holder/Snap assembly 的 half/quarter clip 改為共同 cutter。
6. 更新 quality gate 與 worker tests，加入官方板實際放置、interference、間隙、斜角、孔洞與 export revision 驗證。
7. 更新 e2e labels、filename expectations、persistence fixtures 與 documentation；跑完整 typecheck/unit/worker/e2e 回歸。

Rollback 只需回退本 change 的 Snap contract、migration、boundary module、fixture 與 tests；不需修改 OpenGrid board data 或 component identity。若 migration 遇到不合法 legacy entry，直接使用目前 Snap defaults，不阻斷其他 component。

## Open Questions

- 需要在 fixture characterization 時確認官方板與 Snap 的裝配 z reference 是否固定為 `z=0`，或 fit test 需使用一個明確的 mating z offset；這只影響 fixture placement，不改 footprint contract。
- 需要用 OCC 實測決定 interference 與面接觸的 tolerance 數值，並將該值集中在 boundary/quality configuration，避免散落在測試中。

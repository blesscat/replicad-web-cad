## Context

本變更新增一個與官方 `opengrid` 完全分離的 CAD component。現有官方 component 使用 28 mm pitch 與 Full/Lite/Heavy 板型；新 component 的幾何基準是自製底座的 14 mm 完整格（7 mm 半格）、5 mm 寬分隔牆、Ø5 × 1 mm 底部定位柱與 1 mm 頂部圓角。

CAD runtime 已有 model catalog、typed Worker contract、candidate/commit lifecycle、revision lifetime、mesh 與 STEP/STL export 邊界。新 component 應接入這些既有機制，但不得共用官方 OpenGrid 的參數 schema、profile 常數或 builder dispatch。

## Goals / Non-Goals

**Goals:**

- 以四方向非零格數穩定判定一字型、L 型、T 型與十字型。
- 產生單一連續的 5 mm 寬、可調高度分隔牆。
- 依 14 mm 完整格長度、0.5 格步進與 28 mm 定位柱中心距自動配置稀疏定位柱。
- 在牆體完成後只對頂部牆邊套用 1 mm 圓角，並保留定位柱與底部邊緣的清楚接口。
- 讓新 component 具有獨立的 route、UI、persistence、Worker builder、preview、STEP 與 STL 行為。
- 以可觀察的 bounds、solid count、mesh 與 export fixture 驗證幾何品質。

**Non-Goals:**

- 不修改或重建官方 28 mm `opengrid` component。
- 不修改 `opengrid-stackable-box` 的底座、接口或幾何。
- 不讓使用者在第一版自訂 grid pitch、牆寬、定位柱直徑、定位柱長度或頂部圓角半徑。
- 不提供任意自訂路徑、斜向臂、曲線牆或超過四方向的分支。

## Decisions

### 1. 使用獨立 model id 與獨立 component boundary

新 model id 定為 `opengrid-divider`，路由定為 `/cad/opengrid-divider`。它會在 catalog、Worker registry、panel、persistence 與 filename helper 中各自註冊；官方 `opengrid` 的程式碼可以作為既有 component integration pattern 的參考，但不共用 domain parameters 或 geometry builder。

替代方案是把分隔器加進 `opengrid` 的 Full/Lite/Heavy schema。這會把兩個不同 pitch、不同用途與不同輸出形狀的契約混在一起，也會使既有保存值與相容性語意變得不清楚，因此不採用。

### 2. 以四個 arm counts 作為唯一形狀輸入

參數只保存 `left`、`right`、`up`、`down` 與 `height`。中央交會點是建模 anchor；每一個方向的中心線長度是 `count × 14 mm`，方向格數可用 0.5 格步進，因此 0.5 格代表 7 mm。形狀名稱由非零方向集合推導，不另存可被輸入矛盾的 shape enum：

```text
left/right only       -> straight
two adjacent arms     -> L
three non-zero arms   -> T
four non-zero arms    -> cross
```

每個方向的 count 會限制為安全整數，且整體 XY envelope 不得超過既有 workspace 的 500 mm 安全上限。輸出可在最終預覽座標中置中，但所有長度計算先以中央 anchor 的局部座標完成，避免不對稱臂長被錯誤重算。

### 3. 先建立連續牆體，再處理頂部圓角與定位柱

建模順序固定為：

1. 依四個方向建立從中央交會點延伸的 5 mm 寬矩形臂，並只選取每個 active arm 的上方 perimeter edges 套用固定 1 mm fillet。
2. 將已圓角化的臂以 union 形成連續牆體；這個順序可避免 OpenCascade 在 L、T 與十字分支的 union 後 edge topology 上建立 fillet 時失敗。
3. 依同一個 anchor 計算定位柱中心，在中央交會點固定建立一顆，並沿每個臂以 28 mm（四個 7 mm 半格）為候選間距，在仍位於臂內部的位置建立 Ø5 mm、外露部分 Z=-1 到 Z=0 的圓柱；實作可讓圓柱額外進入牆體 0.02 mm，僅用於可靠 fuse，外露長度仍固定為 1 mm。
4. 將定位柱與已圓角化的牆體 fuse，確認結果是一個 connected solid。

把 fillet 放在定位柱之前可避免柱體的圓邊污染牆體 top-edge selection；把定位柱放在最後也能讓所有柱底一致位於 Z=-1，而牆體底面維持 Z=0。

### 4. 定位柱採「中心 + 每 28 mm、臂內部」策略

對每一條 count 為 `N` 的臂，中心線長度是 `N × 14 mm`。中央交會點固定放一柱；沿臂從距離中心 28 mm 開始，每增加 28 mm 放置一柱，但嚴格排除落在臂端點或外部的候選位置。這代表每次最多先空四個 7 mm 半格，並維持定位柱不過密；當臂長只有一或兩個完整格（14–28 mm）時不增加臂柱，因此 `left=right=up=down=1` 的 3×3 十字只有中心一柱。四個方向使用各自的正負軸，座標以 `(x,y)` key 去重，避免多臂交會重複建立柱體。

替代方案是每個半格都放柱、只放四個端點柱或只放最外側柱。前者過密，後兩者在長臂會有不可預期的翹動與插接支撐間距，因此不採用；第一版也不增加手動逐柱選取 UI。

### 5. 固定尺寸與驗證邊界

第一版固定 grid pitch=14、half-grid pitch=7、grid step=0.5、wall width=5、peg center spacing=28、peg diameter=5、peg length=1、top fillet radius=1 mm。`height` 採 2–500 mm 的整數，確保固定圓角有可驗證的最低高度；direction counts 使用非負 0.5 格倍數，並以完整 envelope 驗證不超過 500 mm。任何不滿足幾何邊界的 snapshot 都在 Worker 前被拒絕，或在必要的 B-Rep 檢查中回傳可診斷的 geometry error，不產生 partial commit。

### 6. 使用既有 catalog/workspace/persistence/export lifecycle

catalog definition 提供新 component 的 display metadata、defaults、validation、bounds 與檔名；Worker 依 model id 做嚴格 dispatch；UI 只送 normalized divider snapshot。瀏覽器保存只接受通過 validation 的 typed values，並以 `opengrid-divider` key 與官方 `opengrid` 分離。candidate、commit、stale generation、revision pin、STEP/STL writer 與既有 component 使用相同生命週期，不新增 protocol version 或跨 Worker 的 B-Rep 傳遞。

### 7. 以契約與幾何 fixture 驗證，而不是只驗 bounds

測試分成四層：參數/shape classifier unit tests、peg coordinate與 bounds contract tests、Replicad builder integration tests、Worker/UI/persistence/export lifecycle tests。幾何 fixture 至少涵蓋水平一字、垂直一字、L、T、十字、不對稱臂長與長臂案例，並檢查 5 mm wall width、requested height、peg Ø5/length1、top fillet、Z bounds、one-solid 與非空 STEP/STL。

## Risks / Trade-offs

- **頂部 edge selection 可能因 union 拓撲變化而不穩定** → 以 Z 高度、切線方向與 perimeter 判定 top edges，並用多種形狀 fixture 驗證；fillet 失敗時回傳明確錯誤。
- **長臂與高牆會增加 boolean、mesh 與 export 成本** → 先限制整體 envelope 500 mm，採分段建立並在安全邊界 yield；以 benchmark fixture 觀察實際上限。
- **Ø5 定位柱與 5 mm 牆寬沒有額外平面餘量** → 所有柱中心必須落在牆中心線，並驗證柱與牆的接觸、柱底 Z=-1 與 one-solid；不在第一版提供偏移柱。
- **不對稱形狀的預覽置中可能讓使用者誤解底座對位** → UI 顯示四方向 counts、推導尺寸與 anchor 相對關係，文件明確說明 shape 是由中央交會點展開。
- **現有分支有未提交的 stackable-box 工作** → 本 change 只新增自己的檔案與明確 integration points；實作與測試時保留既有修改，不使用 destructive git 操作。

## Migration Plan

1. 新增 divider domain types、validation、shape classifier、bounds 與 filename helpers。
2. 新增 component-local builder、geometry quality probes、catalog entry、Worker dispatch 與專屬 panel。
3. 加入 model route、model chooser entry、typed persistence 與 component-specific tests。
4. 執行 divider fixture、既有 component regression、typecheck、format、build、完整測試與 OpenSpec validation。
5. 若需要回滾，只移除 `opengrid-divider` route/catalog/Worker registration 與其 component-local artifacts；既有 `opengrid` 與 `opengrid-stackable-box` 不需資料 migration。

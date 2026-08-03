## Context

目前 `CadViewport` 以 validated mesh 建立 React Three Fiber Canvas，`Bounds` 負責模型 framing，`OrbitControls` 負責相機互動。`CadWorkspace` 另外持有目前 committed model 的 `parameters`；box model 的 width/depth/height 分別對應 X/Y/Z，Worker 產生的 mesh snapshot 則包含實際 `bounds`。本設計延續 proposal 與 `cad-workspace` delta spec，不改變 Worker message contract、CAD kernel 或 revision lifetime。

## Goals / Non-Goals

**Goals:**

- 在同一個 3D scene 內顯示 width、depth、height 三組貼邊尺寸標註。
- 讓尺寸線、延伸線與數值標籤隨 OrbitControls 的相機旋轉、縮放與 viewport resize 更新。
- 使用 mesh bounds 做幾何錨點，使用 committed parameters 做 nominal 尺寸文字，避免標註與畫面中的 revision 不一致。
- 保留既有 stale、無模型、WebGL fallback 與 GPU resource cleanup 行為。
- 讓尺寸數值在 DOM 中可讀取，支援鍵盤/輔助技術使用者理解目前 preview 尺寸。

**Non-Goals:**

- 不支援任意 CAD solid、曲面、孔洞或未來模型的自動尺寸分析。
- 不提供使用者拖曳尺寸、量測工具、tolerance/inspection、尺寸編輯或標註顯示切換。
- 不修改 B-Rep、mesh、Worker protocol、STEP export 或 model revision 資源生命週期。
- 不處理正式工程圖投影、剖面視圖、隱藏線判定或列印排版。

## Decisions

### 1. 尺寸資料由主執行緒傳入 viewport

`CadWorkspace` 會把 `state.committed?.parameters` 以獨立的 `parameters` prop 傳給 `CadViewport`；viewport 同時使用已驗證的 `mesh`。這避免 viewport 依賴整個 state module，也避免直接讀取尚未 committed 的 `state.input`。

尺寸線的端點與延伸線錨點由 `mesh.bounds.min/max` 計算，文字則使用同一 committed model 的 width/depth/height parameters。對目前置中於原點的 box，三個軸向定義固定為 X=width、Y=depth、Z=height。

替代方案是把完整 `CommittedModel` 傳給 viewport，或在 Worker response 新增尺寸欄位；前者擴大 viewport 對 state module 的耦合，後者重複既有資料並改動跨執行緒 contract，因此不採用。

### 2. 以純函式產生三組 annotation geometry

新增 viewport 內部的純 geometry helper，輸入 `BoxBounds` 與 `BoxParameters`，輸出三組固定 axis 的 annotation spec。每組 spec 包含：

- 兩個從 box edge 延伸到標註位置的 extension segments。
- 一條沿 X、Y 或 Z 軸的 dimension segment。
- 兩個短端點 ticks，作為尺寸線的 endpoint markers。
- 中點 label anchor、axis key、顯示值與可存取 label。

標註位置採用固定 world-space 側面與依模型最大尺寸縮放的 outward offset，避免使用固定 pixel 距離造成不同尺寸的 box 重疊。幾何計算不依賴 React、Three.js 或相機狀態，方便 unit test 驗證軸向、長度與不穿入模型的條件。

替代方案是每次 render 直接在 JSX 內建立座標，會把軸向與 offset 規則混在 view code 中，難以測試與維護，因此不採用。

### 3. 使用 Drei Line 加 DOM-backed label

尺寸線、延伸線與 ticks 使用既有 `@react-three/drei` 的 `Line`，維持 world-space 幾何並跟隨 Canvas 相機。數值 label 使用 Drei `Html` 錨定在 dimension segment 中點，讓文字始終面向使用者、維持 CSS 可讀性，並可提供 `aria-label`。

標註的 line material 使用明確的 render order/深度設定，確保旋轉到模型背面時尺寸資訊仍可辨識；這是 Prototype 的可讀性優先取捨，暫不加入依視角隱藏標註的工程圖級 occlusion 規則。HTML label 設為不攔截 pointer events，避免阻礙 OrbitControls。

替代方案是使用 Drei `Text` 產生全 3D 文字，但需要處理字型載入、字元支援與文字深度，且不自然地提供 DOM accessibility，因此不採用。

### 4. 將 annotations 放入 Bounds 的 framing 範圍

`ModelMesh` 與 `DimensionAnnotations` 會同時位於 `Bounds` 內，讓相機 fit/clip 將外移的尺寸線納入可見範圍。沒有 mesh 或 parameters 時不建立 Canvas annotation subtree，維持既有 no-model/fallback 行為。

annotation 使用的 offset 與既有 `Bounds` margin 一起保留足夠留白；若標籤本身超出 WebGL canvas，DOM label 仍受 viewport 的 overflow 邊界限制，不以額外頁面浮層取代 scene anchoring。

### 5. 以 committed revision 維持 stale 一致性

所有 annotation props 都從 `state.committed` 產生。使用者修改參數後，既有 reducer 保留上一個 mesh 與 parameters，尺寸標註也保留上一個 committed model 的數值，並由現有 stale border/badge 告知尚未同步。只有 `model.ready` 成功後，mesh 與 parameters 才會一起替換。

這避免在新 generation 建模期間把新輸入的尺寸畫到舊模型上，也不需要為 annotation 增加新的 Worker 或 reducer state。

## Risks / Trade-offs

- [標註固定在 world-space 側面，某些旋轉角度可能與模型重疊] → 尺寸線使用可辨識的 render order/深度設定，並採用與模型尺寸成比例的外移；工程圖級視角 occlusion 不列入本次範圍。
- [三組標註增加 Bounds 的 framing 範圍，使方塊在 viewport 中變小] → 將 offset 控制在模型最大尺寸的固定比例，並以非均勻尺寸 fixture 驗證模型與標註都可見。
- [HTML label 在極端窄 viewport 可能被裁切] → label 使用短數值格式與不攔截 pointer events，並以 responsive E2E 在既有 760/761px boundary 驗證不造成 layout overflow。
- [mesh bounds 與 nominal parameters 因 CAD tolerance 有微小差異] → 幾何位置採用實際 bounds，文字明確代表 committed input 的 nominal mm 尺寸；兩者分工不混用，避免顯示浮點 mesh 誤差。
- [尺寸標註提高每次 render 的 scene node 數量] → Prototype 固定只有三組標註，使用 memoized geometry 與共用 materials；不引入額外 Worker 或高頻資料傳輸。
- [DOM label accessibility 與 Canvas role 可能重複宣告資訊] → 保留 viewport 的總體 `aria-label`，每個尺寸 label 提供清楚的 axis、名稱、數值與單位，並在 E2E 驗證可查找文字。

## Migration Plan

1. 新增 geometry helper 與純函式測試。
2. 在 viewport 加入 `DimensionAnnotations`、Line/Html rendering、Bounds framing 與 fallback guard。
3. 從 `CadWorkspace` 傳入 committed parameters，補上 ready、stale、invalid 與 responsive E2E assertions。
4. 執行 type-check、unit test、build、Chromium E2E 與 headed Firefox gate。
5. 若視覺回歸或標註造成相機 framing 問題，可只移除 annotation subtree/prop 與 helper，既有 mesh、Worker contract、STEP export 與 state lifecycle 不需 rollback 或資料 migration。

## Context

目前 CAD workspace 的 contract、state、model catalog 與 Worker 都以單一 `box` 為前提。`src/cad-kernel/model` 直接以參數建立 box，`src/cad-contract/messages` 只接受 `BoxParameters`，而 viewport 與 STEP export 也假設所有模型都有 width/depth/height 三個欄位。

本變更要加入名為 `modular-grid-base` 的可選 component。它使用目前已準備好的 `cell-template.step`：單格外框為 20 × 20 × 5 mm，中心為 17 × 17 mm 的貫穿切除，四周各保留 1.5 mm。生成任務會把單格 template 複製到 rows × columns 的位置，融合成單一 solid，再只對整體外側四個垂直角套用 R2.5 mm 圓角。

目前 `cell-template.step` 位於 Downloads，實作時必須把它與 component builder 一起納入 repository。之後每個 component 都可以直接提供自己的預切除 `cell-template.step`；runtime 不應再依賴或重新切除另一個來源檔案。

## Goals / Non-Goals

**Goals:**

- 建立可擴充的 component catalog，保留既有 `box` 並新增 `modular-grid-base`。
- 將 component-specific parameters、validation、builder、bounds metadata 與 export filename 綁定在穩定的 model definition 上。
- 使用預切除 STEP B-Rep template，避免每次 generation 重做 source cutter boolean。
- 在 Worker 內完成 STEP 載入、clone/translate、fuse、外側圓角、mesh 與 export，並遵守既有 latest-wins 和 native resource lifetime。
- 讓 UI 能選 component、只顯示對應參數，並以實際 committed bounds 更新預覽與尺寸標註。
- 以 1x1、2x2、asset reuse、外側圓角、contract validation、Worker cleanup 與 STEP export 行為測試驗收。

**Non-Goals:**

- 不新增任意 CAD 檔案匯入、STL/3MF/G-code pipeline、後端建模、儲存或 collaboration。
- 不在瀏覽器 runtime 重新建立任何來源 cutter 的切除流程。
- 不把圓角預先烘焙進單格 template；單格 template 必須保留 sharp outer corners，讓整體融合後才能正確只圓四個外角。
- 不改變 box 的既有預設尺寸、座標規則或輸出格式。

## Decisions

### 1. 以 component registry 取代 box-only 分支

建立可共用的 model/component contract，至少包含：

- stable `modelId`；
- component-specific parameter union；
- pure validation 與預覽欄位 metadata；
- Worker 可用的 builder key/registry；
- bounds metadata 與 export filename formatter。

`box` 和 `modular-grid-base` 都是 registry entry；box 保持初始選項以維持現有 prototype 行為。主執行緒的 catalog metadata 不直接攜帶 OpenCascade 或 Solid，Worker 只使用 Worker-side registry 執行 CAD。參數 union 必須以 `modelId` 做 discriminated validation，避免把 `rows/columns` 誤當成 box 尺寸。

考慮過的替代方案：

- 在 `buildModelBRep` 裡增加更多 `if` 分支：短期最少檔案，但會讓每個新 component 把 asset、參數與幾何邏輯堆進通用 builder，與 component-local 邊界衝突。
- 以 `Record<string, unknown>` 傳送所有參數：表面上最容易擴充，但會失去 compile-time 與 runtime shape safety，因此不採用。

### 2. Component 目錄同時保存 builder 與 STEP 資產

新增類似下列的 component-local 目錄：

```text
src/cad-kernel/components/modular-grid-base/
  builder.ts
  cell-template.step
```

UI catalog 只引用可序列化的 definition metadata；Worker registry 引用 `builder.ts`。STEP asset 透過 Vite 可解析的 module-relative URL 打包，不能依賴使用者機器上的 Downloads 路徑。builder 在 Worker 中 fetch URL 得到 Blob，再呼叫 replicad 的 `importSTEP`。

選擇 STEP 而非 STL 或 DXF，原因是目前需求是對精確 3D B-Rep 做 clone、fuse、fillet 與 STEP export。STL 是三角網格，DXF 是 2D profile，兩者都不是這個 3D cutter/template pipeline 的 canonical asset。

### 3. 以預切除 template 生成，而不是每次重做 boolean cut

`cell-template.step` 是一個已完成單格切除的 B-Rep。Worker runtime 只載入並驗證一次，之後每個 generation：

1. 從 immutable template clone 出每個 cell。
2. 以 `x = (column - (columns - 1) / 2) × 20`、`y = (row - (rows - 1) / 2) × 20` 平移 clone，Z 保持 0。
3. 將相鄰 cell fuse 成單一 solid，釋放不再需要的中間 native shapes。
4. 依整體 envelope 的四個角，以幾何位置和垂直方向辨識外側 vertical edges，套用 R2.5 mm fillet。
5. 產生 mesh 與 bounds，將 final shape 交給既有 candidate lifetime。

外側 edge 的選取不能依賴固定 face/edge index，因為 rows、columns 和 boolean topology 會改變。也不能先對每個 cell 圓角，否則內部格線交界會被錯誤圓化。1x1 和多格都使用同一條「先 fuse、後圓整體外角」流程。

考慮過的替代方案：

- 每次以來源 cutter 對 box 做 cut：幾何意義直接，但每格都付出 import/boolean 成本，也不符合已經存在的 `cell-template.step`。
- 先對每格做 R2.5 fillet 再排列：會圓化內部交界，與需求不符。
- 以 STL 作 template：可作 mesh preview，但會犧牲曲面精度與 boolean/STEP round-trip 的穩定性。

### 4. Worker 內的 asset cache 與 native lifetime

將 component template cache 綁定到 `CadWorkerRuntime` epoch，而不是 module-level global。cache 儲存一個 `Promise<Solid>`，讓同一 Worker 的並行 generation 共用一次 import；generation 在等待 asset import 後必須再次檢查是否已過期，避免 stale request 繼續建立 candidate。

Worker dispose 時按順序清除 candidate/revision/export pin，再釋放 cached template；每個 generation 使用的 clone/fused result 由既有 `RevisionLifetime` 管理。任何 import、clone、fuse、fillet 或 mesh 例外都必須落入既有 `operation.error` mapping，且不能留下未追蹤的 native shape。

### 5. Contract、state 與 UI 的遷移

維持目前 versioned envelope、generation、candidate commit、workerEpoch 與 modelRevision 流程，擴大而不旁路它們：

- `ModelGenerateCommand` 由 box-only 改為 `modelId + ModelParameters` discriminated union。
- Worker event、candidate/revision record 和主執行緒 committed state 都保存 `modelId` 及 serializable parameters，讓 export filename、尺寸標註和 stale 狀態能對應同一 revision。
- pure model definitions/validators 放在可被 contract、UI 和測試共用的模組；CAD builder/asset registry 留在 Worker-side `cad-kernel`。
- model selection 改變視為新的 input snapshot：generation 遞增、舊 candidate invalidate，既有 committed preview 可暫留並標為 stale。
- component parameter editor 以 component-local React panel 分隔；`CadWorkspacePanel` 只負責 selector、狀態與 export，box 的三個 mm 欄位和 modular-grid-base 的 rows/columns slider 不共用錯誤的語意。每個新 component 都可以在自己的 panel 實作完全不同的調整項目。

這是 repository 內的 breaking TypeScript contract 變更，但不需要 backend migration；既有 box command/result 仍由新 union 接受。

### 6. Bounds、mesh 與 export metadata

Worker 回傳的 bounds 是唯一的幾何真實來源。UI 尺寸標註使用 committed mesh snapshot 的 bounds/revision，不直接用尚未 commit 的輸入值。component definition 提供 filename formatter：box 維持 `box-{width}x{depth}x{height}.step`，modular-grid-base 使用 `modular-grid-base-{columns}x{rows}.step`。STEP 仍由 Worker 中被 pin 的 B-Rep revision export，不從 mesh 反推。

## Risks / Trade-offs

- **[Risk] STEP asset 在 Worker/build preview 中無法解析 →** 使用 module-relative asset URL、檢查 fetch response/Blob，並以 dev server 與 production preview 各跑一次 asset-load smoke test。
- **[Risk] 預切除 template 與規格尺寸漂移 →** 在 asset fixture test 驗證 20 × 20 × 5 bounds、17 × 17 centered cutout 與非空 single solid；將 template 作為 component 的 canonical runtime asset。
- **[Risk] 不同 grid topology 使 fillet edge index 改變 →** 以外側 envelope 座標、vertical tangent/direction 和 endpoint bounds 選 edge，不依賴拓撲索引；1x1、1x2、2x2 至少各測一次。
- **[Risk] 多格 fuse/fillet 成本隨 cell 數增加 →** 初始沿用 500 mm 軸向上限，等同每軸最多 25 格；cache template 並避免重做 cutter import。若未來需要更大尺寸，再另行設計批次 fuse 或 geometry simplification。
- **[Risk] contract 與 UI catalog 的 validator 漂移 →** 將純參數 validator 與 model parameter types 放在 shared contract module，Worker 仍在 boundary 再驗證，並測試錯誤 modelId/錯配 parameters。
- **[Risk] native shape 遺漏造成 Worker memory growth →** 明確區分 immutable template、per-generation clone、candidate/revision owner，並在 dispose、stale、mesh failure 和 export completion 路徑測試 cleanup。

## Migration Plan

1. 將使用者提供的 `cell-template.step` 加入 component-local 目錄，先完成 asset fixture/import smoke test。
2. 新增 shared model types、validators、catalog metadata 和 Worker-side component registry；先讓 box 走新 contract，確認既有 box acceptance 不變。
3. 實作 modular-grid-base builder、template cache、排列/fuse/fillet 與 mesh/export metadata。
4. 接上 component selector、dynamic parameter editor、bounds/annotation、filename 與 state transitions。
5. 執行 unit、CAD-kernel integration、Worker lifecycle、UI/e2e 與 build preview gates。

Rollback 不需要資料 migration：若新 component 有問題，可移除 catalog 中的 `modular-grid-base` entry 並保留 box builder；若 contract migration 尚未完成，整個 change 以 repository commit 回退即可。

## Open Questions

初始版本沒有阻塞實作的 open question。已固定的決策是：`modular-grid-base` 為 component 名稱、runtime template 使用目前 17 × 17 cutout 的 `cell-template.step`、切除為貫穿 5 mm、外側四角為 R2.5、box 保持預設選項，且 shared 最大寬/深為 500 mm。

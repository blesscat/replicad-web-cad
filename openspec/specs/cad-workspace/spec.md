## Purpose

本文件定義瀏覽器端 CAD 雛形的可觀察行為、驗收情境與執行邊界，讓使用者能以明確規格驗證多模型建模、3D 預覽及 STEP/STL 匯出流程。

## 目的與範圍

本文件定義瀏覽器端 CAD 雛形的可觀察行為與驗收情境。

Prototype 目前包含：

- 由 model catalog 管理的內建 CAD models，包括 box、modular-grid-base、hsw-cell、hexagonal-column 與 OpenGrid。
- 各模型自己的有效參數與 browser-local 參數保存。
- `box` 實心方塊模型，提供寬、深、高三個 mm 參數。
- `box-normal` 網格開口盒模型，提供 X/Y 格數、盒體高度與四角定位柱選項。
- `modular-grid-base`、`hsw-cell`、`hexagonal-column` 與 OpenGrid 的獨立模型與各自參數。
- 瀏覽器內的 B-Rep 建模與 3D 預覽。
- 從目前成功模型下載 STEP 與 STL。

未註冊的模型、3MF、G-code、任意 CAD 匯入、生成檔案/模型的專案儲存、auth、collaboration 與後端 CAD 服務不屬於本 Prototype；目前可用模型以 model catalog 與其 capability specs 為準，各 component 的 STL、參數保存與模型選擇行為由其 capability 規格定義。

本文中的「必須」為規範性要求；「可以」表示允許但非必要。

## 名詞

- **方塊模型**：`box` 的內建單一 solid 模型。
- **參數**：方塊的 width、depth、height，皆以 mm 解讀。
- **generation**：一次參數 snapshot 的單調遞增識別；合法與非法 snapshot 都會取得 generation，只有合法 snapshot 才能送出 model.generate。
- **candidate**：Worker 建立但尚未 commit 的候選 B-Rep。
- **model revision**：已 commit 且可預覽/匯出的 B-Rep 識別。
- **mesh**：由 B-Rep 三角化而得、供 viewport 顯示的離散資料。
- **worker epoch**：一次 Worker runtime 的不透明識別；Worker 重建後必須改變。
- **operationId**：貫穿同一個建模或匯出 operation 的穩定識別。
- **requestId**：單次 Worker command 或 response 的識別；同一 operation 可以包含多個 requestId。

## Prototype Configuration

以下是雛形的暫定驗收設定；之後可以調整，但實作 gate 必須使用同一組已記錄的值：

| 項目 | 暫定值 |
| --- | --- |
| 預設尺寸 | 20 × 30 × 40 mm |
| 每軸合法範圍 | 1–500 mm |
| 輸入 step | 1 mm；拒絕小數，不自動四捨五入 |
| 輸入 debounce | 150 ms |
| B-Rep/mesh bounds tolerance | ±0.01 mm |
| CAD dependency policy | 實作開始時使用 npm latest stable 的 replicad 與相容的 replicad-opencascadejs；安裝後以 lockfile 固定解析版本 |
| engine initialization timeout | 60 s |
| model/export operation timeout | 120 s |
| Worker 自動 recovery retry | 1 次；初次失敗後自動重建一次，再次失敗停止自動循環 |
| 同時保留的 pending candidate 上限 | 2 |
| candidate TTL | 30 s |
| pending candidate 超限處理 | discard 最舊且已被較新 input 取代的 candidate，回傳 operation.superseded 並釋放資源 |
| STEP 副檔名 | .step |
| STEP MIME | model/step |
| 預設檔名 | box-{width}x{depth}x{height}.step |
| 方塊位置 | X/Y 置中於世界原點，底面位於 Z=0 |
| Prototype 瀏覽器 | 桌面版 Chrome、桌面版 Firefox；版本於驗收時記錄 |
## Requirements
### Requirement: 瀏覽器端執行邊界
The system MUST satisfy the following behavior:

Prototype 的 CAD 頁面、Worker、WASM、建模、預覽與 STEP 匯出必須在瀏覽器完成，不得依賴 backend、API server、database、auth 或伺服器端模型運算。本變更以本機 Astro dev server 或 local build preview 驗證；正式 hosting、CDN、base path、cache header 與 production deployment 不屬於本 Prototype。

#### Scenario: 本機 CAD 路由

- **Given** 本機 Astro dev server 或 local build preview 已提供 CAD route 與應用 asset
- **When** 使用者從本機網站開啟 CAD route
- **Then** 頁面必須載入 workspace、Worker 與 WASM
- **And** 初始化與匯出不呼叫專案 backend API

#### Scenario: 非 CAD 頁面

- **Given** 使用者只瀏覽本機網站的首頁或文件頁
- **When** 頁面完成載入
- **Then** 頁面必須提供可閱讀的靜態內容
- **And** 不得啟動 CAD Worker 或載入 OpenCascade WASM

### Requirement: Astro 與 Svelte workspace
The system MUST satisfy the following behavior:

CAD workspace 必須是 Svelte 5 + Threlte/Three.js 的瀏覽器端 island，預設使用 client:only="svelte"。Astro build/SSR 不得執行 Svelte workspace、WebGL、Worker 或 OpenCascade 初始化。

#### Scenario: 載入 fallback

- **Given** CAD route 的頁面 shell 已顯示，但 Svelte workspace 尚未 ready
- **When** 使用者查看 CAD 區域
- **Then** 必須看到載入 fallback、JavaScript/WASM/WebGL 必要條件或狀態提示
- **And** 不得只有空白畫面或沒有說明的永久 spinner

### Requirement: Prototype 方塊模型

The system MUST expose a runtime-validated component catalog. Each catalog entry MUST have an independent definition with a stable `modelId`, display metadata, parameter schema and builder boundary. The existing `box`, `modular-grid-base`, `hsw-cell`, and `hexagonal-column` entries MUST remain available, and `box-normal` MUST be registered as an additional independent entry. Each model-specific CAD route MUST bind to exactly one catalog definition: `/cad/box` to `box`, `/cad/box-normal` to `box-normal`, `/cad/modular-grid-base` to `modular-grid-base`, `/cad/hsw-cell` to `hsw-cell`, and `/cad/hexagonal-column` to `hexagonal-column`. The CAD workspace MUST NOT provide an in-place model selector; changing the selected model MUST require navigation to `/models` and entry through another model-specific route.

#### Scenario: `/cad/box` 初始方塊建模

- **Given** 使用者開啟 `/cad/box`，且使用 Prototype 支援的桌面版 Chrome 或 Firefox，WebAssembly、Worker 與 WebGL 可用
- **When** Worker 回傳 engine.ready
- **Then** 主執行緒 MUST 以該 route 的有效保存參數送出 generation 1、modelId=box 的 model.generate；若沒有有效保存參數，MUST 使用 box definition 的預設參數
- **And** Worker MUST 回傳 candidate-ready，且不得先修改 current model
- **And** 主執行緒驗證 candidate mesh 後 MUST 送出 model.commit
- **And** Worker MUST 回傳非空 mesh、bounds、generation 與 model revision
- **And** 沒有有效保存參數時，Prototype 驗收 fixture MUST 使用 20 × 30 × 40 mm 方塊，且 X/Y 中心位於世界原點、底面位於 Z=0
- **And** viewport MUST 顯示方塊，UI 進入 ready

#### Scenario: `/cad/modular-grid-base` 初始網格建模

- **Given** 使用者開啟 `/cad/modular-grid-base`，且 WebAssembly、Worker 與 WebGL 可用
- **When** Worker 回傳 engine.ready
- **Then** 主執行緒 MUST 以該 route 的有效保存 rows 與 columns 送出 generation 1、modelId=modular-grid-base 的 model.generate；若沒有有效保存參數，MUST 使用該 component 的預設 rows 與 columns
- **And** Worker MUST 以 modular-grid-base component-local builder 建立 candidate
- **And** commit 後 viewport、bounds 與可匯出的 model revision MUST 屬於 modular-grid-base

#### Scenario: `/cad/box-normal` 初始開口盒建模

- **Given** 使用者開啟 `/cad/box-normal`，且 WebAssembly、Worker 與 WebGL 可用
- **When** Worker 回傳 engine.ready
- **Then** 主執行緒 MUST 以該 route 的有效保存 `x`、`y`、`height` 與 `cornerPosts` 送出 generation 1、modelId=box-normal 的 model.generate；若沒有有效保存參數，MUST 使用 box-normal definition 的預設參數
- **And** Worker MUST 以 box-normal component-local builder 建立 candidate
- **And** commit 後 viewport、bounds 與可匯出的 model revision MUST 屬於 box-normal

#### Scenario: CAD workspace 鎖定 route model

- **Given** 使用者已進入任一合法的 model-specific CAD route
- **When** 使用者查看模型控制區
- **Then** UI MUST 顯示 route 對應的 component 名稱
- **And** UI MUST 只顯示該 component 定義的參數欄位
- **And** UI MUST NOT 顯示可切換 model id 的選擇器
- **And** UI MUST 提供導向 `/models` 的模型選擇入口

#### Scenario: 初始化不重複建模

- **Given** Worker 已回傳 engine.ready，但尚未收到目前 route model 的 generation 1 model.ready
- **When** Svelte lifecycle 或重試流程再次觸發初始化
- **Then** 主執行緒不得重複送出目前 route model 的 generation 1 model.generate
- **And** Worker 不得建立第二個初始 current model

#### Scenario: Component 參數欄位

- **Given** 使用者位於 `/cad/box`、`/cad/box-normal` 或 `/cad/modular-grid-base`
- **When** 使用者查看或修改參數
        - **Then** box MUST 提供 width、depth、height 欄位並明示 mm，且每個文字輸入 MUST 接受 1–500 mm
        - **And** box-normal MUST 提供 X=2–40、Y=2–35 格數、height 文字輸入=10–500 mm 並搭配 height slider=10–200 mm，以及預設勾選的 cornerPosts checkbox
- **And** modular-grid-base MUST 提供 rows、columns 欄位，並明示合法範圍 1–20 格、每格 20 × 20 mm 及固定高度 5 mm
- **And** UI MUST NOT 顯示另一個 component 的參數欄位

### Requirement: box-normal workspace integration

The system MUST register `box-normal` as an independent runtime-validated model definition and MUST route `/cad/box-normal` to that definition. The definition MUST expose `x`, `y`, and `height` through numeric parameter fields plus `cornerPosts` through an independent custom checkbox control, centered X/Y preview metadata, deterministic STEP/STL metadata, and the bounds contract defined by the `box-normal` capability. The Worker MUST dispatch `modelId=box-normal` to a box-normal-specific builder and MUST NOT fall through to `box`, `modular-grid-base`, `hsw-cell`, or `hexagonal-column`.

#### Scenario: box-normal initial generation

- **GIVEN** a user opens `/cad/box-normal` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using valid saved box-normal parameters or the definition defaults
- **AND** the Worker MUST route the request to the independent box-normal builder
- **AND** the committed model MUST expose box-normal bounds, mesh and model metadata

#### Scenario: box-normal parameter controls

- **GIVEN** a user views the `/cad/box-normal` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose X slider values 2–40, Y slider values 2–35, integer height values 10–500 mm, and a checked-by-default corner-post checkbox
- **AND** it MUST NOT expose parameters belonging to another component
- **AND** the checkbox MUST expose an accessible label, checked state, and field-specific validation error when its raw value is not `true` or `false`

#### Scenario: box-normal route isolation

- **GIVEN** a `model.generate` request carries `modelId=box-normal`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST reject mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder or template cache

### Requirement: box-normal parameter validation and generation lifecycle

The workspace MUST parse X/Y/height as safe integers, parse `cornerPosts` as a boolean, and validate the complete box-normal snapshot before sending `model.generate`. Invalid or incomplete snapshots MUST follow the existing invalid-input and model-invalidate lifecycle. Valid snapshots MUST preserve the existing debounce, latest-wins, stale candidate, commit, mesh, and export gates.

#### Scenario: Invalid box-normal input

- **WHEN** a user enters a fractional, empty, non-finite, or out-of-range X, Y, or height value, or an invalid checkbox value
- **THEN** the workspace MUST show a diagnosable validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that snapshot
- **AND** export MUST remain disabled while the input is invalid or stale

#### Scenario: Valid box-normal input commit

- **WHEN** a complete box-normal snapshot passes validation and the input debounce settles
- **THEN** the workspace MUST send a generation request with typed `x`, `y`, `height`, and `cornerPosts`
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** the committed mesh bounds MUST match the box-normal contract within tolerance

### Requirement: OpenGrid board workspace integration

The runtime-validated catalog MUST keep the existing opengrid model id and
route /cad/opengrid bound to the official OpenGrid board definition. The route
MUST use the board's normalized parameter validator and component-local
builder, and MUST preserve the existing candidate, commit, preview, STEP, and
binary STL lifecycle.

#### Scenario: OpenGrid route initial generation

- **GIVEN** a user opens /cad/opengrid with browser CAD prerequisites
- **WHEN** the Worker reports engine.ready
- **THEN** the workspace MUST send generation 1 with modelId=opengrid and a
  valid saved snapshot, or the current OpenGrid defaults when no valid entry
  exists
- **AND** the Worker MUST route the request to the OpenGrid board builder
- **AND** the committed revision, bounds, preview, and exports MUST belong to
  opengrid

#### Scenario: OpenGrid model contract

- **GIVEN** the Worker receives model.generate with modelId=opengrid
- **WHEN** the parameters contain a valid normalized OpenGrid snapshot
- **THEN** the Worker MUST validate the variant, grid, half-cell, chamfer,
  connector, screw, and custom-position fields together
- **AND** a mismatched or invalid snapshot MUST be rejected with a diagnostic
  validation error

### Requirement: OpenGrid board controls

The /cad/opengrid workspace MUST expose Full/Lite/Heavy variant, rows and
columns from 1 through 10, X/Y half-cell directions, chamfer mode and corner flags, connector
enable and side flags, generic screw dimensions, screw mode, center/interval
modifiers, and an internal-intersection custom screw matrix. It MUST display
derived width, depth, and variant thickness in millimetres. The accessible screw-mode
control MUST be rendered before the screw-size-source control, and any conditional
row/column interval controls MUST remain associated with the screw-mode control.

#### Scenario: Configure current OpenGrid controls

- **WHEN** a user changes variant, grid, half-cell, chamfer, connector, screw,
  or custom-intersection values
- **THEN** the pending typed snapshot MUST contain those normalized fields
- **AND** derived dimensions MUST use the final half-cell envelope
- **AND** the settled input MUST use the existing debounce and Worker lifecycle

#### Scenario: Screw mode appears before screw size source

- **WHEN** a user views the `/cad/opengrid` parameter panel
- **THEN** the accessible `OpenGrid 螺絲孔模式` select MUST appear before the accessible `OpenGrid 螺絲尺寸來源` select
- **AND** selecting `by-row-column` MUST show its row and column interval controls as part of the screw-mode section

### Requirement: OpenGrid board persistence and stale preview

The OpenGrid workspace MUST use the existing per-component persistence and
latest-wins behavior. Invalid input MUST invalidate a newer generation rather
than generating native geometry, and a stale or invalid generation MUST NOT
replace the last committed OpenGrid revision or enable exports.

#### Scenario: OpenGrid invalidation

- **WHEN** a newer OpenGrid draft is invalid or supersedes a running
  generation
- **THEN** the workspace MUST send parameter-free model.invalidate with the
  newer generation
- **AND** the older candidate MUST not commit
- **AND** the last committed preview MAY remain visible but MUST be stale

### Requirement: box-normal reference cache and disposal

The Worker MUST load and validate the component-local `box-normal.step` reference at most once per Worker epoch, cache it independently from every other component reference/template, reuse it for later `box-normal` generations, and release it during Worker disposal. The box-normal builder MUST NOT delete or own the cached reference. A failed or missing reference MUST invalidate the cache and return a diagnosable asset error; pending cache cleanup MUST remain safe if disposal races asset loading.

#### Scenario: Reference cache reuse

- **WHEN** multiple `box-normal` generations run within one Worker epoch
- **THEN** the Worker MUST load and validate `box-normal.step` only once
- **AND** later generations MUST reuse the validated reference without using another component's cache

#### Scenario: Reference disposal

- **WHEN** the Worker is disposed while the reference is loaded or still pending
- **THEN** the reference MUST be released once it becomes available
- **AND** no later generation MUST reuse that disposed or failed reference

#### Scenario: Reference load failure can be retried

- **WHEN** loading or validating `box-normal.step` fails for one generation and a later generation is requested in the same Worker epoch
- **THEN** the rejected reference promise MUST have been removed from the cache
- **AND** the later generation MUST be allowed to retry the asset load

### Requirement: box-normal documentation

The Prototype documentation page MUST list `box-normal` as an available component and describe its X/Y grid ranges, 10–500 mm manual body-height input, 10–200 mm body-height slider, total 0.15 mm X/Y clearance, default four 7 mm corner posts, localStorage persistence, and STEP/STL export behavior.

#### Scenario: Documentation describes box-normal

- **WHEN** a user opens the Prototype documentation page
- **THEN** the page MUST mention `box-normal` and its confirmed controls and geometry behavior
- **AND** the page MUST describe the distinct 10–200 mm slider range and 10–500 mm manual input range
- **AND** the page MUST NOT describe `box` as the only available solid model

### Requirement: 參數驗證與 generation

The system MUST validate the selected `modelId` and its component-specific parameters before sending any model request to the Worker. Basic `box` dimensional parameters MUST be finite, positive integer millimetres in the inclusive range 1–500. Component-specific validators MUST enforce their own input ranges, including each 500 mm height or length range covered by this change. The hexagonal-column height MUST be an integer in the inclusive range 1–500 while its row-envelope safety check remains 500 mm. `modular-grid-base` `rows` and `columns` MUST be integers from 1 through 20 whose derived width and depth do not exceed 400 mm, and all grid/OpenGrid planar footprint safety limits MUST remain unchanged at their existing 500 mm bounds. Decimal values MUST be rejected without rounding. Every parameter snapshot, including an invalid snapshot, MUST receive a new generation; a valid snapshot MUST send `model.generate` only after all fields stop changing for 150 ms.

#### Scenario: 合法方塊參數變更

- **Given** workspace 已顯示一個 committed model
- **When** 使用者輸入合法的 width、depth 或 height，且所有欄位停止變更 150 ms
- **Then** UI 必須送出大於目前 generation 的建模要求
- **And** Worker 必須依新的 mm 參數建立方塊 B-Rep 與 mesh
- **And** commit 後 viewport bounds 必須符合新參數的尺寸 tolerance
- **And** 方塊的 X/Y 中心必須維持在世界原點，且最低 Z 必須維持為 0

#### Scenario: 合法網格參數變更

- **Given** workspace 已選取 modular-grid-base
- **When** 使用者輸入合法的 rows 或 columns，且所有欄位停止變更 150 ms
- **Then** UI 必須送出大於目前 generation 的 `model.generate`
- **And** Worker 必須依 `columns × 20`、`rows × 20`、5 mm 建立網格底板 B-Rep 與 mesh
- **And** commit 後 bounds 必須符合 component 規格的尺寸 tolerance

#### Scenario: Debounce 最新 snapshot

- **Given** 使用者在 150 ms 內連續修改同一個參數欄位
- **When** 使用者停止輸入至少 150 ms
- **Then** UI 只能為最後一個合法 snapshot 送出 model.generate
- **And** 中間 snapshot 不得各自觸發建模

#### Scenario: 非法參數或 component

- **Given** 使用者輸入空值、非有限數值、零、負值、小數、超出範圍的值，或未知 modelId
- **When** UI 驗證輸入
- **Then** 欄位或 component selector 附近必須顯示可理解的驗證錯誤
- **And** 不得為該 snapshot 送出 model.generate 或匯出 request
- **And** UI 必須立即進入 invalid-input、停用匯出，並送出 model.invalidate 使較舊 generation 失效
- **And** 既有成功預覽可以保留，但必須標示為 stale

#### Scenario: 500 mm 手動輸入

- **Given** 使用者在支援 500 mm 的長度／高度文字欄位輸入合法整數 `500`
- **When** 輸入完成且 debounce 結束
- **Then** 該 snapshot MUST 通過數值範圍驗證並送出 model.generate
- **And** 對應模型的生成 bounds MUST 使用 500 mm 的請求尺寸
- **And** slider MUST 仍然把可拖曳的最大值限制在 200 mm

### Requirement: Separate slider and manual-input limits

For a numeric field that exposes both a slider and a text input, the workspace MUST treat the slider maximum as a navigation aid rather than the component's validation maximum. Fields targeted by this change MUST expose a 200 mm slider maximum while retaining their component-specific manual-input maximum of 500 mm; fields with a smaller existing domain MUST retain that smaller domain. The `box` text-only dimensions MUST expose their 500 mm manual-input maximum without requiring a slider.

#### Scenario: Slider and text input expose distinct limits

- **WHEN** a user views a targeted height or length field
- **THEN** the range input MUST expose a maximum of 200 mm
- **AND** the text input MUST expose a maximum of 500 mm
- **AND** entering a valid value above 200 mm through the text input MUST remain possible

#### Scenario: Smaller domains remain bounded

- **WHEN** a numeric control has an existing maximum below 200 mm
- **THEN** its slider and manual input MUST retain the component's existing smaller maximum
- **AND** this change MUST NOT create new values outside that component's declared domain

#### Scenario: Planar workspace limits remain unchanged

- **WHEN** a user enters a height or length of 500 mm for a component whose X/Y footprint remains within its existing workspace limit
- **THEN** the component MUST be eligible for generation
- **AND** entering a planar footprint beyond the existing 500 mm safety limit MUST still be rejected independently of the height or length input range

### Requirement: Worker 初始化與 CAD 所有權
The system MUST satisfy the following behavior:

OpenCascade WASM、replicad、B-Rep 建模、mesh 產生與 STEP writer 必須位於同一個專用 CAD Worker。主執行緒不得持有或操作 OpenCascade instance。

#### Scenario: 首次初始化

- **Given** 靜態 Worker 與 WASM asset 可取得
- **When** workspace 啟動 Worker
- **Then** UI 必須呈現 loading-engine 狀態
- **And** Worker 必須在同一 runtime 內初始化 OpenCascade 並注入 replicad
- **And** 初始化成功後才可回傳 engine.ready

#### Scenario: 重複初始化

- **Given** Worker 已成功初始化
- **When** 主執行緒重複送出 engine.init
- **Then** Worker 必須重用同一個 initialization result
- **And** 不得建立第二個並行 OpenCascade runtime

### Requirement: 版本化 Worker contract

The main thread and Worker MUST use a runtime-validated discriminated component-generation message contract. All messages MUST contain `version=1`, `kind` and `requestId`; model generation and export operations MUST carry `operationId`; model-generation, candidate, and committed-model messages MUST carry `modelId` and generation where applicable; `model.invalidate` is the explicit exception because it is a generic control message and carries generation, operationId, worker epoch, and reason but no modelId or parameters. Candidate, committed model and export messages MUST carry `workerEpoch` or `modelRevision` as appropriate. The contract MUST validate component-specific parameters against the selected model definition and MUST reject unknown model IDs or mismatched parameter shapes. `model.invalidate` creates no B-Rep but records the generation as the latest input generation.

#### Scenario: 不相容訊息

- **Given** 任一端收到不支援的訊息 version、未知 kind、未知 modelId 或缺少必要欄位
- **When** 訊息被驗證
- **Then** 接收端必須拒絕處理
- **And** UI 必須收到 protocol error
- **And** 不得更新 viewport、model revision 或觸發下載

#### Scenario: Component-specific contract

- **Given** Worker 收到 `model.generate`
- **When** `modelId=modular-grid-base` 且 parameters 是合法 rows/columns
- **Then** Worker 必須將 request route 到 modular-grid-base builder
- **And** Worker 不得把 rows/columns 當成 box 的 width/depth/height
- **And** 若 parameters 與 modelId 不匹配，Worker 必須拒絕 request 並回傳可診斷 validation error

#### Scenario: 大型資料傳輸

- **Given** Worker 已產生 mesh typed arrays 或 STEP bytes
- **When** 資料跨越 Worker 邊界
- **Then** 大型 ArrayBuffer 必須使用 transferable，或使用已驗證不造成不可接受阻塞的 Blob
- **And** 不得傳送 OpenCascade/replicad B-Rep wrapper 或可變 WASM heap view

#### Scenario: Operation 關聯與重送

- **Given** 一個 model.generate operation 產生 candidate-ready
- **When** 主執行緒送出 model.commit 或 model.discard
- **Then** 後續訊息必須沿用原 operationId
- **And** 每個 command 可以有新的 requestId
- **And** 重複 commit 不得產生第二個 model revision
- **And** 重複 discard 不得再次釋放同一個 candidate

### Requirement: Latest-wins 與 candidate commit
The system MUST satisfy the following behavior:

Worker 建模成功只代表 candidate 建立成功，不代表 current model 已更新。只有主執行緒確認 generation 仍為最新後，candidate 才可以 commit。

#### Scenario: 最新 candidate commit

- **Given** 最新 generation 為 G2
- **When** Worker 回傳 G2 的 candidate-ready
- **Then** 主執行緒驗證 mesh 後必須送出 model.commit
- **And** Worker 必須驗證 candidate 的 workerEpoch 等於目前 epoch、candidate 尚未終結，且 generation 等於 Worker 記錄的最新 input generation
- **And** Worker 必須將該 candidate 設為 current model
- **And** Worker 必須回傳新的 model revision 與 model.ready

#### Scenario: 過期 candidate discard

- **Given** 使用者先產生 G2，之後產生 G3
- **When** G2 candidate 在 G3 已成為最新要求後抵達
- **Then** 主執行緒不得 commit G2
- **And** 必須送出 model.discard
- **And** Worker 必須以 operation.superseded 結束 G2 原本的建模 operation
- **And** G2 不得更新 viewport、current model 或匯出來源

#### Scenario: Worker 拒絕過期 commit

- **Given** Worker 已接受 G3，且 G2 candidate 尚未終結
- **When** 主執行緒因重送或訊息順序錯誤送出 G2 的 model.commit
- **Then** Worker 必須拒絕 G2 commit
- **And** 必須回傳帶有原 operationId 的 operation.superseded 或 stale-generation error
- **And** current model、model revision 與 viewport 不得改變

#### Scenario: 非法輸入使舊 generation 失效

- **Given** G2 的 candidate 或建模 operation 尚未終結
- **When** 使用者輸入非法的 G3 snapshot
- **Then** UI 必須送出帶有 G3 的 model.invalidate，而不是 model.generate
- **And** Worker 必須記錄 G3 為最新 input generation，並使 G2 candidate 與建模 operation 失效
- **And** G2 不得再 commit，current model 可以保留但必須標示 stale，匯出保持停用
- **And** Worker 必須回傳 model.invalidated 及受影響 operation 的 terminal response

#### Scenario: Worker 拒絕過期 generate

- **Given** Worker 已記錄最新 input generation 為 G3
- **When** Worker 收到 generation 為 G2 或重複 G3 的 model.generate
- **Then** Worker 不得建立新的 candidate
- **And** 必須回傳帶有原 operationId 的 operation.superseded
- **And** current model 與 pending candidate 不得改變

#### Scenario: 最新 generation 建模失敗

- **Given** G3 是最新 generation，但 Worker 無法建立有效 B-Rep
- **When** Worker 回傳建模錯誤
- **Then** G2 等過期 candidate 不得自動提升為 current model
- **And** 最後一個成功 model 可以保留為 stale 預覽
- **And** 新 STEP 匯出必須停用，直到新的 generation 成功 commit

#### Scenario: Candidate cleanup

- **Given** Worker 已回傳 candidate-ready
- **When** mesh validation 失敗、commit/discard 失敗、主執行緒沒有回覆或 candidate 超過 TTL
- **Then** Worker 必須釋放 candidate 的 B-Rep/native resources
- **And** pending candidate 數量不得超過 Prototype Configuration 上限
- **And** TTL 或主執行緒未回覆時，Worker 必須以原始 generate 的 operationId、terminalForRequestId 與 CANDIDATE_EXPIRED/CANDIDATE_ORPHANED code 回傳一次 terminal response
- **And** cleanup 失敗必須進入可診斷的 Worker error 或 recovery 流程

#### Scenario: Pending candidate 超過上限

- **Given** Worker 已有兩個 pending candidate，且較舊 candidate 已被更新的 generation 取代
- **When** 新 generation 的 candidate 完成
- **Then** Worker 必須 discard generation 最小的舊 candidate
- **And** 必須以原始 operationId 回傳 reason=CANDIDATE_CAPACITY 的 operation.superseded
- **And** 必須釋放舊 candidate 資源後保留新 candidate
- **And** 不得丟棄 current model 或已被 export pin 的 revision；若沒有可丟棄 candidate，新的 generate 必須以 CANDIDATE_CAPACITY error 結束

#### Scenario: Request terminal state

- **Given** UI 已送出可接受的建模 request
- **When** 該 request 被處理完成、取代或發生錯誤
- **Then** 必須收到 model.ready、operation.error 或 operation.superseded 其中一種 terminal response
- **And** UI 不得永久停留在 generating

### Requirement: Mesh viewport

The viewport MUST use Threlte with Three.js to display the latest committed model mesh, regardless of whether the selected catalog entry is a box or a component. It MUST NOT execute B-Rep modelling or STEP export. Dimension annotations MUST describe the selected committed model's actual X, Y and Z bounds and MUST remain associated with the same committed model revision. While the committed model revision is unchanged, parameter input and stale-state changes MUST NOT change the viewport camera pose or framing; camera fitting MAY occur when the viewport size changes or when a new committed model revision replaces the current one. Viewport lighting MUST keep exposed model surfaces, including raised features, thin walls and recessed cavities, visually legible across all viewing angles supported by the existing OrbitControls configuration. Lighting MUST provide enough orientation-independent fill to prevent exposed surfaces from becoming near-black solely because they face away from the primary light, while preserving directional contrast so adjacent faces and geometric relief remain distinguishable. The viewport MUST also display a fixed-position orientation indicator with visible X, Y and Z axis labels. The indicator MUST represent the same world coordinate system as the model and grid, including the CAD Z-up convention, and MUST update its orientation whenever the viewport camera or orbit pose changes without moving from its viewport corner.

#### Scenario: 有效 component mesh

- **Given** Worker 回傳 positions、normals、indices、bounds 與 triangle count for a selected component
- **When** worker client 驗證成功
- **Then** viewport 必須顯示可辨識的 component
- **And** 相機 framing 必須使模型可見
- **And** 替換模型後必須釋放舊 geometry、material 與 GPU resource
- **And** viewport 必須顯示對應 committed model 的 X、Y、Z 尺寸標註
- **And** 每組尺寸標註必須顯示以 mm 為單位的實際 bounds 數值
- **And** 初始視角中的可見表面與幾何凹凸必須保持可辨識，不得因主光源方向而整片變黑
- **And** viewport 必須同時顯示固定位置且包含 X、Y、Z 文字的座標方向指示器

#### Scenario: 尺寸標註對應 modular-grid-base

- **Given** workspace 已成功 committed 一個 rows × columns 的 modular-grid-base model
- **When** 使用者查看 3D viewport
- **Then** X 標註必須等於 `columns × 20 mm`
- **And** Y 標註必須等於 `rows × 20 mm`
- **And** Z 標註必須等於 5 mm
- **And** 標註必須包含連接模型邊緣的延伸線、尺寸線與可讀的數值標籤
- **And** 座標方向指示器的 X、Y、Z 軸向必須與模型及網格的世界座標一致

#### Scenario: Orbit angles preserve relief readability

- **Given** viewport 已顯示包含凸起、凹槽、薄壁或中空區域的 committed model
- **When** 使用者透過既有 OrbitControls 從正面、側面、背面及高低傾角查看模型
- **Then** 每個視角中朝向使用者且未被幾何遮擋的模型表面都必須保持可辨識
- **And** 凹槽或中空區域的內側表面不得僅因背向主光源而變成無法辨識的近黑區域
- **And** 相鄰表面之間必須保留足以辨識凸凹、邊界與深度的明暗差異
- **And** 光照改善不得以移除幾何明暗或將模型渲染成無材質明暗的平面色取代

#### Scenario: Lighting remains readable across representative model types

- **Given** viewport 依序顯示實心 box、薄壁或開口盒，以及 OpenGrid 或蜂巢類中空模型
- **When** 使用者在相同的代表性 orbit 視角查看每個模型
- **Then** 各模型的可見表面都必須維持一致且可預期的最低可讀亮度
- **And** 中空模型的孔洞、內壁與薄壁邊緣必須可由明暗差異辨識
- **And** 光源配置不得改變模型 bounds、尺寸標註、相機控制或模型生成結果

#### Scenario: OpenGrid underside groove readability

- **Given** viewport 已顯示包含內側凹槽與中空開口的 OpenGrid 底板
- **When** 使用者透過既有 OrbitControls 從 underside 傾角查看模型
- **Then** 面向使用者且未被幾何遮擋的四側內壁必須仍可辨識
- **And** 內側凹槽邊界不得因背向主光或朝向模型下方而變成近黑區域
- **And** 凹槽深度與相鄰底面之間必須保留明暗差異

#### Scenario: XYZ orientation indicator follows orbit

- **Given** viewport 已顯示 committed model 與 XYZ 座標方向指示器
- **When** 使用者透過既有 OrbitControls 旋轉、傾斜或翻轉視角
- **Then** 座標方向指示器必須留在同一個 viewport corner
- **And** 指示器中的 X、Y、Z 軸向朝向必須反映目前相機方向
- **And** orbit 操作不得改變模型 mesh、bounds 或尺寸標註的資料內容

#### Scenario: 建模期間保留舊 preview

- **Given** 使用者已修改 component 參數，新的 generation 尚未 committed，且上一個 committed model 仍保留在 viewport
- **When** 使用者查看 viewport
- **Then** 尺寸標註必須仍對應畫面上保留的上一個 committed model
- **And** 尺寸標註不得提前顯示尚未 committed 的新輸入
- **And** viewport 必須維持既有 stale 狀態提示
- **And** viewport camera pose、model framing 與尺寸標註的畫面位置必須維持不變
- **And** XYZ 座標方向指示器必須仍顯示目前 camera pose 的方向

#### Scenario: 參數輸入不觸發 viewport camera 旋轉

- **Given** viewport 已顯示 committed model，且使用者未在 3D viewport 內進行 orbit 操作
- **When** 使用者拖曳 slider、使用鍵盤調整 slider，或修改其他參數，而新 model revision 尚未 committed
- **Then** viewport 必須繼續顯示原本的 committed mesh
- **And** camera 的方向、target、zoom/framing 不得因輸入事件而改變
- **And** 輸入事件不得使既有模型被重新 fit 而產生旋轉或跳動
- **And** XYZ 座標方向指示器不得因輸入事件自行改變方向

#### Scenario: 新 committed revision 更新 framing

- **Given** 使用者已修改參數，且新的 model revision 已成功 committed
- **When** viewport 替換成新的 committed mesh
- **Then** viewport 必須顯示新 revision 對應的模型與尺寸標註
- **And** camera framing 必須使新模型可見
- **And** 既有 Orbit 操作必須仍可使用
- **And** XYZ 座標方向指示器必須繼續顯示新 viewport camera pose 的方向

#### Scenario: 窄版 viewport 保持可讀

- **Given** CAD viewport 顯示於窄版桌面或較小的可視區域
- **When** 使用者查看模型並操作 OrbitControls
- **Then** XYZ 座標方向指示器必須完整留在 viewport 內
- **And** X、Y、Z 軸向文字必須保持可辨識
- **And** 指示器不得遮住 stale 狀態提示或造成 viewport 橫向溢出

#### Scenario: 沒有可用模型

- **Given** workspace 尚未有 committed model，或目前沒有可供預覽的 mesh
- **When** 使用者查看 viewport
- **Then** viewport 不得顯示尺寸線或尺寸標籤
- **And** viewport 必須顯示既有的無模型或 WebGL fallback 訊息
- **And** viewport 不得顯示沒有可對應模型的 XYZ 座標方向指示器

#### Scenario: 損壞 mesh

- **Given** response 缺少 buffer、index 越界、座標非有限或沒有三角形
- **When** mesh boundary validation 執行
- **Then** 不得把該 mesh 設為成功預覽
- **And** UI 必須顯示 mesh validation error
- **And** 主執行緒必須送出對應 candidate 的 model.discard
- **And** viewport 不得 crash
- **And** viewport 不得為該損壞 mesh 顯示尺寸標註或 XYZ 座標方向指示器

### Requirement: Viewport edge-line overlay

The viewport MUST render a restrained edge-line overlay together with every valid committed model mesh. The overlay MUST include geometric boundaries and visually meaningful feature edges while suppressing ordinary triangulation edges that would make smooth or tessellated surfaces appear as a dense wireframe. The overlay MUST preserve the existing model shading and viewport lighting rather than replacing lighting with flat-color rendering.

#### Scenario: Valid committed mesh shows model edges

- **WHEN** a valid committed mesh for any registered model is displayed in the CAD viewport
- **THEN** the visible outer contour and meaningful hard or recessed feature edges MUST have a clear line treatment
- **AND** the line treatment MUST use a consistent style across model types and orbit views
- **AND** the existing model shading, dimensions, grid and XYZ orientation indicator MUST remain visible

#### Scenario: Tessellation edges remain suppressed

- **WHEN** a model contains triangulated planar or smoothly curved faces
- **THEN** ordinary internal triangle boundaries MUST NOT produce a dense wireframe-like overlay
- **AND** actual model boundaries and sufficiently pronounced changes in face direction MUST remain represented

#### Scenario: Hidden edges remain occluded

- **WHEN** an edge is behind a visible model surface from the current camera pose
- **THEN** that edge MUST NOT appear to pass through the surface
- **AND** rotating the camera to expose the edge MUST make the edge eligible for display without changing the model data

#### Scenario: Edge overlay follows committed revisions

- **WHEN** a new model revision replaces the current committed mesh
- **THEN** the viewport MUST remove the previous revision's edge overlay
- **AND** the new revision's overlay MUST correspond only to the new committed mesh
- **AND** no previous edge lines or line resources MAY remain visible after replacement

#### Scenario: Pending or invalid input preserves the committed overlay

- **WHEN** the user changes parameters while a new generation is pending, stale, invalid, or failed
- **THEN** the viewport MUST keep the edge overlay associated with the last committed mesh
- **AND** it MUST NOT derive edge lines from uncommitted input
- **AND** camera pose, framing, dimensions, stale state and XYZ orientation behavior MUST remain governed by the existing viewport contract

#### Scenario: No committed mesh has no edge overlay

- **WHEN** the workspace has no valid committed mesh or mesh validation fails
- **THEN** the viewport MUST NOT render edge lines, dimensions or an orientation indicator for that unavailable model
- **AND** the existing no-model or validation-error behavior MUST remain intact

### Requirement: STEP 匯出

The system MUST generate STEP from the selected component's existing, pinned committed model revision in the Worker. It MUST never reconstruct STEP from the viewport mesh. Export metadata and filename MUST be supplied by the selected catalog definition; the existing box filename format MUST remain `box-{width}x{depth}x{height}.step`, and modular-grid-base MUST use `modular-grid-base-{columns}x{rows}.step`.

#### Scenario: Component STEP 匯出成功

- **Given** workspace 為 ready，且指定 component model revision 仍存在
- **When** 使用者按下下載 STEP
- **Then** UI 必須建立綁定該 component model revision 的 export request
- **And** Worker 接受並驗證 request 後必須先回傳 export.accepted，並 pin 該 model revision
- **And** Worker 必須從該已 pin 的 B-Rep 產生非空 STEP bytes
- **And** 主執行緒必須驗證 bytes 與 metadata 後以 model/step MIME 觸發一次 .step 下載
- **And** modular-grid-base 的預設檔名必須符合 `modular-grid-base-{columns}x{rows}.step`

#### Scenario: STEP 匯出失敗

- **Given** writer 失敗、回傳空資料或指定 revision 不存在
- **When** 匯出流程結束
- **Then** 不得下載空檔或錯誤檔案
- **And** UI 必須顯示 STEP 匯出失敗與重試方式
- **And** 既有 B-Rep 與預覽不得被無條件清除

#### Scenario: 匯出期間 component 更新

- **Given** 使用者對 component revision R1 開始 STEP 匯出
- **When** 後續參數更新並成功 commit 為 R2
- **Then** R1 export 必須仍明確標示為 R1
- **And** Worker 必須在匯出完成前保留被 pin 的 R1
- **And** 不得把 R1 檔案命名或通知成 R2

#### Scenario: Prototype 瀏覽器範圍

- **Given** 執行 Prototype 驗收
- **When** 測試完整的初始化、component 建模、預覽與 STEP 匯出流程
- **Then** 必須在桌面版 Chrome 與桌面版 Firefox 通過
- **And** 驗收時必須記錄實際 stable 版本
- **And** Safari、Edge 與行動瀏覽器不列入本變更的通過條件

#### Scenario: Export 尚未被接受

- **Given** 使用者對 component revision R1 發出 STEP export request，但 Worker 尚未接受該 request
- **When** 後續 R2 成功 commit 並釋放未被 pin 的 R1
- **Then** R1 export 必須回傳 stale/missing model error
- **And** 不得改用 R2 靜默產生檔案
- **And** 若 Worker 先接受 R1，則必須先回傳 export.accepted 並保留 R1 到 export terminal response

### Requirement: 狀態與錯誤
The system MUST satisfy the following behavior:

UI 必須呈現 booting、loading-engine、generating、ready、invalid-input、recoverable-error 與 fatal-worker-error。錯誤至少包含 stage、穩定 code、user message、recoverable 與 request/revision 關聯。

#### Scenario: WASM 載入失敗

- **Given** WASM asset 404、MIME 錯誤或初始化例外
- **When** Worker 初始化失敗
- **Then** UI 必須離開 loading 狀態
- **And** 顯示 CAD engine 載入失敗
- **And** 提供重試或重新載入指引
- **And** STEP 下載必須停用

#### Scenario: Worker 終止

- **Given** Worker 未捕捉例外、message error 或意外終止
- **When** 主執行緒偵測到 failure
- **Then** UI 必須進入 fatal-worker-error
- **And** 不得把舊預覽標示為目前參數同步
- **And** 使用者必須能重建 Worker
- **And** 重建後 workerEpoch 改變，舊 revision 與 pending export 全部失效

#### Scenario: 可復原建模錯誤

- **Given** 參數通過表面驗證但 CAD kernel 建模失敗
- **When** Worker 回傳建模錯誤
- **Then** UI 必須指出模型建立失敗
- **And** 可以保留上一個成功預覽並標示 stale
- **And** 使用者可以修改參數後重試
- **And** 新 STEP 匯出保持停用

#### Scenario: Worker timeout

- **Given** engine initialization、model operation 或 STEP export 超過 Prototype Configuration 的 timeout
- **When** watchdog 判定 Worker 不再可信
- **Then** UI 必須離開 loading、generating 或 exporting 狀態
- **And** 目前 operation 必須收到 WORKER_TIMEOUT error
- **And** 所有 pending operation 都必須收到 WORKER_TIMEOUT 或 WORKER_RESTARTED 的 terminal error
- **And** 舊 Worker 必須被 terminate，pending candidate、revision 與 export pin 必須清理
- **And** 重建後 Worker 必須使用新的 workerEpoch
- **And** 新 Worker 必須重新執行 engine.init；若目前輸入 snapshot 合法，engine.ready 後必須重新執行 generation 1 的 model.generate、candidate commit 與 model.ready
- **And** generation 必須以 workerEpoch 為範圍並在重建後重置為 1；若目前輸入非法，重建後維持 invalid-input，不得自動建模或開放匯出
- **And** 每個 failure recovery cycle 最多只能自動重建 Worker 1 次；再次失敗必須進入 recoverable-error，停止自動重試並提供手動重試

### Requirement: 主執行緒不被 CAD 阻塞
The system MUST satisfy the following behavior:

replicad、OpenCascade、B-Rep 操作、mesh 產生與 STEP writer 不得在主執行緒執行。代表性 Prototype 模型運算期間，UI 必須仍能更新狀態與操作相機。

#### Scenario: Worker 建模期間 UI 可互動

- **Given** Worker 正在執行方塊重建
- **When** 使用者操作相機或非建模控制項
- **Then** 主執行緒不得執行 CAD kernel function
- **And** UI 不得永久卡在 generating
- **And** Worker progress 或 busy stage 必須可呈現

### Requirement: 明確非目標

The system MUST provide the registered `box`, `box-normal`, `modular-grid-base`, `hsw-cell`, and `hexagonal-column` through the component catalog. This change MUST provide STEP and STL downloads, and MAY preserve validated component parameter preferences in browser-local persistence as defined by the component-parameter-persistence capability, but MUST NOT add arbitrary CAD file import, 3MF/G-code workflows, saving generated CAD files or models, authentication, collaboration, automatic Bambu Studio launching, or native desktop-app integration.

#### Scenario: Prototype 功能清單

- **Given** 使用者查看 Prototype UI 與文件
- **When** 檢查模型與輸出功能
- **Then** 必須提供 component catalog、box、box-normal、modular-grid-base、hsw-cell、hexagonal-column、各自的 mm/數量參數、3D 預覽、STEP 下載與 STL 下載
- **And** 可以存在 component 參數的 browser-local persistence
- **And** 不得出現 arbitrary import、3MF、G-code、generated CAD file/model saving、auth、collaboration、自動啟動 Bambu Studio 或 native desktop bridge 入口

### Requirement: Fine-grained Worker progress

The versioned Worker contract MUST allow `operation.progress` to carry optional `completed`, `total`, and `unit` fields in addition to its existing stage and operation correlation fields. For modular-grid assembly, the Worker MUST report valid completed/total counts at cell or batch boundaries; stages without a natural count MAY report only their stage. The UI MUST show the current stage and, when counts are available, a determinate progress value without presenting stale or unrelated operation progress.

#### Scenario: Grid assembly reports completed work

- **GIVEN** the Worker is generating a modular-grid-base model
- **WHEN** a cell or fuse batch completes
- **THEN** it MUST emit operation.progress with the current operationId and generation
- **AND** completed MUST be a non-negative integer no greater than total
- **AND** total MUST be a positive integer representing the current assembly work
- **AND** the UI MUST update the visible progress indicator with the current stage and count

#### Scenario: Progress from an older generation is ignored

- **GIVEN** generation G2 is the latest input and G1 progress arrives after G2 starts
- **WHEN** the main thread handles the G1 progress event
- **THEN** it MUST ignore the event
- **AND** it MUST keep displaying G2 progress or its current status

### Requirement: Progress terminal lifecycle

The UI MUST clear the active progress indicator when the associated operation reaches model.ready, operation.error, operation.superseded, timeout, recovery, or invalidation. A terminal event for an older operation MUST NOT clear progress belonging to a newer current operation.

#### Scenario: Successful generation clears progress

- **GIVEN** the UI displays progress for the latest model generation
- **WHEN** the Worker returns model.ready and the mesh is committed
- **THEN** the progress indicator MUST be removed or marked complete
- **AND** the status MUST transition to the existing ready message

#### Scenario: Failed or cancelled generation clears progress

- **GIVEN** the UI displays progress for a generation
- **WHEN** that generation returns an error or superseded terminal response
- **THEN** the UI MUST leave the active progress state
- **AND** it MUST show the existing recoverable/error or stale status without an indefinitely running progress indicator

### Requirement: HSW component catalog and route

The runtime-validated component catalog MUST expose an independent `hsw-cell` definition with stable model id, display metadata, rows/columns parameter schema, default parameters `{ rows: 1, columns: 1 }`, bounds metadata, and export filename metadata. The model-specific route `/cad/hsw-cell` MUST bind only to this definition, and the CAD workspace MUST remain route-locked without an in-place model selector.

#### Scenario: HSW route starts the correct component

- **WHEN** a user opens `/cad/hsw-cell` and the CAD runtime is available
- **THEN** the workspace MUST initialize with `modelId=hsw-cell`
- **AND** generation 1 MUST use valid saved HSW rows and columns when available, otherwise the HSW definition's default rows and columns
- **AND** the Worker MUST route the request to the HSW component-local builder

#### Scenario: HSW workspace shows only HSW controls

- **WHEN** a user views the `/cad/hsw-cell` workspace
- **THEN** the UI MUST identify the HSW component
- **AND** it MUST show rows and columns controls for the HSW grid
- **AND** it MUST NOT show box dimensions or a model selector

### Requirement: HSW slider controls and contract validation

The HSW workspace MUST expose `rows` and `columns` as range controls with minimum 1, maximum 20, and step 1. Normal UI interaction MUST use these sliders rather than free-form text input, so the workspace does not need a separate decimal or empty-string input path. Before sending `model.generate`, the main thread MUST still validate the resulting snapshot against the HSW contract; non-finite, out-of-range, mismatched, or programmatically malformed snapshots MUST be rejected without rounding, must advance generation/invalidation semantics, and must not start HSW CAD geometry. A valid HSW snapshot MUST use the existing settled-input debounce behavior.

#### Scenario: Valid HSW parameter change

- **WHEN** a user changes HSW rows or columns to a legal integer and the input settles
- **THEN** the workspace MUST send a newer `model.generate` with `modelId=hsw-cell`
- **AND** the resulting committed bounds MUST match the HSW layout contract within tolerance

#### Scenario: Invalid HSW snapshot is rejected at the contract boundary

- **WHEN** the workspace receives a zero, negative, non-finite, out-of-range, or mismatched HSW snapshot from any source
- **THEN** the workspace MUST show a component-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** export MUST remain disabled while the input is invalid or stale

### Requirement: HSW Worker preview and revision contract

The Worker MUST return HSW candidate and committed model events with `modelId=hsw-cell`, the validated rows/columns parameters, non-empty mesh, and bounds matching the HSW component contract. The main thread MUST keep the existing candidate commit, stale preview, model revision, and Worker ownership lifecycle for HSW exactly as for other catalog components.

#### Scenario: HSW candidate becomes ready

- **WHEN** a valid HSW generation completes in the Worker
- **THEN** the Worker MUST emit a candidate containing HSW parameters, mesh, and bounds
- **AND** the main thread MUST validate and commit only the latest candidate
- **AND** the viewport MUST display the committed HSW geometry and dimension annotations

### Requirement: HSW STEP metadata

The HSW catalog definition MUST provide the deterministic STEP filename `hsw-cell-{columns}x{rows}.step`. STEP generation MUST use the selected committed HSW B-Rep revision in the Worker and MUST NOT reconstruct the file from the viewport mesh.

#### Scenario: HSW STEP export

- **WHEN** a ready `hsw-cell` revision with `rows=2` and `columns=2` is exported
- **THEN** the request MUST be correlated to that HSW model revision and Worker epoch
- **AND** the suggested filename MUST be `hsw-cell-2x2.step`
- **AND** the downloaded bytes MUST be non-empty exact STEP output from the committed HSW B-Rep

### Requirement: 穩定且響應式的參數復原控制

CAD workspace MUST 提供可辨識且可用的 component-level「全部恢復預設」操作，將目前模型的所有參數恢復為定義的預設值。非 boolean 的模型參數 MAY 另外提供個別復原操作；boolean 控制與尺寸計算器的暫存輸入不提供個別復原按鈕。復原操作出現或消失時，不得重新分配相關 slider、select、文字輸入框或 checkbox 的主要控制區域；在窄版面板中，控制項 MUST 維持可讀、可操作，且不得因復原操作造成水平溢出。

#### Scenario: 非 boolean 參數修改後顯示個別復原操作

- **GIVEN** 使用者位於任一提供可復原參數的 model-specific CAD workspace，且該參數目前為預設值
- **WHEN** 使用者將該參數修改為不同的合法值
- **THEN** 該參數 MUST 顯示具備可理解 accessible name 的復原操作
- **AND** 原本的 slider、select、文字輸入框或 checkbox MUST 維持可操作
- **AND** 參數控制的主要位置與可用寬度 MUST 不因復原操作動態出現而改變

#### Scenario: boolean 與尺寸計算器使用 component-level 復原

- **GIVEN** 使用者修改 model component 的 boolean 參數，或在尺寸計算器輸入目標尺寸
- **THEN** 該控制 MUST NOT 顯示個別復原按鈕
- **AND** component MUST 顯示具備可理解 accessible name 的「全部恢復預設」操作
- **AND** 原本的 checkbox 或文字輸入框 MUST 維持可操作

#### Scenario: 窄版面板不被復原操作壓縮

- **GIVEN** 使用者在窄視窗查看模型參數面板
- **WHEN** 使用者修改會顯示復原操作的 select、slider 或數字輸入參數
- **THEN** 參數控制 MUST 保留足以顯示及操作其值的寬度
- **AND** 復原操作 MUST 保持可見且可點擊
- **AND** 頁面 MUST 不因該復原操作產生水平溢出

#### Scenario: 全部恢復預設後維持穩定版面

- **GIVEN** component 內一個以上參數已修改
- **WHEN** 使用者啟動「全部恢復預設」操作
- **THEN** 所有模型參數 MUST 回到定義的預設值
- **AND** 尺寸計算器的暫存輸入 MUST 清空
- **AND** 相關控制項與相鄰欄位 MUST 不發生額外的水平或垂直位移

### Requirement: OpenGrid stackable-box workspace integration

The runtime-validated catalog MUST register `opengrid-stackable-box` as an independent model definition in the OpenGrid series, and the model-specific CAD route MUST bind `/cad/opengrid-stackable-box` to that definition. The Worker MUST dispatch this model to its own parameter validation and geometry boundary without falling through to `opengrid`, `box-normal`, or another component. The workspace MUST preserve the existing latest-wins generation, preview, commit, STEP, and STL lifecycle.

#### Scenario: Direct stackable-box navigation

- **WHEN** a user opens `/cad/opengrid-stackable-box` with browser CAD prerequisites available
- **THEN** the page MUST load the stackable-box workspace
- **AND** the initial generation MUST use valid saved stackable-box parameters when available, otherwise the model definition defaults
- **AND** the committed revision MUST be identified as `opengrid-stackable-box`

#### Scenario: Stackable-box route isolation

- **WHEN** a `model.generate` request carries `modelId=opengrid-stackable-box`
- **THEN** the Worker MUST validate the stackable-box parameter shape
- **AND** it MUST use the stackable-box builder boundary
- **AND** it MUST reject mismatched parameters rather than resolving the request through the official OpenGrid board or another model

#### Scenario: Stackable-box controls

- **WHEN** a user views `/cad/opengrid-stackable-box`
- **THEN** the panel MUST expose the stackable box's X, Y, and height controls with OpenGrid 28 mm and half-cell semantics
- **AND** it MUST describe the integrated side guide, centered per-cell bottom receiving grooves, and four-corner Snap mounting interface
- **AND** it MUST NOT expose an upper-box/lower-box variant selector or a permanently protruding stacking-post toggle

#### Scenario: Stackable-box export

- **WHEN** a valid stackable-box candidate is committed
- **THEN** the workspace MUST make its STEP and STL exports available using stackable-box metadata
- **AND** exports MUST remain disabled while the current snapshot is invalid, stale, or failed geometry validation

### Requirement: OpenGrid Snap workspace controls

The `/cad/opengrid-snap` workspace MUST expose Full/Lite variant control, one shared `offset` range slider, an X half-cell direction control with `none`／`left`／`right`, and a Y half-cell direction control with `none`／`top`／`bottom`. The offset slider MUST cover `0` through `1 mm` in `0.05 mm` steps, and its label MUST explain that the value is the shared total outer width/depth increment. Each axis direction control MUST allow exactly one value, and the panel MUST NOT expose `allowHalfCell`, a separate half-cell checkbox, or diagonal-only options. The panel MUST display derived outer width, depth, and variant height.

#### Scenario: Configure Full Snap dimensions

- **WHEN** a user selects Full, sets `offset=0.2`, leaves both half-cell directions at `none`, and settles the input
- **THEN** the pending typed snapshot MUST contain exactly `variant=Full`, `offset=0.2`, `halfCellX=none`, and `halfCellY=none`
- **AND** the panel MUST display the resulting equal total outer width/depth increments
- **AND** the panel MUST not display board rows, columns, screws, connectors, or chamfers

#### Scenario: Configure single-axis Snap half-cell

- **WHEN** a user selects Lite, chooses `halfCellX=left`, and leaves `halfCellY=none`
- **THEN** the pending typed snapshot MUST contain the selected X direction and no Y half-cell
- **AND** the derived X envelope MUST be shown as a half-cell host dimension
- **AND** the panel MUST not require an additional half-cell-enabled boolean

#### Scenario: Configure dual-axis Snap half-cell

- **WHEN** a user chooses `halfCellX=right` and `halfCellY=top`
- **THEN** the pending typed snapshot MUST represent a dual-axis half-cell
- **AND** the panel MUST derive that state from the two axis controls
- **AND** it MUST not show a separate right-top or other diagonal Snap option

#### Scenario: Invalid Snap control

- **WHEN** a Snap snapshot contains a non-finite, non-step, or out-of-range offset or an invalid half-cell direction
- **THEN** the corresponding field MUST show a diagnosable validation error
- **AND** the workspace MUST send `model.invalidate` rather than `model.generate`
- **AND** STEP/STL export MUST remain disabled for the invalid or stale generation

### Requirement: OpenGrid half-cell workspace controls

The `/cad/opengrid` workspace MUST expose the existing OpenGrid board controls together with an X half-cell direction control containing `none`／`left`／`right` and a Y half-cell direction control containing `none`／`top`／`bottom`. The grid-count controls MUST be ordered X before Y. With no half-cell on an axis, its slider MUST use whole-cell values; when that axis has a selected half-cell direction, its displayed total count MUST use `0.5` increments (`1.5`, `2.5`, ...), retain at least one complete cell, and extend the maximum by `0.5`. The normalized snapshot MAY continue to store the complete-cell count as an integer plus the typed direction field. The panel MUST display derived width, depth, and thickness using the selected directions. It MUST NOT expose an `allowHalfCell` checkbox, a separate single/dual mode, or independent diagonal controls.

#### Scenario: Select an X half-cell

- **WHEN** a user chooses `halfCellX=right` and leaves `halfCellY=none`
- **THEN** the pending OpenGrid snapshot MUST include the right X direction
- **AND** the displayed width MUST increase by exactly 14 mm over the same rows/columns without half-cell
- **AND** the displayed depth MUST remain unchanged

#### Scenario: Half-cell grid count display

- **WHEN** a user chooses `halfCellX=left` while the normalized OpenGrid snapshot has `columns=2`
- **THEN** the X grid control MUST appear before the Y grid control
- **AND** the X control MUST display `2.5` total cells and accept the next `0.5` value
- **AND** the normalized snapshot MUST retain `columns=2` with `halfCellX=left`

#### Scenario: Half-cell corner screw placement

- **WHEN** a user selects `rows=5`, `columns=3`, `halfCellX=left`, `halfCellY=none`, and `screwMode=corners`
- **THEN** the generated screw centers MUST include the half-cell/full-cell seam at `x=-35 mm`
- **AND** the generated screw centers MUST include the far full-cell corner row at `x=21 mm`
- **AND** the generated screw centers MUST be `[-35,-42]`, `[-35,42]`, `[21,-42]`, and `[21,42]`
- **AND** the middle full-cell seam at `x=-7 mm` MUST NOT receive screws

#### Scenario: Select a Y half-cell

- **WHEN** a user chooses `halfCellY=top` and leaves `halfCellX=none`
- **THEN** the pending OpenGrid snapshot MUST include the top Y direction
- **AND** the displayed depth MUST increase by exactly 14 mm
- **AND** the displayed width MUST remain unchanged

#### Scenario: Select both axes

- **WHEN** a user chooses one X direction and one Y direction
- **THEN** the UI MUST describe the pending state as a dual-axis half-cell through the two selected fields
- **AND** both displayed dimensions MUST include their respective 14 mm extension
- **AND** left/right and top/bottom choices MUST remain mutually exclusive

#### Scenario: OpenGrid invalid direction

- **WHEN** a programmatic or persisted OpenGrid value contains an invalid direction or `allowHalfCell`
- **THEN** the panel MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous accepted preview MAY remain visible but MUST be marked stale

### Requirement: OpenGrid Snap workspace lifecycle and preview

The Snap workspace MUST use the existing debounce, latest-wins, candidate commit/discard, stale-preview, Worker recovery, and route-locking behavior. A committed no-half preview MUST display the complete nine-solid assembly and derived dimensions from the committed bounds. A committed half-cell preview MUST display the validated project-owned half-cell assembly and derived dimensions from the committed bounds without requiring nine solids.

#### Scenario: Initial Snap generation

- **WHEN** `/cad/opengrid-snap` receives `engine.ready`
- **THEN** the main thread MUST send generation 1 with the valid saved Snap snapshot or defaults
- **AND** the Worker MUST return a candidate for `modelId=opengrid-snap`
- **AND** the committed viewport MUST display the complete no-half assembly or the validated half-cell assembly selected by the snapshot

#### Scenario: Latest Snap input wins

- **WHEN** a newer valid or invalid Snap snapshot supersedes a running generation
- **THEN** the older candidate MUST not commit or replace the newer revision
- **AND** the existing stale/invalid export rules MUST remain in effect

#### Scenario: Snap export uses committed revision

- **WHEN** a Snap model is committed and the user requests STEP or STL
- **THEN** the export request MUST use the same committed revision shown in the viewport
- **AND** the downloaded model MUST contain the complete no-half assembly or the validated half-cell assembly rather than only its central body

### Requirement: OpenGrid 分隔器 CAD workspace

The system MUST register `opengrid-divider` as an independent model definition and MUST route `/cad/opengrid-divider` to that definition. The route MUST expose only the divider's `left`, `right`, `up`, `down`, `height`, and `wallThickness` controls without a detailed derived geometry summary. Each directional control MUST accept values from 0 through 10 grids in 0.5-grid steps. The height text input MUST accept 2–500 mm and its slider MUST range from 2–200 mm. It MUST NOT show the repeated technical paragraph describing the official grid, height, slider, or footprint limits. It MUST NOT show the official OpenGrid Full/Lite/Heavy, connector, or screw controls.

#### Scenario: 直接開啟分隔器 route

- **WHEN** a user opens `/cad/opengrid-divider`
- **THEN** the page MUST resolve the route to `modelId=opengrid-divider`
- **AND** the first generation MUST use valid saved divider parameters or the divider definition defaults, including `left=1.5`, `right=1.5`, `up=0`, `down=0`, `height=20`, and `wallThickness=2`
- **AND** the Worker MUST dispatch the request to the divider builder

#### Scenario: 分隔器控制面板

- **WHEN** the divider workspace is rendered
- **THEN** it MUST display four directional grid-count controls with minimum 0, maximum 10, and step 0.5, a height text input with maximum 500 mm and a height slider with maximum 200 mm, and a wall-thickness control with values from 1 through 5 mm
- **AND** the thickness control MUST identify 2 mm as the default
- **AND** it MUST NOT display a separate technical summary for the official 28 mm/14 mm footprint, shape, plane dimensions, chamfer, locating pegs, or total Z bounds
- **AND** it MUST NOT display the repeated official-grid/height-limit paragraph
- **AND** it MUST NOT display controls belonging to another model

### Requirement: 分隔器輸入生命週期

The divider workspace MUST use the existing typed generation, debounce, latest-wins, invalidation, candidate, commit, stale-preview, and export gates for its component-specific parameters, including `wallThickness`.

#### Scenario: 合法輸入建模

- **WHEN** a complete divider snapshot passes validation and input debounce settles
- **THEN** the workspace MUST send a `model.generate` request with `modelId=opengrid-divider`
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** exports MUST become available only after a matching committed revision exists

#### Scenario: 非法輸入失效化

- **WHEN** any directional count, height, or `wallThickness` is empty, fractional where integer input is required, non-finite, negative, or outside its supported range
- **THEN** the workspace MUST show a field-specific validation error
- **AND** it MUST send `model.invalidate` instead of `model.generate`
- **AND** export MUST remain disabled for the invalid or stale generation

### Requirement: OpenGrid pillar workspace integration

The runtime-validated component catalog MUST register `opengrid-pillar` as an independent OpenGrid model definition and MUST route `/cad/opengrid-pillar` to it. The definition MUST expose exactly one required radio group with `standard`, `thin-shell`, and `positioning` choices, defaulting to `standard`, plus numeric X/Y offset controls shared by all three modes. Standard and thin-shell MUST NOT expose a manual length, diameter, flange-height, or chamfer field; positioning MUST expose only its custom total-length field in addition to the X/Y offset controls. The Worker MUST dispatch `modelId=opengrid-pillar` to the pillar builder, and the CAD workspace MUST not fall through to another component or expose another component's parameters.

#### Scenario: Pillar initial generation

- **GIVEN** a user opens `/cad/opengrid-pillar` in a supported browser
- **WHEN** the Worker emits `engine.ready`
- **THEN** the main thread MUST send generation 1 using a valid saved pillar snapshot or `{ mode: 'standard', offsetX: 0, offsetY: 0 }`
- **AND** the Worker MUST route the request to the independent pillar builder
- **AND** the committed model MUST expose pillar bounds, mesh, and model metadata

#### Scenario: Pillar parameter controls

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the parameter panel is rendered
- **THEN** it MUST expose a radio group with clearly labeled `堆疊版`, `薄殼版`, and `物件定位用` choices
- **AND** the standard choice MUST be selected by default
- **AND** selecting standard MUST represent a fixed 9 mm model
- **AND** selecting thin-shell MUST represent a fixed 6 mm model
- **AND** selecting positioning MUST expose a custom total-length field
- **AND** every mode MUST expose X and Y offset controls with range -0.5～0.5 mm and step 0.05 mm
- **AND** standard and thin-shell MUST NOT expose adjustable length, diameter, flange-height, or chamfer fields

#### Scenario: Mode selection updates the existing model

- **GIVEN** a user views the `/cad/opengrid-pillar` workspace
- **WHEN** the user selects any radio choice or changes a valid XY offset
- **THEN** the workspace MUST validate and generate the corresponding pillar mode model at the requested XY position
- **AND** the accepted typed mode, length when applicable, and offsets MUST be persisted under `opengrid-pillar`
- **AND** switching to positioning MUST retain or initialize its custom length
- **AND** switching to a fixed mode MUST remove the manual length override from the accepted snapshot

#### Scenario: Pillar route isolation

- **GIVEN** a `model.generate` request carries `modelId=opengrid-pillar`
- **WHEN** the Worker validates and builds the request
- **THEN** it MUST accept only the pillar mode parameter shape, with `length` allowed only for positioning and offsets required for every normalized snapshot
- **AND** it MUST reject mismatched or unknown parameter shapes
- **AND** it MUST NOT resolve the request through another component's builder or template cache

#### Scenario: Invalid pillar input lifecycle

- **WHEN** a user or external caller supplies a missing, malformed, unsupported pillar mode, invalid positioning length, or invalid XY offset
- **THEN** the workspace MUST show a diagnosable field error
- **AND** it MUST send `model.invalidate` rather than `model.generate` for that invalid snapshot
- **AND** export MUST remain disabled while the input is invalid or stale

### Requirement: OpenGrid locating model descriptions

The runtime model-card descriptions for the affected OpenGrid components MUST state the confirmed locating dimensions. The pillar description MUST identify standard as 9 mm and thin-shell as 6 mm, both with a Ø5 mm body, and MUST mention the positioning mode's configurable XY offset range of -0.5～0.5 mm in 0.05 mm steps. The box description MUST state that its four corner connection holes are Ø5 mm. The cylinder description MUST state that its center hole and four outer cardinal connection holes are Ø5 mm. These descriptions MUST remain consistent with the generated geometry and parameter controls.

#### Scenario: Pillar description exposes current contract

- **WHEN** the `opengrid-pillar` model card is rendered
- **THEN** its description MUST state `堆疊版 9 mm`, `薄殼版 6 mm`, and Ø5 mm body dimensions
- **AND** it MUST state that XY offsets range from -0.5～0.5 mm with 0.05 mm increments

#### Scenario: Box and cylinder descriptions expose current holes

- **WHEN** the box and cylinder model cards are rendered
- **THEN** the box description MUST identify its four corner connection holes as Ø5 mm
- **AND** the cylinder description MUST identify its center plus four outer cardinal connection holes as Ø5 mm

### Requirement: OpenGrid stackable-cylinder workspace integration

The CAD workspace MUST bind `/cad/opengrid-stackable-cylinder` exclusively to `modelId=opengrid-stackable-cylinder`. The catalog entry MUST expose typed diameter and height fields with 1 mm slider increments and direct numeric input, two mutually exclusive visible mode choices `薄殼模式` and `堆疊模式`, a bottom-hole toggle, and a four-direction opening disclosure containing depth, bottom-length, and angle controls. The visible panel MUST NOT expose `bottomPlateMode` as a selectable radio choice, while the normalized legacy field MAY remain supported for persisted or programmatic snapshots. The Worker MUST route this model ID to the independent cylinder builder and MUST NOT fall through to `box`, `opengrid-stackable-box`, or another component.

#### Scenario: Cylinder route initializes

- **WHEN** a user opens `/cad/opengrid-stackable-cylinder`
- **THEN** the workspace MUST initialize with `modelId=opengrid-stackable-cylinder`
- **AND** the first valid generation MUST use the cylinder defaults or valid saved cylinder parameters

#### Scenario: Cylinder panel exposes only cylinder fields

- **WHEN** the user views the cylinder parameter panel
- **THEN** it MUST show outer diameter and height controls
- **AND** both controls MUST use a 1 mm step
- **AND** it MUST show the two visible mode choices, the bottom-hole toggle, and the four direction opening controls
- **AND** the selected default-mode description MUST read `預設模式：可堆疊滑動，使用9mm定位柱`
- **AND** the selected thin-shell description MUST read `薄殼模式：不可堆疊，使用6mm定位柱`
- **AND** it MUST NOT show rectangular X/Y cell, OpenGrid board, or stackable-box full-grid controls

#### Scenario: Worker dispatch is component-specific

- **WHEN** the Worker receives a model-generation request with `modelId=opengrid-stackable-cylinder`
- **THEN** it MUST validate the cylinder parameter shape and invoke the cylinder builder
- **AND** a mismatched parameter shape MUST be rejected with a diagnosable validation error

### Requirement: Cylinder workspace lifecycle and export gates

The new cylinder route MUST use the existing debounce, latest-wins, candidate-ready, commit/discard, invalid-input, stale-preview, Worker recovery, preview mesh, STEP export, and STL export lifecycle. A failed or stale cylinder generation MUST NOT replace the latest committed revision or enable export.

#### Scenario: Valid cylinder update commits

- **WHEN** a valid diameter or height update settles after the existing input debounce
- **THEN** the workspace MUST request a newer cylinder generation
- **AND** only the latest valid candidate MUST be eligible for commit
- **AND** the committed bounds MUST match the typed parameters within tolerance

#### Scenario: Invalid or stale cylinder update

- **WHEN** a cylinder input is invalid or its candidate becomes stale because a newer generation exists
- **THEN** the workspace MUST invalidate or discard that snapshot according to the existing lifecycle
- **AND** the previous committed preview MAY remain visible as stale
- **AND** STEP/STL export MUST remain disabled for the invalid or stale snapshot

### Requirement: Mobile CAD viewport touch interaction

At or below the existing `760px` responsive breakpoint, a CAD viewport with a committed model MUST support continuous touch interaction without requiring the user to lift their finger during a gesture. Touch handling MUST be scoped to the preview surface so normal page scrolling remains available outside the viewport.

#### Scenario: Continuous one-finger orbit on a mobile viewport

- **WHEN** a user touches a committed CAD preview at or below the `760px` breakpoint and drags with one finger without lifting it
- **THEN** the model orientation MUST continue updating for the full drag until the finger is released
- **AND** the gesture MUST NOT stop after a short movement or require a second touch to continue

#### Scenario: Preview touch handling is scoped to the preview surface

- **WHEN** a user starts a vertical scroll on mobile outside the CAD preview surface
- **THEN** the document MUST continue scrolling normally
- **AND** the preview interaction behavior MUST NOT lock or disable scrolling for the rest of the page

#### Scenario: Existing multi-touch viewport controls remain available

- **WHEN** a user performs the existing supported two-finger viewport gesture on a mobile preview
- **THEN** the viewport MUST continue to provide its existing zoom or pan behavior
- **AND** the mobile touch support MUST NOT replace or disable the existing viewport control mapping

#### Scenario: Desktop viewport interaction remains compatible

- **WHEN** a user operates the CAD preview above the `760px` breakpoint with the existing mouse orbit interaction
- **THEN** the model MUST remain rotatable through the existing desktop interaction
- **AND** the mobile touch support MUST NOT change model generation, camera framing, dimension annotations, or committed revision behavior

### Requirement: System context controls initial CAD generation

The CAD workspace MUST resolve the supported `desk` or `wall` context before its first generation. It MUST initialize from the valid scoped snapshot, system preset, or model definition default according to the persistence precedence, while keeping the existing model id, generation lifecycle, viewport behavior, and export gates unchanged.

#### Scenario: Context route initializes the matching Snap geometry

- **WHEN** a user opens `/cad/opengrid-snap?system=desk` or `/cad/opengrid-snap?system=wall` without scoped saved values
- **THEN** generation 1 MUST use the corresponding context preset
- **AND** the Desk preset MUST use an X/Y increment of `0.25`
- **AND** the committed model MUST retain `modelId=opengrid-snap`
- **AND** the model MUST remain previewable and exportable through the existing Worker lifecycle

### Requirement: System-aware restore defaults

When a supported system context is active, the CAD workspace's restore-defaults action MUST apply the active system preset and persist the validated result in that system scope. The context-free route MUST continue to restore the model definition defaults.

#### Scenario: Wall reset restores Wall Snap defaults

- **WHEN** a user changes Wall Snap parameters and activates `全部恢復預設`
- **THEN** the controls MUST return to Full/Standard/full/0 with both optional hole flags disabled
- **AND** the next valid generation MUST use those values

### Requirement: Active system label on the CAD edit page

The CAD edit page MUST show the validated active system name above the model title when a supported OpenGrid system context is present. Desk MUST show `目前系統：Desk System`, and Wall MUST show `目前系統：Wall Related`. A context-free or unsupported route MUST omit the system label.

#### Scenario: Desk edit page identifies the active system

- **WHEN** a user opens `/cad/opengrid-snap?system=desk`
- **THEN** the page MUST show `目前系統：Desk System` above the model title

#### Scenario: Wall edit page identifies the active system

- **WHEN** a user opens `/cad/opengrid-snap?system=wall`
- **THEN** the page MUST show `目前系統：Wall Related` above the model title

## 可追溯性

- 變更動機、Prototype 範圍與後續演進：../../proposal.md
- 架構、contract、lifetime 與測試策略：../../design.md
- 實作順序與 quality gates：../../tasks.md

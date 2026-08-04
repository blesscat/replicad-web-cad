## MODIFIED Requirements

### Requirement: Prototype 方塊模型

The system MUST expose a runtime-validated component catalog. Each catalog entry MUST have an independent definition with a stable `modelId`, display metadata, parameter schema and builder boundary. The existing `box` entry MUST remain available, and the catalog MUST add `modular-grid-base` as a selectable entry; the current box remains the default initial selection unless the user explicitly selects another entry.

#### Scenario: 初始方塊建模

- **Given** 使用者第一次開啟 CAD workspace，且使用 Prototype 支援的桌面版 Chrome 或 Firefox，WebAssembly、Worker 與 WebGL 可用
- **When** Worker 回傳 engine.ready
- **Then** 主執行緒必須以預設參數送出 generation 1、modelId=box 的 model.generate
- **And** Worker 必須回傳 candidate-ready，且不得先修改 current model
- **And** 主執行緒驗證 candidate mesh 後必須送出 model.commit
- **And** Worker 必須回傳非空 mesh、bounds、generation 與 model revision
- **And** Prototype 驗收 fixture 必須使用 20 × 30 × 40 mm 方塊，且 X/Y 中心位於世界原點、底面位於 Z=0
- **And** viewport 必須顯示方塊，UI 進入 ready

#### Scenario: Catalog 顯示可選 component

- **Given** CAD workspace 已完成 engine 初始化
- **When** 使用者查看模型選擇控制項
- **Then** UI 必須顯示 `box` 與 `modular-grid-base` 的可理解名稱
- **AND** 每個選項 MUST resolve to its own catalog definition rather than a generic untyped geometry branch
- **AND** 選取 component 後 UI 必須顯示該 component 的參數欄位

#### Scenario: 選取模組化網格底板

- **Given** 使用者已在 catalog 選取 `modular-grid-base`
- **When** 使用者以合法的 rows 與 columns 送出生成
- **Then** 主執行緒必須送出 `modelId=modular-grid-base` 與該 component-specific parameters
- **AND** Worker 必須以該 component-local builder 建立 candidate
- **AND** commit 後 viewport、bounds 與可匯出的 model revision 必須屬於所選 component

#### Scenario: 初始化不重複建模

- **Given** Worker 已回傳 engine.ready，但尚未收到 generation 1 的 model.ready
- **When** React lifecycle 或重試流程再次觸發初始化
- **Then** 主執行緒不得重複送出 generation 1 的 model.generate
- **And** Worker 不得建立第二個初始 current model

#### Scenario: Component 參數欄位

- **Given** 使用者在 catalog 選取一個 component
- **When** 使用者查看或修改參數
- **Then** UI 必須只顯示該 component 定義的參數欄位
- **And** box 必須提供 width、depth、height 欄位並明示 mm
- **And** modular-grid-base 必須提供 rows、columns 欄位，並明示每格 20 × 20 mm 及固定高度 5 mm

### Requirement: 參數驗證與 generation

The system MUST validate the selected `modelId` and its component-specific parameters before sending any model request to the Worker. Shared dimensional parameters MUST be finite, positive integer millimetres within the confirmed workspace range; modular-grid-base `rows` and `columns` MUST be positive integers whose derived width and depth do not exceed 500 mm. Decimal values MUST be rejected without rounding. Every parameter snapshot, including an invalid snapshot, MUST receive a new generation; a valid snapshot MUST send `model.generate` only after all fields stop changing for 150 ms.

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

### Requirement: 版本化 Worker contract

The main thread and Worker MUST use a runtime-validated discriminated component-generation message contract. All messages MUST contain `version=1`, `kind` and `requestId`; model generation, invalidation and export operations MUST carry `operationId`; model messages MUST carry `modelId` and generation; candidate, committed model and export messages MUST carry `workerEpoch` or `modelRevision` as appropriate. The contract MUST validate component-specific parameters against the selected model definition and MUST reject unknown model IDs or mismatched parameter shapes. `model.invalidate` remains a control message that creates no B-Rep but records the generation as the latest input generation.

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

### Requirement: Mesh viewport

The viewport MUST use React Three Fiber to display the latest committed model mesh, regardless of whether the selected catalog entry is a box or a component. It MUST NOT execute B-Rep modelling or STEP export. Dimension annotations MUST describe the selected committed model's actual X, Y and Z bounds and MUST remain associated with the same committed model revision.

#### Scenario: 有效 component mesh

- **Given** Worker 回傳 positions、normals、indices、bounds 與 triangle count for a selected component
- **When** worker client 驗證成功
- **Then** viewport 必須顯示可辨識的 component
- **And** 相機 framing 必須使模型可見
- **And** 替換模型後必須釋放舊 geometry、material 與 GPU resource
- **And** viewport 必須顯示對應 committed model 的 X、Y、Z 尺寸標註
- **And** 每組尺寸標註必須顯示以 mm 為單位的實際 bounds 數值

#### Scenario: 尺寸標註對應 modular-grid-base

- **Given** workspace 已成功 committed 一個 rows × columns 的 modular-grid-base model
- **When** 使用者查看 3D viewport
- **Then** X 標註必須等於 `columns × 20 mm`
- **And** Y 標註必須等於 `rows × 20 mm`
- **And** Z 標註必須等於 5 mm
- **And** 標註必須包含連接模型邊緣的延伸線、尺寸線與可讀的數值標籤

#### Scenario: 建模期間保留舊 preview

- **Given** 使用者已修改 component 參數，新的 generation 尚未 committed，且上一個 committed model 仍保留在 viewport
- **When** 使用者查看 viewport
- **Then** 尺寸標註必須仍對應畫面上保留的上一個 committed model
- **And** 尺寸標註不得提前顯示尚未 committed 的新輸入
- **And** viewport 必須維持既有 stale 狀態提示

#### Scenario: 沒有可用模型

- **Given** workspace 尚未有 committed model，或目前沒有可供預覽的 mesh
- **When** 使用者查看 viewport
- **Then** viewport 不得顯示尺寸線或尺寸標籤
- **And** viewport 必須顯示既有的無模型或 WebGL fallback 訊息

#### Scenario: 損壞 mesh

- **Given** response 缺少 buffer、index 越界、座標非有限或沒有三角形
- **When** mesh boundary validation 執行
- **Then** 不得把該 mesh 設為成功預覽
- **And** UI 必須顯示 mesh validation error
- **And** 主執行緒必須送出對應 candidate 的 model.discard
- **And** viewport 不得 crash
- **And** viewport 不得為該損壞 mesh 顯示尺寸標註

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

### Requirement: 明確非目標

The system MUST provide the existing box and the new modular-grid-base through the component catalog, but this change MUST NOT add arbitrary CAD file import, STL/3MF/G-code workflows, saving, authentication or collaboration features.

#### Scenario: Prototype 功能清單

- **Given** 使用者查看 Prototype UI 與文件
- **When** 檢查模型與輸出功能
- **Then** 必須提供 component catalog、box、modular-grid-base、各自的 mm/數量參數、3D 預覽與 STEP 下載
- **And** 不得出現 STL、3MF、G-code、arbitrary import、save、auth 或 collaboration 入口

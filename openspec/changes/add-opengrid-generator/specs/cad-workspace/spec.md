## MODIFIED Requirements

### Requirement: Prototype 方塊模型

The system MUST expose a runtime-validated component catalog. Each catalog entry MUST have an independent definition with a stable `modelId`, display metadata, parameter schema and builder boundary. The existing `box`, `modular-grid-base`, `hsw-cell`, and `hexagonal-column` entries MUST remain available, and the new `opengrid` entry MUST be independently validated and built. Each model-specific CAD route MUST bind to exactly one catalog definition: `/cad/box` to `box`, `/cad/modular-grid-base` to `modular-grid-base`, `/cad/hsw-cell` to `hsw-cell`, `/cad/hexagonal-column` to `hexagonal-column`, and `/cad/opengrid` to `opengrid`. The CAD workspace MUST NOT provide a model selector; changing the selected model MUST require navigation back to the homepage and entry through another model-specific route.

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

#### Scenario: `/cad/opengrid` 初始 OpenGrid 建模

- **Given** 使用者開啟 `/cad/opengrid`，且 WebAssembly、Worker 與 WebGL 可用
- **When** Worker 回傳 engine.ready
- **Then** 主執行緒 MUST 以有效保存的 OpenGrid snapshot 送出 generation 1、modelId=opengrid 的 model.generate；若沒有有效保存參數，MUST 使用 OpenGrid definition 的預設參數
- **And** Worker MUST 以 OpenGrid component-local builder 建立 candidate
- **And** candidate MUST carry the normalized variant, grid, screw, custom-position, and connector-hole parameters
- **And** commit 後 viewport、bounds 與可匯出的 model revision MUST 屬於 opengrid

#### Scenario: CAD workspace 鎖定 route model

- **Given** 使用者已進入任一合法的 model-specific CAD route
- **When** 使用者查看模型控制區
- **Then** UI MUST 顯示 route 對應的 component 名稱
- **And** UI MUST 只顯示該 component 定義的參數欄位
- **And** UI MUST NOT 顯示可切換 model id 的選擇器
- **And** UI MUST 提供返回首頁選擇其他模型的入口

#### Scenario: 初始化不重複建模

- **Given** Worker 已回傳 engine.ready，但尚未收到目前 route model 的 generation 1 model.ready
- **When** Svelte lifecycle 或重試流程再次觸發初始化
- **Then** 主執行緒不得重複送出目前 route model 的 generation 1 model.generate
- **And** Worker 不得建立第二個初始 current model

#### Scenario: Component 參數欄位

- **Given** 使用者位於 `/cad/box`、`/cad/modular-grid-base` 或 `/cad/opengrid`
- **When** 使用者查看或修改參數
- **Then** box MUST 提供 width、depth、height 欄位並明示 mm
- **And** modular-grid-base MUST 提供 rows、columns 欄位，並明示合法範圍 1–20 格、每格 20 × 20 mm 及固定高度 5 mm
- **And** OpenGrid MUST provide variant, rows, columns, screw kind, screw mode, an internal-intersection custom screw matrix, and connector-hole controls
- **And** OpenGrid MUST display derived width, depth, and variant thickness in mm
- **And** UI MUST NOT 顯示另一個 component 的參數欄位

### Requirement: 明確非目標

The system MUST provide the existing box, modular-grid-base, hsw-cell, hexagonal-column, and OpenGrid models through the component catalog. This change MUST provide STEP and STL downloads, and MAY preserve validated component parameter preferences in browser-local persistence as defined by the component-parameter-persistence capability, but MUST NOT add arbitrary CAD file import, 3MF/G-code workflows, saving generated CAD files or models, authentication, collaboration, automatic Bambu Studio launching, or native desktop-app integration.

#### Scenario: Prototype 功能清單

- **Given** 使用者查看 Prototype UI 與文件
- **When** 檢查模型與輸出功能
- **Then** 必須提供 component catalog、box、modular-grid-base、hsw-cell、hexagonal-column、OpenGrid、各自的參數、3D 預覽、STEP 下載與 STL 下載
- **And** 可以存在 component 參數的 browser-local persistence
- **And** 不得出現 arbitrary import、3MF、G-code、generated CAD file/model saving、auth、collaboration、自動啟動 Bambu Studio 或 native desktop bridge 入口

### Requirement: 版本化 Worker contract

The main thread and Worker MUST use a runtime-validated discriminated component-generation message contract. All messages MUST contain `version=1`, `kind` and `requestId`; model generation and export operations MUST carry `operationId`; model-generation, candidate, and committed-model messages MUST carry `modelId` and generation where applicable; `model.invalidate` is the explicit exception because it is a generic control message and carries generation, operationId, worker epoch, and reason but no modelId or parameters. Candidate, committed model and export messages MUST carry `workerEpoch` or `modelRevision` as appropriate. The contract MUST validate component-specific parameters against the selected model definition and MUST reject unknown model IDs or mismatched parameter shapes. `model.invalidate` creates no B-Rep but records the generation as the latest input generation.

#### Scenario: 不相容訊息

- **Given** 任一端收到不支援的訊息 version、未知 kind、未知 modelId 或缺少必要欄位
- **When** 訊息被驗證
- **Then** 接收端必須拒絕處理
- **And** UI 必須收到 protocol error
- **And** 不得更新 viewport、model revision 或觸發下載

#### Scenario: OpenGrid model contract

- **Given** Worker 收到 `model.generate` 且 `modelId=opengrid`
- **When** parameters 是完整且結構合法的 OpenGrid snapshot
- **Then** Worker 必須將 request route 到 OpenGrid builder
- **And** Worker MUST validate the variant, grid, screw, custom-position, and connector-hole fields together
- **And** 若 parameters 與 modelId 不匹配，Worker 必須拒絕 request 並回傳可診斷 validation error

#### Scenario: Component-specific contract

- **Given** Worker 收到 `model.generate`
- **When** `modelId=modular-grid-base` 且 parameters 是合法 rows/columns
- **Then** Worker 必須將 request route 到 modular-grid-base builder
- **And** Worker 不得把 rows/columns 當成 box 的 width/depth/height
- **And** 若 parameters 與 modelId 不匹配，Worker 必須拒絕 request 並回傳可診斷 validation error

#### Scenario: Invalidation control contract

- **Given** 主執行緒收到不完整或非法的 OpenGrid draft
- **When** 主執行緒送出 `model.invalidate`
- **Then** command MUST carry `version=1`, `kind`, `requestId`, `operationId`, `generation`, `workerEpoch`, and `reason`
- **AND** command MUST NOT require `modelId` or a parameter snapshot
- **AND** Worker MUST record the generation as latest input without creating a B-Rep

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

## MODIFIED Requirements

### Requirement: Prototype 方塊模型

The system MUST expose a runtime-validated component catalog. Each catalog entry MUST have an independent definition with a stable `modelId`, display metadata, parameter schema and builder boundary. The existing `box` entry and `modular-grid-base` entry MUST remain available. Each model-specific CAD route MUST bind to exactly one catalog definition: `/cad/box` to `box` and `/cad/modular-grid-base` to `modular-grid-base`. The CAD workspace MUST NOT provide a model selector; changing the selected model MUST require navigation back to the homepage and entry through another model-specific route.

#### Scenario: `/cad/box` 初始方塊建模

- **Given** 使用者開啟 `/cad/box`，且使用 Prototype 支援的桌面版 Chrome 或 Firefox，WebAssembly、Worker 與 WebGL 可用
- **When** Worker 回傳 engine.ready
- **Then** 主執行緒 MUST 以預設參數送出 generation 1、modelId=box 的 model.generate
- **And** Worker MUST 回傳 candidate-ready，且不得先修改 current model
- **And** 主執行緒驗證 candidate mesh 後 MUST 送出 model.commit
- **And** Worker MUST 回傳非空 mesh、bounds、generation 與 model revision
- **And** Prototype 驗收 fixture MUST 使用 20 × 30 × 40 mm 方塊，且 X/Y 中心位於世界原點、底面位於 Z=0
- **And** viewport MUST 顯示方塊，UI 進入 ready

#### Scenario: `/cad/modular-grid-base` 初始網格建模

- **Given** 使用者開啟 `/cad/modular-grid-base`，且 WebAssembly、Worker 與 WebGL 可用
- **When** Worker 回傳 engine.ready
- **Then** 主執行緒 MUST 以該 component 的預設 rows 與 columns 送出 generation 1、modelId=modular-grid-base 的 model.generate
- **And** Worker MUST 以 modular-grid-base component-local builder 建立 candidate
- **And** commit 後 viewport、bounds 與可匯出的 model revision MUST 屬於 modular-grid-base

#### Scenario: CAD workspace 鎖定 route model

- **Given** 使用者已進入任一合法的 model-specific CAD route
- **When** 使用者查看模型控制區
- **Then** UI MUST 顯示 route 對應的 component 名稱
- **And** UI MUST 只顯示該 component 定義的參數欄位
- **And** UI MUST NOT 顯示可切換 model id 的選擇器
- **And** UI MUST 提供返回首頁選擇其他模型的入口

#### Scenario: 初始化不重複建模

- **Given** Worker 已回傳 engine.ready，但尚未收到目前 route model 的 generation 1 model.ready
- **When** React lifecycle 或重試流程再次觸發初始化
- **Then** 主執行緒不得重複送出目前 route model 的 generation 1 model.generate
- **And** Worker 不得建立第二個初始 current model

#### Scenario: Component 參數欄位

- **Given** 使用者位於 `/cad/box` 或 `/cad/modular-grid-base`
- **When** 使用者查看或修改參數
- **Then** box MUST 提供 width、depth、height 欄位並明示 mm
- **And** modular-grid-base MUST 提供 rows、columns 欄位，並明示每格 20 × 20 mm 及固定高度 5 mm
- **And** UI MUST NOT 顯示另一個 component 的參數欄位

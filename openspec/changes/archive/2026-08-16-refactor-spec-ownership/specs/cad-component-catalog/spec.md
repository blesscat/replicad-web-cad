## Purpose

This capability owns the runtime-validated catalog registry, route-locking behavior, and baseline parameter validation boundaries. It keeps model identity and baseline control contracts discoverable without mixing them into the shared Worker lifecycle.

## ADDED Requirements

### Requirement: Runtime-validated component catalog and route lock

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




### Requirement: Component-specific parameter validation boundaries

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

## Purpose

本文件定義首頁模型選擇、模型專屬 CAD 路由、模型切換入口與多模型產品文案的可觀察行為，確保首頁不啟動 CAD runtime，並讓使用者能以明確路由進入與切換目前支援的模型。

## Requirements

### Requirement: 首頁模型選擇

The system MUST provide a static homepage model chooser driven by the registered model catalog. Every currently available model MUST have an understandable display name, a concise description, a summary of its adjustable parameters, and a link to its model-specific CAD route. The chooser MUST include `box` and `modular-grid-base`.

#### Scenario: 首頁顯示目前模型

- **WHEN** 使用者開啟首頁
- **THEN** 首頁 MUST 顯示 `box` 與 `modular-grid-base` 的可理解名稱
- **AND** 每個模型 MUST 顯示與其參數及用途相符的簡短說明
- **AND** 首頁 MUST NOT 啟動 CAD Worker 或 Svelte CAD workspace

#### Scenario: 選擇方塊

- **WHEN** 使用者在首頁選擇 `box`
- **THEN** 選擇入口 MUST 導向 `/cad/box`
- **AND** CAD workspace MUST 以 `modelId=box` 初始化

#### Scenario: 選擇模組化網格底板

- **WHEN** 使用者在首頁選擇 `modular-grid-base`
- **THEN** 選擇入口 MUST 導向 `/cad/modular-grid-base`
- **AND** CAD workspace MUST 以 `modelId=modular-grid-base` 初始化

### Requirement: 模型專屬 CAD 路由

The system MUST expose one CAD route for each registered model id. The current routes MUST map `/cad/box` to `box` and `/cad/modular-grid-base` to `modular-grid-base`. The model path segment MUST be the source of truth for the selected component, and a route for an unknown model id MUST NOT initialize a CAD Worker for an unsupported component.

#### Scenario: 直接開啟模型 route

- **GIVEN** 使用者直接開啟 `/cad/modular-grid-base`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入模組化網格底板 workspace
- **AND** 初始 generation MUST 使用該 component 的有效保存 rows 與 columns；若沒有有效保存參數，MUST 使用該 component 的預設 rows 與 columns
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 沒有 model id 的 CAD route

- **WHEN** 使用者開啟 `/cad/`
- **THEN** 系統 MUST 導回 `/`
- **AND** 頁面 MUST 提供可操作的首頁模型選擇流程
- **AND** `/cad/` MUST NOT 啟動 CAD Worker

#### Scenario: 未註冊 model route

- **WHEN** 使用者開啟不屬於 model catalog 的 `/cad/<modelId>`
- **THEN** 系統 MUST 顯示可理解的 not-found 或 route fallback
- **AND** MUST NOT 啟動 CAD Worker
- **AND** MUST NOT 以任一已註冊模型靜默替代該未知 model id

### Requirement: 從 CAD 返回首頁切換模型

The system MUST provide a clear navigation path from every model-specific CAD workspace back to the homepage for model switching. The CAD workspace MUST identify the currently selected model and MUST NOT provide an in-place model selector.

#### Scenario: CAD workspace 鎖定模型

- **GIVEN** 使用者位於 `/cad/box`
- **WHEN** 使用者查看 CAD workspace 控制區
- **THEN** UI MUST 顯示目前正在編輯的 `box`
- **AND** UI MUST 只顯示 box 的 width、depth、height 參數
- **AND** UI MUST NOT 顯示可切換至其他 model id 的 selector

#### Scenario: 返回首頁切換

- **GIVEN** 使用者位於任一模型專屬 CAD route
- **WHEN** 使用者要切換模型
- **THEN** UI MUST 提供導向 `/` 的「返回首頁選擇其他模型」入口
- **AND** 使用者 MUST 能在首頁選擇另一個模型 route

### Requirement: 多模型產品文案

The system MUST describe the product and its entry flow as supporting multiple CAD models or components. Homepage, CAD page, global navigation and documentation copy MUST NOT describe the entire product as only a box.

#### Scenario: 首頁說明反映多模型

- **WHEN** 使用者閱讀首頁標題與說明
- **THEN** 文案 MUST 說明可選擇、調整與匯出 CAD 模型或 component
- **AND** 文案 MUST 不得宣稱產品只提供方塊

#### Scenario: 文件與導覽一致

- **WHEN** 使用者從全域導覽或文件頁尋找 CAD 入口
- **THEN** 入口 MUST 指向首頁模型選擇流程或明確的模型專屬 route
- **AND** 說明 MUST 與目前 catalog 的模型數量及名稱一致

### Requirement: HSW model selection entry

The homepage model chooser MUST include `hsw-cell` as a currently available CAD component with an understandable display name, a description of its adjustable rows/columns honeycomb grid, and a link to `/cad/hsw-cell`. The homepage MUST remain a static chooser and MUST NOT initialize the CAD Worker merely to display the HSW entry.

#### Scenario: Homepage lists HSW cell

- **WHEN** a user opens the homepage
- **THEN** the model chooser MUST display the HSW component
- **AND** its description MUST identify rows/columns and hexagonal honeycomb placement
- **AND** the chooser MUST provide a link to `/cad/hsw-cell`

### Requirement: HSW model-specific route

The registered model catalog MUST resolve `/cad/hsw-cell` to `modelId=hsw-cell`, and direct navigation to that route MUST initialize the HSW workspace with valid saved rows and columns when available, otherwise with its default rows and columns after route resolution.

#### Scenario: Direct HSW navigation

- **WHEN** a user opens `/cad/hsw-cell`
- **THEN** the page MUST load the HSW-specific CAD workspace
- **AND** it MUST NOT silently substitute `box` or `modular-grid-base`
- **AND** the initial generation MUST use valid saved HSW rows and columns when available, otherwise the HSW defaults

## Purpose

本文件定義首頁模型選擇、模型專屬 CAD 路由、模型切換入口與多模型產品文案的可觀察行為，確保首頁不啟動 CAD runtime，並讓使用者能以明確路由進入與切換目前支援的模型。

## Requirements

### Requirement: 首頁模型選擇

The system MUST provide a static model-selection page at `/models` driven by the registered model catalog. Every currently available model MUST have an understandable display name, a concise description, a summary of its adjustable parameters, and a link to its model-specific CAD route. The chooser MUST include `box`, `box-normal`, `modular-grid-base`, `hsw-cell`, `hexagonal-column`, `opengrid`, `opengrid-stackable-box`, and `opengrid-snap`. The root path `/` MUST remain a separate static product homepage and MUST link to `/models` without rendering the model chooser.

#### Scenario: 真正首頁不顯示模型選擇器

- **WHEN** 使用者開啟 `/`
- **THEN** 首頁 MUST 顯示產品介紹與前往模型選擇頁的明確入口
- **AND** 首頁 MUST NOT 顯示模型選擇卡片或初始化 CAD Worker、Svelte CAD workspace
- **AND** 前往模型選擇的入口 MUST 導向 `/models`

#### Scenario: 模型選擇頁顯示目前模型

- **WHEN** 使用者開啟 `/models`
- **THEN** 頁面 MUST 顯示 `box`、`box-normal`、`modular-grid-base`、`hsw-cell`、`hexagonal-column`、`opengrid`、`opengrid-stackable-box` 與 `opengrid-snap` 的可理解名稱
- **AND** 每個模型 MUST 顯示與其參數及用途相符的簡短說明
- **AND** OpenGrid 描述 MUST 說明 Full/Lite/Heavy 板型、28 mm 網格、rows/columns、螺絲孔與 connector-hole 設定
- **AND** `/models` MUST NOT 初始化 CAD Worker 或 Svelte CAD workspace

#### Scenario: 選擇方塊

- **WHEN** 使用者在 `/models` 選擇 `box`
- **THEN** 選擇入口 MUST 導向 `/cad/box`
- **AND** CAD workspace MUST 以 `modelId=box` 初始化

#### Scenario: 選擇 box-normal

- **WHEN** 使用者在 `/models` 選擇 `box-normal`
- **THEN** 選擇入口 MUST 導向 `/cad/box-normal`
- **AND** CAD workspace MUST 以 `modelId=box-normal` 初始化
- **AND** 模型描述 MUST 說明 X/Y 格數、盒體 height 與可選四角六角定位柱

#### Scenario: 選擇模組化網格底板

- **WHEN** 使用者在 `/models` 選擇 `modular-grid-base`
- **THEN** 選擇入口 MUST 導向 `/cad/modular-grid-base`
- **AND** CAD workspace MUST 以 `modelId=modular-grid-base` 初始化

#### Scenario: 選擇 HSW 六角蜂巢

- **WHEN** 使用者在 `/models` 選擇 `hsw-cell`
- **THEN** 選擇入口 MUST 導向 `/cad/hsw-cell`
- **AND** CAD workspace MUST 以 `modelId=hsw-cell` 初始化

#### Scenario: 選擇可調高度六角柱

- **WHEN** 使用者在 `/models` 選擇 `hexagonal-column`
- **THEN** 選擇入口 MUST 導向 `/cad/hexagonal-column`
- **AND** CAD workspace MUST 以 `modelId=hexagonal-column` 初始化
- **AND** 模型描述 MUST 說明整體 height、支數 count、預設 1 mm gap 與預設躺下方向

#### Scenario: 選擇 OpenGrid

- **WHEN** 使用者在 `/models` 選擇 `opengrid`
- **THEN** 選擇入口 MUST 導向 `/cad/opengrid`
- **AND** CAD workspace MUST 以 `modelId=opengrid` 初始化

### Requirement: 模型專屬 CAD 路由

The system MUST expose one CAD route for each registered model id. The current routes MUST map `/cad/box` to `box`, `/cad/box-normal` to `box-normal`, `/cad/modular-grid-base` to `modular-grid-base`, `/cad/hsw-cell` to `hsw-cell`, `/cad/hexagonal-column` to `hexagonal-column`, `/cad/opengrid` to `opengrid`, `/cad/opengrid-stackable-box` to `opengrid-stackable-box`, and `/cad/opengrid-snap` to `opengrid-snap`. The model path segment MUST be the source of truth for the selected component, and a route for an unknown model id MUST NOT initialize a CAD Worker for an unsupported component.

#### Scenario: 直接開啟 box-normal route

- **GIVEN** 使用者直接開啟 `/cad/box-normal`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入 box-normal workspace
- **AND** 初始 generation MUST 使用有效保存的 `x`、`y`、`height` 與 `cornerPosts`；若沒有有效保存參數，MUST 使用 `box-normal` 的預設值
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 直接開啟模組化網格 route

- **GIVEN** 使用者直接開啟 `/cad/modular-grid-base`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入模組化網格底板 workspace
- **AND** 初始 generation MUST 使用該 component 的有效保存 rows 與 columns；若沒有有效保存參數，MUST 使用該 component 的預設 rows 與 columns
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 直接開啟 HSW route

- **GIVEN** 使用者直接開啟 `/cad/hsw-cell`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入 HSW 專屬 CAD workspace
- **AND** 初始 generation MUST 使用有效保存的 HSW rows 與 columns；若沒有有效保存參數，MUST 使用 HSW definition 的預設值
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 直接開啟 OpenGrid route

- **GIVEN** 使用者直接開啟 `/cad/opengrid`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入 OpenGrid 專屬 CAD workspace
- **AND** 初始 generation MUST 使用有效保存的 OpenGrid 參數；若沒有有效保存參數，MUST 使用 OpenGrid definition 的預設值
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 直接開啟 OpenGrid 堆疊盒 route

- **GIVEN** 使用者直接開啟 `/cad/opengrid-stackable-box`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入 OpenGrid 堆疊盒專屬 CAD workspace
- **AND** 初始 generation MUST 使用有效保存的堆疊盒參數；若沒有有效保存參數，MUST 使用堆疊盒 definition 的預設值
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 直接開啟六角柱 route

- **GIVEN** 使用者直接開啟 `/cad/hexagonal-column`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入 hexagonal-column 專屬 CAD workspace
- **AND** 初始 generation MUST 使用 `height=8`、`count=1`、`gap=1` 與 `orientation=lying` 的預設值
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 沒有 model id 的 CAD route

- **WHEN** 使用者開啟 `/cad/`
- **THEN** 系統 MUST 導向 `/models`
- **AND** 頁面 MUST 提供可操作的模型選擇流程
- **AND** `/cad/` MUST NOT 啟動 CAD Worker

#### Scenario: 未註冊 model route

- **WHEN** 使用者開啟不屬於 model catalog 的 `/cad/<modelId>`
- **THEN** 系統 MUST 顯示可理解的 not-found 或 route fallback
- **AND** MUST NOT 啟動 CAD Worker
- **AND** MUST NOT 以任一已註冊模型靜默替代該未知 model id

### Requirement: 從 CAD 返回首頁切換模型

The system MUST provide a clear navigation path from every model-specific CAD workspace back to `/models` for model switching. The CAD workspace MUST identify the currently selected model and MUST NOT provide an in-place model selector.

#### Scenario: CAD workspace 鎖定模型

- **GIVEN** 使用者位於 `/cad/box`
- **WHEN** 使用者查看 CAD workspace 控制區
- **THEN** UI MUST 顯示目前正在編輯的 `box`
- **AND** UI MUST 只顯示 box 的 width、depth、height 參數
- **AND** UI MUST NOT 顯示可切換至其他 model id 的 selector

#### Scenario: 返回模型選擇頁切換

- **GIVEN** 使用者位於任一模型專屬 CAD route
- **WHEN** 使用者要切換模型
- **THEN** UI MUST 提供導向 `/models` 的「返回模型選擇」入口
- **AND** 使用者 MUST 能在 `/models` 選擇另一個模型 route

### Requirement: 多模型產品文案

The system MUST describe the product and its entry flow as supporting multiple CAD models or components. The homepage, model-selection page, CAD page, global navigation and documentation copy MUST NOT describe the entire product as only a box.

#### Scenario: 首頁說明反映多模型

- **WHEN** 使用者閱讀首頁標題與說明
- **THEN** 文案 MUST 說明產品可選擇、調整與匯出 CAD 模型或 component
- **AND** 首頁 MUST 提供前往 `/models` 的清楚入口
- **AND** 文案 MUST 不得宣稱產品只提供方塊

#### Scenario: 文件與導覽一致

- **WHEN** 使用者從全域導覽或文件頁尋找 CAD 入口
- **THEN** 入口 MUST 指向 `/models` 或明確的模型專屬 route
- **AND** 說明 MUST 與目前 catalog 的模型數量、名稱及系列分類一致

### Requirement: HSW model selection entry

The `/models` chooser MUST include `hsw-cell` as a currently available CAD component with an understandable display name, a description of its adjustable rows/columns honeycomb grid, and a link to `/cad/hsw-cell`. The `/models` page MUST remain static and MUST NOT initialize the CAD Worker merely to display the HSW entry.

#### Scenario: Model page lists HSW cell

- **WHEN** a user opens the homepage
- **THEN** the model chooser MUST display the HSW component in the HSW series
- **AND** its description MUST identify rows/columns and hexagonal honeycomb placement
- **AND** the chooser MUST provide a link to `/cad/hsw-cell`

### Requirement: HSW model-specific route

The registered model catalog MUST resolve `/cad/hsw-cell` to `modelId=hsw-cell`, and direct navigation to that route MUST initialize the HSW workspace with valid saved rows and columns when available, otherwise with its default rows and columns after route resolution.

#### Scenario: Direct HSW navigation

- **WHEN** a user opens `/cad/hsw-cell`
- **THEN** the page MUST load the HSW-specific CAD workspace
- **AND** it MUST NOT silently substitute `box` or `modular-grid-base`
- **AND** the initial generation MUST use valid saved HSW rows and columns when available, otherwise the HSW defaults

### Requirement: 模型系列分類

The model-selection page MUST render the registered catalog entries in the three user-facing series `HSW 系列`, `OpenGrid 系列`, and `其他模型`. Each registered model definition MUST declare exactly one series key, and the page MUST derive membership, labels, ordering within a series, and model links from catalog metadata rather than a second hardcoded model-id list.

#### Scenario: Catalog entries appear in one series

- **WHEN** a user opens `/models`
- **THEN** every registered model MUST appear exactly once in one of the three series
- **AND** `hsw-cell` MUST appear in `HSW 系列`
- **AND** `opengrid` MUST appear in `OpenGrid 系列`
- **AND** `opengrid-stackable-box` MUST appear in `OpenGrid 系列`
- **AND** `opengrid-snap` MUST appear in `OpenGrid 系列`
- **AND** `box`、`box-normal`、`modular-grid-base` 與 `hexagonal-column` MUST appear in `其他模型`

#### Scenario: Series page remains a static chooser

- **WHEN** a user views any series on `/models`
- **THEN** each model entry MUST expose its display metadata, parameter summary, and model-specific route link
- **AND** the series layout MUST NOT instantiate a CAD Worker or CAD workspace

## ADDED Requirements

### Requirement: OpenGrid Snap model selection entry

The registered model catalog and `/models` chooser MUST include `opengrid-snap` as an independent CAD component. The chooser MUST display an understandable OpenGrid Snap name, describe the Full/Lite variants and one shared total X/Y outer-envelope offset, and link to `/cad/opengrid-snap` without starting the CAD Worker.

#### Scenario: Model selection page lists OpenGrid Snap

- **WHEN** a user opens `/models`
- **THEN** the model chooser MUST display an OpenGrid Snap entry
- **AND** its description MUST identify Full/Lite variants and outer width/depth fine-tuning
- **AND** the chooser MUST provide a link to `/cad/opengrid-snap`
- **AND** `/models` MUST remain static without initializing the CAD Worker

### Requirement: OpenGrid Snap model-specific route

The model catalog MUST resolve `/cad/opengrid-snap` to `modelId=opengrid-snap`. Direct navigation to the route MUST load the Snap-specific workspace and MUST NOT silently substitute the existing `opengrid` board model or any other component.

#### Scenario: Direct OpenGrid Snap navigation

- **WHEN** a user opens `/cad/opengrid-snap`
- **THEN** the page MUST load the OpenGrid Snap workspace
- **AND** initial generation MUST use the valid saved Snap snapshot or the Snap defaults
- **AND** the route MUST not initialize the existing OpenGrid board definition instead

### Requirement: OpenGrid stackable-box model selection entry

The static `/models` chooser MUST include `opengrid-stackable-box` exactly once in `OpenGrid 系列`. Its entry MUST provide an understandable display name, a concise description of 28 mm and half-cell sizing, same-part stacking, continuous sliding guides, and four-corner Ø5 mm Snap mounting sockets, and a link to `/cad/opengrid-stackable-box`. The chooser MUST remain static and MUST NOT initialize the CAD Worker to display this entry.

#### Scenario: Model page lists the stackable box

- **WHEN** a user opens `/models`
- **THEN** the OpenGrid series MUST show the stackable-box entry
- **AND** its description MUST distinguish it from the official OpenGrid board generator
- **AND** the entry MUST link to `/cad/opengrid-stackable-box`

#### Scenario: Select the stackable box

- **WHEN** a user selects the OpenGrid stackable-box entry
- **THEN** navigation MUST go to `/cad/opengrid-stackable-box`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-stackable-box`

#### Scenario: Static selection page

- **WHEN** the model chooser renders the stackable-box entry
- **THEN** the page MUST use catalog metadata to render it
- **AND** it MUST NOT instantiate a CAD Worker or Svelte CAD workspace merely to display the model

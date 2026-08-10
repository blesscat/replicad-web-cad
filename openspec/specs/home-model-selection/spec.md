## Purpose

本文件定義首頁模型選擇、模型專屬 CAD 路由、模型切換入口與多模型產品文案的可觀察行為，確保首頁不啟動 CAD runtime，並讓使用者能以明確路由進入與切換目前支援的模型。

## Requirements

### Requirement: 首頁模型選擇

The system MUST provide a static model-selection page at `/models` driven by the registered model catalog. Every model rendered in the chooser MUST have an understandable display name, a catalog-provided static preview image, and a link to its model-specific CAD route. The chooser content MUST NOT render introductory copy, family descriptions, model descriptions, or adjustable-parameter summaries. The chooser MUST display the OpenGrid series before the HSW series, including `opengrid`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-snap`, `opengrid-snap-remover`, and `hsw-cell`. Registered models outside these visible series MAY remain available through direct CAD routes but MUST NOT be rendered as chooser entries. The root path `/` MUST remain a separate static product homepage and MUST link to `/models` without rendering the model chooser.

#### Scenario: 真正首頁不顯示模型選擇器

- **WHEN** 使用者開啟 `/`
- **THEN** 首頁 MUST 顯示產品介紹與前往模型選擇頁的明確入口
- **AND** 首頁 MUST NOT 顯示模型選擇卡片或初始化 CAD Worker、Svelte CAD workspace
- **AND** 前往模型選擇的入口 MUST 導向 `/models`

#### Scenario: 模型選擇頁顯示目前模型與預覽

- **WHEN** 使用者開啟 `/models`
- **THEN** 頁面 MUST 依序顯示 OpenGrid 系列與 HSW 系列的可理解模型名稱
- **AND** OpenGrid 系列 MUST 顯示 `opengrid`、`opengrid-pillar`、`opengrid-divider`、`opengrid-stackable-box`、`opengrid-stackable-cylinder`、`opengrid-snap` 與 `opengrid-snap-remover`
- **AND** HSW 系列 MUST 顯示 `hsw-cell`
- **AND** 每個可見模型 MUST 顯示其 catalog-provided static preview image、可理解模型名稱與 `編輯 →` 入口
- **AND** 每個 preview image MUST expose alternative text that identifies the model it represents
- **AND** `box`、`box-normal`、`modular-grid-base` 與 `hexagonal-column` MUST NOT appear as chooser entries
- **AND** `/models` MUST NOT 顯示模型用途說明、可調整參數摘要、系列說明或選擇頁導言
- **AND** `/models` MUST NOT 初始化 CAD Worker、WebAssembly CAD kernel、WebGL renderer 或 Svelte CAD workspace

#### Scenario: 預覽圖片無法載入時仍可選擇模型

- **GIVEN** 可見模型的 preview image 無法載入
- **WHEN** 使用者開啟 `/models`
- **THEN** 該卡片 MUST 顯示可理解的預覽 placeholder 或 fallback
- **AND** 該卡片 MUST 仍顯示模型名稱與 `編輯 →` 入口
- **AND** fallback MUST NOT prevent navigation to the model-specific CAD route

#### Scenario: 選擇 HSW 六角蜂巢

- **WHEN** 使用者在 `/models` 選擇 `hsw-cell`
- **THEN** 選擇入口 MUST 導向 `/cad/hsw-cell`
- **AND** CAD workspace MUST 以 `modelId=hsw-cell` 初始化

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

The system MUST provide a clear navigation path from every model-specific CAD workspace back to `/models` for model switching. The CAD workspace MUST identify the currently selected model and MUST NOT provide an in-place model selector. The chooser switch target is the currently visible OpenGrid or HSW model set; models hidden from the chooser remain directly routable.

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
- **AND** 使用者 MUST 能在 `/models` 選擇另一個可見模型 route

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

The `/models` chooser MUST include `hsw-cell` as a currently available CAD component with an understandable display name and a link to `/cad/hsw-cell`. The `/models` page MUST remain static and MUST NOT initialize the CAD Worker merely to display the HSW entry.

#### Scenario: Model page lists HSW cell

- **WHEN** a user opens the homepage
- **THEN** the model chooser MUST display the HSW component in the HSW series
- **AND** the chooser MUST provide a link to `/cad/hsw-cell`

### Requirement: HSW model-specific route

The registered model catalog MUST resolve `/cad/hsw-cell` to `modelId=hsw-cell`, and direct navigation to that route MUST initialize the HSW workspace with valid saved rows and columns when available, otherwise with its default rows and columns after route resolution.

#### Scenario: Direct HSW navigation

- **WHEN** a user opens `/cad/hsw-cell`
- **THEN** the page MUST load the HSW-specific CAD workspace
- **AND** it MUST NOT silently substitute `box` or `modular-grid-base`
- **AND** the initial generation MUST use valid saved HSW rows and columns when available, otherwise the HSW defaults

### Requirement: 模型系列分類

The model-selection page MUST render the registered catalog entries in the two visible user-facing series `OpenGrid 系列` and `HSW 系列`, in that order. Each registered model definition MUST declare exactly one series key, and the page MUST derive membership, labels, ordering within a series, and model links from catalog metadata rather than a second hardcoded model-id list. Models in other registered series MUST remain routable but MUST NOT be rendered by the chooser.

#### Scenario: Catalog entries appear in one series

- **WHEN** a user opens `/models`
- **THEN** every model in the visible chooser families MUST appear exactly once in one of the two visible series
- **AND** `opengrid` MUST appear in `OpenGrid 系列`
- **AND** `opengrid-pillar` MUST appear in `OpenGrid 系列`
- **AND** `opengrid-divider` MUST appear in `OpenGrid 系列`
- **AND** `opengrid-stackable-box` MUST appear in `OpenGrid 系列`
- **AND** `opengrid-stackable-cylinder` MUST appear in `OpenGrid 系列`
- **AND** `opengrid-snap` MUST appear in `OpenGrid 系列`
- **AND** `opengrid-snap-remover` MUST appear in `OpenGrid 系列`
- **AND** `hsw-cell` MUST appear in `HSW 系列`
- **AND** `box`、`box-normal`、`modular-grid-base` 與 `hexagonal-column` MUST NOT appear in the chooser

#### Scenario: Series page remains a static chooser

- **WHEN** a user views any series on `/models`
- **THEN** each model entry MUST expose its display name and model-specific route link
- **AND** the chooser MUST NOT render family descriptions, model descriptions, or parameter summaries
- **AND** the series layout MUST NOT instantiate a CAD Worker or CAD workspace

### Requirement: OpenGrid Snap model selection entry

The registered model catalog and `/models` chooser MUST include `opengrid-snap` as an independent CAD component. The chooser MUST display an understandable OpenGrid Snap name and link to `/cad/opengrid-snap` without starting the CAD Worker.

#### Scenario: Model selection page lists OpenGrid Snap

- **WHEN** a user opens `/models`
- **THEN** the model chooser MUST display an OpenGrid Snap entry
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

The static `/models` chooser MUST include `opengrid-stackable-box` exactly once in `OpenGrid 系列`. Its entry MUST provide an understandable display name and a link to `/cad/opengrid-stackable-box`. The chooser MUST remain static and MUST NOT initialize the CAD Worker to display this entry.

#### Scenario: Model page lists the stackable box

- **WHEN** a user opens `/models`
- **THEN** the OpenGrid series MUST show the stackable-box entry
- **AND** the entry MUST link to `/cad/opengrid-stackable-box`

#### Scenario: Select the stackable box

- **WHEN** a user selects the OpenGrid stackable-box entry
- **THEN** navigation MUST go to `/cad/opengrid-stackable-box`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-stackable-box`

#### Scenario: Static selection page

- **WHEN** the model chooser renders the stackable-box entry
- **THEN** the page MUST use catalog metadata to render it
- **AND** it MUST NOT instantiate a CAD Worker or Svelte CAD workspace merely to display the model

### Requirement: OpenGrid 分隔器模型選擇入口

The static `/models` chooser MUST include `opengrid-divider` as an independent OpenGrid-series model with an understandable display name. Its entry MUST link to `/cad/opengrid-divider` without initializing the CAD Worker on the chooser page.

#### Scenario: 選擇 OpenGrid 分隔器

- **WHEN** a user opens `/models` and selects the OpenGrid divider entry
- **THEN** the entry MUST navigate to `/cad/opengrid-divider`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-divider`

### Requirement: OpenGrid pillar model selection entry and route

The static `/models` chooser MUST include `opengrid-pillar` as an independent entry in `OpenGrid 系列`, with an `OpenGrid `-prefixed display name. The entry MUST link to `/cad/opengrid-pillar` without initializing the CAD Worker. The model catalog MUST resolve `/cad/opengrid-pillar` to `modelId=opengrid-pillar`, and direct navigation MUST use valid saved pillar parameters or the pillar defaults.

#### Scenario: Model page lists pillar

- **WHEN** a user opens `/models`
- **THEN** the chooser MUST display the OpenGrid pillar entry in `OpenGrid 系列`
- **AND** the entry MUST provide a link to `/cad/opengrid-pillar`
- **AND** the chooser MUST remain static without initializing the CAD Worker

#### Scenario: Select pillar

- **WHEN** a user selects the pillar entry
- **THEN** navigation MUST go to `/cad/opengrid-pillar`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-pillar`

#### Scenario: Direct pillar navigation

- **WHEN** a user opens `/cad/opengrid-pillar` directly
- **THEN** the page MUST load the OpenGrid pillar-specific CAD workspace
- **AND** initial generation MUST use the valid saved pillar snapshot when available, otherwise `{ length: 5, baseConnection: false }`
- **AND** the route MUST NOT silently substitute another component

### Requirement: OpenGrid board selection entry

The static /models chooser MUST keep the existing opengrid entry in the
OpenGrid series. Its display name MUST be understandable. The entry MUST link
to /cad/opengrid without initializing the CAD Worker.

#### Scenario: Select the official OpenGrid board

- **WHEN** a user selects opengrid from /models
- **THEN** navigation MUST go to /cad/opengrid
- **AND** the CAD workspace MUST initialize with modelId=opengrid

### Requirement: OpenGrid board direct route

Direct navigation to /cad/opengrid MUST resolve to the existing official
OpenGrid board definition and MUST NOT silently substitute another component.
Initial generation MUST use the valid persisted OpenGrid snapshot or the
current component defaults.

#### Scenario: Open the OpenGrid board route directly

- **WHEN** a user opens /cad/opengrid directly
- **THEN** the page MUST load the OpenGrid board workspace
- **AND** the route MUST not initialize the Snap, stackable-box, divider,
  pillar, or another model definition
### Requirement: OpenGrid stackable-cylinder model selection

The model chooser MUST list `opengrid-stackable-cylinder` in the OpenGrid family using a user-facing display name beginning with `OpenGrid `. The entry MUST link to `/cad/opengrid-stackable-cylinder` and the chooser MUST remain static without starting the CAD Worker.

#### Scenario: Cylinder appears in the OpenGrid chooser

- **WHEN** a user opens `/models`
- **THEN** the OpenGrid family MUST include the stackable-cylinder entry
- **AND** the entry MUST use the stable `opengrid-stackable-cylinder` route

#### Scenario: Selecting the cylinder opens its route

- **WHEN** a user selects the OpenGrid stackable-cylinder entry
- **THEN** navigation MUST go to `/cad/opengrid-stackable-cylinder`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-stackable-cylinder`

#### Scenario: Static chooser rendering

- **WHEN** the model chooser displays the cylinder entry
- **THEN** it MUST render from catalog metadata
- **AND** it MUST NOT instantiate the CAD Worker or a CAD viewport merely to display the entry

## ADDED Requirements

### Requirement: 系列相對模型選擇名稱

The `/models` chooser MUST use a selection-only label for each visible model card so that a family prefix already represented by the series heading is not repeated. The series headings MUST remain `OpenGrid 系列` and `HSW 系列`. The current visible card labels MUST be:

- OpenGrid: `底板`、`Snap`、`圓柱支柱`、`分隔塊`、`堆疊盒`、`可堆疊圓柱`、`Snap Remover`
- HSW: `六角蜂巢`

The corresponding edit links MUST use the same selection-only label in their accessible names. Full model names, including the `OpenGrid` or `HSW` prefix where currently present, MUST remain unchanged anywhere outside the `/models` chooser.

#### Scenario: 模型選擇頁使用系列相對名稱

- **WHEN** 使用者開啟 `/models`
- **THEN** OpenGrid 系列的卡片標題 MUST 依序顯示 `底板`、`Snap`、`圓柱支柱`、`分隔塊`、`堆疊盒`、`可堆疊圓柱`、`Snap Remover`
- **AND** HSW 系列的卡片標題 MUST 顯示 `六角蜂巢`
- **AND** 編輯入口的 accessible name MUST 分別使用 `編輯 底板`、`編輯 Snap`、`編輯 圓柱支柱`、`編輯 分隔塊`、`編輯 堆疊盒`、`編輯 可堆疊圓柱`、`編輯 Snap Remover` 與 `編輯 六角蜂巢`
- **AND** 系列標題 MUST 仍顯示 `OpenGrid 系列` 與 `HSW 系列`

#### Scenario: 其他頁面維持完整模型名稱

- **WHEN** 使用者離開 `/models` 並查看目前模型的 CAD workspace 或其他既有模型識別文案
- **THEN** 系統 MUST 維持該模型原本的完整名稱，例如 `OpenGrid 底板`、`OpenGrid Snap` 與 `HSW 六角蜂巢`

### Requirement: OpenGrid Snap 選擇入口順序

The `/models` chooser MUST render the OpenGrid entries in this order: `opengrid`, `opengrid-snap`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, and `opengrid-snap-remover`. The Snap card MUST immediately follow the bottom-plate card in the rendered OpenGrid sequence; when the existing desktop two-column layout is used, the two cards MUST appear next to each other. Every entry MUST retain its existing model-specific route.

#### Scenario: Snap 與底板相鄰

- **WHEN** 使用者以支援雙欄版面的視窗開啟 `/models`
- **THEN** OpenGrid 系列的第一張卡片 MUST 是 `底板`
- **AND** OpenGrid 系列的第二張卡片 MUST 是 `Snap`
- **AND** `底板` 的入口 MUST 導向 `/cad/opengrid`
- **AND** `Snap` 的入口 MUST 導向 `/cad/opengrid-snap`

#### Scenario: 其他 OpenGrid 入口仍保留

- **WHEN** 使用者開啟 `/models`
- **THEN** OpenGrid 系列 MUST 仍包含 `opengrid-pillar`、`opengrid-divider`、`opengrid-stackable-box`、`opengrid-stackable-cylinder` 與 `opengrid-snap-remover`
- **AND** 這些入口的既有 model ID 與 `/cad/<modelId>` 路由 MUST 維持不變

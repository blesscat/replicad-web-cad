## Purpose

本文件定義首頁模型選擇、模型專屬 CAD 路由、模型切換入口與多模型產品文案的可觀察行為，確保首頁不啟動 CAD runtime，並讓使用者能以明確路由進入與切換目前支援的模型。
## Requirements
### Requirement: 首頁模型選擇

The system MUST provide a static model-selection page at `/models` driven by the registered model catalog. Every model rendered in the chooser MUST have an understandable display name, a catalog-provided static preview image, a concise visible capability summary, and a link to its model-specific CAD route. Configurable components MUST describe their main adjustable settings in localized visible text; fixed components MUST be clearly identified as fixed. The chooser MUST NOT use a generic schema field count as the sole source of truth for custom or conditional parameter presentations, and MUST NOT invent a raw numeric count for such presentations. Detailed parameter names, ranges, constraints, units, and export formats MUST remain available in server-rendered HTML through an accessible out-of-flow details presentation. The chooser MUST display the OpenGrid series before the HSW series, including `opengrid`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-snap`, `opengrid-snap-remover`, `opengrid-open-shelf`, and `hsw-cell`. Registered models outside these visible series MAY remain available through direct CAD routes but MUST NOT be rendered as chooser entries. The root path `/` MUST remain a separate static product homepage and MUST link to `/models` without rendering the model chooser. The `/models` page MUST expose a page-level selection heading without requiring an additional outer visual panel around the entire chooser. The OpenGrid and HSW series MUST remain visually distinguishable by series headings, and the OpenGrid Desk/Wall subgroups MUST remain distinguishable by subgroup headings, spacing, or separators without requiring redundant family badges or nested bordered panels. Model cards MUST use an adaptive layout that uses more than two columns when a wide viewport has enough room and collapses to one column on a narrow viewport.

#### Scenario: 真正首頁不顯示模型選擇器

- **WHEN** 使用者開啟 `/`
- **THEN** 首頁 MUST 顯示產品介紹與前往模型選擇頁的明確入口
- **AND** 首頁 MUST NOT 顯示模型選擇卡片或初始化 CAD Worker、Svelte CAD workspace
- **AND** 前往模型選擇的入口 MUST 導向 `/models`

#### Scenario: 模型選擇頁顯示目前模型與預覽

- **WHEN** 使用者開啟 `/models`
- **THEN** 頁面 MUST 依序顯示 OpenGrid 系列與 HSW 系列的可理解模型名稱
- **AND** OpenGrid 系列 MUST 顯示 `opengrid`、`opengrid-pillar`、`opengrid-divider`、`opengrid-stackable-box`、`opengrid-stackable-cylinder`、`opengrid-snap`、`opengrid-snap-remover` 與 `opengrid-open-shelf`
- **AND** HSW 系列 MUST 顯示 `hsw-cell`
- **AND** 每個可見模型 MUST 顯示其 catalog-provided static preview image、可理解模型名稱與 `編輯 →` 入口
- **AND** 每個 preview image MUST expose alternative text that identifies the model it represents
- **AND** `box`、`box-normal`、`modular-grid-base` 與 `hexagonal-column` MUST NOT appear as chooser entries
- **AND** `/models` MUST NOT 初始化 CAD Worker、WebAssembly CAD kernel、WebGL renderer 或 Svelte CAD workspace
- **AND** 頁面 MUST 顯示選擇模型的頁面標題，而不以整個 chooser 的外框 panel 包住內容
- **AND** OpenGrid 系列與 HSW 系列 MUST 以系列標題區分，OpenGrid 的 `Desk System` 與 `Wall Related` MUST 以 subgroup 標題、間距或分隔線區分
- **AND** 模型卡片 MUST 使用可依可用寬度調整欄數的排列；寬版視窗在有足夠模型時 MUST 能顯示三欄以上，窄版視窗 MUST 收合為單欄

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

The system MUST expose one CAD route for each currently registered model ID.
The active routes MUST include the existing `box`, `modular-grid-base`,
`hsw-cell`, `hexagonal-column`, `opengrid`, `opengrid-stackable-box`,
`opengrid-stackable-cylinder`, `opengrid-snap`, and other current catalog
entries, but MUST NOT include `box-normal`. The model path segment MUST remain
the source of truth for the selected component, and a route for an unknown or
removed model ID MUST NOT initialize a CAD Worker for an unsupported component.

#### Scenario: Direct OpenGrid stackable-box navigation

- **WHEN** a user opens `/cad/opengrid-stackable-box`
- **THEN** the page MUST load the OpenGrid stackable-box workspace
- **AND** initial generation MUST use valid saved parameters or the current
  definition defaults
- **AND** the route MUST not initialize another model definition

#### Scenario: Direct OpenGrid stackable-cylinder navigation

- **WHEN** a user opens `/cad/opengrid-stackable-cylinder`
- **THEN** the page MUST load the OpenGrid stackable-cylinder workspace
- **AND** initial generation MUST use valid saved parameters or the current
  definition defaults
- **AND** the route MUST not initialize another model definition

#### Scenario: Direct navigation for remaining registered models

- **WHEN** a user opens a direct route for any remaining registered model
- **THEN** the page MUST load that model's dedicated workspace
- **AND** initial generation MUST use that model's valid saved parameters or
  definition defaults
- **AND** the page MUST NOT require selecting the model again in the workspace

#### Scenario: No model id route

- **WHEN** a user opens `/cad/`
- **THEN** the system MUST redirect to `/models`
- **AND** `/cad/` MUST NOT start the CAD Worker

#### Scenario: Unknown or removed model route

- **WHEN** a user opens `/cad/box-normal` or another path not in the current
  model catalog
- **THEN** the system MUST show a diagnosable not-found or route fallback
- **AND** MUST NOT start a CAD Worker for that unsupported model ID
- **AND** MUST NOT silently substitute another registered model

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

The model-selection page MUST render the registered catalog entries in the two visible user-facing series `OpenGrid 系列` and `HSW 系列`, in that order. Each registered model definition MUST declare exactly one series key, and the page MUST derive membership, labels, ordering within a series, model links, and capability summaries from catalog metadata rather than a second hardcoded model-id list. Models in other registered series MUST remain routable but MUST NOT be rendered by the chooser.

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
- **AND** `opengrid-open-shelf` MUST appear in `OpenGrid 系列`
- **AND** `hsw-cell` MUST appear in `HSW 系列`
- **AND** `box`、`box-normal`、`modular-grid-base` 與 `hexagonal-column` MUST NOT appear in the chooser

#### Scenario: Series page remains a static chooser

- **WHEN** a user views any series on `/models`
- **THEN** each model entry MUST expose its display name, localized capability summary, and model-specific route link
- **AND** detailed capability and parameter content MUST remain available in server-rendered HTML without requiring a CAD Worker or CAD workspace
- **AND** the series layout MUST NOT instantiate a CAD Worker or CAD workspace

### Requirement: 模型卡片參數詳情不改變排列

The model chooser MUST provide full parameter details through an out-of-flow accessible presentation for every visible model card that has additional details. Opening or closing the presentation MUST NOT change the card's height, the grid row height, or the position or stretch state of neighboring cards. The presentation MUST provide a clear close action, support Escape dismissal and focus return, keep long content scrollable, and remain usable on narrow viewports.

#### Scenario: 開啟參數詳情不推動其他卡片

- **WHEN** 使用者在任一模型卡片開啟完整參數
- **THEN** 詳情 MUST appear outside the card/grid layout flow
- **AND** the card and neighboring cards MUST retain their pre-opened dimensions and positions

#### Scenario: 使用者可以關閉參數詳情

- **WHEN** 參數詳情 presentation is open
- **THEN** 使用者 MUST be able to close it with a visible close control or Escape
- **AND** focus MUST return to the control that opened it

#### Scenario: 狹窄視窗仍可閱讀完整參數

- **WHEN** 使用者在 narrow viewport 開啟參數詳情
- **THEN** presentation MUST fit within the viewport without horizontal overflow
- **AND** long parameter content MUST scroll within the presentation

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

The static `/models` chooser MUST include `opengrid-pillar` as an independent
entry in `OpenGrid 系列`, with the catalog selection label
`Locating Post (定位柱)`. The entry MUST link to `/cad/opengrid-pillar` without
initializing the CAD Worker. The model catalog MUST resolve
`/cad/opengrid-pillar` to `modelId=opengrid-pillar`, and direct navigation MUST
use a valid saved mode snapshot or the pillar's locking-corner-seat default.
The pillar's mode-specific interface MUST expose `鎖定角座` before
`物件定位用`.

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
- **AND** initial generation MUST use the valid saved pillar snapshot when
  available, otherwise `{ mode: 'detachable-corner-seat' }`
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

The model chooser MUST list `opengrid-stackable-cylinder` in the OpenGrid family using the catalog selection label `Round Box (圓盒)`. The entry MUST link to `/cad/opengrid-stackable-cylinder` and the chooser MUST remain static without starting the CAD Worker.

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

### Requirement: 系列相對模型選擇名稱

The `/models` chooser MUST use a selection-only label for each visible model card so that a family prefix already represented by the series heading is not repeated. The series headings MUST remain `OpenGrid 系列` and `HSW 系列`. The current visible card labels MUST be:

- OpenGrid: `Board (底版)`、`Snap (咔咔)`、`Locating Post (定位柱)`、`divider (分隔牆)`、`Grid Box (方盒)`、`Round Box (圓盒)`、`Snap Remover`、`Open Shelf (斜開格櫃)`
- HSW: `六角蜂巢`

The corresponding edit links MUST use the same catalog selection label in their accessible names. Outside the `/models` chooser, the current catalog display names MUST remain `opengrid board (底版)`, `Snap (咔咔)`, `Locating Post (定位柱)`, `divider (分隔牆)`, `Grid Box (方盒)`, `Round Box (圓盒)`, `Snap Remover`, and `六角蜂巢` respectively.

#### Scenario: 模型選擇頁使用系列相對名稱

- **WHEN** 使用者開啟 `/models`
- **THEN** OpenGrid 系列的卡片標題 MUST 依序顯示 `Board (底版)`、`Snap (咔咔)`、`Locating Post (定位柱)`、`divider (分隔牆)`、`Grid Box (方盒)`、`Round Box (圓盒)`、`Snap Remover`、`Open Shelf (斜開格櫃)`
- **AND** HSW 系列的卡片標題 MUST 顯示 `六角蜂巢`
- **AND** 編輯入口的 accessible name MUST 分別使用 `編輯 Board (底版)`、`編輯 Snap (咔咔)`、`編輯 Locating Post (定位柱)`、`編輯 divider (分隔牆)`、`編輯 Grid Box (方盒)`、`編輯 Round Box (圓盒)`、`編輯 Snap Remover`、`編輯 Open Shelf (斜開格櫃)` 與 `編輯 六角蜂巢`
- **AND** 系列標題 MUST 仍顯示 `OpenGrid 系列` 與 `HSW 系列`

#### Scenario: 其他頁面維持完整模型名稱

- **WHEN** 使用者離開 `/models` 並查看目前模型的 CAD workspace 或其他既有模型識別文案
- **THEN** 系統 MUST 維持目前 catalog display name，例如 `opengrid board (底版)`、`Snap (咔咔)`、`Locating Post (定位柱)`、`divider (分隔牆)`、`Grid Box (方盒)`、`Round Box (圓盒)`、`OpenGrid Open Shelf (斜開格櫃)` 與 `六角蜂巢`

### Requirement: OpenGrid Snap 選擇入口順序

The `/models` chooser MUST render the OpenGrid entries in this order: `opengrid`, `opengrid-snap`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-snap-remover`, and `opengrid-open-shelf`. The responsive card grid MUST preserve this rendered order. When the viewport has room for at least two card columns, the first two cards MUST appear next to each other; on a narrow one-column viewport they MUST remain in the same order vertically. Every entry MUST retain its existing model-specific route.

#### Scenario: Snap 與底板在寬版相鄰

- **WHEN** 使用者以支援至少雙欄卡片排列的視窗開啟 `/models`
- **THEN** OpenGrid 系列的第一張卡片 MUST 是 `Board (底版)`
- **AND** OpenGrid 系列的第二張卡片 MUST 是 `Snap (咔咔)`
- **AND** `Board (底版)` 的入口 MUST 導向 `/cad/opengrid`
- **AND** `Snap (咔咔)` 的入口 MUST 導向 `/cad/opengrid-snap`

#### Scenario: 其他 OpenGrid 入口仍保留

- **WHEN** 使用者開啟 `/models`
- **THEN** OpenGrid 系列 MUST 仍包含 `opengrid-pillar`、`opengrid-divider`、`opengrid-stackable-box`、`opengrid-stackable-cylinder`、`opengrid-snap-remover` 與 `opengrid-open-shelf`
- **AND** 這些入口的既有 model ID 與 `/cad/<modelId>` 路由 MUST 維持不變

### Requirement: OpenGrid system entry subgroups

The static `/models` chooser MUST split the visible OpenGrid catalog entries into `Desk System` and `Wall Related` subgroups. The Desk subgroup MUST contain `opengrid`, `opengrid-snap`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-snap-remover`, and `opengrid-open-shelf`; the Wall subgroup MUST contain only `opengrid` and `opengrid-snap`. Each entry MUST retain its understandable selection label and model-specific route, and the HSW series MUST remain after the OpenGrid subgroups.

#### Scenario: Desk and Wall groups are visible

- **WHEN** a user opens `/models`
- **THEN** the page MUST show `Desk System` and `Wall Related` under the OpenGrid series
- **AND** the Desk subgroup MUST show every visible OpenGrid model
- **AND** the Wall subgroup MUST show only the bottom plate and Snap
- **AND** the HSW series MUST remain available as a separate context-free group

### Requirement: Open Shelf is a Desk-only model-selection entry

The static `/models` chooser MUST include `opengrid-open-shelf` exactly once under the OpenGrid `Desk System` subgroup. Its selection label MUST be `Open Shelf (斜開格櫃)`, its user-facing display name MUST begin with `OpenGrid `, and its link MUST be `/cad/opengrid-open-shelf?system=desk`. It MUST not appear in `Wall Related`.

#### Scenario: Desk chooser lists Open Shelf

- **WHEN** a user opens `/models`
- **THEN** the Desk System subgroup MUST show `Open Shelf (斜開格櫃)` with a static preview and an edit link
- **AND** the chooser MUST remain static without initializing the CAD Worker

#### Scenario: Selecting Open Shelf opens its route

- **WHEN** a user selects the Open Shelf card
- **THEN** navigation MUST go to `/cad/opengrid-open-shelf?system=desk`
- **AND** the CAD workspace MUST initialize with `modelId=opengrid-open-shelf`

#### Scenario: Open Shelf is absent from Wall Related

- **WHEN** the model chooser renders the Wall Related subgroup
- **THEN** `opengrid-open-shelf` MUST not be rendered there

### Requirement: System-aware chooser links

The OpenGrid entries rendered from a system subgroup MUST link to the same `/cad/<modelId>` route with `system=desk` or `system=wall` as appropriate. The chooser MUST remain static and MUST NOT initialize CAD generation to render either subgroup or its preview images.

#### Scenario: Selecting a Wall Snap entry

- **WHEN** a user activates the Snap card under `Wall Related`
- **THEN** navigation MUST go to `/cad/opengrid-snap?system=wall`
- **AND** the target page MUST initialize the existing `opengrid-snap` model with the Wall context

### Requirement: Active model chooser excludes removed box-normal

The static `/models` chooser and its catalog-derived route metadata MUST NOT
advertise `box-normal`. Existing OpenGrid entries, including Grid Box and Round
Box, MUST remain available with their existing model IDs and routes.

#### Scenario: Models page retains supported OpenGrid entries

- **WHEN** a user opens `/models`
- **THEN** the chooser MUST continue to show `opengrid-stackable-box` and
  `opengrid-stackable-cylinder`
- **AND** neither the chooser nor its links MUST contain an active
  `box-normal` entry

### Requirement: Use-case-led promotional homepage

The localized product homepage MUST present the current OpenGrid Desk System as
the primary use case. It MUST explain the observable journey from configurable
CAD components to an inspected 3D preview and downloadable STEP or STL output,
and it MUST provide a clear primary entry into the Desk System context plus a
secondary entry to the canonical model chooser.

#### Scenario: New visitor understands the primary product outcome

- **WHEN** a visitor opens a localized homepage
- **THEN** the page MUST identify browser-based CAD model creation as the
  product purpose
- **AND** the primary promotional message MUST mention the OpenGrid Desk System
  or its Board/Snap/container workflow
- **AND** the page MUST visibly communicate live 3D preview and STEP/STL export

#### Scenario: Homepage provides prioritized entry paths

- **WHEN** a visitor chooses to continue from the localized homepage
- **THEN** the primary call to action MUST enter the existing OpenGrid Board
  route with the Desk System context preserved
- **AND** a secondary call to action MUST link to the localized `/models` page
- **AND** the page MUST provide a discoverable link to the existing localized
  Desk System quick-start documentation

#### Scenario: Homepage remains a static promotional surface

- **WHEN** a visitor loads the localized homepage
- **THEN** the page MUST render its promotional copy, visuals, and navigation
  without starting the CAD Worker, loading the CAD WASM runtime, initializing a
  WebGL viewport, or mounting the Svelte CAD workspace
- **AND** the page MUST NOT render the full model-selection card grid
- **AND** the canonical `/models` page MUST remain responsible for complete
  model browsing

#### Scenario: Promotional content is localized and accessible

- **WHEN** a visitor opens either supported homepage locale
- **THEN** the hero, capability labels, calls to action, workflow summary, image
  alternative text, page title, and description MUST use that locale
- **AND** all homepage promotional visuals MUST have meaningful alternative text
  or equivalent visible text
- **AND** homepage links MUST preserve the existing locale route, model ID,
  `system=desk` context, and query-string behavior

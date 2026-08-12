## MODIFIED Requirements

### Requirement: 首頁模型選擇

The system MUST provide a static model-selection page at `/models` driven by the registered model catalog. Every model rendered in the chooser MUST have an understandable display name, a catalog-provided static preview image, and a link to its model-specific CAD route. The chooser content MUST NOT render introductory copy, family descriptions, model descriptions, or adjustable-parameter summaries. The chooser MUST display the OpenGrid series before the HSW series, including `opengrid`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, `opengrid-snap`, `opengrid-snap-remover`, and `hsw-cell`. Registered models outside these visible series MAY remain available through direct CAD routes but MUST NOT be rendered as chooser entries. The root path `/` MUST remain a separate static product homepage and MUST link to `/models` without rendering the model chooser. The `/models` page MUST expose a page-level selection heading without requiring an additional outer visual panel around the entire chooser. The OpenGrid and HSW series MUST remain visually distinguishable by series headings, and the OpenGrid Desk/Wall subgroups MUST remain distinguishable by subgroup headings, spacing, or separators without requiring redundant family badges or nested bordered panels. Model cards MUST use an adaptive layout that uses more than two columns when a wide viewport has enough room and collapses to one column on a narrow viewport.

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

### Requirement: OpenGrid Snap 選擇入口順序

The `/models` chooser MUST render the OpenGrid entries in this order: `opengrid`, `opengrid-snap`, `opengrid-pillar`, `opengrid-divider`, `opengrid-stackable-box`, `opengrid-stackable-cylinder`, and `opengrid-snap-remover`. The responsive card grid MUST preserve this rendered order. When the viewport has room for at least two card columns, the first two cards MUST appear next to each other; on a narrow one-column viewport they MUST remain in the same order vertically. Every entry MUST retain its existing model-specific route.

#### Scenario: Snap 與底板在寬版相鄰

- **WHEN** 使用者以支援至少雙欄卡片排列的視窗開啟 `/models`
- **THEN** OpenGrid 系列的第一張卡片 MUST 是 `底板`
- **AND** OpenGrid 系列的第二張卡片 MUST 是 `Snap`
- **AND** `底板` 的入口 MUST 導向 `/cad/opengrid`
- **AND** `Snap` 的入口 MUST 導向 `/cad/opengrid-snap`

#### Scenario: 其他 OpenGrid 入口仍保留

- **WHEN** 使用者開啟 `/models`
- **THEN** OpenGrid 系列 MUST 仍包含 `opengrid-pillar`、`opengrid-divider`、`opengrid-stackable-box`、`opengrid-stackable-cylinder` 與 `opengrid-snap-remover`
- **AND** 這些入口的既有 model ID 與 `/cad/<modelId>` 路由 MUST 維持不變

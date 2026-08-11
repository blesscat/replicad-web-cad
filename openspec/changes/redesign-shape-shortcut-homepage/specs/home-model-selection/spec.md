## MODIFIED Requirements

### Requirement: 首頁模型選擇

The system MUST provide a static, introduction-first Shape Shortcut product homepage at `/` and a separate static model-selection page at `/models`. The homepage MUST explain Shape Shortcut's product positioning, core capabilities, browser-based workflow, current scope, and output formats. The homepage MUST provide clear generic links to `/models` and MAY provide a link to `/docs/`. The root homepage MUST NOT render the model chooser, catalog-driven model cards, catalog preview images, model-specific CAD links, parameter controls, or direct model-building CTAs. The `/models` page MUST remain the catalog-driven model-selection entry for choosing a model and entering its model-specific CAD route.

#### Scenario: 首頁以產品介紹為主

- **WHEN** 使用者開啟 `/`
- **THEN** 首頁 MUST 顯示 `Shape Shortcut` 品牌與清楚的產品定位說明
- **AND** 首頁 MUST 介紹至少瀏覽器內 CAD、參數化控制、預覽與 STEP／STL 匯出等核心能力
- **AND** 首頁 MUST 提供前往 `/models` 的可操作通用入口
- **AND** 首頁 MAY 提供前往 `/docs/` 的產品文件入口

#### Scenario: 首頁只說明流程，不承擔建造模型

- **WHEN** 使用者開啟 `/`
- **THEN** 首頁 MAY 以文字或靜態視覺說明「選擇 → 調整 → 預覽 → 匯出」流程
- **AND** 首頁 MUST NOT 顯示模型選擇卡片、用途捷徑、參數表單、模型 preview 或 3D CAD viewport
- **AND** 首頁 MUST NOT 提供「開始生成」、「編輯」或其他直接進入單一模型的建造 CTA
- **AND** 首頁 MUST NOT 提供 `/cad/<modelId>` 的個別模型連結

#### Scenario: 首頁與模型選擇頁責任分離

- **WHEN** 使用者需要選擇或建造模型
- **THEN** 首頁的通用入口 MUST 導向 `/models`
- **AND** `/models` MUST 保留目前 catalog-driven 的模型名稱、preview 與 model-specific route 入口
- **AND** 模型選擇與進入 CAD workspace 的行為 MUST 不要求首頁渲染任何模型卡片

#### Scenario: 首頁保持靜態

- **WHEN** 使用者開啟 `/`
- **THEN** 首頁 MUST NOT 初始化 CAD Worker、OpenCascade WASM、WebGL renderer 或 Svelte CAD workspace
- **AND** 首頁 MUST 使用可理解的 headings、landmarks、link names 與 image alternative text（若有靜態視覺）
- **AND** 首頁在窄螢幕 MUST 維持內容可讀、CTA 可操作且不得產生水平溢位

#### Scenario: 模型選擇頁維持既有入口

- **WHEN** 使用者從首頁點擊模型庫入口並開啟 `/models`
- **THEN** `/models` MUST 維持既有 OpenGrid／HSW 模型選擇、preview fallback、編輯入口與靜態 runtime boundary
- **AND** 既有 model ID、buildKey、`/cad/<modelId>` route 與 CAD workspace 行為 MUST 不因首頁改版而變更

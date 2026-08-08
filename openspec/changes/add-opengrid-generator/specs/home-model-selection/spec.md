## MODIFIED Requirements

### Requirement: 首頁模型選擇

The system MUST provide a static homepage model chooser driven by the registered model catalog. Every currently available model MUST have an understandable display name, a concise description, a summary of its adjustable parameters, and a link to its model-specific CAD route. The chooser MUST include `box`, `modular-grid-base`, `hsw-cell`, `hexagonal-column`, and `opengrid`.

#### Scenario: 首頁顯示目前模型

- **WHEN** 使用者開啟首頁
- **THEN** 首頁 MUST 顯示 `box`、`modular-grid-base`、`hsw-cell`、`hexagonal-column` 與 `opengrid` 的可理解名稱
- **AND** 每個模型 MUST 顯示與其參數及用途相符的簡短說明
- **AND** OpenGrid 描述 MUST 說明 Full/Lite/Heavy 板型、28 mm 網格、可調 rows/columns、螺絲孔與 connector-hole 設定
- **AND** 首頁 MUST NOT 啟動 CAD Worker 或 Svelte CAD workspace

#### Scenario: 選擇方塊

- **WHEN** 使用者在首頁選擇 `box`
- **THEN** 選擇入口 MUST 導向 `/cad/box`
- **AND** CAD workspace MUST 以 `modelId=box` 初始化

#### Scenario: 選擇模組化網格底板

- **WHEN** 使用者在首頁選擇 `modular-grid-base`
- **THEN** 選擇入口 MUST 導向 `/cad/modular-grid-base`
- **AND** CAD workspace MUST 以 `modelId=modular-grid-base` 初始化

#### Scenario: 選擇可調高度六角柱

- **WHEN** 使用者在首頁選擇 `hexagonal-column`
- **THEN** 選擇入口 MUST 導向 `/cad/hexagonal-column`
- **AND** CAD workspace MUST 以 `modelId=hexagonal-column` 初始化
- **AND** 首頁描述 MUST 說明整體 height、支數 count、預設 1 mm gap 與預設躺下方向

#### Scenario: 選擇 OpenGrid

- **WHEN** 使用者在首頁選擇 `opengrid`
- **THEN** 選擇入口 MUST 導向 `/cad/opengrid`
- **AND** CAD workspace MUST 以 `modelId=opengrid` 初始化

### Requirement: 模型專屬 CAD 路由

The system MUST expose one CAD route for each registered model id. The current routes MUST map `/cad/box` to `box`, `/cad/modular-grid-base` to `modular-grid-base`, `/cad/hsw-cell` to `hsw-cell`, `/cad/hexagonal-column` to `hexagonal-column`, and `/cad/opengrid` to `opengrid`. The model path segment MUST be the source of truth for the selected component, and a route for an unknown model id MUST NOT initialize a CAD Worker for an unsupported component.

#### Scenario: 直接開啟模型 route

- **GIVEN** 使用者直接開啟 `/cad/modular-grid-base`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入模組化網格底板 workspace
- **AND** 初始 generation MUST 使用該 component 的有效保存 rows 與 columns；若沒有有效保存參數，MUST 使用該 component 的預設 rows 與 columns
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 直接開啟六角柱 route

- **GIVEN** 使用者直接開啟 `/cad/hexagonal-column`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入 hexagonal-column 專屬 CAD workspace
- **AND** 初始 generation MUST 使用 `height=8`、`count=1`、`gap=1` 與 `orientation=lying` 的預設值
- **AND** 頁面 MUST NOT 要求使用者先在 CAD workspace 重新選擇 component

#### Scenario: 直接開啟 OpenGrid route

- **GIVEN** 使用者直接開啟 `/cad/opengrid`
- **WHEN** 頁面完成 route resolution
- **THEN** 頁面 MUST 載入 OpenGrid 專屬 CAD workspace
- **AND** 初始 generation MUST 使用有效保存的 OpenGrid 參數；若沒有有效保存參數，MUST 使用 OpenGrid definition 的預設值
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

## Why

目前首頁的規劃逐漸偏向模型 hub：直接列出模型卡、用途捷徑與「開始生成」入口。這會讓使用者一進站就面對工具選擇，卻還沒理解 Shape Shortcut 是什麼、解決什麼問題，以及它和一般 CAD 工具的差異。

模型選擇與建造流程已經有清楚的 `/models` 與 `/cad/<modelId>` 路徑，首頁應該回到產品介紹與品牌入口的角色，讓使用者先理解產品，再決定是否前往模型庫。

## What Changes

- **BREAKING** 將根路徑 `/` 定位為介紹優先的 Shape Shortcut 靜態產品首頁，不再作為模型 hub 或建造入口。
- 在首頁建立清楚的品牌 Hero，說明 Shape Shortcut 提供瀏覽器內的參數化 CAD 工作流程，以及選擇、調整、預覽、匯出的產品價值。
- 增加產品介紹內容，包括核心能力、使用流程、輸出方式與目前產品範圍；內容以解釋產品為主，不提供互動式建模操作。
- 首頁只提供通用的「查看模型庫」與「閱讀文件」入口，分別導向 `/models` 與 `/docs/`；不得直接列出個別模型或直接連到 `/cad/<modelId>`。
- 移除首頁的模型卡片、模型 preview、用途捷徑、參數摘要與「開始生成／編輯」等模型建造 CTA。模型探索與進入 CAD workspace 的責任集中在 `/models`。
- `/models` 維持目前 catalog-driven 的模型選擇頁；既有 model ID、buildKey、`/cad/<modelId>` routes、參數驗證、預覽、保存與匯出流程不在本 change 內重寫。
- 首頁 MUST 維持靜態載入，不初始化 CAD Worker、OpenCascade WASM、WebGL renderer 或 Svelte CAD workspace。
- 更新首頁的 responsive layout、accessibility labels、document metadata 與端對端驗收，確保介紹內容清楚且能通往模型庫。

## Capabilities

### New Capabilities

None. This change refines the existing homepage/model-selection boundary rather than introducing a new model domain.

### Modified Capabilities

- `home-model-selection`: 將 `/` 明確定義為介紹型產品首頁，並保留 `/models` 作為唯一的模型選擇入口。

## Impact

- Affected page: `src/pages/index.astro`; shared navigation metadata may be updated only when needed to keep the generic `/models` entry consistent.
- Affected tests: homepage E2E assertions must stop expecting model cards and instead verify the product introduction, generic links and static boundary; existing `/models` model-selection assertions remain in scope for regression coverage.
- Affected documentation/specs: the canonical `home-model-selection` delta and user-facing homepage copy must describe the introduction-first information architecture.
- No new component, catalog field, CAD-kernel builder, Worker message, parameter contract, export format, dependency, model ID, buildKey or CAD route is introduced. Existing OpenGrid identities and routes are intentionally preserved.

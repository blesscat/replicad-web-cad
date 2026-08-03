## Why

目前首頁、文件頁與 CAD workspace 的全站樣式集中在單一 `src/styles.css`，樣式責任、元件邊界與後續擴充方向不清楚；隨著功能增加，容易產生 selector 命名衝突與難以追蹤的全域耦合。現在先建立可擴充的 Tailwind + scoped SCSS 樣式架構，並保留現有頁面與 CAD 行為，可降低後續功能開發的樣式成本。

## What Changes

- 導入 Tailwind CSS v4 與 Vite plugin，建立單一全域 Tailwind CSS 入口及共用 theme tokens。
- 將網站 shell、導覽列與頁面框架集中到共用 `SiteLayout.astro`，避免 Astro pages 重複維護相同 markup 與樣式。
- 將頁面、文件卡片、CAD 表單、按鈕、狀態與錯誤提示改用 Tailwind utility classes。
- 只在 viewport 的 `canvas` descendant 尺寸這個確實需要封裝的複雜 selector 使用 `CadViewport.module.scss`；其他 viewport state 與 overlay 改用 Tailwind。
- 移除或縮減原本集中所有責任的 `src/styles.css`，讓全域 CSS 僅保留 reset、theme 與必要的基礎規則。
- 更新 README 的樣式與資料夾規則，說明 Tailwind 與 `.module.scss` 的使用邊界，並同步受影響的測試 selector。
- 維持既有路由、CAD 互動、responsive 行為與視覺語意；本變更不預期改動 CAD domain logic 或 Worker contract。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a styling, component-structure, tooling, and documentation refactor with no change to the existing CAD behavior requirements, so this change sets `skip_specs: true`.

## Impact

- 依賴與建置：`package.json`、`pnpm-lock.yaml`、Astro/Vite 設定；預計加入 `tailwindcss`、`@tailwindcss/vite` 與支援 SCSS module 所需的 `sass`。
- UI 結構：`src/pages/`、新增的 `src/layouts/SiteLayout.astro`、`src/components/`、`src/features/cad/viewport/`。
- 樣式檔案：全域 CSS 入口、Tailwind theme tokens，以及 CAD viewport 的 `*.module.scss`。
- 文件與驗證：`README.md`、受影響的 E2E selector，並重新執行 type check、build、unit test 與相關 E2E 測試。
- 不涉及 backend、API、資料庫、Worker protocol 或 CAD model generation/export 行為。

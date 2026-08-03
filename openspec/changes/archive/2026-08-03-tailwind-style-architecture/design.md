## Context

目前 Astro 7 專案由多個 page 直接 import 同一份 `src/styles.css`；該檔案同時負責 global reset、網站 shell、文件卡片、CAD 表單、狀態訊息與 3D viewport。首頁、文件頁與 CAD 頁也重複定義相同的 shell/nav markup。CAD viewport 另有 `canvas` descendant rule、stale modifier、empty state 與 overlay badge，這些規則需要比一般 utility class 更明確的元件封裝。

本變更不改變 `openspec/specs/cad-workspace/spec.md` 的 CAD 行為契約；既有 760px responsive breakpoint、fallback 隱藏流程、路由與可存取語意都必須保留。

## Goals / Non-Goals

**Goals:**

- 以 Tailwind utilities 作為 page、layout、form、status、card 與 responsive styling 的預設方式。
- 保留一個可追蹤的全域 CSS 入口，只放 Tailwind import、theme tokens、reset 與必要的 base rule。
- 用 `SiteLayout.astro` 統一網站 shell、導覽列、head metadata 與 page content container。
- 用 `CadViewport.module.scss` 只封裝 canvas descendant sizing 這個確實需要 CSS module 的規則。
- 讓樣式責任依 component/page 邊界可定位，並讓測試不再依賴視覺 class 名稱。
- 在 migration 後以 check、build、unit test 與相關 E2E 驗證功能及既有視覺語意。

**Non-Goals:**

- 不重新設計色彩、排版、文案、CAD 操作流程或頁面資訊架構。
- 不改動 CAD Worker、replicad/OpenCascade ownership、message contract、model generation 或 STEP export。
- 不導入 component library、Tailwind plugin、Typography plugin 或另一套 global SCSS design system。
- 不處理遠端 dev proxy、Cloudflare cache 或 production hosting 設定。

## Decisions

### 1. 使用 Tailwind v4 Vite plugin 作為整合方式

在 Astro 的 Vite 設定加入 `@tailwindcss/vite`，並在 `src/styles/global.css` 使用 `@import "tailwindcss";`。`tailwindcss`、`@tailwindcss/vite` 與 `sass` 由 package manager 固定版本並更新 lockfile。

選擇 Vite plugin 是因為目前 Astro 版本已直接支援 Tailwind 4 的 Vite 整合；不使用已 deprecated 的 `@astrojs/tailwind`，也不額外引入 PostCSS 設定，讓 CSS pipeline 維持單純。

### 2. 全域 CSS 只保留入口、tokens 與最小 base

`global.css` 保留 `@import "tailwindcss";`、目前視覺所需的 `@theme` color/breakpoint tokens，以及 `:root`、`*`、`body`、`a`、`[hidden]` 等必要 base rule。網站 shell、card、form 與 CAD layout 不再以 global selector 定義。

現有顏色會先轉成具名 theme token，避免各處散落 arbitrary value；760px 行為以 exact breakpoint utility 或同等的具名 breakpoint 保留，不直接改成預設 768px breakpoint。

### 3. 以 `SiteLayout.astro` 統一 Astro page shell

新增 `src/layouts/SiteLayout.astro`，由 layout 接收 title、description 等 head metadata，負責 `html`、`head`、body shell、主導覽與 content container，透過 slot/render children 放入各頁內容。頁面只保留自己的內容與頁面專屬語意，CAD fallback `id="cad-fallback"` 與 `client:only="react"` 行為維持在 CAD page。

這能消除三個 page 的重複 shell，同時讓 layout utility classes 只有一個 owner。導覽 active state 仍以頁面 pathname/既有 `aria-current` 語意呈現，不用 CSS class 作為行為判斷依據。

### 4. Tailwind-first，SCSS module 只處理 viewport 複雜規則

一般元素改用完整、靜態可掃描的 Tailwind class string；不拼接 utility class 片段，避免 production scan 遺漏動態 class。CAD workspace 的 grid、controls、fields、actions、status、cards 與 button state 以 utilities 表達。

`CadViewport.tsx` 引入 `CadViewport.module.scss`，module 只保留：

- root viewport 的 `canvas` descendant sizing（包括既有的固定 520px 高度需求）；

stale border modifier、empty state 的固定高度/置中，以及 badge overlay 的 absolute positioning、border、顏色與字級全部使用 Tailwind utilities。這些規則不需要再進入 CSS module。

如果規則能直接由 utility 清楚表達，就不放進 module；不在 SCSS module 大量使用 `@apply`，避免建立第二套難以追蹤的 utility alias。

### 5. 測試以行為與可存取語意定位

移除樣式 class 後，E2E 測試改用 heading、label、button、status、`#cad-fallback` 等穩定的語意 selector；若 viewport 或 workspace 沒有足夠的語意 target，才增加明確的 `data-testid`。測試不驗證 Tailwind class 字串或 CSS 實作細節，unit test 的 CAD domain 行為維持原有覆蓋範圍。

### 6. 分階段 migration，保留可回退點

先加入 Tailwind/SCSS tooling 與新的 global entry，再建立 layout 並逐頁遷移，接著遷移 React CAD components，最後移除未使用的 legacy selectors、更新 README 與測試。每個階段都以 type check/build 驗證；若 migration 造成回歸，可在完成前暫時保留舊 stylesheet import，或以單一 revert 恢復原本 page imports，不涉及資料 migration。

## Risks / Trade-offs

- [Tailwind scanner 漏掉條件 class] → 所有條件狀態使用完整 literal class 或 module class mapping，不動態拼接 utility token；build 後檢查 stale/disabled/error 狀態。
- [Tailwind 與 SCSS pipeline 互相耦合] → SCSS 僅作為獨立 CSS module，避免把 Tailwind import 或大量 `@apply` 放進 SCSS；global Tailwind CSS 與 module stylesheet 各自維持清楚入口。
- [utility migration 造成細微視覺差異] → 先以現有 CSS 的 token、間距、字級、陰影與 760px breakpoint 建立對照清單，再跑 route/E2E 驗證並檢查 CAD viewport canvas 高度。
- [layout extraction 影響 Astro fallback 或 metadata] → 先維持原本 DOM 語意、fallback id、slot 位置與 page title，再移除重複 markup；以三個 route 的 build 與 smoke E2E 驗證。
- [測試依賴舊 class] → 將 selector 改為行為/可存取語意；只有沒有替代語意的 viewport/workspace target 才使用 data-testid，避免把樣式 class 重新變成測試契約。

## Context

目前首頁是靜態 Astro 頁面，只提供前往 `/cad/` 的連結；CAD 頁面則由 `CadWorkspace` React island 建立 Worker 與 workspace state，並在 `CadWorkspacePanel` 內提供 component selector。model catalog 已集中定義 `box` 與 `modular-grid-base` 的 id、顯示名稱、參數 schema、預設值與匯出 metadata，但 workspace controller 目前固定從 `box` 的初始 state 啟動。

本變更要把「選擇工作內容」移到首頁，把 CAD 頁面收斂成「編輯已選模型」。路由是跨 Astro、React state、catalog metadata、導覽文案與 E2E 測試的邊界，因此需要先固定模型路由、初始 state 與 fallback 行為。

## Goals / Non-Goals

**Goals:**

- 首頁以目前 model catalog 為來源展示模型選擇卡片與入口。
- 以 `/cad/<modelId>` 作為模型選擇的明確路由上下文。
- CAD workspace 依路由初始化單一模型，移除頁內模型切換。
- 保留現有 component-specific 參數、Worker generation、mesh preview、stale state 與 STEP export 行為。
- 讓 `/cad/`、全域導覽、CAD 頁面與文件頁提供可理解且一致的選擇流程。

**Non-Goals:**

- 不在本變更保存使用者參數、建立模型專案或加入 localStorage/session persistence。
- 不新增模型、不改變 CAD Worker message contract、B-Rep lifetime 或 export format。
- 不支援任意未註冊的 model id，也不把模型參數編碼成新的路由格式。

## Decisions

### 1. 使用 path route 表示模型選擇

採用 `/cad/box` 與 `/cad/modular-grid-base`，讓模型 id 成為 CAD 編輯器的主要 route context。`/cad/` 不帶模型時導回首頁；未知 model id 不建立 workspace，交由 Astro 的無效 route/404 fallback 處理。

相較於 `/cad/?model=...`，path route 更容易閱讀、分享、加入書籤，也能在 Astro 端透過 static paths 將合法 model id 傳給 React，不必讓 client island 自行解析 query string。未來 query string 仍可保留給非身份性的 UI 或參數狀態。

### 2. model catalog 是首頁與 CAD route 的共同來源

沿用現有 `modelDefinitions` registry；為每個 definition 增加首頁需要的簡短描述或等價的 selection metadata。首頁卡片、路由生成與 CAD 顯示名稱都從同一份 catalog 取得，避免首頁自行維護第二份模型清單。

### 3. Astro route 傳入初始 model id

建立模型專屬的 Astro route，使用 catalog 產生目前支援的 static paths，並將已驗證的 `modelId` 傳給 `CadWorkspace`。controller/state factory 以此 model id 取得對應 definition 的預設參數，Worker ready 後直接對該 model 送出初始 generation。

`/cad/` 保留為無模型入口並導回 `/`，同時提供可讀取的 fallback link，以便靜態 hosting 或 JavaScript 不可用時仍能理解下一步。

### 4. CAD workspace 只接受目前 route 的 model

`CadWorkspacePanel` 顯示目前 component 名稱與對應參數面板，但移除 model selector 與 `onModelChange` 事件。面板提供「返回首頁選擇其他模型」連結；切換模型必須經由首頁重新進入另一個 route。

參數變更仍沿用既有 debounce、generation、validation、stale preview 與 export gating。路由只決定 model identity，不保存或覆寫使用者在同一次 workspace session 內的參數。

### 5. 更新導覽與產品文案

首頁主標題與說明改用「CAD 模型/component」的中性描述，並列出目前可用模型。CAD 頁面顯示目前選定模型與切換方式；文件頁與全域導覽不再把整個產品描述成單一 box，導覽入口改指向首頁模型選擇流程。

### 6. 以路由與行為測試驗證

E2E 測試涵蓋首頁卡片連結、兩個合法 CAD routes、`/cad/` 導回首頁、未知 route fallback、CAD 頁面無 selector、返回首頁入口、無 JavaScript fallback，以及既有兩種模型的參數/預覽/STEP 行為。單元測試補上 catalog selection metadata 與 route-to-model mapping 的行為。

Playwright 的 base URL 與 dev server port 可由 `PLAYWRIGHT_PORT` 覆寫，預設仍使用 `3456`；不同 worktree 可以各自指定不同 port，並行啟動 server 與瀏覽器測試。

## Risks / Trade-offs

- [既有 `/cad/` 書籤行為改變] → `/cad/` 提供明確導回首頁與可讀 fallback，並更新 repository 內導覽與文件連結。
- [首頁與 catalog metadata 不一致] → 首頁只讀取 catalog definition，不建立獨立模型清單。
- [靜態 hosting 對 redirect 的支援差異] → 使用 Astro 支援的 redirect 設定，並保留可見的首頁連結作為 fallback。
- [路由 model id 與 Worker model id 不一致] → static route 只從 catalog 產生，進入 React 前再次以 definition 驗證，Worker contract 維持既有 runtime validation。

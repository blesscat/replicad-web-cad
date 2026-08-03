# replicad-web-cad

瀏覽器端 CAD Prototype：使用者調整方塊的寬、深、高，以即時 3D 預覽查看結果，並從精確的 B-Rep 下載 STEP 檔案。

> 目前專案仍在 Prototype 的設計與實作階段。本 README 是人類與 AI 了解專案結構的入口；詳細設計以 OpenSpec 的 `design.md` 為準。

## 主要架構

Astro 負責網站 shell 與路由，React workspace 負責瀏覽器端 UI，專用 CAD Worker 負責所有 CAD kernel 工作：

```text
Astro site shell
└─ SiteLayout.astro + Astro pages / 首頁 / 文件 / CAD route
   └─ React workspace（主執行緒）
      ├─ 參數表單與 state machine
      ├─ Worker client / runtime validation
      ├─ React Three Fiber viewport
      └─ download adapter
             ⇅ versioned messages + transferable buffers
         CAD Worker
         ├─ OpenCascade WASM / replicad initialization
         ├─ box B-Rep builder
         ├─ preview mesh generation
         └─ STEP export
```

主執行緒只持有參數、UI 狀態、已驗證的 mesh、model revision metadata 與下載 bytes。OpenCascade、replicad、B-Rep 建模、mesh 產生與 STEP writer 全部屬於同一個 CAD Worker，不能在主執行緒執行。

## 建議來源目錄

```text
src/
├─ pages/
│  ├─ index.astro
│  ├─ docs/
│  └─ cad.astro
├─ layouts/
│  └─ SiteLayout.astro
├─ styles/
│  └─ global.css
├─ components/cad/CadWorkspace.tsx
├─ features/cad/
│  ├─ model-catalog/
│  │  └─ box-definition
│  ├─ parameters/
│  ├─ state/
│  ├─ viewport/
│  │  ├─ CadViewport.tsx
│  │  └─ CadViewport.module.scss
│  ├─ worker-client/
│  └─ download/
├─ cad-contract/
│  ├─ messages
│  ├─ errors
│  └─ units
├─ cad-kernel/
│  ├─ initialise
│  ├─ model
│  ├─ mesh
│  ├─ export
│  └─ lifetime
└─ workers/cad.worker
```

資料夾名稱可以隨實作調整，但責任邊界必須維持：

- `pages/` 只提供頁面內容、fallback 與 React 掛載點；共用 Astro shell、導覽與 head metadata 由 `layouts/SiteLayout.astro` 負責。
- `styles/global.css` 是唯一全域 CSS 入口，只放 Tailwind import、`@theme` tokens、reset 與必要的 base rules，不放頁面或功能元件 selector。
- 頁面與元件預設使用 Tailwind utility classes；utility class 必須以完整、可靜態掃描的字串呈現，不拼接部分 class token。
- `*.module.scss` 只用於 utility 不易表達的複雜 selector 或 descendant rule，並放在實際擁有該樣式的功能資料夾。現在的例外是 `features/cad/viewport/CadViewport.module.scss`，只負責 canvas descendant 尺寸；viewport overlay/state 仍使用 Tailwind。
- `components/cad/` 組裝 React workspace；`CadWorkspace` 不直接 import CAD kernel。
- `features/cad/model-catalog/` 描述模型 id、參數 schema、建模入口與 metadata，不持有 UI 或 Worker lifecycle。
- `features/cad/parameters/`、`state/`、`viewport/`、`worker-client/` 與 `download/` 分別處理輸入、狀態、預覽、Worker 通訊與瀏覽器下載。
- `cad-contract/` 放跨主執行緒共用的 messages、errors 與 units；不得依賴 DOM、React、Three.js、replicad 或 OpenCascade。
- `cad-kernel/` 放 WASM、B-Rep、mesh、STEP 與 resource lifetime 邏輯，只能由 `cad.worker` 使用。
- `viewport/` 只接受已驗證的 mesh snapshot，不執行 B-Rep 建模或 STEP 匯出。
- `download/` 只處理成功的 bytes 與 metadata，不重新建模。

依賴方向應維持為：

```text
Astro pages
  → React CadWorkspace
    → features/cad + worker-client + cad-contract
      ⇅ versioned Worker messages
    → cad.worker
      → cad-kernel
```

這樣分層是為了隔離 UI、跨執行緒 contract 與 CAD 原生資源，避免主執行緒被 WASM/CAD 運算阻塞，也讓未來增加模型時不必把 B-Rep 邏輯塞進 UI。

## Prototype 範圍

- 唯一內建模型：X/Y 置中於世界原點、底面位於 Z=0 的 box。
- 參數：`width`、`depth`、`height`，單位為 mm。
- 預覽：由 Worker 產生的 B-Rep mesh。
- 匯出：由 Worker 目前 committed B-Rep 產生 STEP。
- 不包含模型匯入、STL/3MF/G-code、儲存、帳號、後端或多人協作。

## 使用 Prototype

開啟 `/cad/` 後，workspace 會直接載入唯一的 `box` 模型。`width`、`depth`、`height` 都是整數 mm；預設值為 `20 × 30 × 40`，合法範圍為 `1–500 mm`，輸入停止 150 ms 後才會送出建模。小數、空值、零、負值與超出範圍的輸入會立即顯示欄位錯誤，不會送出 `model.generate` 或匯出 request。

建模期間可以保留上一個成功 revision 的預覽，但它會標示為 stale，且 STEP 下載會停用；只有新的 B-Rep candidate 完成 commit 並進入「模型已就緒」後，預覽與匯出才會重新同步。WASM 載入、建模、mesh 與匯出都有狀態提示；Worker 或操作失敗時可修改參數或按「重試」，Worker recovery 最多自動重建一次。

## STEP 匯出

「下載 STEP」只會對目前成功 commit 的 `modelRevision` 發出 request。Worker 先 pin 該 revision，再依 replicad 官方的 B-Rep `blobSTEP()` export path 產生 bytes；STEP 不由 viewport screenshot 或離散 mesh 反推。主執行緒驗證 revision、format、MIME 與非空 bytes 後，以 `model/step` 觸發一次下載，檔名為：

```text
box-{width}x{depth}x{height}.step
```

獨立 STEP parser、round-trip、single-solid 與尺寸驗證工具/版本不屬於這個 Prototype，會在後續 change 另行定義，也不會因此加入產品 import 流程。

## 本機啟動與驗收

前置條件是 Node.js、pnpm，以及支援 WebAssembly、Web Worker、WebGL 的桌面版 Chrome 或 Firefox。這個 Prototype 只驗證本機 Astro dev server 或 local build preview，不承諾正式 hosting、CDN、base path 或 production cache 設定。

```bash
pnpm install
pnpm dev
```

開啟 <http://localhost:3456/cad/>。建置與 preview：

```bash
pnpm build
pnpm preview
```

品質檢查：

```bash
pnpm check
pnpm test
pnpm test:e2e
```

E2E 預設會在 Chromium 完成 WebGL CAD/STEP gate，並在 Firefox headless 執行 route/fallback smoke；要在本機以虛擬桌面補跑 Firefox 的完整 WebGL gate，可使用：

```bash
pnpm test:e2e:firefox
```

`test:e2e:firefox` 需要 Linux 的 Xvfb；沒有 Xvfb 時可用等價的 headed Firefox + 虛擬桌面指令執行。

WASM asset 位於 `public/replicad_single.wasm`，Worker 由目前 Astro 應用的 `/replicad_single.wasm` URL 載入。若頁面顯示 WASM 載入失敗，先確認 dev server 正在執行且該 asset 可由瀏覽器取得；若顯示不支援 WebGL，請改用支援 WebGL 的桌面瀏覽器或啟用圖形加速。輸入錯誤、Worker timeout 與 stale 預覽則依頁面狀態提示修正參數或重試。

Prototype 驗收使用的自動化瀏覽器 binary 為 Chromium `151.0.7922.34` 與 Firefox `153.0`；正式版本驗收時仍需記錄實際桌面版 Chrome/Firefox stable 版本。

## 未來模型 catalog 的擴充

目前 catalog 只有 `box`。新增固定模型時，先在 `features/cad/model-catalog/` 增加新的 `ModelDefinition`、`buildKey` 與參數 schema，再在 Worker-only 的 `cad-kernel/model/` 增加對應 `KernelModelDefinition.build()` 入口；UI 只消費 schema，不應把 B-Rep 邏輯放進 `CadWorkspace`。新模型必須另開 OpenSpec change，明確驗收參數單位、bounds、mesh、revision lifetime、STEP filename 與錯誤流程，並維持既有 versioned Worker contract 與主執行緒/CAD Worker 邊界。

## OpenSpec 文件

- [變更提案](openspec/changes/archive/2026-08-02-replicad-web-cad/proposal.md)：目標、範圍與非目標。
- [詳細設計](openspec/changes/archive/2026-08-02-replicad-web-cad/design.md)：架構、Worker contract、revision lifetime 與測試策略。
- [能力規格](openspec/specs/cad-workspace/spec.md)：可觀察行為與驗收情境。
- [實作任務](openspec/changes/archive/2026-08-02-replicad-web-cad/tasks.md)：實作順序與 quality gates。

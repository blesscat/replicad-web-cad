# shape-shortcut

瀏覽器端 CAD Prototype：使用者調整 CAD component 的參數，以即時 3D 預覽查看結果，並從精確的 B-Rep 下載 STEP 或 STL 檔案。

> 目前專案仍在 Prototype 的設計與實作階段。本 README 是人類與 AI 了解專案結構的入口；詳細設計以 OpenSpec 的 `design.md` 為準。

## 主要架構

Astro 負責網站 shell 與路由，Svelte workspace 負責瀏覽器端 UI，專用 CAD Worker 負責所有 CAD kernel 工作：

```text
Astro site shell（layouts/ + pages/）
└─ Svelte workspace（components/cad/，主執行緒）
      ├─ 參數表單與 state machine
      ├─ component-local control panels
      ├─ Worker client / runtime validation
      ├─ Threlte + Three.js viewport
      └─ download adapter
             ⇅ versioned messages + transferable buffers
         CAD Worker（workers/ + cad-kernel/）
         ├─ OpenCascade WASM / replicad initialization
         ├─ component registry
         ├─ box B-Rep builder
         ├─ box-normal builder + STEP template
         ├─ modular-grid-base builder + STEP template
         ├─ hsw-cell builder + STEP template
         ├─ hexagonal-column builder + STEP template
         ├─ preview mesh generation
         └─ STEP / binary STL export
```

主執行緒只持有參數、UI 狀態、已驗證的 mesh、model revision metadata 與下載 bytes。OpenCascade、replicad、B-Rep 建模、mesh 產生與 STEP/STL writer 全部屬於同一個 CAD Worker，不能在主執行緒執行。

## 建議來源目錄

```text
src/
├─ pages/
├─ layouts/
├─ styles/
├─ components/cad/
│  ├─ component-panels/
│  └─ workspace/runtime/
├─ features/cad/
│  ├─ model-catalog/
│  │  └─ components/（每個 component 的 definition）
│  ├─ parameters/
│  ├─ state/
│  ├─ viewport/
│  ├─ worker-client/
│  └─ download/
├─ cad-contract/
├─ cad-kernel/
└─ workers/
```

資料夾名稱可以隨實作調整，但責任邊界必須維持：

- `pages/` 只提供頁面內容、fallback 與 Svelte 掛載點；共用 Astro shell、導覽與 head metadata 由 `layouts/` 負責。
- `layouts/` 負責共用 Astro shell、導覽與 head metadata。
- `styles/` 是全域樣式入口，只放 Tailwind import、`@theme` tokens、reset 與必要的 base rules，不放頁面或功能元件 selector。
- 頁面與元件預設使用 Tailwind utility classes；utility class 必須以完整、可靜態掃描的字串呈現，不拼接部分 class token。
- `features/cad/viewport/` 與其他功能資料夾預設使用 Tailwind；只有 utility 不易表達的複雜 selector 或 descendant rule 才在實際擁有該樣式的資料夾放 scoped SCSS。
- `components/cad/` 組裝 Svelte workspace，負責 UI controller、輸入驗證、Worker lifecycle、控制面板與 viewport，不直接 import CAD kernel。
- `components/cad/component-panels/` 依 component 分開 Svelte 調整頁面；共用 workspace 只負責目前 component 的狀態與匯出。
- `components/cad/workspace/runtime/` 依生成排程、Worker event 與 STEP/STL export 拆分主執行緒 runtime。
- `features/cad/model-catalog/` 的 `index.ts` 只做 registry/lookup；每個 component 的 id、參數 schema、預設值與 export metadata 放在自己的 definition 檔案，不持有 UI 或 Worker lifecycle。
- `features/cad/parameters/`、`state/`、`viewport/`、`worker-client/` 與 `download/` 分別處理輸入、狀態、預覽、Worker 通訊與瀏覽器下載。
- `cad-contract/` 放跨主執行緒共用的 messages、errors 與 units；不得依賴 DOM、UI framework、Three.js、replicad 或 OpenCascade。
- `cad-kernel/` 放 WASM、B-Rep、mesh、STEP 與 resource lifetime 邏輯，只能由 `workers/` 使用。
- `cad-kernel/components/<component>/` 同時放 component-local builder 與其 canonical CAD asset；例如 `modular-grid-base/builder.ts` 與 `board-cell-template.step`，以及獨立的 `hsw-cell/builder.ts` 與 `hsw-cell.step`。
- `workers/` 是 CAD Worker 的執行入口，只能組合 `cad-contract/` 與 `cad-kernel/`。
- `features/cad/viewport/` 只接受已驗證的 mesh snapshot，不執行 B-Rep 建模或 STEP 匯出。
- `features/cad/download/` 只處理成功的 bytes 與 metadata，不重新建模。

依賴方向應維持為：

```text
pages/
  → components/cad/
    → features/cad/ + cad-contract/
      ⇅ versioned Worker messages
    → workers/
      → cad-kernel/
```

這樣分層是為了隔離 UI、跨執行緒 contract 與 CAD 原生資源，避免主執行緒被 WASM/CAD 運算阻塞，也讓未來增加模型時不必把 B-Rep 邏輯塞進 UI。

## Prototype 範圍

- 內建 component：X/Y 置中於世界原點、底面位於 Z=0 的 `box`、獨立的 `box-normal`、`modular-grid-base`、`hsw-cell` 與 `hexagonal-column`。
- `box` 參數：`width`、`depth`、`height`，單位為 mm。
- `box-normal` 參數：`x`=2–40、`y`=2–35 格，`height`=10–500 mm，以及預設勾選的四角定位柱。X/Y 每軸總共內縮 0.15 mm；定位柱使用平頂/底六角截面，外露高度為 7 mm，盒底接合端不做端部斜角。路由為 `/cad/box-normal`，輸出檔名為 `box-normal-{x}x{y}-h{height}-{posts|plain}.step` 與對應的 `.stl`。
- `modular-grid-base` 參數：`rows`、`columns` 格數 slider，範圍為 1–20 格；每格為 20 × 20 mm，高度固定 5 mm，最大寬/深為 400 mm。預切除 `cell-template.step` 會複製、平移、融合後，只對整體外側四角套用 R2.5 mm 圓角。
- `hsw-cell` 參數：`rows`、`columns` 格數 slider，範圍為 1–20 格；使用固定約 27.25 × 23.60 × 8 mm 的平頂六角 canonical `hsw-cell.step`，columns 沿 X 方向交錯排列成蜂巢，整體不套用額外圓角。路由為 `/cad/hsw-cell`，輸出檔名為 `hsw-cell-{columns}x{rows}.step` 與 `hsw-cell-{columns}x{rows}.stl`。
- `hexagonal-column` 參數：`height`、`count`、`gap` 與 `orientation`，路由為 `/cad/hexagonal-column`；它與 `box-normal` 共用低階六角柱 profile helper，但保持獨立 component contract。
- 預覽：由 Worker 產生的 B-Rep mesh。
- 匯出：由 Worker 目前 committed B-Rep 產生 STEP 或 binary STL。
- 不包含模型匯入、3MF/G-code、儲存、帳號、後端、多人協作或自動啟動 Bambu Studio。

## 使用 Prototype

先在首頁選擇模型，再進入對應的 CAD workspace：`box` 使用 `/cad/box`、`box-normal` 使用 `/cad/box-normal`、`modular-grid-base` 使用 `/cad/modular-grid-base`、`hsw-cell` 使用 `/cad/hsw-cell`、`hexagonal-column` 使用 `/cad/hexagonal-column`、`opengrid` 使用 `/cad/opengrid`、`opengrid-stackable-box` 使用 `/cad/opengrid-stackable-box`。CAD workspace 只調整目前 route 的 component；要切換模型必須返回模型選擇頁。`box-normal` 的 `x`、`y`、`height` 是整數，合法範圍為 `2–40`、`2–35` 格與 `10–500 mm`；預設為 `2 × 2 × 10` 且啟用四角定位柱。OpenGrid 堆疊盒的 `x`、`y` 支援 `0.5` 格步進，外部 footprint 為 `x × 28 − 0.15 mm`、`y × 28 − 0.15 mm`，並以同一個連續凸導軌／底部 45° 導角凹槽在盒體之間堆疊；四角 Snap 固定孔為 nominal Ø5 mm、距邊 7 mm，底部入口 Ø5.05 mm 以固定 0.5 mm、45° 斜角過渡至內側 Ø6.05 mm。輸入停止 500 ms 後才會送出建模；每個新 snapshot 會先使舊 generation 失效，連續 slider 變更只會對最後合法值送出建模；無效外部 snapshot 不會送出 `model.generate` 或匯出 request。

建模期間可以保留上一個成功 revision 的預覽，但它會標示為 stale，且 STEP/STL 下載會停用；只有新的 B-Rep candidate 完成 commit 並進入「模型已就緒」後，預覽與匯出才會重新同步。WASM 載入、建模、mesh 與匯出都有狀態提示；Worker 或操作失敗時可修改參數或按「重試」，Worker recovery 最多自動重建一次。

## STEP template 與格式選擇

目前 3D component 的 canonical asset 使用 STEP，而不是 STL 或 DXF：STEP 保留可供 clone、fuse、fillet 與 STEP export 使用的精確 B-Rep；STL 只有三角網格，DXF 則是 2D profile，兩者都不適合這個 3D boolean pipeline。

`board-cell-template.step` 是已完成中央貫穿切除的 `modular-grid-base` component-local 預處理檔案；`box-normal.step`、`hsw-cell.step` 與 `hexagonal.step` 則分別是各自 component 的 canonical asset。各 Worker epoch 都只 import/cache 各自的 asset 一次；`box-normal` 會依 canonical profile 建立 rounded body、底部 chamfer、開口 cavity，再以固定數量的柱體 clone/平移/fuse 組裝，其他模板型 component 則依各自 builder 產生。`modular-grid-base` 才會對整體外角做圓角，`hsw-cell` 不執行額外 fillet，`box-normal` 只保留其 canonical profile 的圓角與斜角。不會依賴 Downloads 路徑，也不會在每次生成重新建立 cutter。未來新增 component 時，builder 與它自己的預切除資產放在同一個 `cad-kernel/components/<component>/` 目錄。

## STEP 匯出

「下載 STEP」只會對目前成功 commit 的 `modelRevision` 發出 request。Worker 先 pin 該 revision，再依 replicad 官方的 B-Rep `blobSTEP()` export path 產生 bytes；STEP 不由 viewport screenshot 或離散 mesh 反推。主執行緒驗證 revision、format、MIME 與非空 bytes 後，以 `model/step` 觸發一次下載，檔名為：

```text
box-{width}x{depth}x{height}.step
box-normal-{x}x{y}-h{height}-{posts|plain}.step
modular-grid-base-{columns}x{rows}.step
hsw-cell-{columns}x{rows}.step
hexagonal-column-{height}x{count}-g{gap}-{standing|lying}.step
```

這個 Prototype 不提供任意 STEP 的產品匯入或 round-trip parser；目前的 `board-cell-template.step` 是 repository 內受控的 canonical asset，並由 CAD kernel integration tests 驗證其 single-solid、尺寸與幾何條件。

## STL 匯出與 Bambu Studio

「下載 STL」會對目前成功 commit 的 `modelRevision` 發出 `export.stl` request。Worker pin 該 revision，使用 B-Rep 的 `Shape3D.blobSTL({ binary: true, tolerance, angularTolerance })` 產生 binary STL；它不會從 viewport mesh 反推，也不會在主執行緒執行 CAD writer。主執行緒會驗證 revision、Worker epoch、MIME、檔名、三角形數量與 binary STL 總長度後，以 `model/stl` 觸發一次下載。

STL 使用專案的 mm 座標 convention，檔名為：

```text
box-{width}x{depth}x{height}.stl
box-normal-{x}x{y}-h{height}-{posts|plain}.stl
modular-grid-base-{columns}x{rows}.stl
hsw-cell-{columns}x{rows}.stl
hexagonal-column-{height}x{count}-g{gap}-{standing|lying}.stl
```

下載完成後，使用者可在 Bambu Studio 透過一般的本機檔案開啟/匯入流程載入 STL。瀏覽器不會直接啟動或控制 Bambu Studio，也不會產生 3MF、G-code 或印表機設定檔。初始 STL tessellation 設定為 `tolerance = 0.001 mm`、`angularTolerance = 0.1`；這些設定與 viewport preview mesh 分開管理。

代表性量測（box、2×2 與 5×5 grid）都產生有效 binary STL：box 為 684 B/12 triangles，2×2 為 459,084 B/9,180 triangles，5×5 為 2,697,684 B/53,952 triangles；輸出長度皆符合 `84 + triangleCount × 50`。

## 本機啟動與驗收

前置條件是 Node.js、pnpm，以及支援 WebAssembly、Web Worker、WebGL 的桌面版 Chrome 或 Firefox。這個 Prototype 只驗證本機 Astro dev server 或 local build preview，不承諾正式 hosting、CDN、base path 或 production cache 設定。

```bash
pnpm install
pnpm dev
```

開啟 <http://localhost:3456/>，先選擇模型。建置與 preview：

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

B-Rep 效能 benchmark 是 opt-in，HSW benchmark 會使用 canonical STEP、production preview 設定與 1×1、2×2、5×5、10×10、20×20 fixture，先分開記錄 cold asset import，再 warm up 並量測至少五次，輸出 asset loading、assembly/fuse、mesh、total 的 median/P95 與環境資訊：

```bash
RUN_CAD_BENCHMARK=1 pnpm exec vitest run tests/worker/hsw-cell-benchmark.test.ts
```

可用 `RUN_CAD_BENCHMARK_FIXTURES=20x20` 與 `RUN_CAD_BENCHMARK_STRATEGIES=column,sequential` 限定範圍。optimized path 會先融合一條 canonical column，再 clone/translate 其餘 columns，並以 bounded balanced column fuse 組裝；這仍是 CPU/OpenCascade B-Rep，WebGL 只負責 viewport rendering。warm-up 會驗證 STEP/STL 的非空與 binary STL 結構，generation total 不把重複 export writer 成本算入。若 sequential 大型 baseline 在同一 native epoch 失敗，benchmark 會保留每個嘗試的 sample/phase/error，並以 operation-timeout safety gate 驗證 optimized 路徑，同時在報告中標示無法進行相對 20% 比較。

目前 model/mesh 與 STEP/STL operation timeout 為 120 秒；engine initialization timeout 維持 60 秒。timeout 只是讓大型模型有較長的完成窗口，不代表 B-Rep 效能 gate 可以略過。

WASM asset 位於 `public/replicad_single.wasm`，Worker 由目前 Astro 應用的 `/replicad_single.wasm` URL 載入。若頁面顯示 WASM 載入失敗，先確認 dev server 正在執行且該 asset 可由瀏覽器取得；若顯示不支援 WebGL，請改用支援 WebGL 的桌面瀏覽器或啟用圖形加速。輸入錯誤、Worker timeout 與 stale 預覽則依頁面狀態提示修正參數或重試。

Prototype 驗收使用的自動化瀏覽器 binary 為 Chromium `151.0.7922.34` 與 Firefox `153.0`；正式版本驗收時仍需記錄實際桌面版 Chrome/Firefox stable 版本。

## 未來模型 catalog 的擴充

目前 catalog 有 `box`、`box-normal`、`modular-grid-base`、`hsw-cell`、`hexagonal-column`、`opengrid` 與 `opengrid-stackable-box`。新增 component 時，在 `features/cad/model-catalog/components/` 建立獨立 `ModelDefinition`，在 `components/cad/component-panels/<component>/` 建立專屬調整頁面，再在 Worker-only 的 `cad-kernel/components/<component>/` 放 builder 與資產，最後由 catalog/kernel registry 掛入。UI 只消費 schema，不應把 B-Rep 邏輯放進 `CadWorkspace`。新模型必須另開 OpenSpec change，明確驗收參數單位、bounds、mesh、revision lifetime、STEP/STL filename 與錯誤流程，並維持既有 versioned Worker contract 與主執行緒/CAD Worker 邊界。

## OpenSpec 文件

- [變更提案](openspec/changes/archive/2026-08-02-shape-shortcut/proposal.md)：目標、範圍與非目標。
- [詳細設計](openspec/changes/archive/2026-08-02-shape-shortcut/design.md)：架構、Worker contract、revision lifetime 與測試策略。
- [能力規格](openspec/specs/cad-workspace/spec.md)：可觀察行為與驗收情境。
- [實作任務](openspec/changes/archive/2026-08-02-shape-shortcut/tasks.md)：實作順序與 quality gates。

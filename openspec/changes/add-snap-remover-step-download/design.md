## Context

現有專案以 model catalog 建立首頁卡片與 `/cad/<modelId>` route；CAD Worker 負責 B-Rep、mesh、revision lifetime 與 STEP export。上一版將 `snap remover.step` 放在 `public/` 做首頁靜態下載，與目前 component preview 架構脫節。這次要把它變成一個 OpenGrid 的固定幾何 component：可以進入 preview、產生 mesh 與下載，但不接受使用者參數。

來源檔案目前位於 `/Users/blesscat/Downloads/snap remover.step`，大小為 54,347 bytes，SHA-256 為 `8f34c88dfea6b2c3352301d68dadc0b43665c0f8424f7da2b61c8dcda38ac41b`。這個本機路徑只能作為實作時的來源；repository 內的 component-local asset 才是唯一 runtime 來源。

## Goals / Non-Goals

**Goals:**

- 將提供的 STEP bytes 以 `opengrid-snap-remover` component-local asset 打包。
- 在既有首頁 catalog 顯示 OpenGrid component，並用目前 `/cad/<modelId>` 方式進入 preview。
- 以空參數 `{}` 建立固定 component；sidebar 不顯示參數控制，但保留狀態、重試與 STEP download。
- 讓既有 `box` 與 `modular-grid-base` 卡片、route、參數與 export 行為保持可用。
- 以 bytes identity 驗證 source asset 未被修改。

**Non-Goals:**

- 不新增另一套 nested `/cad/opengrid/...` route；沿用現有 `/cad/<modelId>` 架構。
- 不提供 `opengrid-snap-remover` 的尺寸、slider、文字欄位或參數編輯。
- 不改動既有 `box`、`modular-grid-base` 的 model ID、route、參數或 Worker semantics。
- 不新增 runtime dependency、backend 或資料 migration。

## Decisions

### 1. 使用 OpenGrid component-local Worker asset

檔案放在 `src/cad-kernel/components/opengrid-snap-remover/snap remover.step`，並由 matching builder 以 module-relative URL 載入。它不再是首頁的 public standalone file；這能讓 preview 與下載共用同一個 Worker-owned B-Rep pipeline。

檔案內容仍必須 byte-for-byte 保持不變。runtime 不依賴 `/Users/blesscat/Downloads/`。

### 2. 使用目前 catalog 與 route 架構

新增 `opengrid-snap-remover` definition 到 `modelDefinitions`，由首頁既有 map 自動產生卡片，route 為 `/cad/opengrid-snap-remover`。不得用替換整個 catalog array 的方式加入新 entry；`box` 與 `modular-grid-base` 必須仍在 array。

### 3. 空參數 definition 與 sidebar

`ModelParameters` 增加 `{ modelId: 'opengrid-snap-remover'; parameters: {} }`。definition 的 `parameterSchema` 為空陣列、default parameters 為 `{}`、validation 只接受空 object。`CadWorkspacePanel` 仍顯示名稱、狀態、重試與下載 action，但只在 definition 有 parameter fields 時 render `ComponentParameterPanel`。

### 4. Worker cache、clone 與 lifecycle

Worker 每個 epoch cache 一個 imported source shape；每個 generation 只 clone source shape 作為 candidate，避免 revision dispose 釋放 cache。Worker dispose 時釋放 cache；load/import/clone 失敗要走既有可診斷的 model asset error。

### 5. OpenGrid naming

OpenGrid 新 component 的 stable `modelId`、`buildKey`、route slug、catalog component directory 與 kernel component directory 都使用 `opengrid-<component-slug>`；display name 使用 `OpenGrid <Name>`。既有 IDs 不因這次需求重新命名。

## Risks / Trade-offs

- **[Risk] 檔名含空白造成 bundled URL 或測試選取不一致** → 由 module-relative `URL` 解析 asset，export definition 明確設定 `snap remover.step`；測試以下載事件的檔名和 bytes 驗證。
- **[Risk] 某些 static server 對 `.step` 沒有專用 MIME mapping** → 以 Worker export response 的 `model/step` metadata、原生 `download` action 和非空 `.step` bytes 作為核心行為。
- **[Risk] 實作誤把固定 asset 接入錯誤的 runtime 路徑** → 將 asset 限定在 component-local Worker builder，並檢查 homepage 不啟動 CAD runtime、OpenGrid route 才載入 Worker/WASM。
- **[Risk] 來源檔案在實作環境不存在** → 實作前先確認來源存在並以 hash 驗證；commit 後 repository asset 是唯一 runtime 來源。

## Migration Plan

1. 將來源檔案以 byte-for-byte 方式移入 `opengrid-snap-remover` component-local 目錄，移除 public standalone copy 與首頁獨立下載 card。
2. 擴充 shared contract/catalog、Worker asset cache、preview-only sidebar 與 `/cad/opengrid-snap-remover` route。
3. 執行 OpenGrid preview、下載、existing catalog regression、check、build 與 browser 驗證。
4. 若需要 rollback，移除 OpenGrid catalog entry、component-local builder/asset 與 preview tests；保留既有 box/grid 功能。

## Open Questions

目前沒有阻塞實作的問題；`opengrid-snap-remover` 使用現有 catalog 與 `/cad/<modelId>` route，現有 component IDs 保持相容。

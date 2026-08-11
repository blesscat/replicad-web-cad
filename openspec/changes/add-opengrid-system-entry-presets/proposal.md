## Why

目前 `/models` 只依 OpenGrid family 顯示模型，所有進入同一個 `opengrid-snap` route 的使用者都共用同一份 modelId-scoped localStorage。桌面系統與掛牆系統雖然使用同一個 Snap 幾何模型，卻需要不同的初始設定與互不覆蓋的暫存，因此需要把系統入口 context 納入模型選擇與 workspace persistence。

## What Changes

- 新增穩定的 OpenGrid system context：`desktop` 與 `wall`。
- 將 `/models` 的 OpenGrid 系列再分成 `Desktop System` 與 `Wall Related` 兩個子分類。
- `底板` 與 `Snap` 同時出現在兩個子分類；其他目前的 OpenGrid 模型只出現在 `Desktop System`；HSW 系列維持目前行為。
- 子分類中的入口連結帶上 system context，例如 `/cad/opengrid-snap?system=desktop` 與 `/cad/opengrid-snap?system=wall`。
- Desktop Snap 的首次進入 preset 為 `variant=Lite`、`profile=Standard`、Full footprint、`offset=0`、四周定位孔開啟、中央移除孔開啟。
- Wall Snap 的首次進入 preset 為 `variant=Full`、`profile=Standard`、Full footprint、`offset=0`、四周定位孔關閉、中央移除孔關閉。
- 將 browser-local parameter persistence scope 擴充為 system context + `modelId`；Desktop 與 Wall 的底板及 Snap 暫存互相隔離。
- 已保存的該 system/model 參數優先於 system preset；沒有保存資料時才使用 system preset，再回退到 model definition default。
- 「全部恢復預設」在有 system context 時恢復該 system 的 preset，而不是一律恢復全域 model default。
- 保留既有 `opengrid`、`opengrid-snap` 等 model ID、buildKey、CAD route 與 Worker contract；system context 只負責入口、preset 與 persistence，不新增重複 CAD model。
- 保留沒有 system context 的既有直接 CAD route 作為 legacy/default 行為，並避免舊的 unscoped persistence 無聲污染新的 Desktop／Wall scope。

## Capabilities

### New Capabilities

- `opengrid-system-entry-context`: 定義 Desktop／Wall context、入口解析、system-specific preset 與 preset/保存值的優先順序。

### Modified Capabilities

- `home-model-selection`: 修改 OpenGrid 模型選擇頁的子分類、重複放置模型與帶 context 的入口連結。
- `component-parameter-persistence`: 修改參數保存 scope，使 system context 下的同一 model 能保存互相隔離的快照。
- `cad-workspace`: 修改 system context 下的初始 generation、恢復預設與 workspace route 行為。

## Impact

- Catalog：`src/features/cad/model-catalog/types.ts`、`index.ts` 與 OpenGrid entry placement/grouping metadata。
- Pages/routes：`src/pages/models.astro`、`src/pages/cad/[modelId].astro` 與 CAD path/context helper。
- Workspace：`CadWorkspace.svelte`、workspace controller、parameter store 與 restore-defaults flow。
- Tests：模型選擇頁分組與 context links、Desktop／Wall Snap preset、底板／Snap persistence isolation、legacy route fallback 與 initial generation regression tests。
- Documentation/OpenSpec：更新模型選擇與 persistence 的行為契約。
- 不新增依賴、CAD kernel builder、Worker message 欄位或新的 OpenGrid component；既有 OpenGrid identities intentionally remain unchanged。
- 本 change 會觸及目前 `redesign-shape-shortcut-homepage` change 所保留的 `/models` 邊界，實作時需同步其 acceptance 或依序套用，避免兩個 change 對模型選擇頁產生衝突。

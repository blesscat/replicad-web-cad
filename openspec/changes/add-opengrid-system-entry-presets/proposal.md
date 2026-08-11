## Why

OpenGrid 的 Desktop 與 Wall 入口會對同一個 model 使用不同的初始 preset，但目前模型選擇頁與預覽 capture 只認得 model id，因此兩個入口無法同時保存互相隔離的參數，也無法產生反映各自 preset 的預覽圖。這會讓 Wall Snap 的卡片看起來像 Desktop Snap，且 capture 不能驗證入口實際使用的初始設定。

## What Changes

- 新增穩定的 OpenGrid system context：`desktop` 與 `wall`。
- 將 `/models` 的 OpenGrid 系列分成 `Desktop System` 與 `Wall Related` 子分類。
- `底板` 與 `Snap` 同時出現在兩個子分類；其他目前的 OpenGrid 模型只出現在 Desktop；HSW 維持單一入口。
- 子分類入口連結帶上 system context，例如 `/cad/opengrid-snap?system=desktop` 與 `/cad/opengrid-snap?system=wall`。
- Desktop Snap 的首次進入 preset 為 `variant=Lite`、`profile=Standard`、`footprint=full`、`offset=0`、四周定位孔開啟、中央 remover 孔開啟。
- Wall Snap 的首次進入 preset 為 `variant=Full`、`profile=Standard`、`footprint=full`、`offset=0`、四周定位孔關閉、中央 remover 孔關閉。
- Desktop／Wall 的底板與 Snap 參數保存 scope 互相隔離；已有的無 context 保存值只供 legacy/default route 使用，不得無聲污染 system scope。
- 有 system context 時，參數優先順序為 scoped saved value、system preset、model definition default；「全部恢復預設」恢復目前 system 的 preset。
- 預覽 capture 與 verify workflow 改為以可見 catalog entry 為單位。每個 context entry 都會以對應 system preset 產生自己的靜態 PNG，例如 `opengrid-snap-desktop.png` 與 `opengrid-snap-wall.png`；沒有 context 的 legacy model 維持 `<modelId>.png`。
- 預覽 capture 必須清除或使用新的 browser storage context，並透過帶有 `system` context 的 CAD route 取得 preset，不得使用開發者現有的保存值。
- 保留既有 model id、buildKey、CAD route slug、Worker protocol 與 export contract；system context 只影響入口、preset、persistence 與 presentation-only preview asset。

## Capabilities

### New Capabilities

- `opengrid-system-entry-context`: 定義 Desktop／Wall context、入口解析、system-specific preset、scoped persistence 與 context preview capture identity。

### Modified Capabilities

- `home-model-selection`: 修改 OpenGrid 的分組與帶 context 的 entry links。
- `component-parameter-persistence`: 將保存 scope 擴充為 system context + model id，並保留 legacy fallback。
- `cad-workspace`: 修改 system context 下的初始 generation 與 restore-defaults 行為。
- `model-card-previews`: 由每個 model 一張圖擴充為每個可見 catalog entry 一張圖，並要求 capture 使用 entry 的 effective preset。

## Impact

- Catalog：model entry/context metadata、可見分組、preview image metadata 與 context-aware CAD links。
- Routes/workspace：`/cad/[modelId]` 的 query context、初始參數、恢復預設與 parameter store API。
- Persistence：versioned browser-local payload 的 legacy 與 scoped entries。
- Preview workflow：`tests/e2e/model-card-previews.spec.ts`、`public/model-previews/` 與 capture/verify scripts。
- Tests：catalog grouping/link tests、context preset and persistence tests、CAD route initial-generation/restore tests、context-specific preview asset tests。
- 不新增依賴、CAD kernel builder、Worker message 欄位或新的 OpenGrid component。

## Why

本專案目前沒有統一的 formatter 或格式檢查命令，JavaScript/TypeScript 相關檔案也普遍使用分號。隨著 Astro、React、Worker 與測試程式碼持續增加，需要一套可由編輯器與命令列一致執行的格式規則，降低格式差異與 review 雜訊。

## What Changes

- 導入 Prettier，並加入 Astro 檔案所需的 formatter 支援。
- 建立專案格式規則，讓 JavaScript、TypeScript、TSX、MJS 與 Astro 程式碼不使用分號，並保留目前的雙引號風格。
- 定義 formatter 應處理的 source、test 與設定檔範圍，排除產生物、測試輸出、WASM 與整個 `openspec/` 資料夾等非格式化目標。
- 在 `package.json` 提供 `format` 與 `format:check` 命令，讓本機格式化與品質檢查可重複執行。
- 提供編輯器儲存時自動格式化的專案設定，讓新增與修改的程式碼能即時套用規則。
- 將既有 source、test 與相關設定檔套用新格式，維持執行時行為不變。

## Capabilities

### New Capabilities

- `code-formatting`: 定義專案程式碼格式規則、可執行的格式化命令與自動格式化整合。

### Modified Capabilities

無。這項變更只建立開發工具與程式碼風格規範，不改變 CAD workspace 的產品行為或既有需求。

## Impact

- 影響根目錄的 formatter 設定、ignore 設定、package scripts 與開發相依套件。
- 影響 `src/`、`tests/`、Astro/Vite/Vitest/Playwright 設定檔及相關可格式化文件的排版；`openspec/` 全部資料不在格式化範圍內。
- 可能新增編輯器工作區設定；不修改 runtime dependency、Worker contract、CAD kernel ownership 或產品 API。
- `pnpm-workspace.yaml` 目前已有未提交的使用者修改，本 change 不應覆蓋或重置該修改。

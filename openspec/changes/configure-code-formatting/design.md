## Context

目前專案使用 Astro、React、TypeScript、Vitest 與 Playwright，但沒有 formatter、lint script、EditorConfig 或 editor workspace formatting 設定。`src/`、`tests/` 與根目錄的 Astro/Vite/Vitest/Playwright 設定普遍以分號結尾，而專案需求是讓 JavaScript-family 程式碼不使用分號，並讓格式化可以由命令列與編輯器一致執行。

這是 development tooling 與 source reformat change，不應改變 CAD workspace 的 runtime behavior、Worker message contract、CAD kernel ownership、測試語意或使用者可見 UI。

## Goals / Non-Goals

**Goals:**

- 以單一 formatter 定義 JavaScript、TypeScript、TSX、MJS 與 Astro 的排版規則。
- 將分號規則設為 `semi: false`，並延續目前的雙引號風格。
- 支援 Astro component，同時格式化 CSS/SCSS 及根目錄可格式化設定檔。
- 提供可重複執行的 `format` 與 `format:check` scripts。
- 提供 VS Code workspace 的 format-on-save 整合，但不要求非 VS Code 使用者採用特定 editor。
- 將既有受管檔案格式化，並以既有 type check、tests 與 build 確認沒有行為回歸。

**Non-Goals:**

- 不導入 ESLint、Biome 或其他 lint/quality rule system。
- 不新增 runtime dependency，不修改應用程式 API、Worker protocol 或 CAD domain logic。
- 不格式化 `node_modules/`、`dist/`、`.astro/`、測試報告、coverage、WASM 或整個 `openspec/` 資料夾。
- 不把 formatter check 接到不存在的 CI pipeline；只提供可供 CI 使用的 `format:check` 命令。

## Decisions

### 1. 使用 Prettier 作為唯一排版工具

使用 Prettier 而非 ESLint formatting rules 或 Biome，因為目前需求是排版一致性與分號風格，不是靜態分析。Prettier 已能涵蓋 TypeScript、TSX、JavaScript、JSON、CSS/SCSS 與 Markdown；以 `prettier-plugin-astro` 補足 Astro parser。

替代方案是只加入 ESLint 的 `semi` rule，但那需要另建完整 ESLint parser/config，且無法單獨提供跨檔案格式化流程，因此不採用。Biome 也能同時處理 lint/format，但會引入比目前需求更大的工具選擇與格式差異，留待未來另案評估。

### 2. 只覆寫必要的格式選項

新增 `prettier.config.mjs`，明確設定：

- `semi: false`：JavaScript、TypeScript、TSX、MJS 與 Astro 不產生分號。
- `singleQuote: false`：延續現有雙引號 import 與字串風格。
- Astro plugin/parser：讓 `.astro` template 與 frontmatter 使用同一 formatter。

其餘選項採用 Prettier 預設值，避免在沒有既有團隊決策的情況下額外建立 print width、tab width 或 trailing comma 規範。若未來需要調整，應在 formatter change 中明確記錄並一次套用。

### 3. 以明確 glob 控制格式化範圍

`format` 與 `format:check` 使用同一組 root/source/test glob，涵蓋 `src/`、`tests/`、根目錄的 JavaScript/TypeScript/JSON/YAML/Markdown 與相關 style 檔案；整個 `openspec/` 資料夾不列入命令的輸入範圍。另以 `.prettierignore` 排除 generated output、dependency、test output、coverage、WASM 與 `openspec/`。

兩個 script 必須共用相同的檔案集合：`format` 使用 `--write`，`format:check` 使用 `--check`。這可避免本機格式化與日後 CI/check 命令檢查不同檔案。

### 4. 以 workspace editor 設定提供儲存時格式化

新增 VS Code workspace settings，指定 Prettier extension 為 JavaScript/TypeScript/TSX/Astro/CSS/SCSS/JSON/YAML/Markdown 的 default formatter，並啟用 `editor.formatOnSave`。這是便利的 editor integration，不取代 `format:check`，也不會阻止其他 editor 透過同一份 Prettier config 工作。

### 5. 以 lockfile 與行為 gate 驗證 rollout

新增 development dependencies 後更新 pnpm lockfile。格式化完成後執行 `pnpm format:check`、`pnpm check`、`pnpm test`、`pnpm build`，必要時補跑既有 E2E gate。若格式化造成非預期行為或工具相容性問題，rollback 只需移除 formatter 設定、scripts、development dependencies 與排版 diff，不涉及 runtime migration。

## Risks / Trade-offs

- [第一次套用 formatter 會產生較大的純排版 diff] → 限定 glob 與 ignore 範圍，並在 diff review 中確認只包含 whitespace、引號、分號與 formatter 排版變更。
- [Astro plugin 與目前 Astro/Prettier 版本不相容] → 使用 Node.js `>=20` 可用且與現有 pnpm lockfile 相容的套件版本，先執行 `format:check`、type check、unit tests 與 build。
- [VS Code 設定可能不符合其他 editor 的工作流] → 將 editor integration 視為便利設定；命令列 config 與 `format:check` 才是專案的規範來源。
- [格式化誤觸 generated、binary asset 或 OpenSpec 文件] → 使用明確 glob 與 `.prettierignore` 雙重限制，明確排除整個 `openspec/`，並檢查 `git diff --stat` 與 formatter check 的檔案集合。
- [無 lint 工具導致其他程式品質問題未被檢查] → 明確將 lint 留在非本 change 範圍，另案導入時再定義規則與 CI gate。

## Migration Plan

1. 新增 Prettier、Astro plugin、設定檔、ignore 檔與 `format`/`format:check` scripts。
2. 新增 VS Code format-on-save workspace 設定，更新 pnpm lockfile。
3. 對受管的 source、tests 與設定檔執行 formatter，確認 `pnpm-workspace.yaml` 既有使用者修改未被覆蓋。
4. 執行 formatter check、type check、unit/worker tests、build 與適用的 E2E gate。
5. 若需 rollback，移除新增 tooling 設定與 dependency，並還原此次純格式化 diff；不需要資料或部署 migration。

## Open Questions

- 無阻塞性問題。正式實作時只需依目前 package manager 與 Node.js engine 選擇相容的 Prettier/Astro plugin 版本，並將解析結果寫入 lockfile。

## Why

Desk System 的 OpenGrid 方盒與圓盒目前沒有專用 preset，因此首次進入時會沿用一般模型預設，尺寸與底部模式不符合 Desk System 的實際使用情境。需要把 Desk 入口的初始模型直接設為指定尺寸與薄殼配置，同時保留 legacy route、Wall 行為與使用者已保存的參數。

## What Changes

- 新增 `opengrid-stackable-box` 的 Desk preset：`x=8`、`y=4`、`height=50`、`thinShellMode=true`、`basePlateMode=false`。
- 新增 `opengrid-stackable-cylinder` 的 Desk preset：`diameter=60`、`height=50`、`thinBottomMode=true`、`bottomPlateMode=false`。
- 兩個 preset 的其他參數沿用各自目前已驗證的 model defaults。
- 維持 system-scoped saved snapshot 優先於 Desk preset；context-free route 不受影響。
- 依新的 Desk effective preset 重新產生方盒與圓盒的 static preview assets。
- 增加 preset、fallback、persistence precedence、初始 CAD controls 與 preview asset 的行為測試。

## Capabilities

### New Capabilities

- `opengrid-desk-container-presets`: 定義 Desk System 方盒與圓盒的初始參數、模式與對應 preview identity。

### Modified Capabilities

<!-- Existing system-context requirements are preserved; this change only adds Desk container preset values. -->

## Impact

- `src/features/cad/system-entry-context/index.ts` 的 Desk preset resolver。
- Desk route 的 component parameter store fallback 與 CAD workspace 初始 generation 行為測試。
- `tests/unit/`、`tests/e2e/` 中的 system preset、persistence、workspace 與 preview coverage。
- `public/model-previews/opengrid-stackable-box-desk.png` 與 `public/model-previews/opengrid-stackable-cylinder-desk.png`。
- 不新增 component、model id、route、Worker 欄位、CAD geometry contract 或外部依賴；context-free 與 Wall 行為維持不變。

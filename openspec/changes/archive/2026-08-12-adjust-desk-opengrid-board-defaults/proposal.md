## Why

Desk System 的 OpenGrid board 目前沿用官方全域的角落倒角與角落螺絲孔預設，首次進入時會產生 Desk 不需要的外觀與孔位。螺絲孔模式也位於螺絲尺寸來源之後，操作順序不符合先選擇孔位策略、再選擇螺絲規格的使用流程。

## What Changes

- 將 Desk System 的 OpenGrid board 有效 preset 設為 `chamfers=none` 與 `screwMode=none`，其餘參數與現有 Desk preset 相同。
- 保留 context-free 與 Wall OpenGrid board 的官方全域 defaults：`chamfers=corners`、`screwMode=corners`。
- 讓 Desk route 的全部恢復預設與單欄恢復操作都回到 Desk 有效 preset，避免恢復後回到全域角落模式。
- 將「螺絲孔模式」選單移到「螺絲尺寸來源」之前，並保留其條件式列／欄設定與模式區塊相鄰。
- 增加 system preset、restore 行為、context isolation、表單順序與初始 Desk route 的行為測試。
- 不變更 OpenGrid model ID、route、Worker protocol、CAD geometry 或 export contract。

## Capabilities

### New Capabilities

<!-- No new component or capability is introduced. -->

### Modified Capabilities

- `opengrid-system-entry-context`: 更新 Desk board 的有效 preset 與 context-aware restore 行為。
- `cad-workspace`: 明確定義 OpenGrid board 螺絲控制的操作順序。

## Impact

- `src/features/cad/system-entry-context/` 的 Desk preset resolver。
- OpenGrid component panel 的 effective-default/restore wiring 與表單排序。
- OpenGrid system-context unit tests、route E2E tests，以及必要的 restore/layout coverage。
- 既有 context-free 與 Wall 行為、參數 persistence schema、Worker/CAD/export contract 不受影響。

## Why

薄殼模式的模型渲染速度明顯較慢，但目前使用者在切換模式時沒有清楚的效能提示，容易在尚未確認形狀前就承受較長的預覽等待。現在補上提示，可引導使用者先以一般模式確認形狀，再在下載前切換為薄殼模式。

## What Changes

- 在 OpenGrid 堆疊盒、堆疊圓柱與定位柱面板中，選取薄殼模式後顯示紅色效能警語。
- 使用一致且語法清楚的文案：`注意：薄殼模式會明顯降低模型渲染速度。建議先使用一般模式確認形狀，下載前再切換至薄殼模式。`
- 保留既有薄殼模式的幾何、參數、預覽、持久化與 STEP/STL 下載行為，不改變模式本身的功能契約。
- 為三個面板補上使用者可觀察的警語測試，確認薄殼模式顯示警語、其他模式不顯示警語。

## Capabilities

### New Capabilities

<!-- No new capability is introduced. -->

### Modified Capabilities

- `cad-workspace`: 既有 OpenGrid 薄殼模式控制在啟用時必須提供渲染效能警語。

## Impact

- 受影響的 UI：OpenGrid 堆疊盒、堆疊圓柱與定位柱的 Svelte 參數面板。
- 受影響的測試：對應的 Playwright workspace 行為測試。
- 不涉及 Worker、CAD kernel、API、參數 schema、模型生成或匯出檔案格式變更。

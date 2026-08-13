## Why

正向的盒體側開口（後方 `+Y`、右方 `+X`）目前會在內壁留下約 0.04 mm 的薄層，因為 cutter 起始面沒有覆蓋到完整壁厚。這會讓啟用下切深度的四方開口在預覽與匯出幾何中看起來沒有完全切穿，且現有開口品質探針會避開這個薄層而無法偵測。

## What Changes

- 修正正常盒體與薄殼盒體正向側面的開口 cutter 起始位置，讓 `+X` 與 `+Y` 完整切穿側壁及其上緣輪廓。
- 保留 `-X`、`-Y` 的既有幾何、開口參數、角落橋接、頂部導軌與模式行為。
- 新增行為導向的幾何回歸測試，驗證四個方向在有效下切深度下均無殘留側壁薄層，並涵蓋正常與薄殼模式。
- 保留既有 `opengrid-stackable-box` model ID、路由、參數格式、匯出檔名與正常未啟用開口的行為。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-box`: 要求每個啟用的四方盒體開口都必須完整穿過所選側壁與頂部輪廓，不得因側面方向留下薄層。

## Impact

- 影響 `src/cad-kernel/components/opengrid-stackable-box/geometry.ts` 的側開口 cutter 建構。
- 擴充 `tests/worker/opengrid-stackable-box.integration.test.ts` 的 B-Rep 行為驗證。
- 不新增依賴、不變更公開 API、model ID、路由或現有參數／匯出契約；既有 OpenGrid 元件 ID 保持不變。

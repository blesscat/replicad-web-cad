## Why

OpenGrid 圓柱支柱目前只能透過滑桿或文字框輸入長度，常用的 6 mm 與 8 mm 缺少快速入口；同時上端固定 1 mm chamfer 的外形需要調整為更短的 0.5 mm。這次變更改善常用尺寸操作，並更新上端幾何而不改變既有模型識別或自訂長度能力。

## What Changes

- 在 OpenGrid 圓柱支柱的總長度控制下提供 6 mm 與 8 mm 的常用長度快選。
- 快選寫入既有的 `length` 欄位；保留 3–500 mm 的整數文字輸入與滑桿範圍，預設長度仍為 5 mm。
- 將上端 45° equal-distance chamfer 從固定 1 mm 改為 0.5 mm。
- Plain 模式的下端 chamfer 維持 1 mm；連接底版模式的 Ø7 × 0.8 mm 底部凸台維持不變。
- 保留 `modelId=opengrid-pillar`、`buildKey=opengrid-pillar`、路由、參數欄位與既有匯出命名規則，不構成相容性遷移。

## Capabilities

### New Capabilities

None. This change refines the existing OpenGrid pillar capabilities.

### Modified Capabilities

- `opengrid-pillar-generator`: 更新 plain 與連接底版模式的上端 chamfer 尺寸與相應端部幾何驗證；plain 下端維持 1 mm。
- `cad-workspace`: 為 OpenGrid 圓柱支柱的長度控制增加 6 mm、8 mm 快選，且快選必須沿用既有輸入驗證、生成、持久化與狀態流程。

## Impact

- 影響 `src/cad-kernel/components/opengrid-pillar` 的幾何 builder、品質檢查與整合測試。
- 影響 `src/cad-contract/units/opengrid-pillar.ts` 的固定幾何常數與相關單元測試，以及 OpenGrid pillar 面板與 E2E 測試。
- 不新增 Worker 訊息、模型參數、API、依賴或新的 OpenGrid component；既有 `opengrid-pillar` 識別保持不變。

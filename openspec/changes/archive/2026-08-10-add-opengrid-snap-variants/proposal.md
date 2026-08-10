## Why

目前 `opengrid-snap` 的 Full/Lite 參考模型混用了已挖孔的 STEP，無法把原始實心 body 與功能孔洞分開控制，也無法穩定支援不同的 Snap 組成。新的 Bare Standard 與 Directional STEP 參考模型提供了正確的來源；現在需要把它們整理成可選的 Standard/Directional、Full/Lite 與孔洞組合，並讓半格與四分之一格沿用完整組裝後的 OpenGrid 邊界裁切。

## What Changes

- **BREAKING** 將 `opengrid-snap` 的 Standard Full/Lite 基準改為原始實心 body；四周定位孔與中心 remover 孔改為獨立、可選的幾何特徵。
- 擴充 `opengrid-snap` 參數契約，加入 `profile: Standard | Directional`、`fourCornerLocatingHoles` 與 `centerRemoverHole`，並保留既有 `variant`、`offset`、`halfCellX`、`halfCellY`。
- 以 `halfCellX`/`halfCellY` 表示完整、半格與四分之一格；完整的 Body、Snap、Side Holder 先完成放置，再套用共同的 OpenGrid 外框與斜角卡入面裁切。
- 新增 Directional Full/Lite 的獨立幾何 profile；Directional 不以旋轉 Standard 取代，並保留其不對稱方向與 variant-specific 細節。
- 固定孔徑、孔中心與既有固定 body 細節，不因 offset 或半格裁切而縮放；若孔被邊界裁到，結果必須是固定孔幾何的自然裁切。
- 更新 UI、參數驗證、瀏覽器保存、Worker 生成、STEP/STL 匯出與品質檢查，涵蓋兩種 profile、兩種尺寸、四種孔洞組合及完整/半格/四分之一格。
- 保留既有穩定 `opengrid-snap` modelId、buildKey 與 route；既有保存資料缺少新欄位時，安全回退到 Standard 且關閉可選孔洞。
- 不修改 OpenGrid board generator 的參數或行為。

## Capabilities

### New Capabilities

沒有新增獨立 component；本 change 擴充既有 Snap capability。

### Modified Capabilities

- `opengrid-snap`: 改用 Bare Standard 基準，增加 Standard/Directional profile、可選孔洞與完整組裝後的半格/四分之一格裁切要求。
- `component-parameter-persistence`: 保存與恢復 Snap 的 `profile`、`fourCornerLocatingHoles` 與 `centerRemoverHole`，並安全處理舊版 Snap snapshot。

## Impact

- 影響 `opengrid-snap` 的 normalized contract、CAD-kernel builder、Worker 參考資產／profile、catalog controls、參數保存及 STEP/STL export。
- 四個 Bare STEP 只作為 repository-owned 參考 fixture 或幾何校驗基準；runtime 不得依賴 `/Users/.../Downloads` 的絕對路徑。
- Standard 的 Body、Side Holder 與可控孔洞適合逐步改為程式生成；Directional 需使用獨立 profile，初期可保留 source-backed fixture 作為回歸基準。
- 需要新增幾何、拓撲、孔徑、方向、邊界裁切與匯出的測試矩陣，但不需要新增 component identity 或 board API。

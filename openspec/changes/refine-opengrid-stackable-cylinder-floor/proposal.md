## Why

目前的可堆疊圓柱底部仍以 5 mm 平底與內側圓角收尾，會讓底部邊緣形成不利於列印的懸空／填料區，也使中心孔的階梯深度不符合新的底板設計。這次調整將底部改成中央較薄、內外平行的 45° 過渡面，讓相同外徑的圓柱更容易列印與堆疊，同時保留既有元件的 route、modelId 與參數介面。

## What Changes

- 修改既有 `opengrid-stackable-cylinder` 的底部剖面：中央平底最薄處改為 3 mm，底部內側過渡面改為與外側下方斜面平行的 45° 斜面，斜面法向壁厚維持 2 mm。
- 保留 2 mm 直立壁厚、頂部外緣 90°、頂部內側 2 mm／45° 導角，以及底部外側 0.8 mm／45° 導角、`Z=2.6 mm` 垂直段與外側 2 mm／45° 主斜面。
- 移除底部內側原有的 filler／fillet 收尾，不新增加厚堆疊環；堆疊仍只靠底部突出與上方內腔導引。
- 將中心孔與四個外圍孔的階梯剖面改為由底部往上 `Ø5.05 mm × 2 mm`，再接 `Ø7.05 mm × 1 mm`，總孔深 3 mm。
- 保留 14 mm 格線與最外層四個 X/Y 軸孔規則，並同時檢查外緣 2 mm 安全距離與內部中央平底範圍；孔不得切入 45° 內側斜面。無法安全容納時只保留中心孔或前一個安全格層。
- 為同外徑堆疊加入建議的 0.2 mm 徑向列印間隙：底部突出相對上方內腔縮小 0.2 mm，保留 2 mm 主壁厚，且不宣稱不同外徑互配。
- 更新幾何品質檢查、孔位／孔深檢查、同外徑堆疊探針、匯出驗證、單元／整合／E2E 測試與相關文件。
- **BREAKING** 既有 `opengrid-stackable-cylinder` 的實際底部幾何、堆疊配合尺寸與孔深會改變；穩定的 `modelId`、`buildKey`、route、外徑／高度參數範圍與既有元件 ID 保持不變。

## Capabilities

### New Capabilities

無。本次是既有圓柱能力的幾何與列印行為修訂。

### Modified Capabilities

- `opengrid-stackable-cylinder`: 修改底部斜面、中央最小底厚、階梯孔深度、外圍孔安全條件與同外徑堆疊間隙要求。

## Impact

- 影響 `src/cad-kernel/components/opengrid-stackable-cylinder/` 的剖面與孔洞建模，以及該元件的幾何品質診斷。
- 影響 `src/cad-contract`、Worker 生成／錯誤映射、model catalog 或參數顯示中與新幾何診斷相關的型別與訊息；不改變既有 route 或參數 persistence identity。
- 影響圓柱的 STEP／STL 輸出形狀與同外徑實體列印配合，但不新增 CAD kernel 或後端依賴。
- 需要針對最小外徑、最大外徑、側孔剛好切換、斜面邊界、中心孔剖面與兩個同外徑模型的堆疊進行回歸驗證。

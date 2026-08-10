## Why

目前的 `opengrid-stackable-cylinder` 只有 3 mm 中央平底與平行 45° 內部斜坡版本；這個版本適合降低底部懸空並方便列印，但無法直接提供原本 5 mm 底厚的外觀與孔階梯比例。需要保留目前薄底幾何，同時讓一般使用者預設看到原本的 5 mm 底厚版本。

## What Changes

- 在既有 `opengrid-stackable-cylinder` 參數快照中加入可持久化的薄底模式選項，預設為關閉，並加入一個控制所有底部孔的總開關，預設為開啟；維持既有 `modelId`、`buildKey`、route 與外徑／高度控制。
- 保留原本的薄底模式不變，另加入預設關閉的底板模式；底板模式使用 3 mm 底厚的預設式垂直內壁與 0.6 mm 底角圓角，只切除紅線以下的腳端，保留 2+1 mm 階梯孔與相同外徑堆疊，讓外側 45° 斜面後直接接平底。
- 預設一般模式恢復原本的 5 mm 底厚外觀與內側底角收尾；孔階梯改為由底部 `Ø5.05 mm × 4 mm` 接內部 `Ø7.05 mm × 1 mm`，總深度維持 5 mm。
- 薄底模式保留目前已完成的 3 mm 中央平底、內外平行 45° 斜坡、無 filler／內部 fillet 與同外徑堆疊幾何；其孔階梯維持 `Ø5.05 mm × 2 mm` 接 `Ø7.05 mm × 1 mm`。
- 三種模式在底部孔總開關開啟時都保留中心孔、14 mm X/Y 最外圈四孔規則與外緣 2 mm 安全限制；關閉時一次移除中心孔與全部外圍孔，不提供個別孔開關。相同外徑堆疊與輸出功能仍保留，孔位安全計算依各模式的底部可用區域驗證。
- 更新參數驗證、瀏覽器 persistence、Worker builder、品質報告、模式與底部孔總開關控制項、說明文字、匯出識別與 unit／Worker／E2E 測試。
- **BREAKING** 同一外徑／高度的既有生成結果可能因模式與孔階梯更新而改變；既有缺少模式欄位的保存快照必須安全地解讀為預設一般模式且底部孔開啟。

## Capabilities

### New Capabilities

無。本次不新增 component 或 modelId。

### Modified Capabilities

- `opengrid-stackable-cylinder`: 增加底部模式選擇、模式專屬底部幾何與孔階梯規格，並保留共同的外孔、堆疊、品質驗證與匯出契約。

## Impact

- 影響 `src/cad-contract/units` 的圓柱參數型別、驗證、預設值、bounds 與含模式／孔狀態的匯出檔名識別。
- 影響圓柱 CAD-kernel builder：依模式建立 5 mm 一般底部、原本 3 mm 薄底或切除下方腳端的 3 mm 底板剖面，依模式切換孔段深度，並在總開關關閉時略過所有孔切割與孔品質探針。
- 影響 model catalog、Svelte panel、workspace raw-parameter parsing、Worker dispatch 與 browser parameter persistence；UI 只提供一個底部孔總開關，不提供個別孔控制。
- 需要保留既有保存資料的相容解讀：沒有新模式欄位時視為一般模式、沒有孔開關欄位時視為底部孔開啟；模式與孔狀態都應納入 export metadata，避免不同幾何產生同名檔案。
- 需要新增三種模式的最小／最大外徑、孔位門檻、孔深、B-Rep、堆疊與 STEP／STL 回歸覆蓋。

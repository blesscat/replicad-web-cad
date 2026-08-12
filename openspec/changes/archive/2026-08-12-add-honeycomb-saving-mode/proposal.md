## Why

目前方盒與圓盒的連續實心側壁與底板會增加材料用量與列印時間。使用者需要一個可明確開關的六角鏤空省料模式，同時維持既有定位孔、底部孔網格、側開口與堆疊介面，避免省料版本變成另一套不相容的盒體。

## What Changes

- 新增方盒與圓盒共用語意的 `honeycombMode` 布林參數，預設關閉並相容既有持久化快照。
- 開啟時，方盒四側壁與底板可用區、圓盒圓周壁與圓形底板可用區改用可列印的六角鏤空網格。
- 保留外框、角落、堆疊／定位介面、原有底部孔、孔周圍保護區與四向側開口邊界；六角孔不得改變或切掉既有功能孔。
- 省料模式沿用各模型原有的高度、footprint、模式選擇、孔位、開口與匯出流程，並以 mode-specific 檔名區分省料輸出。
- 以批次面板級幾何組裝或切割建立六角網格，避免逐孔 Boolean 造成預覽與匯出效能退化。
- 新增品質檢查與行為測試，驗證六角鏤空、原孔／介面保留、單一有效 B-Rep、材料體積下降與小尺寸 fallback。

## Capabilities

### New Capabilities

無。省料模式是既有 OpenGrid 方盒與圓盒的新增 profile 行為，不新增 model ID、route 或獨立 component。

### Modified Capabilities

- `opengrid-stackable-box`: 增加六角省料參數、面板鏤空、底部保護區、孔位不變與省料匯出契約。
- `opengrid-stackable-cylinder`: 增加六角省料參數、曲面側壁／圓形底部鏤空、階梯孔與同直徑堆疊介面保留契約。

## Impact

- 參數契約、預設值、驗證、持久化 hydration、UI 控制項與 STEP/STL 檔名。
- `src/cad-kernel/components/opengrid-stackable-box/` 與 `opengrid-stackable-cylinder/` 的 B-Rep builder、幾何 helper 與 quality gate。
- 方盒與圓盒的 Worker 生成測試、單元／整合測試、預覽與匯出驗證。
- 不新增外部依賴，不改既有 model ID、route、Worker message 形狀或正常模式的幾何。

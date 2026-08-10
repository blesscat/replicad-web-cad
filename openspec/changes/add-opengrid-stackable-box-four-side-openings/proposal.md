## Why

`opengrid-stackable-cylinder` 已經有一致的四方向開口操作介面，但 `opengrid-stackable-box` 目前只有底部孔洞與底版模式控制。使用者需要在堆疊盒上用相同的前／後／左／右開口控制方式，同時保留盒體自己的矩形結構與堆疊介面。

## What Changes

- 在既有 `opengrid-stackable-box` 參數快照加入四個方向、每方向三個欄位的開口介面：下切深度、底部長度、側壁角度。
- 讓開口控制、預設值、欄位驗證、復原、persistence 與輸出識別跟堆疊圓柱的四向開口介面一致；零深度代表該方向不開口。
- 在盒體面板中加入相同的 `四個方向開口設定` 分組與前方／後方／左方／右方子分組，並保留現有底部孔洞與盒體模式控制。
- 以堆疊盒自己的矩形側壁、圓角頂部滑軌與底部模式建立開口幾何；不移植圓柱的旋轉剖面、圓周角度計算、圓形切法或圓柱 B-Rep builder。
- 依每個方向的盒體寬度／深度、側壁與角落保留量、目前底面高度及頂部滑軌檢查開口是否合法，拒絕切穿底板、破壞角落結構或讓相鄰開口合併。
- 保留 `modelId=opengrid-stackable-box`、route、28 mm／0.5 格尺寸、底部四角孔、全孔模式、底版模式、堆疊導向與 STEP／STL 工作流程。
- 既有沒有開口欄位的保存資料自動正規化為四向未開口；沒有啟用開口時維持既有幾何與輸出檔名識別。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opengrid-stackable-box`: 增加四方向開口參數、使用者介面、矩形開口幾何、品質驗證與開口狀態的輸出識別。

## Impact

- 參數契約、預設值、驗證、公開 unit exports 與模型檔名：`src/cad-contract/units/opengrid-stackable-box.ts` 及相關 index。
- raw parameter 解析、persistence、catalog schema、堆疊盒面板與 degree unit 顯示。
- Worker-only 堆疊盒 builder／geometry 與品質 gate；需要新增方向開口的 B-Rep、底板／正常模式相容性與失敗保護。
- unit、Worker integration、runtime／persistence 與 E2E 測試；不新增 model、route、外部依賴或改變既有 component identity。

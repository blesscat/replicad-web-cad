## Why

目前 OpenGrid Snap 讓使用者分別選 X/Y 半格方向，但實際需求只有完整格、1/2 格與 1/4 格，而且方向應固定配合官方 `xleft/ytop` 邊界。現有半格裁切只依 Snap 自身外框建立簡化切面，放入官方 70 × 70 mm Lite 2×2 板時仍會與邊緣結構重疊，無法可靠塞入。

## What Changes

- **BREAKING** 將 Snap 的使用者參數由獨立 X/Y 半格方向改為單一 `footprint: full | half | quarter`；`half` 固定使用官方 `xleft` canonical orientation，`quarter` 固定使用 `xleft + ytop`。
- 保留既有 `opengrid-snap` modelId、buildKey 與 route；OpenGrid 底板的 X/Y 半格方向 API 不變。
- 將既有 Snap persistence 中的 `halfCellX`/`halfCellY` 安全轉換為 `full`、`half` 或 `quarter`，不讀取或合併 `opengrid` 底板資料。
- 先完成 Body、Side Holder 與 Snap 的完整組裝，再對所有受影響零件套用官方 OpenGrid 邊界互補切面；切除面必須包含可塞入的斜角／卡入輪廓，不能是單純平面矩形裁切。
- 將官方 `opengrid-lite-2x2-xleft-ytop-official-default-none-corners-none.step` 納入 repository-owned fit fixture，驗證 1/2 與 1/4 的實際裝配位置與邊界間隙。
- 保持 Full/Lite、Standard/Directional、外框增量、固定孔徑、孔中心、四周彈性槽與中心 remover 輪廓的既有語意；任何外框裁切不得縮放孔洞或固定幾何。
- 更新參數面板、驗證、保存、builder、quality gate、檔名與 unit/worker/e2e 測試矩陣。
- Runtime 不得依賴 `/Users/.../Downloads` 或其他開發者本機絕對路徑。

## Capabilities

### New Capabilities

沒有新增 component；fit 幾何與 footprint 選項屬於既有 `opengrid-snap` capability 的擴充。

### Modified Capabilities

- `opengrid-snap`: 以單一 full/half/quarter footprint 取代 Snap 的獨立 X/Y 選擇，並新增官方 OpenGrid 邊界 fit 與 canonical orientation 要求。
- `opengrid-half-cell`: 保留底板的 X/Y 半格契約，將 Snap 的公開 footprint 契約與底板方向欄位分離，並定義 canonical mapping。
- `component-parameter-persistence`: 保存新的 Snap footprint，並將既有方向欄位安全正規化為 footprint。

## Impact

- 影響 `src/cad-contract/units` 的 Snap contract、bounds、validation、normalization 與 export filename helpers。
- 影響 `src/cad-kernel/components/opengrid-snap` 的 profile/clip builder、品質檢查、repository assets 與 fit fixture loading。
- 影響 Snap catalog panel、workspace raw-input mapping、Worker generation 與 persistence migration。
- 需要新增官方板邊緣的 B-Rep fit／clearance 驗證，以及 Full/Lite × Standard/Directional × full/half/quarter × optional-hole 的回歸測試。
- 不新增 component identity，也不修改 OpenGrid board generator 的 rows、columns、connector、screw 或既有底板方向行為。

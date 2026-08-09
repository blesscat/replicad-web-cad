## Why

OpenGrid 的 28 mm 整格尺寸無法精準填滿不是整數格的目標長度，而現有 Snap 也沒有能嵌入自訂半格的參數契約。這會讓底板與 Snap 在需要 14 mm 半格補位時無法保持同一套座標與嵌入關係。

## What Changes

- 新增 OpenGrid 半格能力：X 軸使用「無／左／右」，Y 軸使用「無／上／下」；每個軸最多選一側，半格尺寸固定為 14 mm。
- 以 X/Y 方向選項直接表示是否使用半格，不新增或保存 `allowHalfCell` boolean。
- 支援無半格、單軸半格與雙軸半格；雙軸由 X 與 Y 選項組合產生，不增加左上、右上等獨立 Snap 變體。
- 更新 OpenGrid 尺寸計算與手動控制，使目標尺寸不足一個完整 28 mm 格時可以選擇合法的半格補位，並保持不超過目標尺寸的計算規則。
- 將相同的半格方向欄位加入 Snap generator，建立可嵌入 OpenGrid 半格的自訂 Snap 幾何與驗證、品質檢查及匯出流程。
- 更新 UI、Worker contract、參數驗證、localStorage persistence、模型尺寸顯示與測試 fixture。
- **BREAKING**：`opengrid-snap` normalized snapshot 從 `variant`／`offset` 擴充為包含 X/Y 半格方向；舊的 Snap persistence 必須安全回退到無半格預設。

## Capabilities

### New Capabilities

- `opengrid-half-cell`: 定義 OpenGrid 與可嵌入 Snap 共用的半格尺寸、X/Y 方向選項、單軸／雙軸組合、座標與邊界契約。

### Modified Capabilities

- `opengrid-snap`: Snap 支援自訂 X/Y 半格方向並嵌入對應的半格空間。
- `dimension-based-grid-count`: OpenGrid 尺寸計算可在各軸選擇完整格或一個半格補位。
- `cad-workspace`: OpenGrid 與 Snap panel 顯示互斥的方向選項與衍生尺寸，移除半格 boolean。
- `component-parameter-persistence`: 保存與驗證新的 OpenGrid／Snap 半格方向欄位，拒絕舊或不完整的半格 snapshot。

## Impact

- 影響 `src/cad-contract` 的 OpenGrid／Snap typed parameters、model catalog schema、尺寸計算 feature、兩個 component panel、CAD Worker dispatch、半格 B-Rep builder、bounds/quality gate、STEP/STL metadata 與相關 unit/e2e tests。
- OpenGrid 底板會延伸現有進行中的官方 generator contract；官方 28 mm profile 不變，半格是本專案自訂的邊界與嵌入擴充。
- Snap 半格不是官方 OpenGrid asset；需要由本專案建立並驗證自訂幾何，同時保留 Full/Lite 變體與既有 offset 語義。
- 既有非半格模型、Worker version-1 lifecycle、latest-wins、candidate commit 與 export ownership 維持不變。

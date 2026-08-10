## Why

目前多個 CAD 元件把 500 mm 同時當成手動輸入與 slider 上限，導致使用者在常用的小尺寸區間內拖曳時需要經過過大的範圍。六角柱已證明將兩種操作分離（slider 到 200 mm、文字輸入保留較大的合法範圍）較適合這類長度與高度參數，其他元件應採用一致行為。

## What Changes

- 保持目前各元件的合法文字輸入上限為 500 mm，包含基本 `box` 與六角柱的高度／長度欄位。
- 將可調高度／長度參數的 slider 上限設為 200 mm；手動輸入仍可輸入並建模至 500 mm。
- 保留 OpenGrid、OpenGrid 堆疊盒、分隔塊與網格元件的平面 footprint 500 mm 安全限制。
- 更新參數 schema、驗證訊息、元件說明、單元測試與 E2E attribute／輸入驗收，明確驗證 slider 與文字輸入使用不同上限。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cad-workspace`: 將共用尺寸輸入範圍與 slider 操作範圍分離，並維持基本方塊與 workspace 的 500 mm 尺寸規則。
- `box-normal`: 將盒體高度維持輸入 10–500 mm，slider 改為 10–200 mm。
- `opengrid-pillar-generator`: 將支柱長度維持輸入 3–500 mm，slider 改為 3–200 mm。
- `opengrid-divider-generator`: 將分隔牆高度維持輸入 2–500 mm，slider 改為 2–200 mm，同時維持平面 footprint 上限 500 mm。
- `opengrid-stackable-box`: 將盒內淨高維持輸入 10–500 mm，slider 改為 10–200 mm，同時維持 X/Y footprint 上限 500 mm。
- `opengrid-stackable-cylinder`: 將圓柱高度維持輸入 10–500 mm，slider 改為 10–200 mm；外徑既有 20–300 mm 範圍保持不變。
- `hexagonal-column`: 將既有高度文字輸入上限由 999 收回 500 mm，保留 1–200 mm slider 與 500 mm row-envelope 安全檢查。

### Impact

- 影響 `ParameterField`／model catalog 的欄位 metadata，以及各元件的 CAD contract validation。
- 不需要拆分共用的 500 mm 尺寸與 workspace 設定；本次只在欄位 metadata 中加入 200 mm slider 上限。
- 既有 500 mm 邊界測試、UI 說明、README／docs 與 E2E selector attribute 需要同步更新；六角柱的文字輸入上限由 999 收回 500，slider 維持 200。
- 不新增 model、route、API 或 OpenGrid component，因此既有 component ID 與命名保持不變。

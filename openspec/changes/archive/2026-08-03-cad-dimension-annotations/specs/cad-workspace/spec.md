## MODIFIED Requirements

### Requirement: Mesh viewport
The system MUST satisfy the following behavior:

viewport 必須使用 React Three Fiber 顯示最新 committed model 的 mesh，不得執行 B-Rep 建模或 STEP 匯出。對於 Prototype 的 committed box，viewport 也必須顯示貼附於方塊邊緣的寬度、深度與高度 3D 尺寸標註；標註內容必須與畫面中的同一個 committed model revision 一致。

#### Scenario: 有效 mesh

- **Given** Worker 回傳 positions、normals、indices、bounds 與 triangle count
- **When** worker client 驗證成功
- **Then** viewport 必須顯示可辨識的方塊
- **And** 相機 framing 必須使模型可見
- **And** 替換模型後必須釋放舊 geometry、material 與 GPU resource
- **And** viewport 必須同時顯示對應方塊邊緣的寬度 X、深度 Y、高度 Z 尺寸標註
- **And** 每組尺寸標註必須顯示以 mm 為單位的尺寸數值

#### Scenario: 尺寸標註對應 committed model

- **Given** workspace 已有一個成功 committed 的 box model
- **When** 使用者查看 3D viewport
- **Then** 寬度標註必須對應 X 軸方向的方塊邊緣
- **And** 深度標註必須對應 Y 軸方向的方塊邊緣
- **And** 高度標註必須對應 Z 軸方向的方塊邊緣
- **And** 標註必須包含連接模型邊緣的延伸線、尺寸線與可讀的數值標籤
- **And** 標註數值必須等於該 committed model 的 width、depth、height 參數

#### Scenario: 相機互動中的尺寸標註

- **Given** viewport 已顯示方塊與三組尺寸標註
- **When** 使用者旋轉、縮放或改變 viewport 尺寸
- **Then** 尺寸線與延伸線必須繼續錨定在對應方塊邊緣
- **And** 尺寸標籤必須跟隨標註的 3D 位置更新
- **And** viewport framing 必須使方塊與必要的尺寸標註保持可見

#### Scenario: 建模期間保留舊 preview

- **Given** 使用者已修改尺寸，新的 generation 尚未 committed，且上一個 committed model 仍保留在 viewport
- **When** 使用者查看 viewport
- **Then** 方塊尺寸標註必須仍對應畫面上保留的上一個 committed model
- **And** 尺寸標註不得提前顯示尚未 committed 的新輸入
- **And** viewport 必須維持既有 stale 狀態提示

#### Scenario: 沒有可用模型

- **Given** workspace 尚未有 committed model，或目前沒有可供預覽的 mesh
- **When** 使用者查看 viewport
- **Then** viewport 不得顯示尺寸線或尺寸標籤
- **And** viewport 必須顯示既有的無模型或 WebGL fallback 訊息

#### Scenario: 損壞 mesh

- **Given** response 缺少 buffer、index 越界、座標非有限或沒有三角形
- **When** mesh boundary validation 執行
- **Then** 不得把該 mesh 設為成功預覽
- **And** UI 必須顯示 mesh validation error
- **And** 主執行緒必須送出對應 candidate 的 model.discard
- **And** viewport 不得 crash
- **And** viewport 不得為該損壞 mesh 顯示尺寸標註

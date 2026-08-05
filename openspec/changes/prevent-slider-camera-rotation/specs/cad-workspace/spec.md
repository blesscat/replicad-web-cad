## MODIFIED Requirements

### Requirement: Mesh viewport

The viewport MUST use Threlte with Three.js to display the latest committed model mesh, regardless of whether the selected catalog entry is a box or a component. It MUST NOT execute B-Rep modelling or STEP export. Dimension annotations MUST describe the selected committed model's actual X, Y and Z bounds and MUST remain associated with the same committed model revision. While the committed model revision is unchanged, parameter input and stale-state changes MUST NOT change the viewport camera pose or framing; camera fitting MAY occur when the viewport size changes or when a new committed model revision replaces the current one.

#### Scenario: 有效 component mesh

- **Given** Worker 回傳 positions、normals、indices、bounds 與 triangle count for a selected component
- **When** worker client 驗證成功
- **Then** viewport 必須顯示可辨識的 component
- **And** 相機 framing 必須使模型可見
- **And** 替換模型後必須釋放舊 geometry、material 與 GPU resource
- **And** viewport 必須顯示對應 committed model 的 X、Y、Z 尺寸標註
- **And** 每組尺寸標註必須顯示以 mm 為單位的實際 bounds 數值

#### Scenario: 尺寸標註對應 modular-grid-base

- **Given** workspace 已成功 committed 一個 rows × columns 的 modular-grid-base model
- **When** 使用者查看 3D viewport
- **Then** X 標註必須等於 `columns × 20 mm`
- **And** Y 標註必須等於 `rows × 20 mm`
- **And** Z 標註必須等於 5 mm
- **And** 標註必須包含連接模型邊緣的延伸線、尺寸線與可讀的數值標籤

#### Scenario: 建模期間保留舊 preview

- **Given** 使用者已修改 component 參數，新的 generation 尚未 committed，且上一個 committed model 仍保留在 viewport
- **When** 使用者查看 viewport
- **Then** 尺寸標註必須仍對應畫面上保留的上一個 committed model
- **And** 尺寸標註不得提前顯示尚未 committed 的新輸入
- **And** viewport 必須維持既有 stale 狀態提示
- **And** viewport camera pose、model framing 與尺寸標註的畫面位置必須維持不變

#### Scenario: 參數輸入不觸發 viewport camera 旋轉

- **Given** viewport 已顯示 committed model，且使用者未在 3D viewport 內進行 orbit 操作
- **When** 使用者拖曳 slider、使用鍵盤調整 slider，或修改其他參數，而新 model revision 尚未 committed
- **Then** viewport 必須繼續顯示原本的 committed mesh
- **And** camera 的方向、target、zoom/framing 不得因輸入事件而改變
- **And** 輸入事件不得使既有模型被重新 fit 而產生旋轉或跳動

#### Scenario: 新 committed revision 更新 framing

- **Given** 使用者已修改參數，且新的 model revision 已成功 committed
- **When** viewport 替換成新的 committed mesh
- **Then** viewport 必須顯示新 revision 對應的模型與尺寸標註
- **And** camera framing 必須使新模型可見
- **And** 既有 Orbit 操作必須仍可使用

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

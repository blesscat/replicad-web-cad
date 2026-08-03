## Why

目前 CAD preview 只顯示方塊 mesh，使用者必須回看左側輸入欄位才能知道模型尺寸，無法直接把寬、深、高對應到畫面上的方塊邊緣。既有 committed model 已保留參數與 mesh bounds，現在可以在不改變 CAD Worker contract 的前提下補上可隨相機旋轉的 3D 尺寸標註。

## What Changes

- 在 committed box preview 上顯示寬度 X、深度 Y、高度 Z 三組尺寸標註。
- 每組標註包含貼近方塊邊緣的延伸線、尺寸線、端點標記與 `mm` 數值標籤。
- 尺寸線與標籤必須跟著 OrbitControls 的相機旋轉、縮放與 responsive viewport 更新。
- 以 committed mesh bounds 決定標註錨點，以 committed model parameters 顯示使用者輸入的 nominal 尺寸。
- 尺寸標註必須納入 viewport 的 camera framing；沒有可預覽模型時不顯示標註。
- 建模期間保留舊 preview 時，尺寸標註必須與舊 committed revision 一致，並沿用既有 stale 狀態提示。
- 補上尺寸標註幾何計算、viewport rendering 與瀏覽器驗收測試。

## Capabilities

### New Capabilities

<!-- No standalone capability is introduced; annotations extend the existing CAD workspace preview. -->

### Modified Capabilities

- `cad-workspace`: Extend the mesh viewport behavior with attached width, depth and height dimension annotations for the committed box model.

## Impact

- 主要影響 `src/features/cad/viewport/` 與 `src/components/cad/CadWorkspace.tsx` 的 metadata 傳遞及 viewport rendering。
- 可能新增純函式的 annotation geometry helper 與對應 unit tests、CAD route E2E assertions。
- 不修改 Worker message contract、CAD kernel、B-Rep lifetime、STEP export 或模型建模流程。
- 沿用現有 `@react-three/drei` 與 React Three Fiber，不新增 runtime dependency；標籤需維持可讀與可存取。

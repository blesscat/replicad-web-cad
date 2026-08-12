# Proposal: OpenGrid Open Shelf

## Why

OpenGrid Desk System 需要一個前方開口、可調格數與尺寸的斜向開格元件，讓每格仍延伸到後方背板，同時能以固定總高度控制不同仰角下的可用空間。現有底板、方盒與定位柱規格沒有涵蓋這種「底板水平、整個格架向前上仰」的組合，因此需要一個獨立且可持續擴充的 component contract。

## What Changes

- 新增穩定識別 `opengrid-open-shelf`，顯示名稱以 `OpenGrid ` 開頭，並提供 Desk System 的模型選擇入口與 `/cad/opengrid-open-shelf` 路由。
- 新增可調的外部 X/Y 格數、總體高度、內部 X 向格數、Z 向格數與前方開口仰角；預設為 X=4、Y=3、總高=50 mm、內部 X=1、Z=2、仰角 15°。
- 定義前方 `-Y` 開口的幾何：底板水平、背板垂直，所有斜向格層與頂板沿完整深度向前上仰；總高度是包含板厚的世界 Z 包絡高度，仰角增加時後方高度與格高相應降低。
- 定義材料厚度與定位特徵：底板 2 mm、外側板與頂板 1.6 mm、水平/垂直隔板與背板 1.2 mm；四角整合向下的純 Ø4.5 mm × 3 mm 圓柱定位柱，不加入 Ø7.05 mm 肩部或額外定位高度。
- 讓新 component 走既有 catalog、Worker、瀏覽器參數保存、預覽、STEP/STL 匯出與最新 generation lifecycle；既有 modelId、build key、路由與匯出契約保持不變。
- **BREAKING**：無。既有 component 的穩定識別與行為不變；本變更只增加新的 model entry。

## Capabilities

### New capabilities

- `opengrid-open-shelf`: OpenGrid 斜開格櫃的參數、幾何、角度限制、總高包絡、板厚、四角定位柱、驗證與 CAD/export contract。

### Modified capabilities

- `cad-workspace`: 將新 model definition、CAD route、parameter panel、Worker dispatch 與 export metadata 納入既有 workspace lifecycle。
- `home-model-selection`: 在 OpenGrid Desk System 顯示新模型卡片，並導向其專屬 route。
- `component-parameter-persistence`: 為新 stable modelId 保存獨立且經驗證的 typed snapshot，避免與其他 OpenGrid component 混用。
- `model-card-previews`: 為新可見 Desk entry 建立由 canonical generator 產生的靜態預覽資產與驗證目標。

## Impact

- 需要新增 CAD contract、參數 validator、component-local builder、catalog/route/panel/Worker registration、persistence schema 與測試。
- 需要新增 `opengrid-open-shelf-desk.png` 預覽資產，並納入既有 preview capture/verification workflow。
- 幾何採用既有 OpenGrid 28 mm full-pitch 與方盒相同的 `x*28-0.15`、`y*28-0.15` 內縮語義；不修改既有方盒的 Ø7.05 mm retaining shoulder。
- 新 entry 只放在 Desk System；既有 `opengrid-system-entry-context` 的 Desk-only generic 規則沿用，Wall Related 不新增此模型。

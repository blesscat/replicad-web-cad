## Why

自製 OpenGrid 底座以 7 mm 為半格、14 mm 為完整格，目前的 `opengrid` component 是依官方 28 mm OpenGrid 板型建立，無法直接產生適合這個底座的分隔件。需要一個獨立的分隔塊產生器，讓使用者以四個方向的格數快速建立一字型、L 型、T 型或十字型分隔牆。

## What Changes

- 新增獨立的 `opengrid-divider` CAD component，不修改既有 `opengrid` 或其他 OpenGrid 變更。
- 建立以 `left`、`right`、`up`、`down` 格數及 `height` 高度為核心的參數契約；完整格距固定為 14 mm、半格為 7 mm，方向格數以 0.5 格步進。
- 依非零方向自動判定一字型、L 型、T 型或十字型，並產生連續 5 mm 寬的分隔牆。
- 在分隔牆底部依 28 mm 定位中心距與產生長度自動配置直徑 5 mm、突出 1 mm 的定位柱；中心固定一顆，沿上下左右臂避免過密配置，重疊柱位需去重。
- 在分隔牆頂部建立安全的 1 mm 圓角，並在高度不足時拒絕無法生成的參數。
- 新增 `/cad/opengrid-divider` 路由、專屬參數面板、3D 預覽、STEP/STL 匯出與瀏覽器參數保存。
- 將新 component 加入 model catalog 與 `/models`，但保留既有 `/cad/opengrid` 的官方 28 mm 行為不變。
- 新增參數驗證、形狀分類、定位柱配置、幾何 bounds、B-Rep、mesh、Worker lifecycle、persistence、UI 與匯出測試。

## Capabilities

### New Capabilities

- `opengrid-divider-generator`: 定義 14 mm 完整格／7 mm 半格分隔牆的參數、形狀分類、定位柱配置、幾何建模、預覽與匯出行為。

### Modified Capabilities

- `cad-workspace`: 將新的 `opengrid-divider` component 註冊到模型路由、Worker 與專屬控制面板。
- `component-parameter-persistence`: 保存並恢復新的分隔牆參數，且與既有 `opengrid` 參數隔離。
- `home-model-selection`: 在模型選擇頁顯示新的 OpenGrid 分隔塊產生器與其 CAD 路由。

## Impact

- 影響 `src/cad-contract`、model catalog、CAD Worker、`src/cad-kernel/components/opengrid-divider`、Svelte component panel、路由與瀏覽器 persistence。
- 需要新增一個獨立的 Worker model builder 與測試 fixture；不得重用官方 OpenGrid 28 mm builder 的參數或幾何契約。
- Worker protocol version 維持現有版本；新 component 使用既有的 model validation、latest-wins、candidate/commit、revision lifetime 與 STEP/STL export lifecycle。
- 既有 `opengrid`、`opengrid-stackable-box` 及其目前分支上的未提交修改不在本變更的修改範圍內。

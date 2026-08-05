## Context

目前 `CadWorkspace` 以 Svelte 5 `$state` 保存 controller snapshot，並把 `snapshot.state.committed.mesh` 傳入 Threlte viewport。參數輸入會在新模型 commit 前多次更新 snapshot；由於 nested object 透過 `$state` 讀取時可能取得新的 proxy identity，`CadViewportScene` 目前的 `{#key mesh}` 會把尚未變更的 committed mesh 視為新 mesh。

`{#key mesh}` 會重建 `Bounds`。Threlte Extras 的 `Bounds` 在 mount/effect 時會 fit model bounds，並把 camera state 同步回 `OrbitControls`，所以每次 slider input 都可能重新調整 camera。Canvas 與左側 slider 的 DOM 事件範圍彼此分離，修正重點應放在 viewport lifecycle identity，而不是阻止 pointer event bubbling。

## Goals / Non-Goals

**Goals:**

- 讓輸入更新期間保持目前 committed model 的 camera pose、target、framing 與尺寸標註視覺位置。
- 只有 committed model revision 真正替換時，才觸發模型替換、resource cleanup 與必要的 bounds fit。
- 保留現有 OrbitControls、stale preview、dimension annotations 與 GPU resource cleanup 行為。
- 以可觀察的瀏覽器測試鎖定 slider pointer drag、slider keyboard input 與新 revision commit 的行為。

**Non-Goals:**

- 不改變 Worker message contract、CAD kernel、model generation debounce 或 export flow。
- 不改變使用者主動在 Canvas 上 orbit、zoom、pan 的控制方式。
- 不處理 viewport resize 時既有的 camera fitting 行為，除非回歸測試顯示本變更意外影響它。
- 不新增相機 preset、camera persistence 或跨頁面保存功能。

## Decisions

### 1. 以 committed model revision 作為 viewport replacement identity

從 workspace 將穩定的 `committed.revision` 與 mesh 一起傳給 viewport，再把 primitive revision 傳到 scene。`Bounds` 的 keyed subtree 使用 revision，而不是 `mesh` object。只要輸入仍指向同一個 committed revision，snapshot、raw parameter 或 stale 狀態更新都不會觸發 keyed subtree 重建；收到新 revision 時，key 才會改變並觸發一次模型替換與 framing。

選擇 revision 而不是移除 key，是因為 revision 已是既有 committed model 的穩定識別，且能保留 model replacement 時的生命週期邊界。完全移除 key 雖可避免錯誤 remount，但需要另建明確的 geometry 變更偵測與 bounds fit 流程，容易讓新模型沒有正確 framing。

### 2. 保持 camera/controls 在 keyed model subtree 外

`PerspectiveCamera` 與 `OrbitControls` 維持在不隨 model revision 重建的 scene 層級；只有 `Bounds`、`ModelMesh` 與 dimension annotation 屬於 revision-keyed subtree。這樣參數輸入不會重建控制器，而新 revision 替換時可沿用現有 controls 的 orbit state，交由現有 `Bounds` lifecycle 進行必要的 fit。

### 3. 以 behavior-focused E2E 驗證 camera 穩定性

在既有 CAD route E2E 測試中，以 dimension annotation 的 bounding box 作為可觀察 camera pose/framing proxy：在 ready 狀態記錄標註位置，調整 slider 後於 stale、尚未 commit 的窗口再次讀取並比較；再等待新 revision ready，驗證新尺寸標註與 viewport 可見性。測試同時涵蓋滑鼠拖曳與鍵盤 ArrowRight，避免只驗證單一輸入事件路徑。

## Risks / Trade-offs

- [新 revision 未正確傳遞或 identity 不穩定] → 保留 primitive revision 的明確型別與 null handling，並以新模型 commit 的 E2E 測試確認一次且只在 revision 替換時重新 framing。
- [移除 mesh key 後舊 GPU resource 未釋放] → 不移除 model replacement 的 keyed boundary；檢查 `ModelMesh` geometry/material cleanup，並執行既有 check/test/build gate。
- [Bounds fit 與使用者主動 orbit 的狀態互相影響] → 讓 OrbitControls 留在 scene 外層，並保留現有 orbit interaction 測試，確認新 revision 更新後仍能旋轉且參數輸入本身不會改變 pose。
- [瀏覽器渲染 timing 造成 bounding-box assertion 不穩定] → 在測試中等待 stale 狀態或固定的短暫輸入窗口，使用合理的像素 tolerance，不檢查 Three.js 或 Svelte 內部實作細節。

## Migration Plan

1. 更新 viewport props 與 scene identity 傳遞，讓 keyed model subtree 改用 committed revision。
2. 加入 slider drag/keyboard 與新 revision commit 的 E2E regression coverage。
3. 執行 `pnpm check`、`pnpm test`、`pnpm test:e2e`、`pnpm build` 與 `openspec validate`。
4. 若回歸失敗，回退本 change 的 viewport identity 傳遞與測試變更；不需要資料或 Worker protocol migration。

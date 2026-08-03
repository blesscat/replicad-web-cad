## Why

全專案掃描發現 production code 與測試中有多層 ternary、條件式建立 object，以及多行 JSX ternary，讓 CAD lifecycle、錯誤映射與測試意圖不易閱讀。現在先整理這些控制流程與少量結構性維護問題，可以降低後續 CAD 功能擴充時的理解與修改成本，且不需要改變既有行為契約。

## What Changes

- 將 `CadWorkspace` 的條件式 field error object 改為明確的 control flow。
- 將 `CadWorkspace` 的 operation progress message nested ternary 改為具名 mapping 或 switch。
- 將 `CadViewport` 的 mesh/empty-state JSX 分支改為清楚的 render helper 或 early return。
- 將 `CadWorkerRuntime` 的 error code 與 error stage nested ternary 改為可讀的 mapping/branch。
- 將 units test 中建立 fallback object 的 ternary 改為明確的已驗證 fixture。
- 視需要拆分 `CadWorkspace` 的 Worker lifecycle、事件處理與 UI 責任，降低單一 component 的認知負擔。
- 讓 state 的初始尺寸直接使用既有 prototype configuration，避免 default values 漂移。
- 抽出 E2E Firefox WebGL skip 條件的共用 helper，避免重複測試 setup。
- 保留既有 CAD state machine、Worker protocol、路由、可存取語意、匯出結果與視覺行為。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a readability and maintainability refactor with no spec-level behavior change, so this change uses `skip_specs: true`.

## Impact

- 主要影響 `src/components/cad/CadWorkspace.tsx`、`src/features/cad/viewport/CadViewport.tsx`、`src/workers/cad.worker.ts` 與相關 unit/E2E tests。
- 可能調整 `src/features/cad/state/` 與共用 configuration 的依賴方向，避免重複定義 prototype defaults。
- 不新增 runtime dependency，不修改 Worker message contract、CAD kernel ownership、模型生成或 STEP export 行為。
- 驗證範圍包含 type check、build、unit/worker tests、Chromium E2E 與 headful Firefox E2E。

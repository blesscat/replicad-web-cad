## Context

目前 CAD UI 與 Worker runtime 已有清楚的 domain boundary，但部分控制流程仍以巢狀 ternary、inline conditional object 與大型 JSX 分支表達。這個 change 是純 refactor；既有 CAD state、Worker contract、路由、可存取語意與匯出行為都必須維持不變。動機與完整問題清單見 `proposal.md`。

## Goals / Non-Goals

**Goals:**

- 讓條件分支使用具名 helper、switch 或 early return 表達。
- 讓 `CadWorkspace`、`CadViewport` 與 `CadWorkerRuntime` 的核心分支可以單獨閱讀與測試。
- 消除重複的 prototype default 與 Firefox E2E skip setup。
- 保持現有測試以行為與公開輸出為主，不新增 implementation-string assertion。

**Non-Goals:**

- 不重新設計 CAD state machine、Worker protocol 或錯誤碼集合。
- 不改變 UI 文案、DOM accessibility contract、CSS 視覺結果或下載檔案格式。
- 不在本 change 導入 ESLint、formatter 或其他新的 runtime/development dependency。
- 不進行大規模 hook/component 拆分；只有能清楚隔離且不改變 lifecycle 的純 helper 或小型 view extraction 才納入。

## Decisions

### 1. 用具名 helper 取代 nested ternary

建立小型、純函式處理下列 mapping：

- `CadWorkspace` operation stage → progress message。
- `CadWorkerRuntime` error message/command → `CadErrorCode`。
- `CadWorkerRuntime` command kind → `CadErrorStage`。

每個 helper 使用 early return 或 switch，保留原本的優先順序；不使用 object lookup 取代需要順序判斷的錯誤字串規則，避免改變相同錯誤訊息同時符合多個條件時的結果。

替代方案是保留 ternary 並只調整格式，但那仍會保留目前的巢狀閱讀成本，因此不採用。

### 2. 用小型 view/helper 取代條件式 JSX 與 conditional object

`CadViewport` 將 mesh canvas 與 empty state 的內容分支移到具名 render component/helper，root container 只負責共用 viewport shell、stale badge 與 state class。`CadWorkspace` 的 field error state 使用明確的 `if/else` 或 helper 回傳完整欄位錯誤 object。

units test 改用命名的 valid input fixture；先驗證 fixture，再直接傳入 `boundsForBox`，不以 fallback object 掩蓋測試前置條件。

替代方案是把 conditional expression 存成匿名中間變數，但如果仍由 ternary 建立 JSX/object，無法滿足可讀性 guardrail，因此不採用。

### 3. 由單一 configuration 擁有 prototype defaults

`INITIAL_PARAMETERS` 改為引用 `PROTOTYPE_CONFIGURATION.defaultDimensions`，讓 model catalog、state initialization 與 UI 初始輸入使用同一份 domain value。這只消除資料重複，不改變目前的 `20 × 30 × 40` 行為。

### 4. 將 Firefox skip 條件集中在測試 helper

E2E 僅在需要 WebGL 的測試呼叫共用 skip helper；static route、fallback 與 responsive 測試不受影響。helper 維持目前的 headless/headful 判斷與 skip 訊息，headful Firefox gate 仍可完整執行。

### 5. 以既有 quality gates 驗證純 refactor

每一組 refactor 後執行 type check 與 unit tests；完成後執行 build、Chromium E2E 與 `pnpm test:e2e:firefox`。不以 source text 驗證重構方式，僅以既有 runtime behavior、公開輸出、accessibility state 與測試結果確認沒有回歸。

## Risks / Trade-offs

- [Helper extraction 改變錯誤映射優先順序] → 依目前 ternary 從上到下的順序實作 early return，並保留 protocol/runtime tests。
- [Viewport extraction 影響 React Three Fiber hydration 或 WebGL fallback] → 維持同一個 `Canvas` props、fallback markup、`aria-label` 與 existing E2E assertions。
- [共享 default object 被意外修改] → 將 configuration 視為 readonly domain value，必要時在 state boundary 建立明確 shallow copy，而不在各 consumer 重新填 literal。
- [測試 helper 掩蓋瀏覽器差異] → 保留 headless skip 與 headful Firefox 專用 gate，並分別執行兩套 E2E command。
- [大型 component 拆分擴大 scope] → 先完成純 helper 與局部 view extraction；只有能在不改 lifecycle ownership 的前提下改善閱讀性才拆分，否則保留現有 component 邊界。

## Migration Plan

1. 先建立純 mapping/render helper，保留原有測試與 public exports。
2. 逐一替換六個明確 guardrail 問題，並同步整理 state default 與 E2E helper。
3. 執行完整 quality gates，確認 diff 沒有 CAD domain 或樣式行為變更。
4. 若任一 extraction 造成回歸，回退該局部 refactor；不需要資料 migration 或 deployment rollback。

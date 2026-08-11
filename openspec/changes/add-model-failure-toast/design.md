## Context

`CadError.userMessage` 已由 Worker error mapping 與主執行緒 runtime 保留在 `CadState.error`，但 `CadWorkspace.svelte` 目前只把 state 傳給控制面板與 viewport，沒有錯誤通知呈現。這次變更只補主執行緒 workspace 的錯誤回饋，不改 Worker protocol、CAD kernel 或 revision lifetime。

## Goals / Non-Goals

**Goals:**

- 在 recoverable-error 與 fatal-worker-error 狀態顯示目前錯誤的 user message。
- 讓通知具備可辨識的失敗類型、可存取語意與可關閉操作。
- 在錯誤被清除、替換或使用者輸入新 generation 時清除舊通知。
- 維持既有 stale preview、progress cleanup、export gating 與 retry 行為。

**Non-Goals:**

- 不新增 toast library 或全站通知系統。
- 不改變錯誤分類、錯誤文字來源或 Worker recovery policy。
- 不把 invalid-input 的欄位驗證訊息重複顯示為 toast；欄位錯誤仍由參數控制項呈現。

## Decisions

### 使用 workspace-local Svelte toast

在 CAD workspace 新增小型 presentational toast component，由 workspace 依目前 `CadState` 選出應顯示的 error。這避免引入外部依賴，也讓通知與 CAD lifecycle 一起卸載。

### 只對 operation error statuses 顯示

只在 `recoverable-error` 或 `fatal-worker-error` 且存在 `CadError` 時顯示；`invalid-input` 不顯示 toast，避免同一個欄位錯誤同時出現在控制項與全域通知。Toast 直接顯示既有 `userMessage`，不自行解析底層例外字串。

### 由 error correlation key 控制關閉與替換

以 error code、operation、generation、revision 與 user message 組合成目前錯誤的穩定 key。使用者關閉後同一錯誤保持隱藏；key 改變或錯誤被清除時重設關閉狀態，讓下一個 failure 可以再次通知。

### 固定在 workspace 上方並使用 alert 語意

Toast 使用 fixed positioning、現有 design tokens 與 `role="alert"`/`aria-live`，避開底部 progress indicator，並在窄視窗保持 viewport 內寬度。錯誤通知不影響 workspace grid 尺寸。

## Risks / Trade-offs

- [錯誤訊息可能較長] → 允許 toast 內容換行並限制最大寬度，不截斷 user message。
- [固定通知可能遮住導覽內容] → 放在右上角、使用高 z-index，並提供關閉按鈕；CAD viewport 與控制面板仍可操作。
- [同一個錯誤事件重複更新 snapshot] → 使用 correlation key 去重，避免 progress 或非錯誤 state update 讓已關閉的 toast重新出現。

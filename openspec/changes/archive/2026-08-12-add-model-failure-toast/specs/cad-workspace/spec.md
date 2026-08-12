## MODIFIED Requirements

### Requirement: 狀態與錯誤

The system MUST satisfy the following behavior:

UI 必須呈現 booting、loading-engine、generating、ready、invalid-input、recoverable-error 與 fatal-worker-error。錯誤至少包含 stage、穩定 code、user message、recoverable 與 request/revision 關聯。當模型建模、mesh、Worker 或相關 operation 進入 recoverable-error 或 fatal-worker-error 時，UI MUST 以可關閉的 toast 顯示該錯誤的 user message 與對應失敗類型；toast 不得取代既有 stale 預覽、匯出停用或重試控制。

#### Scenario: WASM 載入失敗

- **Given** WASM asset 404、MIME 錯誤或初始化例外
- **When** Worker 初始化失敗
- **Then** UI 必須離開 loading 狀態
- **And** 顯示 CAD engine 載入失敗
- **And** 以 toast 顯示該初始化錯誤的 user message
- **And** 提供重試或重新載入指引
- **And** STEP 下載必須停用

#### Scenario: Worker 終止

- **Given** Worker 未捕捉例外、message error 或意外終止
- **When** 主執行緒偵測到 failure
- **Then** UI 必須進入 fatal-worker-error
- **And** 不得把舊預覽標示為目前參數同步
- **And** 以 toast 顯示 Worker failure 的 user message
- **And** 使用者必須能重建 Worker
- **And** 重建後 workerEpoch 改變，舊 revision 與 pending export 全部失效

#### Scenario: 可復原建模錯誤

- **Given** 參數通過表面驗證但 CAD kernel 建模失敗
- **When** Worker 回傳建模錯誤
- **Then** UI 必須進入 recoverable-error
- **And** 以 toast 顯示 Worker 回傳的建模失敗原因
- **And** 可以保留上一個成功預覽並標示 stale
- **And** 使用者可以修改參數後重試
- **And** 新 STEP 匯出保持停用

#### Scenario: Worker timeout

- **Given** engine initialization、model operation 或 STEP export 超過 Prototype Configuration 的 timeout
- **When** watchdog 判定 Worker 不再可信
- **Then** UI 必須離開 loading、generating 或 exporting 狀態
- **And** 目前 operation 必須收到 WORKER_TIMEOUT error
- **And** 以 toast 顯示 timeout 的 user message
- **And** 所有 pending operation 都必須收到 WORKER_TIMEOUT 或 WORKER_RESTARTED 的 terminal error
- **And** 舊 Worker 必須被 terminate，pending candidate、revision 與 export pin 必須清理
- **And** 重建後 Worker 必須使用新的 workerEpoch
- **And** 新 Worker 必須重新執行 engine.init；若目前輸入 snapshot 合法，engine.ready 後必須重新執行 generation 1 的 model.generate、candidate commit 與 model.ready
- **And** generation 必須以 workerEpoch 為範圍並在重建後重置為 1；若目前輸入非法，重建後維持 invalid-input，不得自動建模或開放匯出
- **And** 每個 failure recovery cycle 最多只能自動重建 Worker 1 次；再次失敗必須進入 recoverable-error，停止自動重試並提供手動重試

#### Scenario: 錯誤 toast 的生命週期

- **Given** UI 已顯示目前 operation 的錯誤 toast
- **When** 使用者輸入新的參數、模型成功完成新的 generation，或 Worker recovery 清除目前錯誤
- **Then** 舊錯誤 toast 必須消失
- **And** 若新的 operation 立即失敗，toast 必須改為顯示新的 user message
- **And** 使用者關閉 toast 後，相同錯誤在狀態未改變期間不得立即再次出現

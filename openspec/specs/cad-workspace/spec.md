## Purpose

本文件定義瀏覽器端 CAD 雛形的可觀察行為、驗收情境與執行邊界，讓使用者能以明確規格驗證方塊建模、3D 預覽及 STEP 匯出流程。


## 目的與範圍

本文件定義瀏覽器端 CAD 雛形的可觀察行為與驗收情境。

Prototype 只包含：

- 一個內建方塊模型。
- 寬、深、高三個 mm 參數。
- 瀏覽器內的 B-Rep 建模與 3D 預覽。
- 從目前成功模型下載 STEP。

固定模型選擇清單、其他模型、STL、3MF、G-code、匯入、儲存與後端服務不屬於本 Prototype。

本文中的「必須」為規範性要求；「可以」表示允許但非必要。

## 名詞

- **方塊模型**：Prototype 唯一的內建單一 solid 模型。
- **參數**：方塊的 width、depth、height，皆以 mm 解讀。
- **generation**：一次參數 snapshot 的單調遞增識別；合法與非法 snapshot 都會取得 generation，只有合法 snapshot 才能送出 model.generate。
- **candidate**：Worker 建立但尚未 commit 的候選 B-Rep。
- **model revision**：已 commit 且可預覽/匯出的 B-Rep 識別。
- **mesh**：由 B-Rep 三角化而得、供 viewport 顯示的離散資料。
- **worker epoch**：一次 Worker runtime 的不透明識別；Worker 重建後必須改變。
- **operationId**：貫穿同一個建模或匯出 operation 的穩定識別。
- **requestId**：單次 Worker command 或 response 的識別；同一 operation 可以包含多個 requestId。

## Prototype Configuration

以下是雛形的暫定驗收設定；之後可以調整，但實作 gate 必須使用同一組已記錄的值：

| 項目 | 暫定值 |
| --- | --- |
| 預設尺寸 | 20 × 30 × 40 mm |
| 每軸合法範圍 | 1–500 mm |
| 輸入 step | 1 mm；拒絕小數，不自動四捨五入 |
| 輸入 debounce | 150 ms |
| B-Rep/mesh bounds tolerance | ±0.01 mm |
| CAD dependency policy | 實作開始時使用 npm latest stable 的 replicad 與相容的 replicad-opencascadejs；安裝後以 lockfile 固定解析版本 |
| engine initialization timeout | 60 s |
| model/export operation timeout | 30 s |
| Worker 自動 recovery retry | 1 次；初次失敗後自動重建一次，再次失敗停止自動循環 |
| 同時保留的 pending candidate 上限 | 2 |
| candidate TTL | 30 s |
| pending candidate 超限處理 | discard 最舊且已被較新 input 取代的 candidate，回傳 operation.superseded 並釋放資源 |
| STEP 副檔名 | .step |
| STEP MIME | model/step |
| 預設檔名 | box-{width}x{depth}x{height}.step |
| 方塊位置 | 永遠置中於世界原點 |
| Prototype 瀏覽器 | 桌面版 Chrome、桌面版 Firefox；版本於驗收時記錄 |

## Requirements

### Requirement: 瀏覽器端執行邊界
The system MUST satisfy the following behavior:

Prototype 的 CAD 頁面、Worker、WASM、建模、預覽與 STEP 匯出必須在瀏覽器完成，不得依賴 backend、API server、database、auth 或伺服器端模型運算。本變更以本機 Astro dev server 或 local build preview 驗證；正式 hosting、CDN、base path、cache header 與 production deployment 不屬於本 Prototype。

#### Scenario: 本機 CAD 路由

- **Given** 本機 Astro dev server 或 local build preview 已提供 CAD route 與應用 asset
- **When** 使用者從本機網站開啟 CAD route
- **Then** 頁面必須載入 workspace、Worker 與 WASM
- **And** 初始化與匯出不呼叫專案 backend API

#### Scenario: 非 CAD 頁面

- **Given** 使用者只瀏覽本機網站的首頁或文件頁
- **When** 頁面完成載入
- **Then** 頁面必須提供可閱讀的靜態內容
- **And** 不得啟動 CAD Worker 或載入 OpenCascade WASM

### Requirement: Astro 與 React workspace
The system MUST satisfy the following behavior:

CAD workspace 必須是 React + React Three Fiber 的瀏覽器端 island，預設使用 client:only="react"。Astro build/SSR 不得執行 React workspace、WebGL、Worker 或 OpenCascade 初始化。

#### Scenario: 載入 fallback

- **Given** CAD route 的頁面 shell 已顯示，但 React workspace 尚未 ready
- **When** 使用者查看 CAD 區域
- **Then** 必須看到載入 fallback、JavaScript/WASM/WebGL 必要條件或狀態提示
- **And** 不得只有空白畫面或沒有說明的永久 spinner

### Requirement: Prototype 方塊模型
The system MUST satisfy the following behavior:

Prototype 必須直接載入唯一的內建方塊模型，不需要模型選擇器。方塊模型在程式邊界上必須具有獨立的 model definition，為未來固定模型 catalog 保留擴充點。

#### Scenario: 初始方塊建模

- **Given** 使用者第一次開啟 CAD workspace，且使用 Prototype 支援的桌面版 Chrome 或 Firefox，WebAssembly、Worker 與 WebGL 可用
- **When** Worker 回傳 engine.ready
- **Then** 主執行緒必須以預設參數送出 generation 1、modelId=box 的 model.generate
- **And** Worker 必須回傳 candidate-ready，且不得先修改 current model
- **And** 主執行緒驗證 candidate mesh 後必須送出 model.commit
- **And** Worker 必須回傳非空 mesh、bounds、generation 與 model revision
- **And** Prototype 驗收 fixture 必須使用 20 × 30 × 40 mm 方塊，且方塊中心位於世界原點
- **And** viewport 必須顯示方塊，UI 進入 ready

#### Scenario: 初始化不重複建模

- **Given** Worker 已回傳 engine.ready，但尚未收到 generation 1 的 model.ready
- **When** React lifecycle 或重試流程再次觸發初始化
- **Then** 主執行緒不得重複送出 generation 1 的 model.generate
- **And** Worker 不得建立第二個初始 current model

#### Scenario: 參數欄位

- **Given** 方塊模型已顯示
- **When** 使用者查看或修改參數
- **Then** UI 必須提供 width、depth、height 欄位
- **And** 每個欄位必須明示 mm
- **And** Prototype 不得要求使用者選擇尚未存在的其他模型

### Requirement: 參數驗證與 generation
The system MUST satisfy the following behavior:

所有送往 Worker 的參數必須先通過型別、有限數值、正值、整數 mm 與已確認範圍驗證；小數必須拒絕，不得自動四捨五入。每一個參數 snapshot（包含非法 snapshot）必須取得新的 generation；合法 snapshot 在所有欄位停止變更 150 ms 後才送出 model.generate。

#### Scenario: 合法參數變更

- **Given** workspace 已顯示一個 committed model
- **When** 使用者輸入合法的 width、depth 或 height，且所有欄位停止變更 150 ms
- **Then** UI 必須送出大於目前 generation 的建模要求
- **And** Worker 必須依新的 mm 參數建立方塊 B-Rep 與 mesh
- **And** commit 後 viewport bounds 必須符合新參數的尺寸 tolerance
- **And** 方塊中心必須維持在世界原點

#### Scenario: Debounce 最新 snapshot

- **Given** 使用者在 150 ms 內連續修改同一個尺寸欄位
- **When** 使用者停止輸入至少 150 ms
- **Then** UI 只能為最後一個合法 snapshot 送出 model.generate
- **And** 中間 snapshot 不得各自觸發建模

#### Scenario: 非法參數

- **Given** 使用者輸入空值、非有限數值、零、負值或超出已確認範圍的值
- **When** UI 驗證輸入
- **Then** 欄位附近必須顯示可理解的驗證錯誤
- **And** 不得為該 snapshot 送出 model.generate 或匯出 request
- **And** UI 必須立即進入 invalid-input、停用匯出，並送出 model.invalidate 使較舊 generation 失效
- **And** 既有成功預覽可以保留，但必須標示為 stale

### Requirement: Worker 初始化與 CAD 所有權
The system MUST satisfy the following behavior:

OpenCascade WASM、replicad、B-Rep 建模、mesh 產生與 STEP writer 必須位於同一個專用 CAD Worker。主執行緒不得持有或操作 OpenCascade instance。

#### Scenario: 首次初始化

- **Given** 靜態 Worker 與 WASM asset 可取得
- **When** workspace 啟動 Worker
- **Then** UI 必須呈現 loading-engine 狀態
- **And** Worker 必須在同一 runtime 內初始化 OpenCascade 並注入 replicad
- **And** 初始化成功後才可回傳 engine.ready

#### Scenario: 重複初始化

- **Given** Worker 已成功初始化
- **When** 主執行緒重複送出 engine.init
- **Then** Worker 必須重用同一個 initialization result
- **And** 不得建立第二個並行 OpenCascade runtime

### Requirement: 版本化 Worker contract
The system MUST satisfy the following behavior:

主執行緒與 Worker 必須使用可 runtime validation 的 discriminated message contract。所有訊息必須包含 `version=1`、kind 與 requestId；建模、輸入失效與匯出 operation 必須帶 operationId；模型訊息必須帶 generation，candidate 與已 commit 模型及匯出訊息必須帶 workerEpoch 或 modelRevision。`model.invalidate` 是控制訊息，不建立 B-Rep，但必須讓 Worker 記錄該 generation 為最新 input generation。

#### Scenario: 不相容訊息

- **Given** 任一端收到不支援的訊息 version、未知 kind 或缺少必要欄位
- **When** 訊息被驗證
- **Then** 接收端必須拒絕處理
- **And** UI 必須收到 protocol error
- **And** 不得更新 viewport、model revision 或觸發下載

#### Scenario: 大型資料傳輸

- **Given** Worker 已產生 mesh typed arrays 或 STEP bytes
- **When** 資料跨越 Worker 邊界
- **Then** 大型 ArrayBuffer 必須使用 transferable，或使用已驗證不造成不可接受阻塞的 Blob
- **And** 不得傳送 OpenCascade/replicad B-Rep wrapper 或可變 WASM heap view

#### Scenario: Operation 關聯與重送

- **Given** 一個 model.generate operation 產生 candidate-ready
- **When** 主執行緒送出 model.commit 或 model.discard
- **Then** 後續訊息必須沿用原 operationId
- **And** 每個 command 可以有新的 requestId
- **And** 重複 commit 不得產生第二個 model revision
- **And** 重複 discard 不得再次釋放同一個 candidate

### Requirement: Latest-wins 與 candidate commit
The system MUST satisfy the following behavior:

Worker 建模成功只代表 candidate 建立成功，不代表 current model 已更新。只有主執行緒確認 generation 仍為最新後，candidate 才可以 commit。

#### Scenario: 最新 candidate commit

- **Given** 最新 generation 為 G2
- **When** Worker 回傳 G2 的 candidate-ready
- **Then** 主執行緒驗證 mesh 後必須送出 model.commit
- **And** Worker 必須驗證 candidate 的 workerEpoch 等於目前 epoch、candidate 尚未終結，且 generation 等於 Worker 記錄的最新 input generation
- **And** Worker 必須將該 candidate 設為 current model
- **And** Worker 必須回傳新的 model revision 與 model.ready

#### Scenario: 過期 candidate discard

- **Given** 使用者先產生 G2，之後產生 G3
- **When** G2 candidate 在 G3 已成為最新要求後抵達
- **Then** 主執行緒不得 commit G2
- **And** 必須送出 model.discard
- **And** Worker 必須以 operation.superseded 結束 G2 原本的建模 operation
- **And** G2 不得更新 viewport、current model 或匯出來源

#### Scenario: Worker 拒絕過期 commit

- **Given** Worker 已接受 G3，且 G2 candidate 尚未終結
- **When** 主執行緒因重送或訊息順序錯誤送出 G2 的 model.commit
- **Then** Worker 必須拒絕 G2 commit
- **And** 必須回傳帶有原 operationId 的 operation.superseded 或 stale-generation error
- **And** current model、model revision 與 viewport 不得改變

#### Scenario: 非法輸入使舊 generation 失效

- **Given** G2 的 candidate 或建模 operation 尚未終結
- **When** 使用者輸入非法的 G3 snapshot
- **Then** UI 必須送出帶有 G3 的 model.invalidate，而不是 model.generate
- **And** Worker 必須記錄 G3 為最新 input generation，並使 G2 candidate 與建模 operation 失效
- **And** G2 不得再 commit，current model 可以保留但必須標示 stale，匯出保持停用
- **And** Worker 必須回傳 model.invalidated 及受影響 operation 的 terminal response

#### Scenario: Worker 拒絕過期 generate

- **Given** Worker 已記錄最新 input generation 為 G3
- **When** Worker 收到 generation 為 G2 或重複 G3 的 model.generate
- **Then** Worker 不得建立新的 candidate
- **And** 必須回傳帶有原 operationId 的 operation.superseded
- **And** current model 與 pending candidate 不得改變

#### Scenario: 最新 generation 建模失敗

- **Given** G3 是最新 generation，但 Worker 無法建立有效 B-Rep
- **When** Worker 回傳建模錯誤
- **Then** G2 等過期 candidate 不得自動提升為 current model
- **And** 最後一個成功 model 可以保留為 stale 預覽
- **And** 新 STEP 匯出必須停用，直到新的 generation 成功 commit

#### Scenario: Candidate cleanup

- **Given** Worker 已回傳 candidate-ready
- **When** mesh validation 失敗、commit/discard 失敗、主執行緒沒有回覆或 candidate 超過 TTL
- **Then** Worker 必須釋放 candidate 的 B-Rep/native resources
- **And** pending candidate 數量不得超過 Prototype Configuration 上限
- **And** TTL 或主執行緒未回覆時，Worker 必須以原始 generate 的 operationId、terminalForRequestId 與 CANDIDATE_EXPIRED/CANDIDATE_ORPHANED code 回傳一次 terminal response
- **And** cleanup 失敗必須進入可診斷的 Worker error 或 recovery 流程

#### Scenario: Pending candidate 超過上限

- **Given** Worker 已有兩個 pending candidate，且較舊 candidate 已被更新的 generation 取代
- **When** 新 generation 的 candidate 完成
- **Then** Worker 必須 discard generation 最小的舊 candidate
- **And** 必須以原始 operationId 回傳 reason=CANDIDATE_CAPACITY 的 operation.superseded
- **And** 必須釋放舊 candidate 資源後保留新 candidate
- **And** 不得丟棄 current model 或已被 export pin 的 revision；若沒有可丟棄 candidate，新的 generate 必須以 CANDIDATE_CAPACITY error 結束

#### Scenario: Request terminal state

- **Given** UI 已送出可接受的建模 request
- **When** 該 request 被處理完成、取代或發生錯誤
- **Then** 必須收到 model.ready、operation.error 或 operation.superseded 其中一種 terminal response
- **And** UI 不得永久停留在 generating

### Requirement: Mesh viewport
The system MUST satisfy the following behavior:

viewport 必須使用 React Three Fiber 顯示最新 committed model 的 mesh，不得執行 B-Rep 建模或 STEP 匯出。

#### Scenario: 有效 mesh

- **Given** Worker 回傳 positions、normals、indices、bounds 與 triangle count
- **When** worker client 驗證成功
- **Then** viewport 必須顯示可辨識的方塊
- **And** 相機 framing 必須使模型可見
- **And** 替換模型後必須釋放舊 geometry、material 與 GPU resource

#### Scenario: 損壞 mesh

- **Given** response 缺少 buffer、index 越界、座標非有限或沒有三角形
- **When** mesh boundary validation 執行
- **Then** 不得把該 mesh 設為成功預覽
- **And** UI 必須顯示 mesh validation error
- **And** 主執行緒必須送出對應 candidate 的 model.discard
- **And** viewport 不得 crash

### Requirement: STEP 匯出
The system MUST satisfy the following behavior:

Prototype 必須依照 replicad 官方 STEP export 範例流程，從指定且仍存在的 committed model revision 的 Worker B-Rep 產生 STEP。被 export pin 的舊 revision 也可以匯出；不得從 viewport mesh 反向產生 STEP。Prototype 目前只驗證非空 bytes、metadata 與下載行為；獨立 parser、round-trip、single solid 與尺寸驗證延後處理。

#### Scenario: STEP 匯出成功

- **Given** workspace 為 ready，且指定 model revision 仍存在
- **When** 使用者按下下載 STEP
- **Then** UI 必須建立綁定該 revision 的 export request
- **And** Worker 接受並驗證 request 後必須先回傳 export.accepted，並 pin 該 model revision
- **And** Worker 必須依照官方範例流程從該已 pin 的 B-Rep 產生非空 STEP bytes
- **And** 主執行緒必須驗證 bytes 與 metadata 後以 model/step MIME 觸發一次 .step 下載
- **And** 預設檔名必須符合 box-{width}x{depth}x{height}.step

#### Scenario: STEP 匯出失敗

- **Given** writer 失敗、回傳空資料或指定 revision 不存在
- **When** 匯出流程結束
- **Then** 不得下載空檔或錯誤檔案
- **And** UI 必須顯示 STEP 匯出失敗與重試方式
- **And** 既有 B-Rep 與預覽不得被無條件清除

#### Scenario: 匯出期間模型更新

- **Given** 使用者對 R1 開始 STEP 匯出
- **When** 後續參數更新並成功 commit 為 R2
- **Then** R1 export 必須仍明確標示為 R1
- **And** Worker 必須在匯出完成前保留被 pin 的 R1
- **And** 不得把 R1 檔案命名或通知成 R2

#### Scenario: Prototype 瀏覽器範圍

- **Given** 執行 Prototype 驗收
- **When** 測試完整的初始化、建模、預覽與 STEP 匯出流程
- **Then** 必須在桌面版 Chrome 與桌面版 Firefox 通過
- **And** 驗收時必須記錄實際 stable 版本
- **And** Safari、Edge 與行動瀏覽器不列入本變更的通過條件

#### Scenario: Export 尚未被接受

- **Given** 使用者對 R1 發出 STEP export request，但 Worker 尚未接受該 request
- **When** 後續 R2 成功 commit 並釋放未被 pin 的 R1
- **Then** R1 export 必須回傳 stale/missing model error
- **And** 不得改用 R2 靜默產生檔案
- **And** 若 Worker 先接受 R1，則必須先回傳 export.accepted 並保留 R1 到 export terminal response

### Requirement: 狀態與錯誤
The system MUST satisfy the following behavior:

UI 必須呈現 booting、loading-engine、generating、ready、invalid-input、recoverable-error 與 fatal-worker-error。錯誤至少包含 stage、穩定 code、user message、recoverable 與 request/revision 關聯。

#### Scenario: WASM 載入失敗

- **Given** WASM asset 404、MIME 錯誤或初始化例外
- **When** Worker 初始化失敗
- **Then** UI 必須離開 loading 狀態
- **And** 顯示 CAD engine 載入失敗
- **And** 提供重試或重新載入指引
- **And** STEP 下載必須停用

#### Scenario: Worker 終止

- **Given** Worker 未捕捉例外、message error 或意外終止
- **When** 主執行緒偵測到 failure
- **Then** UI 必須進入 fatal-worker-error
- **And** 不得把舊預覽標示為目前參數同步
- **And** 使用者必須能重建 Worker
- **And** 重建後 workerEpoch 改變，舊 revision 與 pending export 全部失效

#### Scenario: 可復原建模錯誤

- **Given** 參數通過表面驗證但 CAD kernel 建模失敗
- **When** Worker 回傳建模錯誤
- **Then** UI 必須指出模型建立失敗
- **And** 可以保留上一個成功預覽並標示 stale
- **And** 使用者可以修改參數後重試
- **And** 新 STEP 匯出保持停用

#### Scenario: Worker timeout

- **Given** engine initialization、model operation 或 STEP export 超過 Prototype Configuration 的 timeout
- **When** watchdog 判定 Worker 不再可信
- **Then** UI 必須離開 loading、generating 或 exporting 狀態
- **And** 目前 operation 必須收到 WORKER_TIMEOUT error
- **And** 所有 pending operation 都必須收到 WORKER_TIMEOUT 或 WORKER_RESTARTED 的 terminal error
- **And** 舊 Worker 必須被 terminate，pending candidate、revision 與 export pin 必須清理
- **And** 重建後 Worker 必須使用新的 workerEpoch
- **And** 新 Worker 必須重新執行 engine.init；若目前輸入 snapshot 合法，engine.ready 後必須重新執行 generation 1 的 model.generate、candidate commit 與 model.ready
- **And** generation 必須以 workerEpoch 為範圍並在重建後重置為 1；若目前輸入非法，重建後維持 invalid-input，不得自動建模或開放匯出
- **And** 每個 failure recovery cycle 最多只能自動重建 Worker 1 次；再次失敗必須進入 recoverable-error，停止自動重試並提供手動重試

### Requirement: 主執行緒不被 CAD 阻塞
The system MUST satisfy the following behavior:

replicad、OpenCascade、B-Rep 操作、mesh 產生與 STEP writer 不得在主執行緒執行。代表性 Prototype 模型運算期間，UI 必須仍能更新狀態與操作相機。

#### Scenario: Worker 建模期間 UI 可互動

- **Given** Worker 正在執行方塊重建
- **When** 使用者操作相機或非建模控制項
- **Then** 主執行緒不得執行 CAD kernel function
- **And** UI 不得永久卡在 generating
- **And** Worker progress 或 busy stage 必須可呈現

### Requirement: 明確非目標
The system MUST satisfy the following behavior:

#### Scenario: Prototype 功能清單

- **Given** 使用者查看 Prototype UI 與文件
- **When** 檢查模型與輸出功能
- **Then** 只提供內建方塊、mm 參數、3D 預覽與 STEP 下載
- **And** 不得出現固定模型選擇清單、STL、3MF、G-code、import、save、auth 或 collaboration 入口

## 可追溯性

- 變更動機、Prototype 範圍與後續演進：../../proposal.md
- 架構、contract、lifetime 與測試策略：../../design.md
- 實作順序與 quality gates：../../tasks.md


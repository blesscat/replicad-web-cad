# 設計：replicad-web-cad Prototype

- 狀態：提案設計
- 範圍：單一方塊 CAD 雛形
- 原則：先驗證瀏覽器端參數化建模、預覽與 STEP 下載的完整閉環

## 設計概要

Astro 負責網站 shell 與路由；Prototype 先以本機 dev server 或 build preview 驗證。CAD 路由只掛載一個瀏覽器端 React workspace。React 主執行緒負責表單、狀態、3D viewport 與下載觸發。專用 CAD Worker 擁有 replicad、OpenCascade WASM、B-Rep、mesh 產生與 STEP writer。

    local Astro site shell
    └─ Astro shell / 首頁 / 文件 / CAD route
       └─ React workspace（主執行緒）
          ├─ 方塊參數表單
          ├─ state machine
          ├─ worker client / runtime validation
          ├─ React Three Fiber viewport
          └─ download adapter
                     ⇅ versioned messages + transferable buffers
          CAD Worker
          ├─ WASM / OpenCascade / replicad initialization
          ├─ box B-Rep builder
          ├─ candidate mesh
          └─ STEP export

Prototype 不在主執行緒直接 import 或操作 OpenCascade。主執行緒只持有參數、狀態、已驗證 mesh、model revision metadata 與下載 bytes。

## Prototype 模型邊界

雖然目前只有方塊，Worker 不應把方塊邏輯散落在 UI。先建立最小的 model definition 介面，讓後續固定模型清單可以沿用：

    ModelDefinition
    ├─ id: "box"
    ├─ displayName
    ├─ parameterSchema
    ├─ build(parameters) -> B-Rep
    ├─ preview metadata
    └─ export filename metadata

Prototype 不需要顯示模型選擇器；workspace 直接載入 id 為 box 的 definition。後續新增模型時，才加入 catalog 與選擇 UI。

方塊 Prototype 的參數：

| 參數 | 語意 | 單位 |
| --- | --- | --- |
| width | X 軸尺寸 | mm |
| depth | Y 軸尺寸 | mm |
| height | Z 軸尺寸 | mm |

Prototype Configuration 的驗收 fixture 為 20 × 30 × 40 mm；每軸合法範圍為 1–500 mm，輸入步進為 1 mm。方塊永遠置中於世界原點，bounds 為 `[-width/2, width/2] × [-depth/2, depth/2] × [-height/2, height/2]`。

## 模組與責任

建議目錄如下：

    src/
    ├─ pages/
    │  ├─ index.astro
    │  ├─ docs/
    │  └─ cad.astro
    ├─ components/cad/CadWorkspace.tsx
    ├─ features/cad/
    │  ├─ model-catalog/
    │  │  └─ box-definition
    │  ├─ parameters/
    │  ├─ state/
    │  ├─ viewport/
    │  ├─ worker-client/
    │  └─ download/
    ├─ cad-contract/
    │  ├─ messages
    │  ├─ errors
    │  └─ units
    ├─ cad-kernel/
    │  ├─ initialise
    │  ├─ model
    │  ├─ mesh
    │  ├─ export
    │  └─ lifetime
    └─ workers/cad.worker

責任規則：

- Astro page 只提供 shell、fallback 與 React 掛載點。
- CadWorkspace 不直接 import CAD kernel。
- model-catalog 只描述模型參數與建模入口，不持有 UI 或 Worker lifecycle。
- cad-contract 不依賴 DOM、React、Three.js、replicad 或 OpenCascade。
- cad-kernel 只由 cad.worker 使用。
- viewport 只接受已驗證 mesh snapshot。
- download 只處理成功 bytes 與 metadata。

## Astro 與 React island

CAD workspace 使用 client:only="react"。Astro build/SSR 不執行 React workspace、WebGL、Worker 或 OpenCascade。

CAD route 必須提供：

- 可閱讀的靜態頁面標題與說明。
- React 尚未 ready 時的載入 fallback。
- JavaScript、WebAssembly 或 WebGL 不可用時的可理解訊息。
- 不依賴 React SSR 的基本頁面內容。

## 初始建模流程

engine.ready 只代表 Worker runtime 已可用，不代表目前已有可預覽模型。首次載入必須依序執行：

    engine.init
      → engine.ready
      → 主執行緒送出 operationId=initial-model、generation=1 的 model.generate
      → model.candidate-ready
      → 主執行緒驗證 candidate mesh 後送出 model.commit
      → model.ready

只有收到 model.ready 後，UI 才能進入 ready 並啟用 STEP 匯出。初始化失敗不得觸發第一次建模。

## 主執行緒狀態

| 狀態 | 預覽 | 新建模 | 新匯出 |
| --- | --- | --- | --- |
| booting | fallback | 否 | 否 |
| loading-engine | 無或載入中 | 否 | 否 |
| generating | 可保留上一版並標示 stale | 是 | 否 |
| ready | 最新 committed mesh | 是 | 是 |
| invalid-input | 保留上一版並標示 stale | 否 | 否 |
| recoverable-error | 保留上一版並標示 stale | 可重試 | 否 |
| fatal-worker-error | 只能標示 stale | 重建 Worker | 否 |

匯出 operation 是獨立狀態，不能用一個全域 busy boolean 同時代表建模與匯出。

## 參數輸入、step 與 debounce

- Prototype 的尺寸欄位只接受有限的整數 mm；小數、空值、非有限值、零、負值與超出範圍的值直接拒絕，不自動四捨五入。
- 每次輸入 snapshot 都取得單調遞增的 generation，包含非法 snapshot；合法 snapshot 在所有欄位停止變更 150 ms 後才送出 model.generate。
- debounce 期間若輸入再次變更，計時器重置，只對最後一個合法 snapshot 建模。
- 非法 snapshot 立即進入 invalid-input，停用匯出並送出 model.invalidate（不是 model.generate）；Worker 必須使較舊 candidate 與建模結果失效。

Prototype 政策：

- 只有目前參數已成功 commit 的 revision 可以啟動新匯出。
- 建模中、輸入無效或錯誤狀態停用新匯出。
- 已開始的匯出會 pin 住其 model revision，直到成功或失敗。
- 舊預覽可以保留，但不能無提示地當成目前輸入的結果。

## Worker 訊息契約

所有訊息都是可序列化的 discriminated union，並共用 `version=1`、`kind` 與 `requestId` envelope。requestId 是單次 command/response 的識別；operationId 是貫穿同一個使用者 operation 的穩定識別。模型 lifecycle 的 generate、candidate-ready、commit、discard 與 terminal response 必須共用 operationId。模型訊息另帶 generation；candidate、已提交模型與匯出訊息另帶 workerEpoch 或 modelRevision。revision 與 candidateId 都是不透明值，不能只用容易碰撞的序號。

commit 與 discard 必須具備 idempotent 行為：重複 commit 不得產生第二個 model revision；已完成的 discard 不得再次釋放同一個 candidate。terminal response 必須能以 operationId 對應回原始 model.generate。

### 主執行緒到 Worker

| kind | 必要欄位（除共同 envelope 外） | 語意 |
| --- | --- | --- |
| engine.init | operationId, asset metadata | idempotent 初始化 WASM 與 replicad |
| model.generate | operationId, generation, modelId, validated parameters, preview config | 建立候選 B-Rep 與 mesh，不修改 current model |
| model.invalidate | operationId, generation, workerEpoch, reason | 宣告最新輸入無效，使較舊 candidate/generate 不得 commit；不建立模型 |
| model.commit | operationId, generation, candidateId, workerEpoch | 驗證 candidate 仍屬於最新 generation 後設為 current revision |
| model.discard | operationId, generation, candidateId, workerEpoch | 釋放過期或驗證失敗的候選模型；完成後回傳 operation.superseded |
| export.step | operationId, modelRevision, workerEpoch, file metadata | 驗證並 pin 指定 B-Rep 後產生 STEP |
| worker.dispose | operationId | 釋放 Worker 內資源與所有 pending candidate |

### Worker 到主執行緒

| kind | 必要欄位（除共同 envelope 外） | 語意 |
| --- | --- | --- |
| engine.ready | operationId, workerEpoch, engine metadata | runtime 初始化成功 |
| operation.progress | operationId, stage, optional generation/revision | 回報 loading、building、meshing 或 exporting 階段 |
| model.invalidated | operationId, generation, workerEpoch | Worker 已記錄無效輸入並處理較舊 pending operation |
| model.candidate-ready | operationId, generation, candidateId, workerEpoch, mesh snapshot | 候選完成，但尚未成為 current |
| model.ready | operationId, generation, modelRevision, workerEpoch, mesh snapshot, bounds | 候選已 commit 並成為 current |
| export.accepted | operationId, modelRevision, workerEpoch | Worker 已驗證並 pin revision，後續 model commit 不得釋放它 |
| operation.superseded | operationId, terminalForRequestId, generation, reason | request 已被更新的 generation 取代或明確 discard |
| operation.error | operationId, terminalForRequestId, stage, code, user message, recoverable, optional generation/revision | 結構化錯誤 |
| export.ready | operationId, modelRevision, workerEpoch, format, bytes, MIME, file name | STEP bytes 已完成，尚未下載 |

### Latest-wins 與兩階段 commit

model.generate 的成功不等於 current model 成功。流程必須是：

1. Worker 以 generation 建立 candidate。
2. Worker 回傳 candidate-ready；candidate 暫時保留，current B-Rep 不變。
3. 主執行緒檢查 candidate generation 是否仍等於最新 generation。
4. 仍為最新時送 model.commit；否則送 model.discard。
5. 只有 model.commit 成功後才產生 modelRevision、更新 viewport 與開放目前參數的匯出。

若最新 generation 建模失敗或輸入被 model.invalidate，不能自動提升已過期 candidate。最後一個成功 revision 可以保留為 stale 預覽。

Worker 必須記錄目前 runtime 已接受的最新 input generation。收到 model.generate 時，若 generation 不大於最新 input generation，Worker 必須直接以 operation.superseded 結束，不得建立 candidate；否則先記錄該 generation，再開始建模。收到 model.invalidate 時，只有 generation 大於目前值時才能前進 latest-input guard；重複或過期的 invalidate 必須 idempotently 回覆且不得讓 guard 倒退。有效 invalidate 必須記錄該 generation 為最新 input generation，讓較舊 candidate 與建模結果失效，並回傳 model.invalidated。model.commit 只有在 candidateId 存在、candidate 的 workerEpoch 等於 current workerEpoch、candidate 尚未終結，且 candidate generation 等於最新 input generation 時才可成功。過期 commit 必須被拒絕並以 operation.superseded 或 operation.error 結束，不得修改 current B-Rep。

每個已接受的 model operation 都必須收到 ready、error 或 superseded 其中一種 terminal response。主執行緒送出 model.discard 後，Worker 必須以相同 operationId、並以 terminalForRequestId 指向原始 generate request 的 operation.superseded 結束原本的建模 operation。

## B-Rep 與 revision lifetime

- Worker 內的 current B-Rep 是 STEP 的唯一來源。
- candidate 在 commit 或 discard 前必須由 Worker 持有。
- commit 以原子方式替換 current；舊 revision 只有在沒有被 export pin 時才可釋放。
- export request 被 Worker 接受並完成 revision validation 時，必須在處理任何後續 model.commit 前原子地 pin 指定 revision，並回傳 export.accepted；直到 export.ready 或 operation.error 前都不得釋放。
- 若 export request 尚未被 Worker 接受前，較新的 model.commit 已釋放指定 revision，Worker 必須回傳 MODEL_REVISION_MISSING 類錯誤，不得改用新的 revision。
- Worker dispose 或重建時，所有 revision 與 pending export 都失效。
- modelRevision 必須包含 workerEpoch 或等效不可重複 namespace，不能依賴單純的 R1、R2 數字。
- candidate 必須具備 pending 上限與 TTL；Prototype 暫定最多保留 2 個 pending candidate，未在 30 秒內 commit/discard 的 candidate 必須自動 cleanup。pending candidate 只計入尚未 terminal 的候選 B-Rep，不包含 current model 或 export pin。
- 若新 candidate 完成後會超過上限，Worker 必須 discard generation 最小、已被較新 input 取代的 pending candidate，回傳其原始 operationId 的 operation.superseded（reason=`CANDIDATE_CAPACITY`），釋放資源後才保留新 candidate。不得丟棄 current model 或已被 export pin 的 revision；若沒有可丟棄的 candidate，新的 generate 必須以 CANDIDATE_CAPACITY error 結束。
- mesh validation 失敗、commit/discard 失敗、operation timeout、Worker dispose 與 Worker 重建都必須清理相關 candidate。
- candidate 因 TTL、容量或主執行緒未回覆而 cleanup 時，必須以原始 generate 的 operationId、terminalForRequestId 與穩定 code 回傳一次 terminal response；cleanup 後不得再接受該 candidate 的 commit/discard。

主執行緒取得的 mesh buffer 是獨立資料；釋放 Worker B-Rep 不得影響已轉移的 mesh buffer。

## Mesh 與 viewport

Worker 從方塊 B-Rep 產生 positions、normals、indices、bounds 與 triangle count。大型 buffer 使用 transferable ArrayBuffer。

主執行緒在套用前驗證：

- 必要 buffer 存在。
- 座標皆為有限值。
- index 不越界。
- triangle count 大於零。
- bounds 合法。

viewport 使用 React Three Fiber 顯示 mesh，提供基本旋轉、縮放與 framing。替換模型時先建立新 geometry，切換成功後 dispose 舊 geometry、material 與相關 GPU resource。

## STEP 與下載

STEP writer 只接受指定且仍存在的 committed modelRevision，直接消費 Worker 內 B-Rep。被 export pin 的舊 revision 也可以匯出。不得從 viewport mesh 反向產生 STEP。Prototype 使用 .step 副檔名、model/step MIME 與 box-{width}x{depth}x{height}.step 預設檔名。

主執行緒收到 export.ready 後：

1. 驗證 requestId、modelRevision、format、MIME、檔名與 bytes 非空。
2. 建立 Blob 與 Object URL。
3. 觸發一次瀏覽器下載。
4. 在安全時機 revoke Object URL。

同一 response 不得因 React re-render 重複下載。Prototype 的 STEP writer 以 replicad 官方 STEP export 範例流程為實作參考；目前只驗證 bytes 非空、format/MIME/檔名 metadata 正確與下載行為。獨立 parser、round-trip、single solid 與尺寸驗證工具及版本列為後續 gate。

Prototype 不提供 STL、3MF 或 G-code export。

## Timeout 與 Worker recovery

Worker client 必須為 engine initialization、model operation 與 STEP export 設定 watchdog。Prototype 暫定 engine initialization timeout 為 60 秒、model/export operation timeout 為 30 秒；CAD dependency 使用實作開始時的 npm latest stable 相容版本，解析後版本寫入 lockfile。

每個 failure recovery cycle 最多自動重建 Worker 1 次。若自動重建後仍失敗，不得繼續自動重試，UI 必須進入 recoverable-error 並提供手動重試；手動重試開始新的 recovery cycle。

timeout 發生時：

- 主執行緒必須將目前 operation 結束為 WORKER_TIMEOUT。
- 所有等待中的 operation 都必須收到 WORKER_TIMEOUT 或 WORKER_RESTARTED 的 terminal error。
- 不得繼續等待或把舊 preview 標示為目前參數同步。
- 必須 terminate 舊 Worker、清理 pending candidate 與 export pin。
- 必須建立新 Worker 並產生新的 workerEpoch。
- 舊 request、candidate 與 modelRevision 全部失效。
- 新 Worker 必須重新執行 engine.init；初始化成功後，若目前輸入 snapshot 合法，必須重新以該 snapshot 執行 generation 1 的 model.generate → candidate-ready → model.commit → model.ready。
- generation 以 workerEpoch 為範圍；Worker 重建後重置為 1，所有新 requestId 與 operationId 都必須重新產生。若目前輸入非法，重建後維持 invalid-input，不得自動建模或開放匯出。

## 執行邊界與隱私

- Prototype 以本機 Astro dev server 或 local build preview 驗證，不在本變更決定正式 hosting、CDN、base path、cache header 或 production deployment。
- Worker 與 WASM 從目前 Astro 應用可取得的瀏覽器 asset 載入；正式部署時的 URL、MIME 與 cache 規則另案處理。
- 建模、預覽與匯出不需要專案 backend，不上傳參數或模型。
- Prototype 以非 threaded WASM 為假設，不要求 SharedArrayBuffer、COOP 或 COEP。

Prototype 瀏覽器 gate 只包含桌面版 Chrome 與桌面版 Firefox；驗收時記錄實際 stable 版本。Safari、Edge 與行動瀏覽器列為後續支援，不是本變更的通過條件。

## 測試策略

### Contract 與 state

- valid/invalid message fixture。
- 不相容訊息 version/kind 拒絕。
- generation stale、candidate commit/discard 與 superseded。
- invalid input 的 model.invalidate、debounce 最新 snapshot 與過期 guard。
- initial model 的 engine.ready → generation 1 → candidate → commit → ready。
- operationId 關聯、commit/discard idempotency 與過期 commit 拒絕。
- workerEpoch 重建後拒絕舊 revision。
- candidate TTL、上限與 cleanup。
- invalid input 不送 model.generate/export，但會送 model.invalidate 控制訊息。
- generating、ready、invalid、recoverable、fatal 與 export pin 狀態。

### Worker/WASM

- 真實瀏覽器 Worker/WASM 初始化。
- 20 × 30 × 40 mm 方塊 B-Rep、mesh、bounds 與 revision。
- 快速參數更新不採用過期 candidate。
- candidate 失敗不破壞上一個 committed model。
- Worker termination 與重建。
- Worker timeout 與 pending operation recovery。

### Export/UI

- STEP 非空、metadata 與下載行為；parser/round-trip/尺寸驗證列為後續。
- 錯誤或空 bytes 不觸發下載。
- 一次點擊只產生一次下載。
- Object URL revoke。
- export.accepted 後 R1 pin 住，export 尚未 accepted 時 R2 commit 的 stale/missing policy。
- Astro fallback、CAD route、Worker/WASM asset resolution。
- 主執行緒不執行 CAD kernel，且代表性模型運算期間 UI 可互動。

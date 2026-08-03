# replicad-web-cad Prototype 工作清單

本清單只涵蓋單一方塊的瀏覽器端雛形。固定模型 catalog、STL 與其他輸出格式列為後續變更。

## Foundation

- [ ] 建立 Astro site shell、首頁、文件頁與 CAD route。
  - 驗收：可由本機 Astro dev server 或 local build preview 開啟；不包含 server adapter、API route 或 backend runtime。
- [ ] 建立 client-only React workspace 與 Astro fallback。
  - 驗收：Astro build/SSR 不初始化 React、WebGL、Worker 或 OpenCascade。
- [ ] 定義第一版 Worker 訊息 version、kind 與錯誤 taxonomy。
  - 驗收：所有 command/response 都有 `version=1`、kind、requestId；operation message 有 operationId，且有版本拒絕規則。
- [ ] 定義 requestId、operationId、generation、candidateId、modelRevision 與 workerEpoch 的獨立語意。
  - 驗收：測試可證明它們不可互換，重送 commit/discard 不會重複 commit 或釋放，且 Worker 重建後舊 revision 失效。
- [ ] 定義 width、depth、height 參數 schema 與 mm metadata。
  - 驗收：採用 Prototype Configuration 的 20 × 30 × 40 預設、1–500 mm 範圍、拒絕小數與 150 ms debounce；空值、非有限值、零、負值及超出範圍值都有預期拒絕結果，不自動四捨五入。
- [ ] 記錄 Prototype Configuration。
  - 驗收：bounds tolerance、timeout、candidate 上限/TTL、STEP 副檔名、MIME 與檔名規則都有單一來源。
- [ ] 建立 model definition 邊界，先加入唯一的 box definition。
  - 驗收：UI 不直接包含 B-Rep 建模邏輯，未來可在不改 Worker contract 下新增模型。
- [ ] 建立 contract、parameter、error 與 state machine fixture 測試。
  - 驗收：可由單一 pnpm test script 執行。

## CAD Worker

- [ ] 建立真實瀏覽器 Worker/WASM integration harness，不以 Node mock 代替初始化。
  - 驗收：可觀察 Worker asset、WASM instantiate、replicad injection 與 engine.ready。
- [ ] 實作 idempotent OpenCascade/replicad initialization。
  - 驗收：同一 Worker 重複 init 不建立第二個 runtime，失敗時不發出 ready。
- [ ] 實作初始建模序列。
  - 驗收：engine.ready 後只送出一次 generation 1 的 box model.generate，完成 candidate commit 後才進入 ready。
- [ ] 實作 box model builder。
  - 驗收：20 × 30 × 40 mm 可產生非空、有效的單一 solid，bounds 符合尺寸 tolerance，且方塊中心位於世界原點。
- [ ] 實作 B-Rep 到 preview mesh 的三角化與 typed-array snapshot。
  - 驗收：positions、normals、indices、bounds 與 triangle count 都可驗證，buffer 使用 transfer list。
- [ ] 實作 candidate lifecycle：generate、candidate-ready、commit、discard。
  - 驗收：generate 不直接替換 current；只有 commit 後才產生 modelRevision；TTL、容量或 orphan cleanup 都會釋放資源並回傳原始 operation 的 terminal response。
- [ ] 實作非法輸入的 model.invalidate 控制流程。
  - 驗收：非法 snapshot 不送 model.generate/export，但會使較舊 generation 的 candidate、commit 與建模 operation 失效；current model 可保留但標示 stale。
- [ ] 實作 latest-wins 與 operation.superseded。
  - 驗收：G2 晚於 G3 抵達時，主執行緒與 Worker 都拒絕 G2 commit；非法 G3 以 model.invalidate 使 G2 失效；G2 不更新 viewport、current model 或匯出來源，且 operation 有 terminal response。
- [ ] 實作 Worker 端 commit guard 與 idempotency。
  - 驗收：candidate 的 workerEpoch、generation、pending 狀態都會驗證；重複 commit 不產生第二個 revision，過期 commit 回傳 superseded/error。
- [ ] 實作 candidate 上限、TTL 與 orphan cleanup。
  - 驗收：pending candidate 不超過 2 個；超限時 discard 最舊且已被更新 generation 取代的 candidate，回傳 CANDIDATE_CAPACITY superseded 並釋放 B-Rep/native resources；30 秒未完成 commit/discard 也有 terminal response。
- [ ] 實作 model revision lifetime 與 workerEpoch。
  - 驗收：舊 revision 有 active export pin 時不可釋放；Worker 重建後舊 revision 不可使用。
- [ ] 實作結構化 progress/error 與 Worker recovery。
  - 驗收：WASM、建模、mesh、protocol、Worker termination、timeout 與 STEP writer 錯誤可分類；pending candidate、revision 與 export pin 都能清理；重建 Worker 後可重新 init 並從 generation 1 建立初始模型；每個 failure recovery cycle 只自動重建 1 次，第二次失敗進入 recoverable-error 並等待手動重試。

## UI 與 viewport

- [ ] 實作 width、depth、height 的 mm-only 表單。
  - 驗收：欄位明示 mm，小數直接拒絕且不自動四捨五入；非法輸入不送 model.generate/export，但必要時送 model.invalidate。
- [ ] 實作 loading、generating、ready、invalid、recoverable 與 fatal 狀態。
  - 驗收：錯誤訊息可理解，舊預覽保留時明確標示 stale。
- [ ] 實作 worker client 的 runtime validation 與 request correlation。
  - 驗收：未知訊息 version/kind 或損壞 payload 不污染目前模型；operationId 能串起 generate、invalidate、commit/discard 與 terminal response。
- [ ] 實作 React Three Fiber viewport。
  - 驗收：方塊可見，具有基本旋轉、縮放與 framing。
- [ ] 實作 mesh replacement 與 GPU resource disposal。
  - 驗收：成功替換後舊 geometry、material 與相關 resource 已 dispose。
- [ ] 實作能力偵測與 fallback。
  - 驗收：JavaScript、WebAssembly 或 WebGL 不可用時不顯示空白工作區。

## STEP export

- [ ] 建立 STEP bytes/metadata validator 與錯誤 fixture。
  - 驗收：空資料、錯 format、錯 MIME、錯副檔名與錯 revision 都會被拒絕；Prototype 使用 model/step 與 .step。
- [ ] 依照 replicad 官方 STEP export 範例建立 Prototype writer 流程。
  - 驗收：記錄官方範例對應的 B-Rep export path；本 Prototype 不固定獨立 parser、round-trip、single solid 或尺寸驗證工具與版本，這些列為後續 gate。
- [ ] 在 Worker 從指定 modelRevision 的 B-Rep 實作 STEP export。
  - 驗收：採用官方範例流程、STEP 不由 viewport mesh 推導，writer 失敗不觸發下載。
- [ ] 實作 export pin 與 export operation state。
  - 驗收：Worker 接受 request 後先回傳 export.accepted 並 pin R1；R1 export 在 R2 ready 後仍只標示 R1，直到 export terminal response 前 R1 不被釋放；尚未 accepted 的 stale request 不改用 R2。
- [ ] 實作主執行緒 download adapter。
  - 驗收：Blob、box-{width}x{depth}x{height}.step 檔名、model/step MIME、單次下載與 Object URL revoke 正確，React re-render 不重播下載。

## Quality gates

- [ ] 執行 contract、schema、state、viewport 與下載單元測試。
  - 驗收：必要 message kind、operationId、非法輸入、stale candidate、過期 commit、terminal state 與資源釋放案例通過。
- [ ] 執行真實 Worker/WASM 瀏覽器整合測試。
  - 驗收：engine.ready 後 generation 1 初始建模、方塊建模、mesh transfer、candidate commit/discard、Worker guard、timeout 與 recovery 通過。
- [ ] 執行 STEP 匯出驗證。
  - 驗收：依官方範例流程產生的檔案非空、metadata 正確，且只下載一次；parser/round-trip/尺寸驗證不列入本 gate。
- [ ] 建立 Astro fallback、首次載入、參數更新、錯誤與下載 E2E。
  - 驗收：CAD route 可由本機 Astro 流程開啟，方塊可預覽，STEP 可下載。
- [ ] 建立主執行緒反阻塞 gate。
  - 驗收：CAD kernel 不在主執行緒執行，建模期間狀態與相機仍可互動。
- [ ] 建立本機 CAD route 與 asset smoke test。
  - 驗收：本機流程可載入 CAD route、Worker 與 WASM asset；不把正式 hosting、base path、cache 或 production deployment 納入 gate。
- [ ] 鎖定 Prototype 瀏覽器驗收矩陣。
  - 驗收：桌面版 Chrome 與桌面版 Firefox 通過完整流程，並記錄驗收時的 stable 版本；Safari、Edge 與行動瀏覽器標記為後續支援。

## Documentation

- [ ] 撰寫 Prototype 使用說明。
  - 驗收：說明 mm 參數、預覽、載入狀態、stale 預覽與 Worker 重試。
- [ ] 撰寫 STEP 匯出說明。
  - 驗收：說明 STEP 依 replicad 官方範例流程由精確 B-Rep 產生，不是 viewport screenshot 或 mesh 反推；獨立解析與尺寸驗證列為後續。
- [ ] 撰寫本機 Prototype 啟動說明。
  - 驗收：說明 pnpm dev/build preview、桌面版 Chrome/Firefox 前置條件、CAD route、Worker/WASM 載入與常見錯誤；不承諾正式 hosting 設定。
- [ ] 記錄未來固定模型 catalog 的擴充方式。
  - 驗收：文件明確說明 Prototype 只有 box，新增模型需另案驗收參數 schema 與建模規則。

## Deferred（不屬於本 Prototype）

- [ ] 固定 STEP parser、round-trip 與尺寸驗證工具及版本。
  - 驗收：另案定義單一 solid、尺寸 tolerance 與驗證工具版本；測試 parser 不成為產品 import。

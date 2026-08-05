## Context

目前 CAD geometry 全部在專用 Worker 內以 replicad/OpenCascade WASM 執行。`modular-grid-base` 先從 immutable STEP template clone/translate 每個 cell，再將 cell 逐一 fuse 到不斷變大的 `combined`，最後對整體外側垂直邊做 fillet，Worker 之後再產生 preview mesh。這個 left-fold boolean pipeline 在 rows × columns 增加時會反覆處理大型拓撲；目前 generation 只在非同步 template 載入後及部分 runtime 邊界檢查是否過期，單次同步 OpenCascade 呼叫期間無法取消，也只回報 `building`/`meshing` 等粗略階段。

本 change 需要同時調整 Worker-only geometry pipeline、跨 Worker progress contract、主執行緒排程/UI 與測試，因此先固定量測與幾何正確性的決策，再進入實作。主執行緒仍不得 import 或操作 CAD kernel；GPU/WebGL 仍只負責 viewport rendering。

## Goals / Non-Goals

**Goals:**

- 用同一個 Worker generation path 建立可重複的 benchmark，分離 template、cell assembly/fuse、fillet、mesh 與總耗時。
- 以 row/block 的 balanced fuse 取代大型 grid 的 left-fold fuse，並保留可驗證的 sequential baseline。
- 在 clone、fuse、fillet 等可安全邊界檢查 generation，過期 operation 能停止、回傳 terminal state 並釋放所有未交給 candidate lifetime 的 native shapes。
- 讓 Worker 回報目前完成的 cell/merge 數量，UI 能顯示有意義的階段進度且不接受過期 operation 的回報。
- 合併快速 slider/input 變更，避免每一個中間 snapshot 都啟動昂貴建模。
- 以 bounds、single-solid、外角 fillet、mesh 與 STEP 行為測試證明優化前後幾何契約不變。

**Non-Goals:**

- 不把 OpenCascade B-Rep、boolean 或 fillet 重寫為 WebGPU/GPU kernel。
- 不在本 change 建立近似 preview mesh 取代精確 B-Rep，也不改變 STEP 由 committed B-Rep 匯出的規則。
- 不將多個 Worker 用來平行操作同一組 native shapes；OpenCascade runtime、WASM heap 與 shape lifetime 仍以單一 Worker epoch 為邊界。
- 不放寬目前 500 mm 軸向上限、模型幾何 tolerance、component contract 或既有 box 行為。

## Decisions

### 1. 先建立 baseline，再選擇 fuse 策略

新增 Worker/geometry benchmark fixture，固定使用目前的 template、preview tolerance 與參數矩陣 1×1、2×2、5×5、10×10、20×20、25×25。每個 fixture 先 warm up 一次，再執行五次，記錄 template load、clone/translate、fuse/assembly、fillet、mesh 與 generation total 的 median/P95；warm-up 另做一次非空 STEP quality check，STEP writer 不納入 measured generation total。benchmark 必須先嘗試 sequential implementation；若某個 baseline fixture 在 native build/mesh/export 失敗，必須記錄 strategy、fixture、sample、phase 與錯誤並繼續 optimized samples，不得把失敗當成成功的零值或靜默中止整份報告。硬體與 dependency lockfile 版本寫入結果。

選擇 row/block balanced fuse 的理由是它能先建立一條 canonical row，再 clone/translate 這個 row 形成其餘列，並讓 row 內相鄰 cell 在較小的 block shape group 內合併，避免每個新 cell 都對整個歷史 combined shape 做 boolean。實作保留小尺寸或不適合分組的 fallback path，並以 benchmark 決定 group size；這個 fallback 只作正確性/回歸保護，不得掩蓋大型 fixture 的性能 gate。

若 sequential 大型 baseline 有可重複的五次結果，10×10 與 25×25 仍使用相對 median gate；若 baseline 在同一 native epoch 內無法完成，gate 必須改為「optimized 至少完成五次且 median 不超過既有 `operationTimeoutMs`」的 safety gate，並輸出 baseline-unavailable warning。這是可操作性限制的明確記錄，不把不可比的 baseline 當作 20% 改善證據。

考慮過的替代方案：

- 直接增加 Worker timeout：只延後錯誤，不降低 CPU work，不能解決重複建模。
- 只降低 mesh tolerance：若瓶頸在 fuse/fillet 幾乎沒有幫助，且可能損害 preview 品質。
- GPU/WebGPU CSG：需要重做精確 B-Rep、STEP 相容性與拓撲資料結構，超出目前 scope。

### 2. 以 build context 傳遞取消與進度

擴充 Worker-side `KernelBuildContext`，提供：

- `isGenerationCurrent()`：在建立 cell 前、完成 clone/translate 後、每次 fuse/fillet 前後檢查。
- `reportProgress(progress)`：回報 phase、completed、total；callback 只由 Worker runtime 轉成既有 operationId/generation 的 `operation.progress`。

`buildModularGridBase` 只在完成一個可釋放/可驗證的 kernel boundary 後回報 progress。單一 OpenCascade boolean/fillet 呼叫本身仍是不可中斷的 atomic section；新 generation 到達後，最遲在該 section 結束時停止。所有 local shapes 由 `try/finally` 或集中 cleanup helper 管理，不能把 stale shape 送進 candidate lifetime。

Worker 的 message dispatcher 會將 `model.invalidate` 從長時間 `model.generate` command queue 旁路處理；建模 pipeline 也會在 clone/translate、fuse 與 fillet 等安全邊界以 macrotask yield 回到 Worker event loop。這只更新 generation/invalidation state，不會中斷正在執行的 OpenCascade atomic call，讓建模在下一個安全邊界停止；只使用 Promise microtask 不足以讓新的 message event 進入。主執行緒 runtime 另外保留 active progress operationId，所有 terminal、export 與 recovery cleanup 都必須以 operationId correlation 清除，避免舊 operation 清掉新 operation 的進度。

### 3. Progress contract 採 optional counters，維持 version 1

`operation.progress` 保留既有 `stage`、`operationId`、generation/modelRevision 關聯，新增 optional `completed`、`total` 與明確 unit（例如 `cells`、`batches`、`steps`）。loading、fillet 或其他沒有自然計數的階段可以只傳 stage；modular-grid assembly 必須傳有效的 completed/total。欄位保持 optional 讓同一 version 的其他 operation 與舊 UI consumer 不必同時支援所有計數。

主執行緒只接受目前 workerEpoch、latest generation 與 operation 相符的 progress；model.ready、operation.error、operation.superseded、timeout/recovery 或 component invalidate 後必須清除 progress。過期 progress 不得覆蓋較新 operation 的進度。

### 4. 以 component-specific coalescing 降低重複生成

維持最新 snapshot 優先與所有 snapshot 遞增 generation 的 contract。modular-grid 的 range slider 在連續拖曳期間只更新 raw/input state，使用 pointer release 或既有 debounce 的最後邊界送出一次合法 generation；若使用者在建模途中再次輸入，舊 operation 只允許完成目前 atomic kernel section，之後應被 invalidate/cancel。

不將 debounce 提高到掩蓋慢運算，也不在主執行緒執行 geometry。box 的既有輸入語意維持不變，component-specific scheduling 以最少行為差異降低大型 grid 的重複 work。

### 5. 以幾何與效能雙重 gate 驗收

優化策略必須通過 1×1、2×2、5×5、10×10、20×20、25×25 的 bounds/single-solid/fillet/mesh/STEP 行為驗證。以同一 reference environment 的 baseline 比較：若 10×10 與 25×25 的 sequential median total 可取得，optimized 必須至少降低 20%；1×1 與 2×2 不得回歸超過 10%。若大型 sequential baseline 無法完成，報告必須顯示 failure record，並改驗證 optimized median 不超過既有 operation timeout；不得以不可比結果宣稱 20% 改善。若 optimized strategy 沒有達到對應 gate，不能只保留新的 progress UI 宣稱完成，必須調整分組或回到可解釋的 baseline。

## Risks / Trade-offs

- **[Risk] Balanced fuse 改變 OpenCascade topology 或 edge selection →** 以 bounds、single-solid、內部 sharp junction、四個外側 vertical fillet 與非空 STEP 做 geometry regression；外角辨識仍使用 envelope/geometry，不依賴固定 edge index。
- **[Risk] 多個 shape group 同時存在造成 native memory peak →** 限制 batch/group size，明確釋放已合併的 children，並以 25×25 benchmark 加入 memory/cleanup observation；若失敗則使用較小 group 或 sequential fallback。
- **[Risk] 大量 coplanar holes 讓全形狀 mesher 遞迴失敗 →** 對超過 face complexity threshold 的 exact B-Rep 逐 face 執行 OpenCascade meshing，再合併三角資料；不降低 tolerance，也不以近似 preview 取代 canonical B-Rep。
- **[Risk] Cancellation 只能發生在 atomic kernel call 之間 →** 在每個 clone/fuse/fillet 邊界檢查 generation，文件與 progress UI 不宣稱可中斷單次 OpenCascade 呼叫。
- **[Risk] Progress callback 增加跨 Worker 訊息量 →** 只在完成 cell、batch 或 phase boundary 回報，不在 native loop 內逐 triangle 回報；runtime validation 要求 completed/total 合法。
- **[Risk] Benchmark 受瀏覽器、CPU、WASM cache 影響 →** 固定 warm-up、重複次數、browser/build mode、dependency lockfile 與 reference environment；效能 gate 以同一環境的 baseline 相對值判定。
- **[Risk] Slider 行為改變使用者期待 →** 只對 modular-grid range input coalesce，保留最後值、stale preview 與可理解狀態，不改 box text input contract。

## Migration Plan

1. 先加入 benchmark fixture、timing helpers 與 geometry baseline，確認現有 sequential path 的結果與耗時。
2. 擴充 progress event/runtime validation 與 build context callback，先讓現有 sequential path 回報細粒度進度並支援 stale cleanup。
3. 實作 row/block balanced fuse，逐步在小尺寸與大型 fixture 比較，通過 geometry regression 後才成為大型 grid 的預設策略。
4. 接上 modular-grid slider coalescing、progress UI counters、terminal cleanup 與 cancellation tests。
5. 執行 unit、Worker、CAD-kernel integration、Chromium route、type-check、build 與 benchmark gates。

Rollback 不需要資料 migration：保留 sequential fuse helper 與相同 Worker contract；若優化策略在特定 fixture 產生 geometry 或 memory 問題，可切回 sequential strategy，進度/取消 contract 仍可保留。

## Open Questions

- 實際 row/block group size 由 benchmark 決定，不在 spec 先固定單一數字。
- 若大型 sequential baseline 在 reference environment 失敗或超過目前 120 秒 operation timeout，benchmark 必須保留 failure/warning 並改用 optimized safety gate；120 秒只是大型模型的操作完成窗口，不得把放寬 timeout 當成性能改善證據。

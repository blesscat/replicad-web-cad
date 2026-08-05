## Why

`modular-grid-base` 目前逐格 clone/translate 後，以左折疊方式連續執行 B-Rep `fuse`，最後再做整體 `fillet`。網格尺寸變大時，既有模型會在每次 boolean 中持續成長，造成建立時間快速增加；Worker 雖然隔離了主執行緒，但 UI 目前只有粗略的 `building` 狀態，也無法在新輸入出現時於每個可安全邊界停止過期建模。

現在應先以可量測的 CPU/Worker 方案改善演算法與互動回饋，而不是重寫 OpenCascade B-Rep 為 GPU kernel。

## What Changes

- 建立代表性網格尺寸的 B-Rep generation benchmark，量測 template、clone/translate、fuse、fillet、mesh 及總耗時；benchmark 必須保留無法完成的 baseline fixture、樣本與 phase，不得靜默中止或捏造相對數字。
- 將 modular-grid-base 的 sequential fuse 改為經測試的分批或 row/tree fuse 策略，維持相同 single-solid 幾何、bounds、fillet 與 STEP 結果。
- 在每個可安全的 CAD kernel 邊界檢查 generation，讓已被新輸入取代的建模能停止並釋放中間 native shapes。
- 擴充 Worker progress 事件，呈現目前階段及已完成 cell/批次數量；完成、取消、錯誤與 timeout 都必須結束 progress 狀態。
- 降低 modular-grid slider 連續變更造成的重複建模，保留最新輸入優先語意。
- 補上效能、幾何等價、取消、資源清理及瀏覽器進度顯示測試。
- 不新增 GPU B-Rep backend；WebGL 仍只負責 viewport rendering。

大型 fixture 若既有 sequential baseline 在同一個 native epoch 內無法完成五次可比較樣本，效能 gate 會將它標示為 baseline unavailable；此時只允許以 optimized median 不超過既有 operation timeout 的 safety gate 通過，並保留 warning 說明沒有宣稱 20% 相對改善。

## Capabilities

### New Capabilities

- `brep-generation-performance`: 定義 B-Rep 生成的量測、可取消建模、批次 fuse、資源清理及效能回歸驗收。

### Modified Capabilities

- `cad-workspace`: 擴充 Worker progress 的可觀察資訊，並要求新輸入能使過期 generation 在安全邊界停止且不污染 current model。

## Impact

- 主要影響 `src/cad-kernel/components/modular-grid-base/builder.ts`、`src/cad-kernel/model/`、`src/workers/cad.worker.ts` 與 `src/cad-contract/messages/`。
- 需要調整主執行緒 Worker runtime、進度 UI、input debounce/slider 行為與相關型別。
- 新增 Worker/geometry benchmark 與行為測試；不新增 runtime dependency，不需要 backend 或 data migration。
- 既有 box geometry、component contract、STEP export 格式與 viewport GPU rendering 必須維持相容。

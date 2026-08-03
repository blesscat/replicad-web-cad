# 變更提案：replicad-web-cad

- 變更識別：2026-08-02-replicad-web-cad
- 狀態：提案中
- 類型：Greenfield
- 階段：Prototype
- 對應能力：cad-workspace

## 一句話

建立一個完全在瀏覽器內運作的 CAD 雛形：使用者調整一個方塊的長、寬、高，旁邊即時查看 3D 預覽，並下載由精確 B-Rep 產生的 STEP 檔案。

## 動機

使用者希望先驗證一條不需要安裝桌面 CAD、也不需要後端服務的工作流程：

1. 在網頁載入一個內建模型。
2. 修改少量尺寸參數。
3. 立即看到模型結果。
4. 將目前模型輸出為可供其他 CAD 工具使用的 STEP 檔案。

本變更先以單一方塊作為雛形。固定模型清單、更多參數與更複雜的建模能力，在雛形流程驗證後另行擴充。

## Prototype 目標

- 使用 Astro 建立網站 shell、首頁、文件頁與 CAD 路由，先以本機瀏覽器流程驗證。
- 以 React + React Three Fiber 實作瀏覽器端 CAD workspace。
- 在專用 Web Worker 內初始化 replicad 與 OpenCascade WebAssembly。
- 提供一個內建方塊模型，至少支援寬、深、高三個 mm 參數。
- 將 B-Rep 建模、mesh 產生與 STEP 匯出全部留在 Worker。
- 在主執行緒顯示參數表單、狀態與 3D 預覽。
- 讓使用者下載目前成功模型的 STEP 檔案；下載不需要上傳模型或呼叫專案 backend。
- 以版本化 Worker 訊息、generation、candidate commit/discard 與 model revision 避免舊結果覆蓋新結果。
- 在 WASM 載入、建模、預覽與匯出失敗時提供可理解的 UI 狀態。

## Prototype 使用者流程

1. 使用者進入 CAD 路由，看見靜態載入 fallback。
2. React workspace 啟動 Worker，主執行緒送出 engine.init。
3. Worker 回傳 engine.ready；主執行緒以預設參數送出 generation 1 的 model.generate。
4. Worker 回傳 candidate-ready，主執行緒驗證後送出 model.commit，Worker 回傳 model.ready。
5. UI 顯示方塊的寬、深、高欄位，所有數值以 mm 解讀。
6. 使用者修改參數時，合法 snapshot 在 150 ms debounce 後送出建模；非法 snapshot 立即使舊 generation 失效，但不送出 model.generate。Worker 建立候選 B-Rep 與預覽 mesh；只有仍符合最新 generation 的候選模型可以 commit。
7. 使用者按下下載 STEP，Worker 從目前已 commit 的 B-Rep 產生檔案，瀏覽器直接觸發下載。
8. 若新參數無效或建模失敗，既有預覽可以保留，但必須標示為與目前輸入不同步，且不得被當成目前輸入直接匯出。

## 明確非目標

Prototype 不包含：

- 固定模型選擇清單與多模型 UI；方塊是唯一內建模型。
- 複雜 CAD 編輯器、歷史樹、自由曲面、通用 fillet/chamfer 或大量布林。
- STEP、STL 或其他格式的匯入。
- binary STL、3MF、G-code 或 slicer project 輸出。
- backend、API server、database、帳號、雲端儲存、local persistence 或多人協作。
- 伺服器端建模、雲端匯出、工作佇列、遙測與分析服務。
- 行動裝置專屬 UI 或行動裝置效能保證。
- Safari、Edge 與其他尚未列入的桌面/行動瀏覽器支援。
- 正式 static hosting、CDN、base path、cache header 與 production deployment 驗收。

## 成功標準

Prototype 只有在下列流程可重複驗證時才算完成：

- 本機 Astro dev/build preview 可以開啟 CAD 路由，不需要專案 backend。
- 桌面版 Chrome 與 Firefox 能在 Worker 內初始化 WASM，建立非空方塊並顯示 3D 預覽。
- 修改寬、深、高後，預覽最終符合最新成功 generation；舊結果不會覆蓋新結果。
- 方塊的 B-Rep bounds 與 mesh bounds 符合輸入的 mm 尺寸。
- STEP 由目前 B-Rep 產生，採用 replicad 官方 STEP export 範例流程；Prototype 只驗證輸出非空、metadata 正確且能下載。
- STEP 下載不會因 React re-render 重複觸發，且 Object URL 會被釋放。
- WASM 載入失敗、非法輸入、建模失敗、Worker 終止與 STEP 匯出失敗都有明確狀態。
- UI 不提供 STL、3MF、G-code、匯入、儲存或帳號入口。

## Prototype Configuration

以下是雛形的暫定設定；之後可以調整，但實作 gate 必須使用同一組已記錄的值：

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

代表性效能裝置仍列為實作 gate 前由需求方確認的項目。Safari、Edge 與行動瀏覽器列為後續支援；正式 hosting 另案處理。

## 後續演進

雛形確認流程可行後，再另案加入固定模型 catalog。未來每個模型應提供：

- 穩定的 model id 與顯示名稱。
- 自己的參數 schema、單位、預設值與驗證規則。
- 參數到 B-Rep 的建模函式。
- 預覽與匯出檔名 metadata。

新增模型不得破壞目前 Worker contract、revision lifetime、錯誤狀態與瀏覽器端運作邊界。

## 待確認決策

- 代表性效能裝置。
- Prototype 完成後的正式 hosting、根路徑/子路徑、trailing slash 與 cache/header 設定。
- 後續 STEP parser、round-trip 與尺寸驗證工具及版本。
- Prototype 完成後是否另案加入 binary STL。

## 官方參考來源

- replicad library integration、Worker 與 OpenCascade injection：
  https://replicad.xyz/docs/use-as-a-library/
- replicad Solid 的 mesh、STEP、STL 與 delete API：
  https://replicad.xyz/docs/api/classes/Solid/
- Astro client:only 與 fallback：
  https://docs.astro.build/en/reference/directives-reference/#clientonly
- IANA STEP media type registry：
  https://www.iana.org/assignments/media-types/media-types.xhtml
- OpenCascade.js：
  https://ocjs.org/docs/about

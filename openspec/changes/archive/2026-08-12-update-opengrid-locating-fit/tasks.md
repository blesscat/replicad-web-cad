## 1. 共用定位尺寸契約

- [x] 1.1 更新 shared locating contract：保留 nominal Ø5、一般 assembly opening Ø5.05、retaining Ø7.05 與法蘭 Ø7 × 0.8，並將特殊下段 opening 與品質 fixture shaft 改為精確 Ø5。
- [x] 1.2 補上共用契約的行為測試，確認特殊下段 opening 不再由 test shaft 加 0.05 推導，且 28／14 mm grid pitch 與一般 Ø5.05 孔不變。

## 2. 方盒與圓盒幾何及說明

- [x] 2.1 更新方盒 special socket builder、quality fixture 與相關 config，讓四角孔下段使用 Ø5，上段 retaining profile 與各模式深度維持原契約。
- [x] 2.2 更新圓盒中心孔及四個外側 cardinal 孔的 builder、quality fixture 與 config，確認五個 stepped hole 的下段都使用 Ø5，上段都維持 Ø7.05。
- [x] 2.3 更新方盒與圓盒 model-card descriptions，分別明確說明方盒四角連接孔，以及圓盒中心加四個外側連接孔為 Ø5 mm。
- [x] 2.4 增加方盒／圓盒行為測試，覆蓋堆疊版、薄殼版、孔禁用／半格位置、五個圓盒孔的尺寸與 Ø5 fixture shaft。

## 3. 定位柱參數與幾何

- [x] 3.1 將 pillar normalized parameter contract 擴充為 `offsetX`／`offsetY`，三種模式預設 0，驗證有限值、-0.5～0.5 mm 範圍與 0.05 mm 步進；舊 snapshot 缺少欄位時補零，非法值走 invalidation。
- [x] 3.2 更新 fixed pillar config 與 builder：standard 為 Ø5 × 9 mm、thin-shell 為 Ø5 × 6 mm，保留 Ø7 × 0.8 mm 法蘭、shoulder 與既有 chamfer；positioning 維持既有 Ø5 幾何與長度限制。
- [x] 3.3 對三種模式的完整 pillar shape 套用 XY translation，更新 bounds、quality probes 與幾何品質檢查，確認 offset 不改變直徑、長度、倒角或 Z=0 基準。
- [x] 3.4 更新 pillar catalog schema、模型卡說明、filename／metadata 產生器與相關 runtime contract：zero offset 使用 9／6 新 stem，非零 offset 使用 deterministic X/Y suffix。

## 4. Workspace 與持久化整合

- [x] 4.1 更新 pillar workspace parser、raw parameter conversion、store normalization 與 system preset，讓所有 accepted snapshots 都包含 offsetX／offsetY，且 fixed 模式不接受 length override。
- [x] 4.2 更新 Svelte parameter panel，讓 standard、thin-shell、positioning 都顯示 X/Y offset 控制，范围為 -0.5～0.5 mm、step 0.05 mm；固定模式顯示 9／6 mm 且不提供手動長度。
- [x] 4.3 更新 workspace generate／invalidate lifecycle 與 persistence 行為，覆蓋 offset 修改、模式切換、重載還原、舊資料補零及超界輸入停用 export。
- [x] 4.4 增加 catalog、persistence、workspace 與 E2E 行為測試，確認 UI labels、尺寸說明、accepted snapshot、offset bounds 和錯誤流程一致。

## 5. 回歸驗證與文件同步

- [x] 5.1 更新所有受影響的 unit、Worker integration、export-runtime、catalog 與 E2E 斷言，移除固定版 8／5 與 Ø4.5／Ø4.55 的過期期望。
- [x] 5.2 執行 `pnpm test`、`pnpm check`、`pnpm format:check` 與必要的 `pnpm test:e2e`；本 change 相關測試通過，完整套件僅剩未修改之高成本 CAD 測試的個別 timeout。
- [x] 5.3 執行 `openspec validate update-opengrid-locating-fit --type change --strict`，確認 proposal、七個 capability delta、design、tasks 與 implementation scope 一致。

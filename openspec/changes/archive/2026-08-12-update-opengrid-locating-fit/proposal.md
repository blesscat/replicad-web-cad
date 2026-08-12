## Why

OpenGrid 的固定版定位柱、方盒／圓盒的連接孔，以及 Worker 品質 fixture 目前仍沿用 Ø4.5／Ø4.55 mm 軸孔介面，與已確認的 Ø5 mm 連接尺寸不一致。定位柱也需要固定版新長度與小幅 XY 微調，讓實際裝配與使用者可調位置一致。

## What Changes

- 將 OpenGrid 定位柱 standard／thin-shell 的本體改為 Ø5 mm，固定總長分別改為 9 mm 與 6 mm；定位模式維持 Ø5 mm。
- 將方盒四角特殊孔，以及圓盒中心孔與四個外側孔的下段通孔全部改為 Ø5 mm；內側 Ø7.05 mm retaining 孔與 Ø7 mm 法蘭維持不變。
- 將 Box／Cylinder 品質測試 fixture 的軸徑由 Ø4.5 mm 改為 Ø5 mm，並讓共用介面契約與插入測試同步更新。
- 為定位柱新增 X/Y 偏移參數；三種模式都適用，預設為 0 mm，合法範圍為 -0.5～0.5 mm，步進為 0.05 mm。偏移只平移完整幾何，不改變截面尺寸或 Z 基準。
- 更新定位柱、方盒與圓盒的 model-card 說明、參數面板、品質檢查、規格與測試；既有 model ID、build key、route 與 OpenGrid 命名保持不變。
- 更新固定版定位柱的 STEP／STL 長度識別與相關匯出契約，並確保不同 XY 偏移的匯出 metadata 可區分。

## Capabilities

### New Capabilities

無；本變更修改既有 OpenGrid component 的幾何與參數契約。

### Modified Capabilities

- `opengrid-pillar-generator`: 更新固定模式尺寸、長度、XY 偏移參數、bounds 與幾何品質契約。
- `opengrid-grid-contract`: 更新共用定位軸與特殊下段孔的 Ø5 mm 契約，同時保留一般網格孔的 Ø5.05 mm 裝配間隙。
- `opengrid-stackable-box`: 將所有特殊四角孔的下段開口改為 Ø5 mm。
- `opengrid-stackable-cylinder`: 將中心孔與四個外側孔的下段開口改為 Ø5 mm。
- `component-parameter-persistence`: 保存定位柱 XY 偏移，並為舊 snapshot 補上 0 mm 預設值。
- `cad-workspace`: 新增定位柱 X/Y 偏移控制與固定模式新長度的可觀察 UI 行為。
- `stl-export`: 更新固定模式檔名與帶偏移定位柱的 deterministic metadata。

## Impact

- 主要影響 `src/cad-contract/units` 的 locating interface、Pillar、Stackable Box、Stackable Cylinder contract，以及 `src/cad-kernel/components` 的 builder／quality gate。
- 影響定位柱 model catalog、參數 parser／store、Svelte panel、Worker quality fixture、STEP／STL filename、unit／Worker integration／E2E tests 與 OpenSpec specs。
- Offset 會改變定位柱的世界座標 bounds 與輸出幾何，但不改變其尺寸、Z=0 底面或 stable model identity。
- 不新增 component，不改動 OpenGrid model ID、route、system context、參數持久化 storage key 或官方 28／14 mm grid pitch。

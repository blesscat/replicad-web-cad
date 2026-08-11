## Why

OpenGrid 的名義定位尺寸與組裝孔徑目前分散在 Snap、Divider、Pillar、Stackable Box 與 Stackable Cylinder 的不同 contract，導致同一個介面尺寸需要多處維護。現在已確認 Desk System 的實際組裝介面：名義定位尺寸為 Ø5 mm，組裝開孔為 Ø5.05 mm，薄殼測試使用 Ø4.05 mm 的軸孔搭配 Ø7 mm × 0.8 mm 法蘭，因此需要把尺寸來源與配合測試一起對齊。

## What Changes

- 新增共用的 OpenGrid locating／assembly interface contract，集中定義名義 Ø5 mm、共用 `+0.05 mm` 組裝增量、Ø5.05 mm 組裝開孔、Ø4 mm 測試軸與 Ø4.05 mm 軸孔，以及 Ø7 mm × 0.8 mm 測試法蘭。
- 讓 Snap 的定位孔半徑、Divider 的 `pegDiameter`、Pillar 的 `bodyDiameter`、Stackable Box 的 `baseHoleDiameter` 都引用共用名義 Ø5 mm；Pillar 元件本身仍維持 Ø5 mm。
- 讓 Stackable Box 的特殊底孔與普通底孔、Stackable Cylinder 的底孔引用共用 Ø5.05 mm 組裝開孔；普通底孔維持直孔，不新增止擋段。
- **BREAKING** 將 Stackable Box 特殊底孔與 Stackable Cylinder 底孔的內側 Ø7.05 mm 段改為 Ø4.05 mm 軸孔，讓 Ø4 mm 軸通過並由 Ø7 mm 法蘭在肩部止擋。
- **BREAKING** 將 Box 品質檢查用的舊 Ø5.8 mm × 0.5 mm 法蘭 fixture 改為 Ø7 mm × 0.8 mm 法蘭與 Ø4 mm 軸；軸長依有效底板厚度推導，薄殼 3 mm 模式使用 4 mm 軸長，並保留相同的預期外露策略。
- 讓 `socketDeduplicationDistance` 引用共用名義 Ø5 mm，保留它作為孔位置去重門檻的語意，而不是把它當成孔徑或組裝 clearance。
- 保留既有 model ID、build key、route、參數 snapshot schema 與 `opengrid-pillar` 的使用者可見 Ø5 mm 幾何；只有已明確指定的 Stackable Box／Cylinder 組裝幾何與品質 fixture 改變。

## Capabilities

### New Capabilities

- `opengrid-locating-assembly-interface`: 定義 OpenGrid 共用定位尺寸、組裝開孔、Ø4.05 軸孔、測試法蘭與底厚相依 fixture 的契約。

### Modified Capabilities

- `opengrid-grid-contract`: 將孔徑與定位介面改由新的共用 interface contract 管理，並保留 grid pitch 與 feature-specific dimensions 的分離。
- `opengrid-stackable-box`: 修改特殊底孔的內側段與 captive insert fixture；普通底孔仍為 Ø5.05 mm 直孔。
- `opengrid-stackable-cylinder`: 修改 stepped bottom hole 的內側段，由 Ø7.05 mm 改為 Ø4.05 mm。

## Impact

- 主要影響 `src/cad-contract/units` 的 OpenGrid interface、Snap、Divider、Pillar、Stackable Box 與 Stackable Cylinder contract。
- 影響 Stackable Box 的 socket geometry、hole quality gate、flanged-insert fixture、spacing validation，以及 Stackable Cylinder 的 stepped-hole geometry 與 quality checks。
- 需要同步更新 unit／Worker integration tests、OpenSpec specs、品質訊息與固定尺寸 assertions；不新增模型，也不改動既有 OpenGrid 路由或 persistence schema。
- `baseHoleClearance`、孔深、7 mm 位置 offset、法蘭外露策略等非共用尺寸仍須保留各自語意，不能因同一數值而合併。

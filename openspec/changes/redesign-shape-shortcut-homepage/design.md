## Context

目前 worktree 的首頁實作已經把根路徑做成 OpenGrid 模型 hub，但專案先前已將模型選擇拆到 `/models`。這兩個方向互相衝突：`/` 應該負責建立產品理解與品牌印象，`/models` 才負責讓使用者挑選並進入特定 CAD workspace。

本次設計把責任邊界拉清楚，不改動 catalog 或 CAD runtime。首頁是 Astro 靜態 landing page；模型卡、preview、參數與 model-specific route 只存在於 `/models` 或 `/cad/<modelId>`。

## Goals / Non-Goals

**Goals:**

- 讓使用者先理解 Shape Shortcut 的定位、價值與使用方式。
- 以清楚的內容層次介紹瀏覽器內 CAD、參數化控制、預覽與精確匯出等能力。
- 提供明確但通用的下一步：前往 `/models` 或閱讀 `/docs/`。
- 保持首頁快速、靜態、可存取，且不啟動任何 CAD runtime。
- 維持 `/models` 的 catalog-driven 模型選擇與既有 CAD route 行為。

**Non-Goals:**

- 不在首頁顯示模型卡、模型 preview、用途捷徑、參數欄位或 3D viewport。
- 不在首頁提供「開始生成」、「編輯」或任何直接進入單一 `/cad/<modelId>` 的 CTA。
- 不重新設計 `/models`、CAD workspace、Worker contracts、persistence、validation 或 export behavior。
- 不新增模型、重新命名 model ID、改變 buildKey，或建立另一份 catalog 清單。

## Information Architecture

首頁內容採由理解到行動的順序，但行動只指向通用入口：

```text
┌─────────────────────────────────────────────┐
│ Hero：Shape Shortcut 是什麼？                │
│ 產品定位 + 查看模型庫 + 閱讀文件              │
├─────────────────────────────────────────────┤
│ Why：為什麼使用它？                           │
│ 瀏覽器內建模 · 參數化控制 · 精確匯出            │
├─────────────────────────────────────────────┤
│ How：工作流程如何運作？                       │
│ 選擇 → 調整 → 預覽 → 匯出（純說明、無控制項）   │
├─────────────────────────────────────────────┤
│ Scope：目前能做什麼？                         │
│ 實用 CAD 模型、OpenGrid／HSW 系列、STEP／STL   │
├─────────────────────────────────────────────┤
│ CTA：前往模型庫或閱讀文件                     │
└─────────────────────────────────────────────┘
```

## Decisions

### 1. 首頁只做產品介紹

`src/pages/index.astro` 使用靜態 Astro markup，直接描述產品能力與使用流程。頁面可以提到「選擇、調整、預覽、匯出」這些產品步驟，但不得把它們實作成參數控制、模型 preview 或建造操作。

### 2. 模型入口只保留通用 CTA

Hero 的主要 CTA 使用「查看模型庫」並導向 `/models`；介紹段落可提供同一個通用入口，避免把使用者導向特定模型。文件入口使用 `/docs/`，協助想先了解規格與限制的使用者。

首頁不得 import model catalog 來渲染卡片，也不得產生 `/cad/<modelId>` 連結。模型名稱可以在產品範圍的文字中作為概念性說明，但不能變成可選取的模型清單。

### 3. 用內容區塊建立產品理解

首頁至少包含下列可掃描的介紹區塊：

- 產品定位：Shape Shortcut 為什麼存在，以及適合什麼樣的 CAD 工作。
- 核心能力：瀏覽器內使用、參數化調整、即時預覽、STEP／STL 匯出。
- 使用流程：以非互動式步驟解釋從模型庫到匯出的路徑。
- 目前範圍：說明目前以實用模型與 OpenGrid／HSW 相關內容為主，但不列出模型卡片。

### 4. 視覺只做品牌展示

Hero 可保留穩定尺寸的產品視覺區，內容只能是靜態品牌插圖、完成品情境圖或中性的產品展示，不得是 live CAD preview、單一模型 preview collage 或需要 Worker 的互動視窗。若本 change 沒有合適圖片資產，使用不會誤導使用者的 CSS／中性展示區即可。

### 5. 保持靜態邊界

首頁不得 mount `CadWorkspace`、載入 CAD Worker、OpenCascade WASM、WebGL renderer 或 Svelte CAD workspace。`/models` 也維持靜態 catalog chooser；只有 `/cad/<modelId>` 才進入建造與匯出流程。

### 6. 以可觀察行為驗收

E2E 測試應透過 heading、可見文字、角色、通用連結與穩定 page-region test id 驗證首頁。測試要確認介紹內容與入口存在，也要確認首頁不存在模型卡、個別 CAD route、建造 CTA 與 CAD runtime；不應檢查 Astro source 或實作字串。

## Risks / Trade-offs

- [Risk] 首頁與模型庫之間多一層導覽。→ Hero 的 `/models` CTA 必須高可見，導覽列也保留模型庫入口。
- [Risk] 介紹內容可能過於抽象。→ 用具體的核心能力、工作流程與輸出格式說明產品價值，但不把說明變成建模控制項。
- [Risk] 首頁提到 OpenGrid／HSW 後，使用者可能期待看到模型清單。→ 明確把完整模型清單與選擇行為放在 `/models`，首頁只做範圍介紹。
- [Risk] 沒有圖片資產時 Hero 視覺不完整。→ 使用穩定的中性品牌展示區，並將未來靜態成品圖視為獨立資產，不引入 CAD runtime。

## Migration Plan

1. 先更新首頁 E2E，要求介紹型內容、通用入口與沒有模型建造內容。
2. 移除首頁的 catalog imports、模型卡、用途捷徑與 model-specific CTA，改為介紹型 Astro sections。
3. 確認 `/models`、`/cad/<modelId>`、文件與 shared navigation 的既有入口沒有回歸。
4. 執行首頁／模型選擇 E2E、typecheck、unit tests、format、build 與 OpenSpec validation。

回滾時只需還原根路徑的內容；模型 catalog、模型 routes 與 CAD runtime 不需要 migration。

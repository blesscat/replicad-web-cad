## MODIFIED Requirements

### Requirement: 明確非目標

The system MUST provide the existing box and the new modular-grid-base through the component catalog. This change MUST provide STEP and STL downloads, but MUST NOT add arbitrary CAD file import, 3MF/G-code workflows, saving, authentication, collaboration, automatic Bambu Studio launching, or native desktop-app integration.

#### Scenario: Prototype 功能清單

- **Given** 使用者查看 Prototype UI 與文件
- **When** 檢查模型與輸出功能
- **Then** 必須提供 component catalog、box、modular-grid-base、各自的 mm/數量參數、3D 預覽、STEP 下載與 STL 下載
- **And** 不得出現 arbitrary import、3MF、G-code、save、auth、collaboration、自動啟動 Bambu Studio 或 native desktop bridge 入口

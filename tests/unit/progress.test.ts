import { describe, expect, it } from "vitest"
import { progressMessage } from "../../src/features/cad/progress"

describe("CAD progress messages", () => {
  it.each([
    ["loading", "正在載入 CAD engine…"],
    ["building", "正在建立 B-Rep…"],
    ["meshing", "正在產生預覽 mesh…"],
    ["exporting", "正在匯出 STEP…"],
  ] as const)("describes the %s stage", (stage, message) => {
    expect(progressMessage(stage)).toBe(message)
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("CAD thread ownership", () => {
  it("keeps CAD kernel imports out of the React main-thread modules", () => {
    const mainThreadFiles = [
      "src/components/cad/CadWorkspace.tsx",
      "src/features/cad/viewport/CadViewport.tsx",
      "src/features/cad/worker-client/index.ts",
      "src/features/cad/download/index.ts",
    ]
    const source = mainThreadFiles
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")
    expect(source).not.toMatch(/from ["']replicad(?:-opencascadejs)?["']/)
    expect(source).not.toMatch(/from ["'].*cad-kernel/)
  })
})

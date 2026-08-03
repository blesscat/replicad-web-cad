import { describe, expect, it } from "vitest";
import { cadErrorCodeFor, cadErrorStageFor } from "../../src/workers/error-mapping";

describe("CAD Worker error mapping", () => {
  it.each([
    ["MODEL_REVISION_MISSING", "model.generate", "MODEL_REVISION_MISSING"],
    ["WORKER_RESTARTED", "model.generate", "WORKER_RESTARTED"],
    ["CANDIDATE_MISSING", "model.commit", "CANDIDATE_ORPHANED"],
    ["CANDIDATE_CAPACITY", "model.generate", "CANDIDATE_CAPACITY"],
    ["ENGINE_NOT_READY", "model.generate", "ENGINE_INIT_FAILED"],
    ["unknown", "engine.init", "ENGINE_INIT_FAILED"],
    ["unknown", "export.step", "STEP_EXPORT_FAILED"],
    ["unknown", "model.generate", "MODEL_BUILD_FAILED"],
  ] as const)("maps %s before applying the %s fallback", (message, commandKind, expectedCode) => {
    expect(cadErrorCodeFor(message, commandKind)).toBe(expectedCode);
  });

  it("maps command kinds to their operational stages", () => {
    expect(cadErrorStageFor("engine.init")).toBe("initializing");
    expect(cadErrorStageFor("export.step")).toBe("exporting");
    expect(cadErrorStageFor("model.generate")).toBe("building");
    expect(cadErrorStageFor("model.commit")).toBe("worker");
  });
});

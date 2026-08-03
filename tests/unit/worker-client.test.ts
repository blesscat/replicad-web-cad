import { describe, expect, it } from "vitest";
import { validateMeshSnapshot } from "../../src/features/cad/worker-client";

function meshSnapshot() {
  return {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer,
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer,
    indices: new Uint32Array([0, 1, 2]).buffer,
    bounds: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 0] as [number, number, number] },
    triangleCount: 1,
  };
}

describe("Worker mesh boundary validation", () => {
  it("accepts finite typed arrays with in-range triangle indices", () => {
    expect(validateMeshSnapshot(meshSnapshot())).toBe(true);
  });

  it("rejects non-finite coordinates, out-of-range indices and invalid counts", () => {
    expect(
      validateMeshSnapshot({ ...meshSnapshot(), positions: new Float32Array([0, 0, Number.NaN]).buffer })
    ).toBe(false);
    expect(
      validateMeshSnapshot({ ...meshSnapshot(), indices: new Uint32Array([0, 1, 9]).buffer })
    ).toBe(false);
    expect(validateMeshSnapshot({ ...meshSnapshot(), triangleCount: 2 })).toBe(false);
  });
});

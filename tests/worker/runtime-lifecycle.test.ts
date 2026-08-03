import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/cad-kernel/initialise", () => ({
  initialiseCadKernel: vi.fn(async () => undefined),
}));

vi.mock("../../src/cad-kernel/model", () => ({
  buildModelBRep: vi.fn(() => ({ delete: vi.fn() })),
}));

vi.mock("../../src/cad-kernel/mesh", () => ({
  meshBRep: vi.fn(() => ({
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2]),
    bounds: { min: [0, 0, 0], max: [1, 1, 0] },
    triangleCount: 1,
  })),
  serializeMesh: vi.fn((mesh) => ({
    positions: mesh.positions.slice().buffer,
    normals: mesh.normals.slice().buffer,
    indices: mesh.indices.slice().buffer,
    bounds: mesh.bounds,
    triangleCount: mesh.triangleCount,
  })),
}));

vi.mock("../../src/cad-kernel/export", () => ({
  exportStepBytes: vi.fn(async () => new Uint8Array([1]).buffer),
}));

import { CadWorkerRuntime } from "../../src/workers/cad.worker";

const base = {
  version: 1 as const,
  requestId: "request-1",
  operationId: "operation-1",
};

function initCommand() {
  return { ...base, kind: "engine.init" as const, asset: { wasmUrl: "/replicad_single.wasm" } };
}

function generateCommand(generation = 1) {
  return {
    ...base,
    kind: "model.generate" as const,
    requestId: `generate-request-${generation}`,
    operationId: `generate-operation-${generation}`,
    generation,
    modelId: "box" as const,
    parameters: { width: 20, depth: 30, height: 40 },
    previewConfig: { tolerance: 0.01, angularTolerance: 0.1 },
  };
}

describe("CAD Worker candidate terminal lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits one original terminal response for repeated discard", async () => {
    const events: any[] = [];
    const runtime = new CadWorkerRuntime("epoch-test", (event) => events.push(event));
    await runtime.handle(initCommand());
    await runtime.handle(generateCommand());
    const candidate = events.find((event) => event.kind === "model.candidate-ready");

    await runtime.handle({
      ...base,
      kind: "model.discard" as const,
      requestId: "discard-request-1",
      operationId: "generate-operation-1",
      generation: 1,
      candidateId: candidate.candidateId,
      workerEpoch: "epoch-test",
    });
    await runtime.handle({
      ...base,
      kind: "model.discard" as const,
      requestId: "discard-request-2",
      operationId: "generate-operation-1",
      generation: 1,
      candidateId: candidate.candidateId,
      workerEpoch: "epoch-test",
    });

    const terminals = events.filter((event) => event.kind === "operation.superseded");
    expect(terminals).toHaveLength(1);
    expect(terminals[0]).toMatchObject({
      operationId: "generate-operation-1",
      terminalForRequestId: "generate-request-1",
    });
  });

  it("invalidates a same-generation candidate and rejects commit", async () => {
    const events: any[] = [];
    const runtime = new CadWorkerRuntime("epoch-test", (event) => events.push(event));
    await runtime.handle(initCommand());
    await runtime.handle(generateCommand());
    const candidate = events.find((event) => event.kind === "model.candidate-ready");
    await runtime.handle({
      ...base,
      kind: "model.invalidate" as const,
      requestId: "invalidate-request",
      operationId: "invalidate-operation",
      generation: 1,
      workerEpoch: "epoch-test",
      reason: "invalid-input" as const,
    });
    await runtime.handle({
      ...base,
      kind: "model.commit" as const,
      requestId: "commit-request",
      operationId: "generate-operation-1",
      generation: 1,
      candidateId: candidate.candidateId,
      workerEpoch: "epoch-test",
    });

    expect(events.filter((event) => event.kind === "model.ready")).toHaveLength(0);
    expect(events.filter((event) => event.kind === "operation.superseded")).toHaveLength(1);
  });

  it("rejects commands after worker.dispose", async () => {
    const events: any[] = [];
    const runtime = new CadWorkerRuntime("epoch-test", (event) => events.push(event));
    await runtime.handle(initCommand());
    await runtime.handle({ ...base, kind: "worker.dispose" as const });
    await runtime.handle(generateCommand());

    expect(events.at(-1)).toMatchObject({ kind: "operation.error", code: "WORKER_TERMINATED" });
  });
});

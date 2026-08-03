import type { CadError, CadErrorCode, CadErrorStage } from "../errors";
import {
  PROTOTYPE_CONFIGURATION,
  validateBoxParameters,
  type BoxBounds,
  type BoxParameters,
} from "../units";

export const PROTOCOL_VERSION = 1 as const;

export type ProtocolVersion = typeof PROTOCOL_VERSION;

export type MeshSnapshot = {
  positions: ArrayBuffer;
  normals: ArrayBuffer;
  indices: ArrayBuffer;
  bounds: BoxBounds;
  triangleCount: number;
};

export type AssetMetadata = {
  wasmUrl: string;
};

type Envelope<K extends string> = {
  version: ProtocolVersion;
  kind: K;
  requestId: string;
};

export type EngineInitCommand = Envelope<"engine.init"> & {
  operationId: string;
  asset: AssetMetadata;
};

export type ModelGenerateCommand = Envelope<"model.generate"> & {
  operationId: string;
  generation: number;
  modelId: "box";
  parameters: BoxParameters;
  previewConfig: { tolerance: number; angularTolerance: number };
};

export type ModelInvalidateCommand = Envelope<"model.invalidate"> & {
  operationId: string;
  generation: number;
  workerEpoch: string;
  reason: "invalid-input" | "superseded";
};

export type ModelCommitCommand = Envelope<"model.commit"> & {
  operationId: string;
  generation: number;
  candidateId: string;
  workerEpoch: string;
};

export type ModelDiscardCommand = Envelope<"model.discard"> & {
  operationId: string;
  generation: number;
  candidateId: string;
  workerEpoch: string;
};

export type ExportStepCommand = Envelope<"export.step"> & {
  operationId: string;
  modelRevision: string;
  workerEpoch: string;
  file: { name: string; mime: "model/step" };
};

export type WorkerDisposeCommand = Envelope<"worker.dispose"> & {
  operationId: string;
};

export type WorkerCommand =
  | EngineInitCommand
  | ModelGenerateCommand
  | ModelInvalidateCommand
  | ModelCommitCommand
  | ModelDiscardCommand
  | ExportStepCommand
  | WorkerDisposeCommand;

export type WorkerCommandInput =
  | Omit<EngineInitCommand, "version" | "requestId"> & Partial<Pick<EngineInitCommand, "version" | "requestId">>
  | Omit<ModelGenerateCommand, "version" | "requestId"> & Partial<Pick<ModelGenerateCommand, "version" | "requestId">>
  | Omit<ModelInvalidateCommand, "version" | "requestId"> & Partial<Pick<ModelInvalidateCommand, "version" | "requestId">>
  | Omit<ModelCommitCommand, "version" | "requestId"> & Partial<Pick<ModelCommitCommand, "version" | "requestId">>
  | Omit<ModelDiscardCommand, "version" | "requestId"> & Partial<Pick<ModelDiscardCommand, "version" | "requestId">>
  | Omit<ExportStepCommand, "version" | "requestId"> & Partial<Pick<ExportStepCommand, "version" | "requestId">>
  | Omit<WorkerDisposeCommand, "version" | "requestId"> & Partial<Pick<WorkerDisposeCommand, "version" | "requestId">>;

export type EngineReadyEvent = Envelope<"engine.ready"> & {
  operationId: string;
  workerEpoch: string;
  engine: { name: "replicad"; wasm: true };
};

export type ProgressEvent = Envelope<"operation.progress"> & {
  operationId: string;
  stage: "loading" | "building" | "meshing" | "exporting";
  generation?: number;
  modelRevision?: string;
};

export type ModelInvalidatedEvent = Envelope<"model.invalidated"> & {
  operationId: string;
  generation: number;
  workerEpoch: string;
};

export type ModelCandidateReadyEvent = Envelope<"model.candidate-ready"> & {
  operationId: string;
  generation: number;
  candidateId: string;
  workerEpoch: string;
  mesh: MeshSnapshot;
};

export type ModelReadyEvent = Envelope<"model.ready"> & {
  operationId: string;
  generation: number;
  modelRevision: string;
  workerEpoch: string;
  mesh: MeshSnapshot;
  bounds: BoxBounds;
};

export type ExportAcceptedEvent = Envelope<"export.accepted"> & {
  operationId: string;
  modelRevision: string;
  workerEpoch: string;
};

export type SupersededEvent = Envelope<"operation.superseded"> & {
  operationId: string;
  terminalForRequestId: string;
  generation: number;
  reason:
    | "STALE_GENERATION"
    | "CANDIDATE_CAPACITY"
    | "CANDIDATE_EXPIRED"
    | "CANDIDATE_ORPHANED";
};

export type OperationErrorEvent = Envelope<"operation.error"> & {
  operationId: string;
  terminalForRequestId: string;
  stage: CadErrorStage;
  code: CadErrorCode;
  userMessage: string;
  recoverable: boolean;
  generation?: number;
  modelRevision?: string;
};

export type ExportReadyEvent = Envelope<"export.ready"> & {
  operationId: string;
  modelRevision: string;
  workerEpoch: string;
  format: "step";
  bytes: ArrayBuffer;
  mime: "model/step";
  fileName: string;
};

export type WorkerEvent =
  | EngineReadyEvent
  | ProgressEvent
  | ModelInvalidatedEvent
  | ModelCandidateReadyEvent
  | ModelReadyEvent
  | ExportAcceptedEvent
  | SupersededEvent
  | OperationErrorEvent
  | ExportReadyEvent;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isEnvelope(value: unknown, kind: string): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.version === PROTOCOL_VERSION &&
    value.kind === kind &&
    isNonEmptyString(value.requestId)
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

function isBounds(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const min = value.min;
  const max = value.max;
  return (
    Array.isArray(min) &&
    Array.isArray(max) &&
    min.length === 3 &&
    max.length === 3 &&
    [...min, ...max].every(isFiniteNumber) &&
    min.every((coordinate, index) => coordinate <= max[index])
  );
}

function isMesh(value: unknown): value is MeshSnapshot {
  return (
    isRecord(value) &&
    isArrayBuffer(value.positions) &&
    isArrayBuffer(value.normals) &&
    isArrayBuffer(value.indices) &&
    isBounds(value.bounds) &&
    isNonNegativeInteger(value.triangleCount) &&
    value.triangleCount > 0
  );
}

const CAD_ERROR_STAGES: readonly CadErrorStage[] = [
  "protocol",
  "initializing",
  "building",
  "meshing",
  "exporting",
  "worker",
  "validation",
];

const CAD_ERROR_CODES: readonly CadErrorCode[] = [
  "PROTOCOL_UNSUPPORTED",
  "PROTOCOL_INVALID",
  "ENGINE_INIT_FAILED",
  "ENGINE_TIMEOUT",
  "WORKER_TIMEOUT",
  "WORKER_RESTARTED",
  "WORKER_TERMINATED",
  "BROWSER_UNSUPPORTED",
  "INVALID_INPUT",
  "MODEL_BUILD_FAILED",
  "MESH_INVALID",
  "MODEL_REVISION_MISSING",
  "STALE_GENERATION",
  "CANDIDATE_CAPACITY",
  "CANDIDATE_EXPIRED",
  "CANDIDATE_ORPHANED",
  "STEP_EXPORT_FAILED",
  "STEP_METADATA_INVALID",
  "UNKNOWN_ERROR",
];

function isCadErrorStage(value: unknown): value is CadErrorStage {
  return typeof value === "string" && CAD_ERROR_STAGES.includes(value as CadErrorStage);
}

function isCadErrorCode(value: unknown): value is CadErrorCode {
  return typeof value === "string" && CAD_ERROR_CODES.includes(value as CadErrorCode);
}

export function isWorkerCommand(value: unknown): value is WorkerCommand {
  if (!isRecord(value) || value.version !== PROTOCOL_VERSION || typeof value.kind !== "string") {
    return false;
  }
  if (!isNonEmptyString(value.requestId) || !isNonEmptyString(value.operationId)) return false;

  switch (value.kind) {
    case "engine.init":
      return isRecord(value.asset) && isNonEmptyString(value.asset.wasmUrl);
    case "model.generate":
      return (
        isPositiveInteger(value.generation) &&
        value.modelId === "box" &&
        validateBoxParameters(value.parameters).valid &&
        isRecord(value.previewConfig) &&
        isFiniteNumber(value.previewConfig.tolerance) &&
        value.previewConfig.tolerance >= 0 &&
        isFiniteNumber(value.previewConfig.angularTolerance) &&
        value.previewConfig.angularTolerance > 0
      );
    case "model.invalidate":
      return (
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.workerEpoch) &&
        (value.reason === "invalid-input" || value.reason === "superseded")
      );
    case "model.commit":
    case "model.discard":
      return (
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.candidateId) &&
        isNonEmptyString(value.workerEpoch)
      );
    case "export.step":
      return (
        isNonEmptyString(value.modelRevision) &&
        isNonEmptyString(value.workerEpoch) &&
        isRecord(value.file) &&
        isNonEmptyString(value.file.name) &&
        value.file.name.endsWith(PROTOTYPE_CONFIGURATION.stepExtension) &&
        value.file.mime === "model/step"
      );
    case "worker.dispose":
      return true;
    default:
      return false;
  }
}

export function isWorkerEvent(value: unknown): value is WorkerEvent {
  if (!isRecord(value) || typeof value.kind !== "string") return false;

  switch (value.kind) {
    case "engine.ready":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.workerEpoch) &&
        isRecord(value.engine) &&
        value.engine.name === "replicad" &&
        value.engine.wasm === true
      );
    case "operation.progress":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        ["loading", "building", "meshing", "exporting"].includes(String(value.stage)) &&
        (value.generation === undefined || isPositiveInteger(value.generation)) &&
        (value.modelRevision === undefined || isNonEmptyString(value.modelRevision))
      );
    case "model.invalidated":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.workerEpoch)
      );
    case "model.candidate-ready":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.candidateId) &&
        isNonEmptyString(value.workerEpoch) &&
        isMesh(value.mesh)
      );
    case "model.ready":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isPositiveInteger(value.generation) &&
        isNonEmptyString(value.modelRevision) &&
        isNonEmptyString(value.workerEpoch) &&
        isMesh(value.mesh) &&
        isBounds(value.bounds)
      );
    case "export.accepted":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.modelRevision) &&
        isNonEmptyString(value.workerEpoch)
      );
    case "operation.superseded":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.terminalForRequestId) &&
        isPositiveInteger(value.generation) &&
        ["STALE_GENERATION", "CANDIDATE_CAPACITY", "CANDIDATE_EXPIRED", "CANDIDATE_ORPHANED"].includes(String(value.reason))
      );
    case "operation.error":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.terminalForRequestId) &&
        isCadErrorStage(value.stage) &&
        isCadErrorCode(value.code) &&
        isNonEmptyString(value.userMessage) &&
        typeof value.recoverable === "boolean" &&
        (value.generation === undefined || isPositiveInteger(value.generation)) &&
        (value.modelRevision === undefined || isNonEmptyString(value.modelRevision))
      );
    case "export.ready":
      return (
        isEnvelope(value, value.kind) &&
        isNonEmptyString(value.operationId) &&
        isNonEmptyString(value.modelRevision) &&
        isNonEmptyString(value.workerEpoch) &&
        value.format === "step" &&
        isArrayBuffer(value.bytes) &&
        value.mime === "model/step" &&
        isNonEmptyString(value.fileName)
      );
    default:
      return false;
  }
}

export function transferablesForEvent(event: WorkerEvent): Transferable[] {
  if (event.kind === "model.candidate-ready" || event.kind === "model.ready") {
    return [event.mesh.positions, event.mesh.normals, event.mesh.indices];
  }
  if (event.kind === "export.ready") return [event.bytes];
  return [];
}

export function errorEvent(
  command: WorkerCommand,
  error: CadError,
  terminalForRequestId = command.requestId
): OperationErrorEvent {
  return {
    version: PROTOCOL_VERSION,
    kind: "operation.error",
    requestId: crypto.randomUUID(),
    operationId: command.operationId,
    terminalForRequestId,
    stage: error.stage,
    code: error.code,
    userMessage: error.userMessage,
    recoverable: error.recoverable,
    generation: "generation" in command ? command.generation : undefined,
    modelRevision: "modelRevision" in command ? command.modelRevision : undefined,
  };
}

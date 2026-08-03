import type { CadError } from "../../../cad-contract/errors";
import type { MeshSnapshot } from "../../../cad-contract/messages";
import type { BoxParameters } from "../../../cad-contract/units";

export type CadStatus =
  | "booting"
  | "loading-engine"
  | "generating"
  | "ready"
  | "invalid-input"
  | "recoverable-error"
  | "fatal-worker-error";

export type ExportStatus = "disabled" | "idle" | "exporting";

export type CommittedModel = {
  revision: string;
  workerEpoch: string;
  generation: number;
  parameters: BoxParameters;
  mesh: MeshSnapshot;
};

export type CadState = {
  status: CadStatus;
  exportStatus: ExportStatus;
  generation: number;
  input: BoxParameters;
  workerEpoch: string | null;
  committed: CommittedModel | null;
  stale: boolean;
  error: CadError | null;
};

export const INITIAL_PARAMETERS: BoxParameters = { width: 20, depth: 30, height: 40 };

export function initialCadState(): CadState {
  return {
    status: "booting",
    exportStatus: "disabled",
    generation: 0,
    input: INITIAL_PARAMETERS,
    workerEpoch: null,
    committed: null,
    stale: false,
    error: null,
  };
}

export type CadAction =
  | { type: "engine-start" }
  | { type: "engine-ready"; workerEpoch: string }
  | { type: "input-valid"; input: BoxParameters; generation: number }
  | { type: "input-invalid"; input: BoxParameters; generation: number; error: CadError }
  | { type: "generation-start"; generation: number }
  | { type: "model-ready"; model: CommittedModel }
  | { type: "export-start" }
  | { type: "export-end" }
  | { type: "worker-restarted" }
  | { type: "recoverable-error"; error: CadError }
  | { type: "fatal-worker-error"; error: CadError }
  | { type: "reset" };

export function cadReducer(state: CadState, action: CadAction): CadState {
  switch (action.type) {
    case "engine-start":
      return { ...state, status: "loading-engine", error: null };
    case "engine-ready":
      return {
        ...state,
        status: "generating",
        workerEpoch: action.workerEpoch,
        error: null,
      };
    case "input-valid":
      return {
        ...state,
        input: action.input,
        generation: action.generation,
        status: "generating",
        exportStatus: "disabled",
        stale: Boolean(state.committed),
        error: null,
      };
    case "input-invalid":
      return {
        ...state,
        input: action.input,
        generation: action.generation,
        status: "invalid-input",
        exportStatus: "disabled",
        stale: Boolean(state.committed),
        error: action.error,
      };
    case "generation-start":
      return {
        ...state,
        generation: action.generation,
        status: "generating",
        exportStatus: "disabled",
        stale: Boolean(state.committed),
      };
    case "model-ready":
      return {
        ...state,
        status: "ready",
        exportStatus: "idle",
        generation: action.model.generation,
        workerEpoch: action.model.workerEpoch,
        committed: action.model,
        stale: false,
        error: null,
      };
    case "export-start":
      return { ...state, exportStatus: "exporting" };
    case "export-end":
      return { ...state, exportStatus: "idle" };
    case "worker-restarted":
      return {
        ...initialCadState(),
        input: state.input,
        status: "loading-engine",
      };
    case "recoverable-error":
      return {
        ...state,
        status: "recoverable-error",
        exportStatus: "disabled",
        stale: Boolean(state.committed),
        error: action.error,
      };
    case "fatal-worker-error":
      return {
        ...state,
        status: "fatal-worker-error",
        exportStatus: "disabled",
        stale: Boolean(state.committed),
        error: action.error,
      };
    case "reset":
      return initialCadState();
  }
}

import {
  getModelDefinition,
  modelDefinitions,
} from '../../features/cad/model-catalog'
import type { CadState } from '../../features/cad/state'
import type { ModelId, ModelParameterKey } from '../../cad-contract/units'
import type { RawParameters } from './workspace/types'
import { ComponentParameterPanel } from './component-panels'

const ACTION_BUTTON_CLASS =
  'cursor-pointer rounded-lg border-0 bg-primary px-[0.8rem] py-[0.6rem] text-base text-white disabled:cursor-not-allowed disabled:bg-disabled'

type CadWorkspacePanelProps = {
  state: CadState
  modelId: ModelId
  rawParameters: RawParameters
  fieldErrors: Partial<Record<ModelParameterKey, string>>
  status: string
  canExport: boolean
  onModelChange: (modelId: ModelId) => void
  onInputChange: (key: ModelParameterKey, value: string) => void
  onExport: () => void
  onRetry: () => void
}

export function CadWorkspacePanel({
  state,
  modelId,
  rawParameters,
  fieldErrors,
  status,
  canExport,
  onModelChange,
  onInputChange,
  onExport,
  onRetry,
}: CadWorkspacePanelProps) {
  const definition = getModelDefinition(modelId) ?? modelDefinitions[0]

  return (
    <div className="self-start grid gap-4 rounded-2xl border border-border-card bg-panel p-4">
      <div>
        <h2 className="mb-2 text-2xl font-semibold leading-tight">
          {definition.displayName}參數
        </h2>
        <p className="text-muted">請先選擇 component，再調整其參數。</p>
      </div>
      <label className="grid gap-[0.3rem]">
        <span className="font-[650]">CAD component</span>
        <select
          className="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
          value={modelId}
          onChange={(event) => onModelChange(event.target.value as ModelId)}
        >
          {modelDefinitions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.displayName}
            </option>
          ))}
        </select>
      </label>
      <ComponentParameterPanel
        modelId={modelId}
        rawParameters={rawParameters}
        fieldErrors={fieldErrors}
        onInputChange={onInputChange}
      />
      <div className="flex flex-wrap gap-[0.6rem]">
        <button
          className={ACTION_BUTTON_CLASS}
          type="button"
          disabled={!canExport}
          onClick={onExport}
        >
          下載 STEP
        </button>
        {(state.status === 'recoverable-error' ||
          state.status === 'fatal-worker-error') && (
          <button
            className={ACTION_BUTTON_CLASS}
            type="button"
            onClick={onRetry}
          >
            重試
          </button>
        )}
      </div>
      <div
        aria-live="polite"
        className="rounded-2xl border border-border-card bg-panel p-4 text-[0.92rem] text-status"
        role="status"
      >
        <strong className="text-ink">狀態：</strong> {status}
        {state.stale && (
          <div className="text-muted">目前預覽是上一個成功 revision。</div>
        )}
        {state.error && (
          <div className="text-sm text-error" role="alert">
            錯誤代碼：{state.error.code}
          </div>
        )}
      </div>
    </div>
  )
}

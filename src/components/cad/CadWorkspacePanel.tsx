import { getModelDefinition } from '../../features/cad/model-catalog'
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
  onInputChange,
  onExport,
  onRetry,
}: CadWorkspacePanelProps) {
  const definition = getModelDefinition(modelId)
  if (!definition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)

  return (
    <div className="self-start grid gap-4 rounded-2xl border border-border-card bg-panel p-4">
      <div>
        <h2 className="mb-2 text-2xl font-semibold leading-tight">
          {definition.displayName}參數
        </h2>
        <p className="text-muted">
          目前編輯此 component；如要切換模型，請
          <a className="text-ink underline underline-offset-4" href="/">
            返回首頁選擇其他模型
          </a>
          。
        </p>
      </div>
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

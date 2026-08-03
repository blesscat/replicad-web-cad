import { boxDefinition } from '../../features/cad/model-catalog'
import type { CadState } from '../../features/cad/state'
import type { DimensionKey } from '../../cad-contract/units'
import type { RawParameters } from './workspace/types'

const ACTION_BUTTON_CLASS =
  'cursor-pointer rounded-lg border-0 bg-primary px-[0.8rem] py-[0.6rem] text-base text-white disabled:cursor-not-allowed disabled:bg-disabled'

type CadWorkspacePanelProps = {
  state: CadState
  rawParameters: RawParameters
  fieldErrors: Partial<Record<DimensionKey, string>>
  status: string
  canExport: boolean
  onInputChange: (key: DimensionKey, value: string) => void
  onExport: () => void
  onRetry: () => void
}

export function CadWorkspacePanel({
  state,
  rawParameters,
  fieldErrors,
  status,
  canExport,
  onInputChange,
  onExport,
  onRetry,
}: CadWorkspacePanelProps) {
  return (
    <div className="self-start grid gap-4 rounded-2xl border border-border-card bg-panel p-4">
      <div>
        <h2 className="mb-2 text-2xl font-semibold leading-tight">方塊參數</h2>
        <p className="text-muted">所有尺寸皆為整數 mm。</p>
      </div>
      <fieldset className="m-0 grid gap-3 border-0 p-0">
        <legend className="text-muted">尺寸</legend>
        {boxDefinition.parameterSchema.map((field) => (
          <label className="grid gap-[0.3rem]" key={field.key}>
            <span className="flex justify-between font-[650]">
              <span>
                {field.label}（{field.axis}）
              </span>
              <span>{field.unit}</span>
            </span>
            <input
              className="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
              aria-invalid={Boolean(fieldErrors[field.key])}
              aria-describedby={
                fieldErrors[field.key] ? `${field.key}-error` : undefined
              }
              inputMode="numeric"
              min={field.min}
              max={field.max}
              step={field.step}
              type="text"
              value={rawParameters[field.key]}
              onChange={(event) => onInputChange(field.key, event.target.value)}
            />
            {fieldErrors[field.key] && (
              <span
                className="text-sm text-error"
                id={`${field.key}-error`}
                role="alert"
              >
                {fieldErrors[field.key]}
              </span>
            )}
          </label>
        ))}
      </fieldset>
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

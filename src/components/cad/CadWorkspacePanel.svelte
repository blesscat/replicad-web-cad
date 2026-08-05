<script lang="ts">
  import { getModelDefinition } from '../../features/cad/model-catalog'
  import type { CadState } from '../../features/cad/state'
  import type { ModelId, ModelParameterKey } from '../../cad-contract/units'
  import type { ExportFormat } from '../../features/cad/download'
  import type { RawParameters } from './workspace/types'
  import ComponentParameterPanel from './component-panels/index.svelte'

  const ACTION_BUTTON_CLASS =
    'cursor-pointer rounded-lg border-0 bg-primary px-[0.8rem] py-[0.6rem] text-base text-white disabled:cursor-not-allowed disabled:bg-disabled'

  type Props = {
    state: CadState
    modelId: ModelId
    rawParameters: RawParameters
    fieldErrors: Partial<Record<ModelParameterKey, string>>
    status: string
    canExport: boolean
    onInputChange: (key: ModelParameterKey, value: string) => void
    onExport: (format: ExportFormat) => void
    onRetry: () => void
  }

  let {
    state,
    modelId,
    rawParameters,
    fieldErrors,
    status,
    canExport,
    onInputChange,
    onExport,
    onRetry,
  }: Props = $props()

  let definition = $derived.by(() => {
    const nextDefinition = getModelDefinition(modelId)
    if (!nextDefinition) throw new Error(`UNKNOWN_MODEL_ID:${modelId}`)
    return nextDefinition
  })
</script>

<div
  class="self-start grid gap-4 rounded-2xl border border-border-card bg-panel p-4"
>
  <div>
    <h2 class="mb-2 text-2xl font-semibold leading-tight">
      {definition.displayName}參數
    </h2>
    <p class="text-muted">
      目前編輯此 component；如要切換模型，請
      <a class="text-ink underline underline-offset-4" href="/">
        返回首頁選擇其他模型
      </a>
      。
    </p>
  </div>
  <ComponentParameterPanel
    {modelId}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
  <div class="flex flex-wrap gap-[0.6rem]">
    <button
      class={ACTION_BUTTON_CLASS}
      type="button"
      disabled={!canExport}
      onclick={() => onExport('step')}
    >
      下載 STEP
    </button>
    <button
      class={ACTION_BUTTON_CLASS}
      type="button"
      disabled={!canExport}
      onclick={() => onExport('stl')}
    >
      下載 STL
    </button>
    {#if state.status === 'recoverable-error' || state.status === 'fatal-worker-error'}
      <button class={ACTION_BUTTON_CLASS} type="button" onclick={onRetry}>
        重試
      </button>
    {/if}
  </div>
  <p class="text-sm text-muted">
    STL 下載後，可在 Bambu Studio 透過本機檔案流程匯入。
  </p>
  <div
    aria-live="polite"
    class="rounded-2xl border border-border-card bg-panel p-4 text-[0.92rem] text-status"
    role="status"
  >
    <strong class="text-ink">狀態：</strong>
    {status}
    {#if state.stale}
      <div class="text-muted">目前預覽是上一個成功 revision。</div>
    {/if}
    {#if state.error}
      <div class="text-sm text-error" role="alert">
        錯誤代碼：{state.error.code}
      </div>
    {/if}
  </div>
</div>

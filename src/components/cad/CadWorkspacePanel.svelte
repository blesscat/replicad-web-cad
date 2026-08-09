<script lang="ts">
  import type { CadState } from '../../features/cad/state'
  import type {
    ModelId,
    ModelParameterKey,
    ModelParameterValues,
    OpenGridParameters,
  } from '../../cad-contract/units'
  import type { ExportFormat } from '../../features/cad/download'
  import { getModelDefinition } from '../../features/cad/model-catalog'
  import type { RawParameters } from './workspace/types'
  import ComponentParameterPanel from './component-panels/index.svelte'
  import RestoreDefaultsButton from './component-panels/RestoreDefaultsButton.svelte'

  const ACTION_BUTTON_CLASS =
    'cursor-pointer rounded-lg border-0 bg-primary px-[0.8rem] py-[0.6rem] text-base text-white disabled:cursor-not-allowed disabled:bg-disabled'

  type Props = {
    state: CadState
    modelId: ModelId
    parameters: ModelParameterValues
    rawParameters: RawParameters
    fieldErrors: Partial<Record<ModelParameterKey | 'parameters', string>>
    canExport: boolean
    onInputChange: (key: ModelParameterKey, value: string) => void
    onOpenGridParametersChange: (parameters: OpenGridParameters) => void
    onOpenGridDimensionCalculationInvalid: () => void
    onExport: (format: ExportFormat) => void
    onRetry: () => void
    resetVersion: number
    onRestoreDefaults: () => void
  }

  let {
    state,
    modelId,
    parameters,
    rawParameters,
    fieldErrors,
    canExport,
    onInputChange,
    onOpenGridParametersChange,
    onOpenGridDimensionCalculationInvalid,
    onExport,
    onRetry,
    resetVersion,
    onRestoreDefaults,
  }: Props = $props()

  function hasParameterControlsFor(modelId: ModelId): boolean {
    if (modelId === 'opengrid') return true
    return (getModelDefinition(modelId)?.parameterSchema.length ?? 0) > 0
  }
</script>

<div
  class="sticky top-4 self-start grid min-h-0 max-h-[calc(100dvh-16rem)] gap-4 overflow-y-auto rounded-2xl border border-border-card bg-panel p-4 max-cad:static max-cad:max-h-none max-cad:overflow-visible"
  data-testid="cad-workspace-panel"
>
  {#if hasParameterControlsFor(modelId)}
    <RestoreDefaultsButton onRestore={onRestoreDefaults} />
    {#key resetVersion}
      <ComponentParameterPanel
        {modelId}
        {parameters}
        {rawParameters}
        {fieldErrors}
        {onInputChange}
        {onOpenGridParametersChange}
        {onOpenGridDimensionCalculationInvalid}
      />
    {/key}
  {/if}
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
</div>

<script lang="ts">
  import { HEXAGONAL_COLUMN_CONFIGURATION } from '../../../../cad-contract/units'
  import { hexagonalColumnDefinition } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  const defaultOrientation = HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation

  function handleOrientationChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('orientation', event.currentTarget.value)
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="text-muted">六角柱參數</legend>
  <p class="m-0 text-sm text-muted">
    長度包含兩端固定 0.2 mm 過渡；長度可用 slider 調整 1–200 mm 或輸入 1–999
    mm，間隙可用 slider 調整 1–10 mm 或輸入 1–99 mm；支數沿 Y
    軸排列，預設躺下（長軸沿 X），也可切換站立（長軸沿 Z）；預設柱間隙為 1
    mm，不融合。
  </p>
  {#each hexagonalColumnDefinition.parameterSchema as field (field.key)}
    <label class="grid gap-[0.3rem]">
      <span class="flex justify-between font-[650]">
        <span>{field.label}（{field.axis}）</span>
        <span>{field.unit}</span>
      </span>
      <ParameterControl
        {field}
        value={rawParameters[field.key] ?? String(field.defaultValue)}
        error={fieldErrors[field.key]}
        onChange={(value) => onInputChange(field.key, value)}
      />
      {#if fieldErrors[field.key]}
        <span class="text-sm text-error" id={`${field.key}-error`} role="alert"
          >{fieldErrors[field.key]}</span
        >
      {/if}
    </label>
  {/each}
  <label class="grid gap-[0.3rem]">
    <span class="flex justify-between font-[650]">
      <span>擺放方向</span>
      <span>orientation</span>
    </span>
    <select
      class="rounded border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-50"
      aria-label="擺放方向"
      value={rawParameters.orientation ?? defaultOrientation}
      onchange={handleOrientationChange}
    >
      <option value="lying">躺下（長軸 X）</option>
      <option value="standing">站立（長軸 Z）</option>
    </select>
    {#if fieldErrors.orientation}
      <span class="text-sm text-error" id="orientation-error" role="alert"
        >{fieldErrors.orientation}</span
      >
    {/if}
  </label>
</fieldset>

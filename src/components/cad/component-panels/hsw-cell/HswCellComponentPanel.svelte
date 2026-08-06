<script lang="ts">
  import { hswCellDefinition } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="text-muted">HSW 蜂巢尺寸（格數）</legend>
  <p class="m-0 text-sm text-muted">
    平頂六角單元約 27.25 × 23.60 × 8 mm；columns 沿 X 方向交錯排列，使用 slider
    調整行列格數，不套用額外圓角。
  </p>
  {#each hswCellDefinition.parameterSchema as field (field.key)}
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
</fieldset>

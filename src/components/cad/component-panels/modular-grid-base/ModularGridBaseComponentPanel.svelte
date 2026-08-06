<script lang="ts">
  import { calculateModularGridCounts } from '../../../../features/cad/grid-dimensions'
  import { modularGridBaseDefinition } from '../../../../features/cad/model-catalog'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  function handleDimensionCalculation(parameters: {
    rows: number
    columns: number
  }): void {
    onInputChange('columns', String(parameters.columns))
    onInputChange('rows', String(parameters.rows))
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="text-muted">網格尺寸（格數）</legend>
  <p class="m-0 text-sm text-muted">
    每格 20 × 20 mm，高度固定 5 mm；使用 slider 調整長寬格數。
  </p>
  <GridDimensionCalculator
    calculate={calculateModularGridCounts}
    onApply={handleDimensionCalculation}
  />
  {#each modularGridBaseDefinition.parameterSchema as field (field.key)}
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

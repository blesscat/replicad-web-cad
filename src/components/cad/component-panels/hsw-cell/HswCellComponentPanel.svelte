<script lang="ts">
  import { calculateHswCellCounts } from '../../../../features/cad/grid-dimensions'
  import {
    displayParameterLabel,
    hswCellDefinition,
  } from '../../../../features/cad/model-catalog'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import ParameterField from '../ParameterField.svelte'
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
  <p class="m-0 text-sm text-muted">
    平頂六角單元約 27.25 × 23.60 × 8 mm；columns 沿 X 方向交錯排列，使用 slider
    調整行列格數，不套用額外圓角。
  </p>
  <GridDimensionCalculator
    calculate={calculateHswCellCounts}
    onApply={handleDimensionCalculation}
  />
  {#each hswCellDefinition.parameterSchema as field (field.key)}
    {@const value = rawParameters[field.key] ?? String(field.defaultValue)}
    <ParameterField
      label={displayParameterLabel(field)}
      unit={field.unit}
      changed={value !== String(field.defaultValue)}
      error={fieldErrors[field.key]}
      errorId={`${field.key}-error`}
      onRestore={() => onInputChange(field.key, String(field.defaultValue))}
    >
      <ParameterControl
        {field}
        {value}
        error={fieldErrors[field.key]}
        onChange={(nextValue) => onInputChange(field.key, nextValue)}
      />
    </ParameterField>
  {/each}
</fieldset>

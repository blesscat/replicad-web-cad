<script lang="ts">
  import {
    displayParameterLabel,
    opengridStackableBoxDefinition,
  } from '../../../../features/cad/model-catalog'
  import { calculateOpenGridStackableBoxCounts } from '../../../../features/cad/grid-dimensions'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  function handleDimensionCalculation(parameters: {
    rows: number
    columns: number
  }): void {
    onInputChange('x', String(parameters.columns))
    onInputChange('y', String(parameters.rows))
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="m-0 text-sm text-muted">
    每格 28 mm，X/Y 支援半格尺寸；盒子上方是連續凸導軌，底部是 45° 導角凹槽，
    可與相同盒子堆疊並沿長邊滑動。底部四角提供 Ø5 mm Snap
    固定孔，內側圓柱凸緣裝入後與盒內底面切齊。
  </p>
  <GridDimensionCalculator
    calculate={calculateOpenGridStackableBoxCounts}
    description="輸入 X/Y 寬度與深度，計算最接近且不小於目標的 0.5 格數。"
    onApply={handleDimensionCalculation}
  />
  {#each opengridStackableBoxDefinition.parameterSchema as field (field.key)}
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

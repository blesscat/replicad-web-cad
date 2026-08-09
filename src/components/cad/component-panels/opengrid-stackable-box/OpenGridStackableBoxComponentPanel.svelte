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
    固定孔，內側圓柱凸緣裝入後與盒內底面切齊。可另外開啟底部全孔模式，
    以內縮前名義尺寸產生 14 mm 間距的 Ø5.05 mm 普通通孔。
  </p>
  <GridDimensionCalculator
    calculate={calculateOpenGridStackableBoxCounts}
    description="輸入 X/Y 寬度與深度，計算最接近且不小於目標的 0.5 格數。"
    onApply={handleDimensionCalculation}
  />
  <div class="grid gap-2 rounded-lg border border-border-field p-3">
    <label class="flex min-w-0 items-start gap-2">
      <input
        aria-describedby={fieldErrors.fullBottomHoleGrid
          ? 'fullBottomHoleGrid-error'
          : undefined}
        aria-invalid={Boolean(fieldErrors.fullBottomHoleGrid)}
        aria-label="底部全孔模式"
        class="mt-1 accent-primary"
        type="checkbox"
        checked={rawParameters.fullBottomHoleGrid === 'true'}
        onchange={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          onInputChange(
            'fullBottomHoleGrid',
            String(event.currentTarget.checked),
          )
        }}
      />
      <span class="grid gap-1">
        <span class="font-[650]">底部全孔模式</span>
        <span class="text-sm text-muted">
          增加 14 mm 中心距的 Ø5.05 mm 普通通孔；四角 Snap
          孔與固定結構永遠保留。
        </span>
      </span>
    </label>
  </div>
  {#if fieldErrors.fullBottomHoleGrid}
    <span class="text-sm text-error" id="fullBottomHoleGrid-error" role="alert"
      >{fieldErrors.fullBottomHoleGrid}</span
    >
  {/if}
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

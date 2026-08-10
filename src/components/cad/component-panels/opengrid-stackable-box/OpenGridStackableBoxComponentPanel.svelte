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
  <GridDimensionCalculator
    calculate={calculateOpenGridStackableBoxCounts}
    description=""
    onApply={handleDimensionCalculation}
  />
  <div class="grid gap-2 rounded-lg border border-border-field p-3">
    <label class="flex min-w-0 items-start gap-2">
      <input
        aria-describedby={fieldErrors.cornerBottomHoles
          ? 'cornerBottomHoles-error'
          : undefined}
        aria-invalid={Boolean(fieldErrors.cornerBottomHoles)}
        aria-label="底部四角孔"
        class="mt-1 accent-primary"
        type="checkbox"
        checked={rawParameters.cornerBottomHoles === 'true'}
        onchange={(event) => {
          if (!(event.currentTarget instanceof HTMLInputElement)) return
          onInputChange(
            'cornerBottomHoles',
            String(event.currentTarget.checked),
          )
        }}
      />
      <span class="font-[650]">底部四角孔</span>
    </label>
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
      <span class="font-[650]">底部全孔模式</span>
    </label>
  </div>
  {#if fieldErrors.cornerBottomHoles}
    <span class="text-sm text-error" id="cornerBottomHoles-error" role="alert"
      >{fieldErrors.cornerBottomHoles}</span
    >
  {/if}
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

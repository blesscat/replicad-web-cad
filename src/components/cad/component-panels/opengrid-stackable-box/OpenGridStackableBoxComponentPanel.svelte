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

  function handleBasePlateModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('basePlateMode', event.currentTarget.value)
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <GridDimensionCalculator
    calculate={calculateOpenGridStackableBoxCounts}
    description=""
    onApply={handleDimensionCalculation}
  />
  <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
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
  <div aria-label="盒體模式" class="grid gap-1" role="radiogroup">
    <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-describedby={fieldErrors.basePlateMode
            ? 'basePlateMode-error'
            : undefined}
          aria-invalid={Boolean(fieldErrors.basePlateMode)}
          aria-label="預設模式"
          class="mt-1 accent-primary"
          data-testid="opengrid-stackable-box-default-mode"
          name="opengrid-stackable-box-mode"
          type="radio"
          value="false"
          checked={rawParameters.basePlateMode !== 'true'}
          onchange={handleBasePlateModeChange}
        />
        <span class="font-[650]">預設模式</span>
      </label>
      <label class="flex min-w-0 items-start gap-2">
        <input
          aria-describedby={fieldErrors.basePlateMode
            ? 'basePlateMode-error'
            : undefined}
          aria-invalid={Boolean(fieldErrors.basePlateMode)}
          aria-label="底版模式"
          class="mt-1 accent-primary"
          data-testid="opengrid-stackable-box-base-plate-mode"
          name="opengrid-stackable-box-mode"
          type="radio"
          value="true"
          checked={rawParameters.basePlateMode === 'true'}
          onchange={handleBasePlateModeChange}
        />
        <span class="font-[650]">底版模式</span>
      </label>
    </div>
    {#if rawParameters.basePlateMode === 'true'}
      <span class="text-sm text-muted">
        底版模式：不可堆疊，使用6mm固定柱
      </span>
    {:else}
      <span class="text-sm text-muted">
        預設模式：可堆疊滑動，使用標準8mm固定柱
      </span>
    {/if}
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
  {#if fieldErrors.basePlateMode}
    <span class="text-sm text-error" id="basePlateMode-error" role="alert"
      >{fieldErrors.basePlateMode}</span
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

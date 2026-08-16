<script lang="ts">
  import { calculateModularGridCounts } from '../../../../features/cad/grid-dimensions'
  import {
    displayParameterLabel,
    modularGridBaseDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import GridDimensionCalculator from '../GridDimensionCalculator.svelte'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'
  import { translate } from '../../../../i18n'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

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
    {translate(locale, 'panel.modularGridBase.description')}
  </p>
  <GridDimensionCalculator
    {locale}
    calculate={calculateModularGridCounts}
    onApply={handleDimensionCalculation}
  />
  {#each modularGridBaseDefinition.parameterSchema as field (field.key)}
    {@const value = rawParameters[field.key] ?? String(field.defaultValue)}
    <ParameterField
      {locale}
      label={displayParameterLabel(field, locale)}
      unit={unitLabelFor(locale, field.unit)}
      changed={value !== String(field.defaultValue)}
      error={fieldErrors[field.key]}
      errorId={`${field.key}-error`}
      onRestore={() => onInputChange(field.key, String(field.defaultValue))}
    >
      <ParameterControl
        {locale}
        {field}
        {value}
        error={fieldErrors[field.key]}
        onChange={(nextValue) => onInputChange(field.key, nextValue)}
      />
    </ParameterField>
  {/each}
</fieldset>

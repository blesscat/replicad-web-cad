<script lang="ts">
  import {
    displayParameterLabel,
    opengridDividerDefinition,
  } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="m-0 text-sm text-muted">
    分隔牆高度文字輸入為 2–500 mm、slider 為 2–200 mm；平面 footprint 上限為 500
    mm。
  </p>
  {#each opengridDividerDefinition.parameterSchema as field (field.key)}
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

<script lang="ts">
  import {
    displayParameterLabel,
    opengridOpenShelfDefinition,
  } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()
</script>

<div class="grid gap-3">
  <p
    class="m-0 text-sm leading-6 text-muted"
    data-testid="opengrid-open-shelf-help"
  >
    整體高度包含所有板厚，底板保持水平；前方開口與整個格架向上仰，仰角可設
    0–75°。每格深度都延伸到後方背板；若總高不足以支撐目前仰角，會顯示輸入錯誤。
  </p>
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    {#each opengridOpenShelfDefinition.parameterSchema as field (field.key)}
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
</div>

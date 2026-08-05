<script lang="ts">
  import { boxDefinition } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <legend class="text-muted">方塊尺寸</legend>
  {#each boxDefinition.parameterSchema as field (field.key)}
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

<script lang="ts">
  import {
    displayParameterLabel,
    opengridPillarDefinition,
  } from '../../../../features/cad/model-catalog'
  import { PILLAR_CONFIGURATION } from '../../../../cad-contract/units'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  const PILLAR_MODE_OPTIONS = [
    {
      value: 'standard',
      label: '堆疊版',
      length: PILLAR_CONFIGURATION.standardLength,
    },
    {
      value: 'thin-shell',
      label: '薄殼版',
      length: PILLAR_CONFIGURATION.thinShellLength,
    },
    {
      value: 'positioning',
      label: '物件定位用',
    },
  ] as const

  const POSITIONING_LENGTH_FIELD = opengridPillarDefinition.parameterSchema[0]!

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  function handleModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('mode', event.currentTarget.value)
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <div
    aria-label="支柱版本"
    class="grid gap-2 rounded-lg border border-border-field p-3"
    role="radiogroup"
  >
    {#each PILLAR_MODE_OPTIONS as option, index (option.value)}
      <label class="flex min-w-0 grow items-start gap-2">
        <input
          aria-describedby={fieldErrors.mode ? 'pillar-mode-error' : undefined}
          aria-label={option.label}
          class="mt-1 accent-primary"
          data-testid={`opengrid-pillar-mode-${option.value}`}
          name="opengrid-pillar-mode"
          type="radio"
          value={option.value}
          checked={rawParameters.mode === option.value}
          required={index === 0}
          onchange={handleModeChange}
        />
        <span class="grid gap-1">
          <span class="font-[650]">{option.label}</span>
          {#if option.value !== 'positioning'}
            <span class="text-sm text-muted">固定總長 {option.length} mm</span>
          {/if}
        </span>
      </label>
    {/each}
  </div>

  {#if rawParameters.mode === 'positioning'}
    {@const value =
      rawParameters.length ??
      String(PILLAR_CONFIGURATION.positioningDefaultLength)}
    <ParameterField
      label={displayParameterLabel(POSITIONING_LENGTH_FIELD)}
      unit={POSITIONING_LENGTH_FIELD.unit}
      changed={value !== String(POSITIONING_LENGTH_FIELD.defaultValue)}
      error={fieldErrors.length}
      errorId="pillar-positioning-length-error"
      onRestore={() =>
        onInputChange('length', String(POSITIONING_LENGTH_FIELD.defaultValue))}
    >
      <ParameterControl
        field={POSITIONING_LENGTH_FIELD}
        {value}
        error={fieldErrors.length}
        onChange={(nextValue) => onInputChange('length', nextValue)}
      />
    </ParameterField>
  {/if}

  {#if fieldErrors.mode}
    <span class="text-sm text-error" id="pillar-mode-error" role="alert">
      {fieldErrors.mode}
    </span>
  {/if}
</fieldset>

<script lang="ts">
  import { PILLAR_CONFIGURATION } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    pillarDefinition,
  } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  function handleBaseConnectionChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('baseConnection', String(event.currentTarget.checked))
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="m-0 text-sm text-muted">
    主體固定 Ø{PILLAR_CONFIGURATION.bodyDiameter} mm，頂端為 1 mm、45° chamfer；總長度只接受
    {PILLAR_CONFIGURATION.minLength}–{PILLAR_CONFIGURATION.maxLength} mm 整數。開啟「連接底版用」後，底端改為
    Ø{PILLAR_CONFIGURATION.baseDiameter} mm × {PILLAR_CONFIGURATION.baseHeight} mm
    的銳角凸台。
  </p>

  {#each pillarDefinition.parameterSchema as field (field.key)}
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

  <div class="grid gap-2 rounded-lg border border-border-field p-3">
    <label class="flex min-w-0 grow items-start gap-2">
      <input
        aria-describedby={fieldErrors.baseConnection
          ? 'baseConnection-error'
          : undefined}
        aria-invalid={Boolean(fieldErrors.baseConnection)}
        aria-label="連接底版用"
        class="mt-1 accent-primary"
        data-testid="pillar-base-connection"
        type="checkbox"
        checked={rawParameters.baseConnection === 'true'}
        onchange={handleBaseConnectionChange}
      />
      <span class="grid gap-1">
        <span class="font-[650]">連接底版用</span>
        <span class="text-sm text-muted">
          底端使用 Ø{PILLAR_CONFIGURATION.baseDiameter} mm × {PILLAR_CONFIGURATION.baseHeight}
          mm 平底凸台，總長度不變。
        </span>
      </span>
    </label>
  </div>
  {#if fieldErrors.baseConnection}
    <span class="text-sm text-error" id="baseConnection-error" role="alert">
      {fieldErrors.baseConnection}
    </span>
  {/if}
</fieldset>

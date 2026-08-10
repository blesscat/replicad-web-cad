<script lang="ts">
  import { PILLAR_CONFIGURATION } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridPillarDefinition,
  } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  const COMMON_PILLAR_LENGTHS = [6, 8] as const

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  function handleBaseConnectionChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('baseConnection', String(event.currentTarget.checked))
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="m-0 text-sm text-muted">
    主體固定 Ø{PILLAR_CONFIGURATION.bodyDiameter} mm，頂端為
    {PILLAR_CONFIGURATION.upperChamfer} mm、45° chamfer；總長度只接受
    {PILLAR_CONFIGURATION.minLength}–{PILLAR_CONFIGURATION.maxLength} mm 整數。開啟「連接底版用」後，底端改為
    Ø{PILLAR_CONFIGURATION.baseDiameter} mm × {PILLAR_CONFIGURATION.baseHeight} mm
    的銳角凸台。
  </p>

  {#each opengridPillarDefinition.parameterSchema as field (field.key)}
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
      {#if field.key === 'length'}
        <div class="grid gap-1">
          <span class="text-sm text-muted">常用長度</span>
          <div class="flex flex-wrap gap-2">
            {#each COMMON_PILLAR_LENGTHS as commonLength}
              {@const isSelected = value === String(commonLength)}
              <button
                class="cursor-pointer rounded-lg border border-border-field bg-panel px-3 py-1.5 text-sm font-semibold text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                class:border-primary={isSelected}
                class:bg-primary={isSelected}
                class:text-white={isSelected}
                aria-pressed={isSelected}
                data-testid={`opengrid-pillar-length-${commonLength}`}
                type="button"
                onclick={() => onInputChange('length', String(commonLength))}
              >
                {commonLength} mm
              </button>
            {/each}
          </div>
        </div>
      {/if}
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
        data-testid="opengrid-pillar-base-connection"
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

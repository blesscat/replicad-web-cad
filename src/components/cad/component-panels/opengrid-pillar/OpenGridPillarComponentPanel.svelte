<script lang="ts">
  import {
    displayParameterLabel,
    opengridPillarDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import { PILLAR_CONFIGURATION } from '../../../../cad-contract/units'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import { translate } from '../../../../i18n'

  const PILLAR_MODE_OPTIONS = [
    {
      value: 'detachable-corner-seat',
      labelKey: 'panel.pillar.detachableCornerSeat',
      descriptionKey: 'panel.pillar.detachableCornerSeatDescription',
    },
    {
      value: 'positioning',
      labelKey: 'panel.pillar.positioning',
    },
  ] as const

  const POSITIONING_LENGTH_FIELD = opengridPillarDefinition.parameterSchema[0]!
  const OFFSET_FIELD = opengridPillarDefinition.parameterSchema[1]!
  const SEAT_LENGTH_FIELD = opengridPillarDefinition.parameterSchema[2]!

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  function handleModeChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange('mode', event.currentTarget.value)
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <div
    aria-label={translate(locale, 'panel.pillar.version')}
    class="grid gap-2 rounded-lg border border-border-field p-3"
    role="radiogroup"
  >
    {#each PILLAR_MODE_OPTIONS as option, index (option.value)}
      <label class="flex min-w-0 grow items-start gap-2">
        <input
          aria-describedby={fieldErrors.mode ? 'pillar-mode-error' : undefined}
          aria-label={translate(locale, option.labelKey)}
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
          <span class="font-[650]">{translate(locale, option.labelKey)}</span>
          {#if 'descriptionKey' in option}
            <span class="text-sm text-muted-foreground">
              {translate(locale, option.descriptionKey)}
            </span>
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
      {locale}
      label={displayParameterLabel(POSITIONING_LENGTH_FIELD, locale)}
      unit={unitLabelFor(locale, POSITIONING_LENGTH_FIELD.unit)}
      changed={value !== String(POSITIONING_LENGTH_FIELD.defaultValue)}
      error={fieldErrors.length}
      errorId="pillar-positioning-length-error"
      onRestore={() =>
        onInputChange('length', String(POSITIONING_LENGTH_FIELD.defaultValue))}
    >
      <ParameterControl
        {locale}
        field={POSITIONING_LENGTH_FIELD}
        {value}
        error={fieldErrors.length}
        onChange={(nextValue) => onInputChange('length', nextValue)}
      />
    </ParameterField>
  {:else}
    {@const value =
      rawParameters.length ?? String(SEAT_LENGTH_FIELD.defaultValue)}
    <ParameterField
      {locale}
      label={displayParameterLabel(SEAT_LENGTH_FIELD, locale)}
      unit={unitLabelFor(locale, SEAT_LENGTH_FIELD.unit)}
      changed={value !== String(SEAT_LENGTH_FIELD.defaultValue)}
      error={fieldErrors.length}
      errorId="pillar-seat-length-error"
      onRestore={() =>
        onInputChange('length', String(SEAT_LENGTH_FIELD.defaultValue))}
    >
      <ParameterControl
        {locale}
        field={SEAT_LENGTH_FIELD}
        {value}
        error={fieldErrors.length}
        onChange={(nextValue) => onInputChange('length', nextValue)}
      />
    </ParameterField>
  {/if}

  {#if rawParameters.mode === 'positioning' || rawParameters.mode === 'detachable-corner-seat'}
    {@const field = OFFSET_FIELD}
    {@const value = rawParameters[field.key] ?? String(field.defaultValue)}
    <ParameterField
      {locale}
      label={displayParameterLabel(field, locale)}
      unit={unitLabelFor(locale, field.unit)}
      changed={value !== String(field.defaultValue)}
      error={fieldErrors[field.key]}
      errorId={`pillar-${field.key}-error`}
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
  {/if}

  {#if fieldErrors.mode}
    <span class="text-sm text-error" id="pillar-mode-error" role="alert">
      {formatValidationIssue(locale, fieldErrors.mode)}
    </span>
  {/if}
</fieldset>

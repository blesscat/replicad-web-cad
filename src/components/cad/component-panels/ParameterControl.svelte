<script lang="ts">
  import {
    displayParameterLabel,
    type ParameterField,
  } from '../../../features/cad/model-catalog'
  import Slider from './Slider.svelte'

  type Props = {
    field: ParameterField
    value: string
    error?: string
    onChange: (value: string) => void
  }

  let { field, value, error, onChange }: Props = $props()

  let controlLabel = $derived(displayParameterLabel(field))

  let commonProps = $derived({
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${field.key}-error` : undefined,
    min: field.min,
    max: field.max,
    step: field.step,
  })

  function handleInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onChange(event.currentTarget.value)
  }
</script>

<div class="min-w-0">
  {#if field.control === 'range' || field.control === 'range-text'}
    <div class="grid gap-1">
      <Slider
        {value}
        label={controlLabel}
        min={field.sliderMin ?? field.min}
        max={field.sliderMax ?? field.max}
        step={field.step}
        {error}
        describedBy={error ? `${field.key}-error` : undefined}
        {onChange}
      />
      {#if field.control === 'range'}
        <span aria-live="polite" class="text-right text-sm text-muted">
          {value}
          {field.unit}
        </span>
      {:else}
        <div class="min-w-0 flex items-center gap-2">
          <input
            {...commonProps}
            aria-label={controlLabel}
            class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
            inputmode="numeric"
            type="text"
            {value}
            oninput={handleInput}
          />
          <span class="shrink-0 text-sm text-muted">{field.unit}</span>
        </div>
      {/if}
    </div>
  {:else}
    <input
      {...commonProps}
      aria-label={controlLabel}
      class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
      inputmode="numeric"
      type="text"
      {value}
      oninput={handleInput}
    />
  {/if}
</div>

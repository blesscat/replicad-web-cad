<script lang="ts">
  import type { ParameterField } from '../../../features/cad/model-catalog'

  type Props = {
    field: ParameterField
    value: string
    error?: string
    onChange: (value: string) => void
  }

  let { field, value, error, onChange }: Props = $props()

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

{#if field.control === 'range'}
  <div class="grid gap-1">
    <input
      {...commonProps}
      aria-label={`${field.label}（${field.axis}）`}
      class="w-full accent-primary"
      type="range"
      {value}
      oninput={handleInput}
    />
    <span aria-live="polite" class="text-right text-sm text-muted">
      {value}
      {field.unit}
    </span>
  </div>
{:else}
  <input
    {...commonProps}
    class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
    inputmode="numeric"
    type="text"
    {value}
    oninput={handleInput}
  />
{/if}

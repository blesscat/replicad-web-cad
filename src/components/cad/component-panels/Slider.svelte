<script lang="ts">
  import type { ValidationIssue } from '../../../cad-contract/units'

  type Props = {
    value: string | number
    label: string
    min: string | number
    max: string | number
    step: string | number
    direction?: 'ltr' | 'rtl'
    error?: ValidationIssue
    describedBy?: string
    disabled?: boolean
    onChange: (value: string) => void
  }

  let {
    value,
    label,
    min,
    max,
    step,
    direction,
    error,
    describedBy,
    disabled = false,
    onChange,
  }: Props = $props()

  function handleInput(event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onChange(event.currentTarget.value)
  }
</script>

<input
  class="min-w-0 w-full grow accent-primary"
  aria-describedby={describedBy}
  aria-invalid={Boolean(error)}
  aria-label={label}
  {disabled}
  dir={direction}
  type="range"
  {min}
  {max}
  {step}
  {value}
  oninput={handleInput}
/>

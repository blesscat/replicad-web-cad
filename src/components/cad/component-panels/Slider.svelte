<script lang="ts">
  type Props = {
    value: string | number
    label: string
    min: string | number
    max: string | number
    step: string | number
    error?: string
    describedBy?: string
    onChange: (value: string) => void
  }

  let { value, label, min, max, step, error, describedBy, onChange }: Props =
    $props()

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
  type="range"
  {min}
  {max}
  {step}
  {value}
  oninput={handleInput}
/>

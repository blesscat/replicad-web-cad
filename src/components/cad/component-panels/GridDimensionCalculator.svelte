<script lang="ts">
  import type {
    GridDimensionErrors,
    GridDimensionInput,
    GridDimensionResult,
  } from '../../../features/cad/grid-dimensions'
  import ParameterField from './ParameterField.svelte'

  type GridParameters = {
    rows: number
    columns: number
  }

  type ActualDimensions = {
    x: number
    y: number
  }

  type Props = {
    calculate: (input: GridDimensionInput) => GridDimensionResult
    onApply: (parameters: GridParameters) => void
    description?: string
    onInvalid?: () => void
  }

  let {
    calculate,
    onApply,
    description = '輸入 X/Y 尺寸，計算不超過目標的最大格數。',
    onInvalid,
  }: Props = $props()

  let targetX = $state('')
  let targetY = $state('')
  let errors = $state<GridDimensionErrors>({})
  let actualDimensions = $state<ActualDimensions | null>(null)

  function handleTargetInput(axis: 'x' | 'y', event: Event): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return

    if (axis === 'x') {
      targetX = event.currentTarget.value
    } else {
      targetY = event.currentTarget.value
    }

    const nextErrors = { ...errors }
    delete nextErrors[axis]
    errors = nextErrors
    actualDimensions = null
  }

  function handleCalculate(): void {
    const result = calculate({ x: targetX, y: targetY })
    if (!result.valid) {
      errors = result.errors
      actualDimensions = null
      onInvalid?.()
      return
    }

    errors = {}
    actualDimensions = result.actualDimensions
    onApply(result.parameters)
  }

  function formatDimension(value: number): string {
    return Number(value.toFixed(2)).toString()
  }
</script>

<div
  class="grid gap-3 rounded-xl border border-border-card bg-page p-3"
  data-testid="grid-dimension-calculator"
>
  <div>
    <h3 class="m-0 text-base font-semibold">用尺寸計算格數</h3>
    <p class="mt-1 mb-0 text-sm text-muted">{description}</p>
  </div>

  <div
    class="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2"
  >
    <ParameterField
      label="X"
      unit="mm"
      error={errors.x}
      errorId="grid-dimension-x-error"
    >
      <input
        aria-describedby={errors.x ? 'grid-dimension-x-error' : undefined}
        aria-invalid={Boolean(errors.x)}
        aria-label="X（mm）"
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
        inputmode="decimal"
        type="text"
        value={targetX}
        oninput={(event) => handleTargetInput('x', event)}
      />
    </ParameterField>

    <ParameterField
      label="Y"
      unit="mm"
      error={errors.y}
      errorId="grid-dimension-y-error"
    >
      <input
        aria-describedby={errors.y ? 'grid-dimension-y-error' : undefined}
        aria-invalid={Boolean(errors.y)}
        aria-label="Y（mm）"
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
        inputmode="decimal"
        type="text"
        value={targetY}
        oninput={(event) => handleTargetInput('y', event)}
      />
    </ParameterField>
    <div class="min-w-0 pt-[1.8rem]">
      <button
        class="h-[2.725rem] shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-0 bg-primary px-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-disabled"
        type="button"
        onclick={handleCalculate}
      >
        計算格數
      </button>
    </div>
  </div>

  {#if actualDimensions}
    <p
      class="m-0 text-sm text-muted"
      data-testid="grid-dimension-result"
      aria-live="polite"
    >
      計算結果：X {formatDimension(actualDimensions.x)} mm、Y
      {formatDimension(actualDimensions.y)} mm。
    </p>
  {/if}
</div>

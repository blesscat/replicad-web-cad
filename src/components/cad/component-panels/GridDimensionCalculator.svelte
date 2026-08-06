<script lang="ts">
  import type {
    GridDimensionErrors,
    GridDimensionInput,
    GridDimensionResult,
  } from '../../../features/cad/grid-dimensions'

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
  }

  let { calculate, onApply }: Props = $props()

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
    <p class="mt-1 mb-0 text-sm text-muted">
      輸入目標 X/Y 尺寸，計算不超過目標的最大格數。
    </p>
  </div>

  <div class="grid gap-3 sm:grid-cols-2">
    <label class="grid gap-[0.3rem]">
      <span class="font-[650]">目標 X 尺寸（mm）</span>
      <input
        aria-describedby={errors.x ? 'grid-dimension-x-error' : undefined}
        aria-invalid={Boolean(errors.x)}
        aria-label="目標 X 尺寸（mm）"
        class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
        inputmode="decimal"
        type="text"
        value={targetX}
        oninput={(event) => handleTargetInput('x', event)}
      />
      {#if errors.x}
        <span
          id="grid-dimension-x-error"
          class="text-sm text-error"
          role="alert"
        >
          {errors.x}
        </span>
      {/if}
    </label>

    <label class="grid gap-[0.3rem]">
      <span class="font-[650]">目標 Y 尺寸（mm）</span>
      <input
        aria-describedby={errors.y ? 'grid-dimension-y-error' : undefined}
        aria-invalid={Boolean(errors.y)}
        aria-label="目標 Y 尺寸（mm）"
        class="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
        inputmode="decimal"
        type="text"
        value={targetY}
        oninput={(event) => handleTargetInput('y', event)}
      />
      {#if errors.y}
        <span
          id="grid-dimension-y-error"
          class="text-sm text-error"
          role="alert"
        >
          {errors.y}
        </span>
      {/if}
    </label>
  </div>

  <button
    class="w-fit cursor-pointer rounded-lg border-0 bg-primary px-[0.8rem] py-[0.6rem] text-base text-white disabled:cursor-not-allowed disabled:bg-disabled"
    type="button"
    onclick={handleCalculate}
  >
    計算格數
  </button>

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

<script lang="ts">
  import type {
    OpenGridPrintPlanErrors,
    OpenGridPrintPlanInput,
    OpenGridPrintPlanResult,
    OpenGridPrintPlanSuccess,
  } from '../../../../features/cad/grid-dimensions'
  import ParameterField from '../ParameterField.svelte'

  type PrimaryPiece = {
    rows: number
    columns: number
  }

  type Props = {
    calculate: (input: OpenGridPrintPlanInput) => OpenGridPrintPlanResult
    onApply: (piece: PrimaryPiece) => void
    onInvalid?: () => void
  }

  let { calculate, onApply, onInvalid }: Props = $props()

  let targetX = $state('')
  let targetY = $state('')
  let printerX = $state('')
  let printerY = $state('')
  let errors = $state<OpenGridPrintPlanErrors>({})
  let plan = $state<OpenGridPrintPlanSuccess | null>(null)

  function updateInput(
    field: keyof OpenGridPrintPlanInput,
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return

    if (field === 'targetX') targetX = event.currentTarget.value
    if (field === 'targetY') targetY = event.currentTarget.value
    if (field === 'printerX') printerX = event.currentTarget.value
    if (field === 'printerY') printerY = event.currentTarget.value

    const nextErrors = { ...errors }
    delete nextErrors[field]
    errors = nextErrors
    plan = null
  }

  function handleCalculate(): void {
    const result = calculate({ targetX, targetY, printerX, printerY })
    if (!result.valid) {
      errors = result.errors
      plan = null
      onInvalid?.()
      return
    }

    errors = {}
    plan = result
    onApply({ rows: result.primary.rows, columns: result.primary.columns })
  }

  function formatDimension(value: number): string {
    return Number(value.toFixed(2)).toString()
  }

  function groupLabel(
    role: OpenGridPrintPlanSuccess['pieceGroups'][number]['role'],
  ): string {
    if (role === 'primary') return '主要片'
    if (role === 'edge') return '邊緣片'
    return '角落片'
  }
</script>

<div
  class="grid gap-3 rounded-xl border border-border-card bg-page p-3"
  data-testid="grid-dimension-calculator"
>
  <div>
    <h3 class="m-0 text-base font-semibold">列印分片計算</h3>
    <p class="mt-1 mb-0 text-sm text-muted">
      輸入目標與列印機可用尺寸，推薦 OpenGrid 分片方案。
    </p>
  </div>

  <div class="grid min-w-0 gap-2">
    <div class="grid min-w-0 grid-cols-2 gap-2">
      <ParameterField
        label="目標 X"
        unit="mm"
        error={errors.targetX}
        errorId="opengrid-print-plan-target-x-error"
      >
        <input
          aria-describedby={errors.targetX
            ? 'opengrid-print-plan-target-x-error'
            : undefined}
          aria-invalid={Boolean(errors.targetX)}
          aria-label="目標 X（mm）"
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
          inputmode="decimal"
          type="text"
          value={targetX}
          oninput={(event) => updateInput('targetX', event)}
        />
      </ParameterField>

      <ParameterField
        label="目標 Y"
        unit="mm"
        error={errors.targetY}
        errorId="opengrid-print-plan-target-y-error"
      >
        <input
          aria-describedby={errors.targetY
            ? 'opengrid-print-plan-target-y-error'
            : undefined}
          aria-invalid={Boolean(errors.targetY)}
          aria-label="目標 Y（mm）"
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
          inputmode="decimal"
          type="text"
          value={targetY}
          oninput={(event) => updateInput('targetY', event)}
        />
      </ParameterField>
    </div>

    <div class="grid min-w-0 grid-cols-2 gap-2">
      <ParameterField
        label="列印機 X"
        unit="mm"
        error={errors.printerX}
        errorId="opengrid-print-plan-printer-x-error"
      >
        <input
          aria-describedby={errors.printerX
            ? 'opengrid-print-plan-printer-x-error'
            : undefined}
          aria-invalid={Boolean(errors.printerX)}
          aria-label="列印機 X（mm）"
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
          inputmode="decimal"
          type="text"
          value={printerX}
          oninput={(event) => updateInput('printerX', event)}
        />
      </ParameterField>

      <ParameterField
        label="列印機 Y"
        unit="mm"
        error={errors.printerY}
        errorId="opengrid-print-plan-printer-y-error"
      >
        <input
          aria-describedby={errors.printerY
            ? 'opengrid-print-plan-printer-y-error'
            : undefined}
          aria-invalid={Boolean(errors.printerY)}
          aria-label="列印機 Y（mm）"
          class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
          inputmode="decimal"
          type="text"
          value={printerY}
          oninput={(event) => updateInput('printerY', event)}
        />
      </ParameterField>
    </div>
  </div>

  <button
    class="h-[2.725rem] cursor-pointer rounded-lg border-0 bg-primary px-3 text-sm text-white disabled:cursor-not-allowed disabled:bg-disabled"
    type="button"
    onclick={handleCalculate}
  >
    計算列印分片
  </button>

  {#if plan}
    <div
      class="grid gap-2 rounded-lg border border-border-card bg-panel p-3 text-sm"
      data-testid="grid-print-plan-result"
      aria-live="polite"
    >
      <p class="m-0">
        目標：{plan.target.columns} × {plan.target.rows} 格（完整格數；{formatDimension(
          plan.target.width,
        )} × {formatDimension(plan.target.depth)} mm）
      </p>
      <p class="m-0">
        列印機上限：{plan.printer.columns} × {plan.printer.rows} 格（完整格數；{formatDimension(
          plan.printer.width,
        )} × {formatDimension(plan.printer.depth)} mm）
      </p>
      <p class="m-0 font-semibold">
        主要片：{plan.primary.columns} × {plan.primary.rows} 格（完整格數；{formatDimension(
          plan.primary.width,
        )} × {formatDimension(plan.primary.depth)} mm）
      </p>
      <ul class="m-0 grid gap-1 pl-5">
        {#each plan.pieceGroups as group}
          <li>
            {groupLabel(group.role)}：{group.columns} × {group.rows} 格（完整格數；{formatDimension(
              group.width,
            )} × {formatDimension(group.depth)} mm）× {group.quantity} 片
          </li>
        {/each}
      </ul>
      <p class="m-0 font-semibold">共 {plan.totalPieces} 片</p>
      <p class="m-0 text-muted">
        目前預覽套用主要片；其他收尾片需依方案個別設定。
      </p>
    </div>
  {/if}
</div>

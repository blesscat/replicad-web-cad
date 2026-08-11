<script lang="ts">
  import { onMount } from 'svelte'
  import {
    CAD_PROGRESS_STAGES,
    buildingProgressElapsedMs,
    booleanProgressLabel,
    formatProgressElapsed,
    progressCountLabel,
    progressDetails,
    type CadProgress,
    type CadProgressDetails,
  } from '../../features/cad/progress'

  type Props = {
    progress: CadProgress
  }

  function getValueMin(hasCounters: boolean): number {
    if (hasCounters) return 0
    return 1
  }

  function getValueMax(
    progress: CadProgress,
    current: CadProgressDetails,
    hasCounters: boolean,
  ): number {
    if (!hasCounters) return current.totalSteps
    return progress.total ?? 1
  }

  function getValueNow(
    progress: CadProgress,
    current: CadProgressDetails,
    hasCounters: boolean,
  ): number {
    if (!hasCounters) return current.step
    return progress.completed ?? 0
  }

  function getValueText(
    current: CadProgressDetails,
    countLabel: string | null,
    booleanLabel: string | null,
    buildingElapsedLabel: string | null,
  ): string {
    let valueText = `${current.label}，第 ${current.step} / ${current.totalSteps} 階段`
    if (countLabel !== null) valueText = `${current.label}，${countLabel}`
    if (booleanLabel !== null) valueText = `${valueText}，${booleanLabel}`
    if (buildingElapsedLabel !== null)
      valueText = `${valueText}，建模總計已耗時 ${buildingElapsedLabel}`
    return valueText
  }

  function clockNow(): number {
    if (typeof performance !== 'undefined') return performance.now()
    return Date.now()
  }

  let { progress }: Props = $props()
  let now = $state(clockNow())
  let trackedStage = progress.stage
  let trackedOperationId = progress.operationId
  let buildingStartedAt = $state<number | null>(
    progress.stage === 'building' ? now : null,
  )
  let current = $derived(progressDetails(progress.stage))
  let countLabel = $derived(progressCountLabel(progress))
  let booleanLabel = $derived(booleanProgressLabel(progress))
  let buildingElapsedMs = $derived.by(() => {
    return buildingProgressElapsedMs(progress.stage, buildingStartedAt, now)
  })
  let buildingElapsedLabel = $derived(
    buildingElapsedMs === null
      ? null
      : formatProgressElapsed(buildingElapsedMs),
  )
  let hasCounters = $derived(countLabel !== null)
  let valueMin = $derived(getValueMin(hasCounters))
  let valueMax = $derived(getValueMax(progress, current, hasCounters))
  let valueNow = $derived(getValueNow(progress, current, hasCounters))
  let completion = $derived((valueNow / valueMax) * 100)
  let valueText = $derived(
    getValueText(current, countLabel, booleanLabel, buildingElapsedLabel),
  )

  onMount(() => {
    const timer = window.setInterval(() => {
      now = clockNow()
    }, 250)
    return () => window.clearInterval(timer)
  })

  $effect(() => {
    const stage = progress.stage
    const operationId = progress.operationId
    if (stage === trackedStage && operationId === trackedOperationId) return
    trackedStage = stage
    trackedOperationId = operationId
    buildingStartedAt = stage === 'building' ? now : null
  })

  function getMarkerClassName(
    progressStage: CadProgress['stage'],
    currentStage: CadProgress['stage'],
  ): string {
    if (progressStage === currentStage) return 'bg-primary text-white'
    return 'bg-border-card text-ink'
  }
</script>

<section
  aria-label="CAD 載入進度"
  class="fixed bottom-4 right-4 z-40 grid w-[min(24rem,calc(100vw-2rem))] gap-3 rounded-2xl border border-border-card bg-panel p-4 shadow-card"
  data-testid="cad-progress"
>
  <div class="flex items-center justify-between gap-4 text-sm">
    <strong class="text-ink">處理進度</strong>
    <span class="text-muted"
      >{countLabel ?? `${current.step} / ${current.totalSteps}`}</span
    >
  </div>
  {#if booleanLabel !== null}
    <p class="text-sm text-muted" data-testid="cad-progress-boolean">
      {booleanLabel}
    </p>
  {/if}
  {#if buildingElapsedLabel !== null}
    <p class="text-sm text-muted" data-testid="cad-progress-elapsed">
      建模總計 · 已耗時 {buildingElapsedLabel}
    </p>
  {/if}
  <div
    aria-label={current.label}
    aria-valuemax={valueMax}
    aria-valuemin={valueMin}
    aria-valuenow={valueNow}
    aria-valuetext={valueText}
    class="h-2 overflow-hidden rounded-full bg-progress-track"
    role="progressbar"
  >
    <div
      aria-hidden="true"
      class="h-full rounded-full bg-progress-fill transition-[width] duration-300"
      style:width={`${completion}%`}
    ></div>
  </div>
  <ol class="grid grid-cols-4 gap-1 text-xs text-muted">
    {#each CAD_PROGRESS_STAGES as progressStage (progressStage)}
      {@const details = progressDetails(progressStage)}
      {@const isCurrent = progressStage === current.stage}
      {@const isComplete = details.step < current.step}
      {@const markerClassName = getMarkerClassName(
        progressStage,
        current.stage,
      )}
      <li
        aria-current={isCurrent ? 'step' : undefined}
        class="grid justify-items-center gap-1 text-center"
        data-stage={progressStage}
      >
        <span
          aria-hidden="true"
          class={`grid h-5 w-5 place-items-center rounded-full text-[0.7rem] font-semibold ${markerClassName}`}
          >{isComplete ? '✓' : details.step}</span
        >
        <span>{details.label}</span>
      </li>
    {/each}
  </ol>
</section>

<script lang="ts">
  import {
    CAD_PROGRESS_STAGES,
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
  ): string {
    if (countLabel !== null) return `${current.label}，${countLabel}`
    return `${current.label}，第 ${current.step} / ${current.totalSteps} 階段`
  }

  let { progress }: Props = $props()
  let current = $derived(progressDetails(progress.stage))
  let countLabel = $derived(progressCountLabel(progress))
  let hasCounters = $derived(countLabel !== null)
  let valueMin = $derived(getValueMin(hasCounters))
  let valueMax = $derived(getValueMax(progress, current, hasCounters))
  let valueNow = $derived(getValueNow(progress, current, hasCounters))
  let completion = $derived((valueNow / valueMax) * 100)
  let valueText = $derived(getValueText(current, countLabel))

  function getMarkerClassName(
    progressStage: CadProgress['stage'],
    currentStage: CadProgress['stage'],
    isComplete: boolean,
  ): string {
    if (progressStage === currentStage) return 'bg-primary text-white'
    if (isComplete) return 'bg-primary/20 text-primary'
    return 'bg-border-card text-muted'
  }
</script>

<section
  aria-label="CAD 載入進度"
  class="grid gap-3 rounded-2xl border border-border-card bg-panel p-4"
  data-testid="cad-progress"
>
  <div class="flex items-center justify-between gap-4 text-sm">
    <strong class="text-ink">處理進度</strong>
    <span class="text-muted"
      >{countLabel ?? `${current.step} / ${current.totalSteps}`}</span
    >
  </div>
  <div
    aria-label={current.label}
    aria-valuemax={valueMax}
    aria-valuemin={valueMin}
    aria-valuenow={valueNow}
    aria-valuetext={valueText}
    class="h-2 overflow-hidden rounded-full bg-border-card"
    role="progressbar"
  >
    <div
      aria-hidden="true"
      class="h-full rounded-full bg-primary transition-[width] duration-300"
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
        isComplete,
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

<script lang="ts">
  import {
    CAD_PROGRESS_STAGES,
    progressCountLabel,
    progressDetails,
    type CadProgress,
  } from '../../features/cad/progress'

  type Props = {
    progress: CadProgress
  }

  let { progress }: Props = $props()
  let current = $derived(progressDetails(progress.stage))
  let countLabel = $derived(progressCountLabel(progress))
  let hasCounters = $derived(countLabel !== null)
  let valueMin = $derived(hasCounters ? 0 : 1)
  let valueMax = $derived(
    hasCounters ? (progress.total ?? 1) : current.totalSteps,
  )
  let valueNow = $derived(
    hasCounters ? (progress.completed ?? 0) : current.step,
  )
  let completion = $derived((valueNow / valueMax) * 100)
  let valueText = $derived(
    hasCounters
      ? `${current.label}，${countLabel}`
      : `${current.label}，第 ${current.step} / ${current.totalSteps} 階段`,
  )

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

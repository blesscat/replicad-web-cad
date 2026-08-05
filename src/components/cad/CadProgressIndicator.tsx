import {
  CAD_PROGRESS_STAGES,
  progressCountLabel,
  progressDetails,
  type CadProgress,
} from '../../features/cad/progress'

type CadProgressIndicatorProps = {
  progress: CadProgress
}

export function CadProgressIndicator({ progress }: CadProgressIndicatorProps) {
  const current = progressDetails(progress.stage)
  const countLabel = progressCountLabel(progress)
  const hasCounters = countLabel !== null
  const valueMin = hasCounters ? 0 : 1
  const valueMax = hasCounters ? (progress.total ?? 1) : current.totalSteps
  const valueNow = hasCounters ? (progress.completed ?? 0) : current.step
  const completion = (valueNow / valueMax) * 100
  const valueText = hasCounters
    ? `${current.label}，${countLabel}`
    : `${current.label}，第 ${current.step} / ${current.totalSteps} 階段`

  return (
    <section
      aria-label="CAD 載入進度"
      className="grid gap-3 rounded-2xl border border-border-card bg-panel p-4"
      data-testid="cad-progress"
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <strong className="text-ink">處理進度</strong>
        <span className="text-muted">
          {countLabel ?? `${current.step} / ${current.totalSteps}`}
        </span>
      </div>
      <div
        aria-label={current.label}
        aria-valuemax={valueMax}
        aria-valuemin={valueMin}
        aria-valuenow={valueNow}
        aria-valuetext={valueText}
        className="h-2 overflow-hidden rounded-full bg-border-card"
        role="progressbar"
      >
        <div
          aria-hidden="true"
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${completion}%` }}
        />
      </div>
      <ol className="grid grid-cols-4 gap-1 text-xs text-muted">
        {CAD_PROGRESS_STAGES.map((progressStage) => {
          const details = progressDetails(progressStage)
          const isCurrent = progressStage === current.stage
          const isComplete = details.step < current.step
          let markerClassName = 'bg-border-card text-muted'

          if (isCurrent) {
            markerClassName = 'bg-primary text-white'
          } else if (isComplete) {
            markerClassName = 'bg-primary/20 text-primary'
          }

          return (
            <li
              aria-current={isCurrent ? 'step' : undefined}
              className="grid justify-items-center gap-1 text-center"
              data-stage={progressStage}
              key={progressStage}
            >
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 place-items-center rounded-full text-[0.7rem] font-semibold ${markerClassName}`}
              >
                {isComplete ? '✓' : details.step}
              </span>
              <span>{details.label}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

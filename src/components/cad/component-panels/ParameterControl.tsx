import type { ParameterField } from '../../../features/cad/model-catalog'

type ParameterControlProps = {
  field: ParameterField
  value: string
  error?: string
  onChange: (value: string) => void
}

export function ParameterControl({
  field,
  value,
  error,
  onChange,
}: ParameterControlProps) {
  const commonProps = {
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${field.key}-error` : undefined,
    min: field.min,
    max: field.max,
    step: field.step,
  }

  if (field.control === 'range') {
    return (
      <div className="grid gap-1">
        <input
          {...commonProps}
          aria-label={`${field.label}（${field.axis}）`}
          className="w-full accent-primary"
          type="range"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span aria-live="polite" className="text-right text-sm text-muted">
          {value} {field.unit}
        </span>
      </div>
    )
  }

  return (
    <input
      {...commonProps}
      className="w-full rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink aria-[invalid=true]:border-error-border"
      inputMode="numeric"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

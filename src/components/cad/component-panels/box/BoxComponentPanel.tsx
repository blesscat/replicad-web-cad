import { boxDefinition } from '../../../../features/cad/model-catalog'
import { ParameterControl } from '../ParameterControl'
import type { ComponentPanelProps } from '../types'

export function BoxComponentPanel({
  rawParameters,
  fieldErrors,
  onInputChange,
}: ComponentPanelProps) {
  return (
    <fieldset className="m-0 grid gap-3 border-0 p-0">
      <legend className="text-muted">方塊尺寸</legend>
      {boxDefinition.parameterSchema.map((field) => (
        <label className="grid gap-[0.3rem]" key={field.key}>
          <span className="flex justify-between font-[650]">
            <span>
              {field.label}（{field.axis}）
            </span>
            <span>{field.unit}</span>
          </span>
          <ParameterControl
            field={field}
            value={rawParameters[field.key] ?? String(field.defaultValue)}
            error={fieldErrors[field.key]}
            onChange={(value) => onInputChange(field.key, value)}
          />
          {fieldErrors[field.key] && (
            <span
              className="text-sm text-error"
              id={`${field.key}-error`}
              role="alert"
            >
              {fieldErrors[field.key]}
            </span>
          )}
        </label>
      ))}
    </fieldset>
  )
}

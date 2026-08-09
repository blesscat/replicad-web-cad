<script lang="ts">
  import {
    boundsForOpenGridSnap,
    type ModelParameterKey,
    type OpenGridSnapParameters,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridSnapDefinition,
  } from '../../../../features/cad/model-catalog'
  import type { RawParameters } from '../../workspace/types'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'

  type Props = {
    parameters: OpenGridSnapParameters
    rawParameters: RawParameters
    fieldErrors: Partial<Record<ModelParameterKey | 'parameters', string>>
    onInputChange: (key: ModelParameterKey, value: string) => void
  }

  let { parameters, rawParameters, fieldErrors, onInputChange }: Props =
    $props()

  const offsetField = opengridSnapDefinition.parameterSchema[0]!

  let bounds = $derived(boundsForOpenGridSnap(parameters))
  let width = $derived(bounds.max[0] - bounds.min[0])
  let depth = $derived(bounds.max[1] - bounds.min[1])
  let height = $derived(bounds.max[2] - bounds.min[2])

  function fieldError(field: ModelParameterKey | 'parameters') {
    return fieldErrors[field]
  }

  let rawOffset = $derived(rawParameters.offset ?? String(parameters.offset))
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0" data-testid="opengrid-snap-panel">
  <ParameterField
    label="Snap 型號"
    error={fieldError('variant')}
    errorId="opengrid-snap-variant-error"
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid Snap 型號"
      aria-describedby={fieldError('variant')
        ? 'opengrid-snap-variant-error'
        : undefined}
      aria-invalid={Boolean(fieldError('variant'))}
      value={rawParameters.variant ?? parameters.variant}
      onchange={(event) => {
        if (event.currentTarget instanceof HTMLSelectElement) {
          onInputChange('variant', event.currentTarget.value)
        }
      }}
    >
      <option value="Full">Full（6.8 mm）</option>
      <option value="Lite">Lite（3.4 mm）</option>
    </select>
  </ParameterField>

  <ParameterField
    label={displayParameterLabel(offsetField)}
    unit={offsetField.unit}
    changed={rawOffset !== String(offsetField.defaultValue)}
    error={fieldError('offset')}
    errorId="opengrid-snap-offset-error"
    onRestore={() => onInputChange('offset', String(offsetField.defaultValue))}
  >
    <ParameterControl
      field={offsetField}
      value={rawOffset}
      error={fieldError('offset')}
      onChange={(nextValue) => onInputChange('offset', nextValue)}
    />
  </ParameterField>

  <p class="m-0 text-sm text-muted" aria-live="polite">
    外框總尺寸：{width.toFixed(2)} × {depth.toFixed(2)} × {height.toFixed(2)} mm
  </p>
</fieldset>

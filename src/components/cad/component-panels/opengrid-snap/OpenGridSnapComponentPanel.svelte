<script lang="ts">
  import {
    boundsForOpenGridSnap,
    halfCellHostPitch,
    type HalfCellX,
    type HalfCellY,
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
  let hostWidth = $derived(halfCellHostPitch(parameters.halfCellX))
  let hostDepth = $derived(halfCellHostPitch(parameters.halfCellY))

  function fieldError(field: ModelParameterKey | 'parameters') {
    return fieldErrors[field]
  }

  let rawOffset = $derived(rawParameters.offset ?? String(parameters.offset))
  let rawProfile = $derived(rawParameters.profile ?? parameters.profile)
  let rawHalfCellX = $derived(rawParameters.halfCellX ?? parameters.halfCellX)
  let rawHalfCellY = $derived(rawParameters.halfCellY ?? parameters.halfCellY)
  let rawFourCornerLocatingHoles = $derived(
    rawParameters.fourCornerLocatingHoles ??
      String(parameters.fourCornerLocatingHoles),
  )
  let rawCenterRemoverHole = $derived(
    rawParameters.centerRemoverHole ?? String(parameters.centerRemoverHole),
  )

  function updateHalfCellX(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('halfCellX', event.currentTarget.value as HalfCellX)
  }

  function updateHalfCellY(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('halfCellY', event.currentTarget.value as HalfCellY)
  }

  function updateBoolean(
    key: 'fourCornerLocatingHoles' | 'centerRemoverHole',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    onInputChange(key, String(event.currentTarget.checked))
  }
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
    label="幾何版本"
    error={fieldError('profile')}
    errorId="opengrid-snap-profile-error"
    onRestore={() => onInputChange('profile', 'Standard')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid Snap 幾何版本"
      aria-describedby={fieldError('profile')
        ? 'opengrid-snap-profile-error'
        : undefined}
      aria-invalid={Boolean(fieldError('profile'))}
      value={rawProfile}
      onchange={(event) => {
        if (event.currentTarget instanceof HTMLSelectElement) {
          onInputChange('profile', event.currentTarget.value)
        }
      }}
    >
      <option value="Standard">Standard</option>
      <option value="Directional">Directional</option>
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

  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <ParameterField
      label="X 半格方向"
      error={fieldError('halfCellX')}
      errorId="opengrid-snap-half-cell-x-error"
      onRestore={() => onInputChange('halfCellX', 'none')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid Snap X 半格方向"
        aria-describedby={fieldError('halfCellX')
          ? 'opengrid-snap-half-cell-x-error'
          : undefined}
        aria-invalid={Boolean(fieldError('halfCellX'))}
        value={rawHalfCellX}
        onchange={updateHalfCellX}
      >
        <option value="none">無</option>
        <option value="left">左</option>
        <option value="right">右</option>
      </select>
    </ParameterField>

    <ParameterField
      label="Y 半格方向"
      error={fieldError('halfCellY')}
      errorId="opengrid-snap-half-cell-y-error"
      onRestore={() => onInputChange('halfCellY', 'none')}
    >
      <select
        class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
        aria-label="OpenGrid Snap Y 半格方向"
        aria-describedby={fieldError('halfCellY')
          ? 'opengrid-snap-half-cell-y-error'
          : undefined}
        aria-invalid={Boolean(fieldError('halfCellY'))}
        value={rawHalfCellY}
        onchange={updateHalfCellY}
      >
        <option value="none">無</option>
        <option value="top">上</option>
        <option value="bottom">下</option>
      </select>
    </ParameterField>
  </div>

  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
    <ParameterField
      label="四周定位孔"
      error={fieldError('fourCornerLocatingHoles')}
      errorId="opengrid-snap-four-corner-holes-error"
      onRestore={() => onInputChange('fourCornerLocatingHoles', 'false')}
    >
      <label class="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label="OpenGrid Snap 四周定位孔"
          checked={rawFourCornerLocatingHoles === 'true'}
          onchange={(event) => updateBoolean('fourCornerLocatingHoles', event)}
        />
        啟用四個定位孔
      </label>
    </ParameterField>

    <ParameterField
      label="中心 remover 孔"
      error={fieldError('centerRemoverHole')}
      errorId="opengrid-snap-center-remover-hole-error"
      onRestore={() => onInputChange('centerRemoverHole', 'false')}
    >
      <label class="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label="OpenGrid Snap 中心 remover 孔"
          checked={rawCenterRemoverHole === 'true'}
          onchange={(event) => updateBoolean('centerRemoverHole', event)}
        />
        啟用中心 remover 孔
      </label>
    </ParameterField>
  </div>

  <p class="m-0 text-sm text-muted" aria-live="polite">
    外框總尺寸：{width.toFixed(2)} × {depth.toFixed(2)} × {height.toFixed(2)} mm （宿主格距：X
    {hostWidth} × Y {hostDepth} mm）
  </p>
</fieldset>

<script lang="ts">
  import {
    type ModelParameterKey,
    type OpenGridSnapParameters,
    type OpenGridSnapFootprint,
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

  function fieldError(field: ModelParameterKey | 'parameters') {
    return fieldErrors[field]
  }

  let rawOffset = $derived(rawParameters.offset ?? String(parameters.offset))
  let rawProfile = $derived(rawParameters.profile ?? parameters.profile)
  let rawFootprint = $derived(rawParameters.footprint ?? parameters.footprint)
  let offsetIsAdjustable = $derived(rawFootprint === 'full')
  let fixedFootprintFeaturesAreDisabled = $derived(rawFootprint !== 'full')
  let displayedOffset = $derived(
    offsetIsAdjustable ? rawOffset : String(offsetField.defaultValue),
  )
  let rawFourCornerLocatingHoles = $derived(
    rawParameters.fourCornerLocatingHoles ??
      String(parameters.fourCornerLocatingHoles),
  )
  let rawCenterRemoverHole = $derived(
    rawParameters.centerRemoverHole ?? String(parameters.centerRemoverHole),
  )

  function updateFootprint(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const footprint = event.currentTarget.value as OpenGridSnapFootprint
    onInputChange('footprint', footprint)
    if (footprint !== 'full') {
      onInputChange('offset', String(offsetField.defaultValue))
      onInputChange('fourCornerLocatingHoles', 'false')
      onInputChange('centerRemoverHole', 'false')
    }
  }

  function restoreOffset(): void {
    onInputChange('offset', String(offsetField.defaultValue))
  }

  function updateBoolean(
    key: 'fourCornerLocatingHoles' | 'centerRemoverHole',
    event: Event,
  ): void {
    if (!(event.currentTarget instanceof HTMLInputElement)) return
    if (fixedFootprintFeaturesAreDisabled) return
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
      <option value="Lite">Lite（3.4 mm）</option>
      <option value="Full">Full（6.8 mm）</option>
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
    changed={offsetIsAdjustable &&
      rawOffset !== String(offsetField.defaultValue)}
    error={fieldError('offset')}
    errorId="opengrid-snap-offset-error"
    onRestore={offsetIsAdjustable ? restoreOffset : undefined}
  >
    <ParameterControl
      field={offsetField}
      value={displayedOffset}
      error={fieldError('offset')}
      disabled={!offsetIsAdjustable}
      onChange={(nextValue) => onInputChange('offset', nextValue)}
    />
    {#if !offsetIsAdjustable}
      <p class="m-0 text-sm text-muted" role="status">增量無效</p>
    {/if}
  </ParameterField>

  <ParameterField
    label="格型"
    error={fieldError('footprint')}
    errorId="opengrid-snap-footprint-error"
    onRestore={() => onInputChange('footprint', 'full')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label="OpenGrid Snap 格型"
      aria-describedby={fieldError('footprint')
        ? 'opengrid-snap-footprint-error'
        : undefined}
      aria-invalid={Boolean(fieldError('footprint'))}
      value={rawFootprint}
      onchange={updateFootprint}
    >
      <option value="full">Full</option>
      <option value="half">Half</option>
      <option value="quarter">Quarter</option>
    </select>
    {#if rawFootprint === 'quarter'}
      <p class="m-0 text-sm text-error" role="status">
        格型測試中 不保證可使用
      </p>
    {/if}
  </ParameterField>

  <div class="grid grid-cols-2 gap-2">
    <div class="min-w-0">
      <label class="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label="定位孔"
          aria-describedby={fieldError('fourCornerLocatingHoles')
            ? 'opengrid-snap-four-corner-holes-error'
            : undefined}
          aria-invalid={Boolean(fieldError('fourCornerLocatingHoles'))}
          checked={!fixedFootprintFeaturesAreDisabled &&
            rawFourCornerLocatingHoles === 'true'}
          disabled={fixedFootprintFeaturesAreDisabled}
          onchange={(event) => updateBoolean('fourCornerLocatingHoles', event)}
        />
        定位孔
      </label>
      {#if fixedFootprintFeaturesAreDisabled}
        <p class="m-0 text-sm text-muted" role="status">定位孔無效</p>
      {/if}
      {#if fieldError('fourCornerLocatingHoles')}
        <span
          id="opengrid-snap-four-corner-holes-error"
          class="text-sm text-error"
          role="alert">{fieldError('fourCornerLocatingHoles')}</span
        >
      {/if}
    </div>

    <div class="min-w-0">
      <label class="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label="移除孔"
          aria-describedby={fieldError('centerRemoverHole')
            ? 'opengrid-snap-center-remover-hole-error'
            : undefined}
          aria-invalid={Boolean(fieldError('centerRemoverHole'))}
          checked={!fixedFootprintFeaturesAreDisabled &&
            rawCenterRemoverHole === 'true'}
          disabled={fixedFootprintFeaturesAreDisabled}
          onchange={(event) => updateBoolean('centerRemoverHole', event)}
        />
        移除孔
      </label>
      {#if fixedFootprintFeaturesAreDisabled}
        <p class="m-0 text-sm text-muted" role="status">移除孔無效</p>
      {/if}
      {#if fieldError('centerRemoverHole')}
        <span
          id="opengrid-snap-center-remover-hole-error"
          class="text-sm text-error"
          role="alert">{fieldError('centerRemoverHole')}</span
        >
      {/if}
    </div>
  </div>
</fieldset>

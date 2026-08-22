<script lang="ts">
  import {
    type ModelParameterKey,
    type OpenGridSnapParameters,
    type OpenGridSnapFootprint,
    type ValidationIssue,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridSnapDefinition,
    unitLabelFor,
  } from '../../../../features/cad/model-catalog'
  import { translate, type Locale } from '../../../../i18n'
  import { formatValidationIssue } from '../../../../i18n/diagnostics'
  import type { RawParameters } from '../../workspace/types'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'

  type Props = {
    locale: Locale
    parameters: OpenGridSnapParameters
    rawParameters: RawParameters
    fieldErrors: Partial<
      Record<ModelParameterKey | 'parameters', ValidationIssue>
    >
    onInputChange: (key: ModelParameterKey, value: string) => void
  }

  let { locale, parameters, rawParameters, fieldErrors, onInputChange }: Props =
    $props()

  const offsetField = opengridSnapDefinition.parameterSchema[0]!
  const magnetLengthField = opengridSnapDefinition.parameterSchema.find(
    (field) => field.key === 'magnetHoleLength',
  )!
  const magnetWidthField = opengridSnapDefinition.parameterSchema.find(
    (field) => field.key === 'magnetHoleWidth',
  )!
  const magnetDiameterField = opengridSnapDefinition.parameterSchema.find(
    (field) => field.key === 'magnetHoleDiameter',
  )!
  const magnetThicknessField = opengridSnapDefinition.parameterSchema.find(
    (field) => field.key === 'magnetHoleThickness',
  )!

  const magnetDimensionKeys = [
    'magnetHoleLength',
    'magnetHoleWidth',
    'magnetHoleDiameter',
    'magnetHoleThickness',
  ] as const

  function fieldError(field: ModelParameterKey | 'parameters') {
    return fieldErrors[field]
  }

  function fieldErrorMessage(field: ModelParameterKey | 'parameters') {
    const issue = fieldError(field)
    return issue ? formatValidationIssue(locale, issue) : ''
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
  let rawMagnetHoleShape = $derived(
    rawParameters.magnetHoleShape ?? parameters.magnetHoleShape,
  )
  let rawMagnetHoleLength = $derived(
    rawParameters.magnetHoleLength ?? String(parameters.magnetHoleLength),
  )
  let rawMagnetHoleWidth = $derived(
    rawParameters.magnetHoleWidth ?? String(parameters.magnetHoleWidth),
  )
  let rawMagnetHoleDiameter = $derived(
    rawParameters.magnetHoleDiameter ?? String(parameters.magnetHoleDiameter),
  )
  let rawMagnetHoleThickness = $derived(
    rawParameters.magnetHoleThickness ?? String(parameters.magnetHoleThickness),
  )
  let magnetHoleIsActive = $derived(rawMagnetHoleShape !== 'none')
  let magnetControlsAreDisabled = $derived(fixedFootprintFeaturesAreDisabled)
  let magnetDimensionControlsAreDisabled = $derived(
    magnetControlsAreDisabled || !magnetHoleIsActive,
  )

  function initializeMagnetDimension(
    key: (typeof magnetDimensionKeys)[number],
    rawValue: string,
    minimum: number,
    defaultValue: number,
  ): void {
    const numericValue = Number(rawValue)
    if (!Number.isFinite(numericValue) || numericValue < minimum) {
      onInputChange(key, String(defaultValue))
    }
  }

  function clearMagnetHole(): void {
    onInputChange('magnetHoleShape', 'none')
    for (const key of magnetDimensionKeys) onInputChange(key, '0')
  }

  function updateMagnetShape(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    if (magnetControlsAreDisabled) return
    const shape = event.currentTarget.value
    if (shape !== 'none' && shape !== 'square' && shape !== 'round') return

    onInputChange('magnetHoleShape', shape)
    if (shape === 'none') {
      for (const key of magnetDimensionKeys) onInputChange(key, '0')
      return
    }

    onInputChange('fourCornerLocatingHoles', 'false')
    onInputChange('centerRemoverHole', 'false')
    initializeMagnetDimension(
      'magnetHoleThickness',
      rawMagnetHoleThickness,
      magnetThicknessField.min,
      magnetThicknessField.defaultValue,
    )
    if (shape === 'square') {
      initializeMagnetDimension(
        'magnetHoleLength',
        rawMagnetHoleLength,
        magnetLengthField.min,
        magnetLengthField.defaultValue,
      )
      initializeMagnetDimension(
        'magnetHoleWidth',
        rawMagnetHoleWidth,
        magnetWidthField.min,
        magnetWidthField.defaultValue,
      )
      onInputChange('magnetHoleDiameter', '0')
    } else {
      initializeMagnetDimension(
        'magnetHoleDiameter',
        rawMagnetHoleDiameter,
        magnetDiameterField.min,
        magnetDiameterField.defaultValue,
      )
      onInputChange('magnetHoleLength', '0')
      onInputChange('magnetHoleWidth', '0')
    }
  }

  function updateFootprint(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    const footprint = event.currentTarget.value as OpenGridSnapFootprint
    onInputChange('footprint', footprint)
    if (footprint !== 'full') {
      onInputChange('offset', String(offsetField.defaultValue))
      onInputChange('fourCornerLocatingHoles', 'false')
      onInputChange('centerRemoverHole', 'false')
      clearMagnetHole()
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
    if (event.currentTarget.checked) clearMagnetHole()
    onInputChange(key, String(event.currentTarget.checked))
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0" data-testid="opengrid-snap-panel">
  <ParameterField
    {locale}
    label={translate(locale, 'panel.snap.variant')}
    error={fieldError('variant')}
    errorId="opengrid-snap-variant-error"
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.snap.variantAria')}
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
      <option value="Lite">{translate(locale, 'panel.snap.variantLite')}</option
      >
      <option value="Full">{translate(locale, 'panel.snap.variantFull')}</option
      >
    </select>
  </ParameterField>

  <ParameterField
    {locale}
    label={translate(locale, 'panel.snap.geometry')}
    error={fieldError('profile')}
    errorId="opengrid-snap-profile-error"
    onRestore={() => onInputChange('profile', 'Standard')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.snap.geometryAria')}
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
      <option value="Standard"
        >{translate(locale, 'panel.snap.profileStandard')}</option
      >
      <option value="Directional"
        >{translate(locale, 'panel.snap.profileDirectional')}</option
      >
    </select>
  </ParameterField>

  <ParameterField
    {locale}
    label={displayParameterLabel(offsetField, locale)}
    unit={unitLabelFor(locale, offsetField.unit)}
    changed={offsetIsAdjustable &&
      rawOffset !== String(offsetField.defaultValue)}
    error={fieldError('offset')}
    errorId="opengrid-snap-offset-error"
    onRestore={offsetIsAdjustable ? restoreOffset : undefined}
  >
    <ParameterControl
      {locale}
      field={offsetField}
      value={displayedOffset}
      error={fieldError('offset')}
      disabled={!offsetIsAdjustable}
      onChange={(nextValue) => onInputChange('offset', nextValue)}
    />
    {#if !offsetIsAdjustable}
      <p class="m-0 text-sm text-muted" role="status">
        {translate(locale, 'panel.snap.invalidOffset')}
      </p>
    {/if}
  </ParameterField>

  <ParameterField
    {locale}
    label={translate(locale, 'panel.snap.footprint')}
    error={fieldError('footprint')}
    errorId="opengrid-snap-footprint-error"
    onRestore={() => onInputChange('footprint', 'full')}
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.snap.footprintAria')}
      aria-describedby={fieldError('footprint')
        ? 'opengrid-snap-footprint-error'
        : undefined}
      aria-invalid={Boolean(fieldError('footprint'))}
      value={rawFootprint}
      onchange={updateFootprint}
    >
      <option value="full"
        >{translate(locale, 'panel.snap.footprintFull')}</option
      >
      <option value="half"
        >{translate(locale, 'panel.snap.footprintHalf')}</option
      >
      <option value="quarter"
        >{translate(locale, 'panel.snap.footprintQuarter')}</option
      >
    </select>
    {#if rawFootprint === 'quarter'}
      <p class="m-0 text-sm text-error" role="status">
        {translate(locale, 'panel.snap.experimental')}
      </p>
    {/if}
  </ParameterField>

  <ParameterField
    {locale}
    label={translate(locale, 'panel.snap.magnetHole')}
    error={fieldError('magnetHoleShape')}
    errorId="opengrid-snap-magnet-hole-shape-error"
  >
    <select
      class="w-full min-w-0 rounded-lg border border-border-field bg-panel px-[0.65rem] py-[0.55rem] text-base text-ink"
      aria-label={translate(locale, 'panel.snap.magnetHoleAria')}
      aria-describedby={fieldError('magnetHoleShape')
        ? 'opengrid-snap-magnet-hole-shape-error'
        : undefined}
      aria-invalid={Boolean(fieldError('magnetHoleShape'))}
      value={rawMagnetHoleShape}
      disabled={magnetControlsAreDisabled}
      onchange={updateMagnetShape}
    >
      <option value="none">{translate(locale, 'panel.snap.magnetNone')}</option>
      <option value="square"
        >{translate(locale, 'panel.snap.magnetSquare')}</option
      >
      <option value="round"
        >{translate(locale, 'panel.snap.magnetRound')}</option
      >
    </select>
    {#if fixedFootprintFeaturesAreDisabled}
      <p class="m-0 text-sm text-muted" role="status">
        {translate(locale, 'panel.snap.magnetHoleInvalid')}
      </p>
    {/if}
  </ParameterField>

  {#if rawMagnetHoleShape === 'square' || rawMagnetHoleShape === 'round'}
    <div class="grid grid-cols-2 gap-2">
      {#if rawMagnetHoleShape === 'square'}
        <ParameterField
          {locale}
          label={displayParameterLabel(magnetLengthField, locale)}
          unit={unitLabelFor(locale, magnetLengthField.unit)}
          error={fieldError('magnetHoleLength')}
          errorId="opengrid-snap-magnet-hole-length-error"
        >
          <ParameterControl
            {locale}
            field={magnetLengthField}
            value={rawMagnetHoleLength}
            error={fieldError('magnetHoleLength')}
            disabled={magnetDimensionControlsAreDisabled}
            onChange={(nextValue) =>
              onInputChange('magnetHoleLength', nextValue)}
          />
        </ParameterField>
        <ParameterField
          {locale}
          label={displayParameterLabel(magnetWidthField, locale)}
          unit={unitLabelFor(locale, magnetWidthField.unit)}
          error={fieldError('magnetHoleWidth')}
          errorId="opengrid-snap-magnet-hole-width-error"
        >
          <ParameterControl
            {locale}
            field={magnetWidthField}
            value={rawMagnetHoleWidth}
            error={fieldError('magnetHoleWidth')}
            disabled={magnetDimensionControlsAreDisabled}
            onChange={(nextValue) =>
              onInputChange('magnetHoleWidth', nextValue)}
          />
        </ParameterField>
      {:else}
        <ParameterField
          {locale}
          label={displayParameterLabel(magnetDiameterField, locale)}
          unit={unitLabelFor(locale, magnetDiameterField.unit)}
          error={fieldError('magnetHoleDiameter')}
          errorId="opengrid-snap-magnet-hole-diameter-error"
        >
          <ParameterControl
            {locale}
            field={magnetDiameterField}
            value={rawMagnetHoleDiameter}
            error={fieldError('magnetHoleDiameter')}
            disabled={magnetDimensionControlsAreDisabled}
            onChange={(nextValue) =>
              onInputChange('magnetHoleDiameter', nextValue)}
          />
        </ParameterField>
      {/if}
      <ParameterField
        {locale}
        label={displayParameterLabel(magnetThicknessField, locale)}
        unit={unitLabelFor(locale, magnetThicknessField.unit)}
        error={fieldError('magnetHoleThickness')}
        errorId="opengrid-snap-magnet-hole-thickness-error"
      >
        <ParameterControl
          {locale}
          field={magnetThicknessField}
          value={rawMagnetHoleThickness}
          error={fieldError('magnetHoleThickness')}
          disabled={magnetDimensionControlsAreDisabled}
          onChange={(nextValue) =>
            onInputChange('magnetHoleThickness', nextValue)}
        />
      </ParameterField>
    </div>
  {/if}

  <div class="grid grid-cols-2 gap-2">
    <div class="min-w-0">
      <label class="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label={translate(locale, 'panel.snap.locatingHoles')}
          aria-describedby={fieldError('fourCornerLocatingHoles')
            ? 'opengrid-snap-four-corner-holes-error'
            : undefined}
          aria-invalid={Boolean(fieldError('fourCornerLocatingHoles'))}
          checked={!fixedFootprintFeaturesAreDisabled &&
            !magnetHoleIsActive &&
            rawFourCornerLocatingHoles === 'true'}
          disabled={fixedFootprintFeaturesAreDisabled}
          onchange={(event) => updateBoolean('fourCornerLocatingHoles', event)}
        />
        {translate(locale, 'panel.snap.locatingHoles')}
      </label>
      {#if fixedFootprintFeaturesAreDisabled}
        <p class="m-0 text-sm text-muted" role="status">
          {translate(locale, 'panel.snap.locatingHolesInvalid')}
        </p>
      {/if}
      {#if fieldError('fourCornerLocatingHoles')}
        <span
          id="opengrid-snap-four-corner-holes-error"
          class="text-sm text-error"
          role="alert">{fieldErrorMessage('fourCornerLocatingHoles')}</span
        >
      {/if}
    </div>

    <div class="min-w-0">
      <label class="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          aria-label={translate(locale, 'panel.snap.removerHole')}
          aria-describedby={fieldError('centerRemoverHole')
            ? 'opengrid-snap-center-remover-hole-error'
            : undefined}
          aria-invalid={Boolean(fieldError('centerRemoverHole'))}
          checked={!fixedFootprintFeaturesAreDisabled &&
            !magnetHoleIsActive &&
            rawCenterRemoverHole === 'true'}
          disabled={fixedFootprintFeaturesAreDisabled}
          onchange={(event) => updateBoolean('centerRemoverHole', event)}
        />
        {translate(locale, 'panel.snap.removerHole')}
      </label>
      {#if fixedFootprintFeaturesAreDisabled}
        <p class="m-0 text-sm text-muted" role="status">
          {translate(locale, 'panel.snap.removerHoleInvalid')}
        </p>
      {/if}
      {#if fieldError('centerRemoverHole')}
        <span
          id="opengrid-snap-center-remover-hole-error"
          class="text-sm text-error"
          role="alert">{fieldErrorMessage('centerRemoverHole')}</span
        >
      {/if}
    </div>
  </div>
</fieldset>

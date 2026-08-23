<script lang="ts">
  import {
    openGridOpenConnectShelfMaximumAngleForRows,
    OPENGRID_OPENCONNECT_SHELF_CONFIGURATION,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridOpenConnectShelfDefinition,
    unitLabelFor,
    type ParameterField as ParameterFieldDefinition,
  } from '../../../../features/cad/model-catalog'
  import { translate } from '../../../../i18n'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let {
    locale,
    rawParameters,
    fieldErrors,
    onInputChange,
  }: ComponentPanelProps = $props()

  function rowsForMaximumAngle(): number {
    const rawRows = rawParameters.rows
    const rows = Number(rawRows)
    const configuration = OPENGRID_OPENCONNECT_SHELF_CONFIGURATION
    if (
      Number.isSafeInteger(rows) &&
      rows >= configuration.minGridCount &&
      rows <= configuration.maxGridCount
    ) {
      return rows
    }
    return configuration.defaultRows
  }

  function fieldForDisplay(
    field: ParameterFieldDefinition,
    maximumAngle: number,
  ): ParameterFieldDefinition {
    if (field.key !== 'angle') return field
    return {
      ...field,
      max: maximumAngle,
      sliderMax: maximumAngle,
    }
  }

  let rows = $derived(rowsForMaximumAngle())
  let maximumAngle = $derived(openGridOpenConnectShelfMaximumAngleForRows(rows))
  let parameterSchema = $derived(
    opengridOpenConnectShelfDefinition.parameterSchema.map((field) =>
      fieldForDisplay(field, maximumAngle),
    ),
  )
</script>

<div class="grid gap-3">
  <p
    class="m-0 text-sm leading-6 text-muted"
    data-testid="opengrid-openconnect-shelf-help"
  >
    {translate(locale, 'panel.openConnectShelf.description')}
  </p>
  <p
    class="m-0 rounded-lg border border-border-card bg-page px-3 py-2 text-sm text-muted"
    data-testid="opengrid-openconnect-shelf-angle-limit"
  >
    {translate(locale, 'panel.openConnectShelf.maximumAngle', {
      rows,
      maximum: maximumAngle,
    })}
  </p>
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    {#each parameterSchema as field (field.key)}
      {@const value = rawParameters[field.key] ?? String(field.defaultValue)}
      <ParameterField
        {locale}
        label={displayParameterLabel(field, locale)}
        unit={unitLabelFor(locale, field.unit)}
        changed={value !== String(field.defaultValue)}
        error={fieldErrors[field.key]}
        errorId={`${field.key}-error`}
        onRestore={() => onInputChange(field.key, String(field.defaultValue))}
      >
        <ParameterControl
          {locale}
          {field}
          {value}
          error={fieldErrors[field.key]}
          onChange={(nextValue) => onInputChange(field.key, nextValue)}
        />
      </ParameterField>
    {/each}
  </fieldset>
</div>

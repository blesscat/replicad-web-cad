<script lang="ts">
  import { HEXAGONAL_COLUMN_CONFIGURATION } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    hexagonalColumnDefinition,
  } from '../../../../features/cad/model-catalog'
  import ParameterField from '../ParameterField.svelte'
  import ParameterControl from '../ParameterControl.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  const defaultOrientation = HEXAGONAL_COLUMN_CONFIGURATION.defaultOrientation

  function handleOrientationChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return
    onInputChange('orientation', event.currentTarget.value)
  }
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="m-0 text-sm text-muted">
    長度包含兩端固定 0.2 mm 過渡；長度可用 slider 調整 1–200 mm 或輸入 1–500
    mm，間隙可用 slider 調整 1–10 mm 或輸入 1–99 mm；支數沿 Y
    軸排列，預設躺下（長軸沿 X），也可切換站立（長軸沿 Z）；預設柱間隙為 1
    mm，不融合。
  </p>
  {#each hexagonalColumnDefinition.parameterSchema as field (field.key)}
    {@const value = rawParameters[field.key] ?? String(field.defaultValue)}
    <ParameterField
      label={displayParameterLabel(field)}
      unit={field.unit}
      changed={value !== String(field.defaultValue)}
      error={fieldErrors[field.key]}
      errorId={`${field.key}-error`}
      onRestore={() => onInputChange(field.key, String(field.defaultValue))}
    >
      <ParameterControl
        {field}
        {value}
        error={fieldErrors[field.key]}
        onChange={(nextValue) => onInputChange(field.key, nextValue)}
      />
    </ParameterField>
  {/each}
  <ParameterField
    label="擺放方向"
    unit="orientation"
    changed={(rawParameters.orientation ?? defaultOrientation) !==
      defaultOrientation}
    error={fieldErrors.orientation}
    errorId="orientation-error"
    onRestore={() => onInputChange('orientation', defaultOrientation)}
  >
    <select
      class="w-full min-w-0 rounded border border-surface-300 bg-surface-50 px-2 py-1.5 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-50"
      aria-label="擺放方向"
      value={rawParameters.orientation ?? defaultOrientation}
      onchange={handleOrientationChange}
    >
      <option value="lying">躺下（長軸 X）</option>
      <option value="standing">站立（長軸 Z）</option>
    </select>
  </ParameterField>
</fieldset>

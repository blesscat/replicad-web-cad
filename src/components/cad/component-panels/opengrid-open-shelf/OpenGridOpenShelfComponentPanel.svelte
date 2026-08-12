<script lang="ts">
  import {
    displayParameterLabel,
    opengridOpenShelfDefinition,
  } from '../../../../features/cad/model-catalog'
  import {
    openGridOpenShelfCellSpaceFor,
    OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
    validateOpenGridOpenShelfParameters,
    type OpenGridOpenShelfParameters,
  } from '../../../../cad-contract/units'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  const OPEN_SHELF_PARAMETER_KEYS = [
    'x',
    'y',
    'height',
    'cellX',
    'cellZ',
    'angle',
  ] as const satisfies readonly (keyof OpenGridOpenShelfParameters)[]

  function parametersForDisplay(): OpenGridOpenShelfParameters | null {
    if (Object.keys(fieldErrors).length > 0) return null
    const candidate: OpenGridOpenShelfParameters = {
      ...OPENGRID_OPEN_SHELF_DEFAULT_PARAMETERS,
    }
    for (const key of OPEN_SHELF_PARAMETER_KEYS) {
      const rawValue = rawParameters[key]
      if (rawValue === undefined || rawValue.trim() === '') continue
      const value = Number(rawValue)
      if (!Number.isFinite(value)) return null
      candidate[key] = value
    }
    const validation = validateOpenGridOpenShelfParameters(candidate)
    return validation.valid ? validation.value : null
  }

  function formatDimension(value: number): string {
    return Number(value.toFixed(2)).toString()
  }

  let cellSpace = $derived.by(() => {
    const parameters = parametersForDisplay()
    if (!parameters) return null
    return {
      parameters,
      space: openGridOpenShelfCellSpaceFor(parameters),
    }
  })
</script>

<div class="grid gap-3">
  <p
    class="m-0 text-sm leading-6 text-muted"
    data-testid="opengrid-open-shelf-help"
  >
    整體高度包含所有板厚，底板保持水平；前方開口與整個格架向上仰，仰角可設
    0–75°。每格深度都延伸到後方背板；若總高不足以支撐目前仰角，會顯示輸入錯誤。
  </p>
  {#if cellSpace}
    <div
      class="grid gap-1 rounded-lg border border-border-card bg-page px-3 py-2 text-sm text-muted"
      data-testid="opengrid-open-shelf-cell-space"
    >
      <p class="m-0 font-[650] text-ink">每格淨空（平行格層）</p>
      <p class="m-0">
        寬 {formatDimension(cellSpace.space.width)} × 深
        {formatDimension(cellSpace.space.depth)} mm；{cellSpace.parameters
          .cellX} 欄 ×
        {cellSpace.parameters.cellZ} 層
      </p>
      {#if cellSpace.parameters.angle > 0}
        <p class="m-0">
          底部斜角區（不計入 Z 格數）：前
          {formatDimension(cellSpace.space.wedge.front)} → 後
          {formatDimension(cellSpace.space.wedge.rear)} mm。
        </p>
      {/if}
      <p class="m-0">
        平行格層 {cellSpace.parameters.cellZ} 層：高
        {formatDimension(cellSpace.space.regular.front)} mm（各層與頂板平行）。
      </p>
    </div>
  {/if}
  <fieldset class="m-0 grid gap-3 border-0 p-0">
    {#each opengridOpenShelfDefinition.parameterSchema as field (field.key)}
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
  </fieldset>
</div>

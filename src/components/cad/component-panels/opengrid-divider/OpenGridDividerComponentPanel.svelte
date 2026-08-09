<script lang="ts">
  import {
    classifyOpenGridDividerShape,
    openGridDividerAxisFor,
    openGridDividerPlanDimensionsFor,
    validateOpenGridDividerParameters,
  } from '../../../../cad-contract/units'
  import {
    displayParameterLabel,
    opengridDividerDefinition,
  } from '../../../../features/cad/model-catalog'
  import ParameterControl from '../ParameterControl.svelte'
  import ParameterField from '../ParameterField.svelte'
  import type { ComponentPanelProps } from '../types'

  let { rawParameters, fieldErrors, onInputChange }: ComponentPanelProps =
    $props()

  const shapeLabels = {
    straight: '一字型',
    L: 'L 型',
    T: 'T 型',
    cross: '十字型',
  } as const

  let preview = $derived.by(() => {
    const candidate = {
      left: Number(rawParameters.left),
      right: Number(rawParameters.right),
      up: Number(rawParameters.up),
      down: Number(rawParameters.down),
      height: Number(rawParameters.height),
    }
    const validation = validateOpenGridDividerParameters(candidate)
    if (!validation.valid) return null

    const shape = classifyOpenGridDividerShape(validation.value)
    const dimensions = openGridDividerPlanDimensionsFor(validation.value)
    return {
      shapeLabel: shapeLabels[shape],
      axis: openGridDividerAxisFor(validation.value),
      dimensions,
    }
  })
</script>

<fieldset class="m-0 grid gap-3 border-0 p-0">
  <p class="m-0 text-sm text-muted">
    自製底座半格 7 mm、整格 14 mm；牆寬固定 5 mm，底部自動加入 Ø5 × 3 mm 定位柱
    （中心距 28 mm），側邊做 2.5 mm 圓角、頂部做 1 mm 圓角。每次可調整 0.5
    格，至少開啟兩個方向。
  </p>

  {#if preview}
    <div
      class="grid gap-1 rounded-lg border border-border-card bg-page p-3 text-sm"
      data-testid="opengrid-divider-summary"
    >
      <strong>{preview.shapeLabel}</strong>
      <span>
        {#if preview.axis}
          {preview.axis === 'horizontal' ? '水平' : '垂直'}中心線
        {:else}
          四方向分支
        {/if}
      </span>
      <span>
        平面 {preview.dimensions.width} × {preview.dimensions.depth} mm，高度
        {preview.dimensions.wallHeight} mm
      </span>
      <span>含定位柱後總高 {preview.dimensions.totalHeight} mm</span>
    </div>
  {/if}

  {#each opengridDividerDefinition.parameterSchema as field (field.key)}
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

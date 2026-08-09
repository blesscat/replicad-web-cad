<script lang="ts">
  import type {
    ModelId,
    ModelParameterValues,
    OpenGridParameters,
    OpenGridSnapParameters,
  } from '../../../cad-contract/units'
  import BoxComponentPanel from './box/BoxComponentPanel.svelte'
  import BoxNormalComponentPanel from './box-normal/BoxNormalComponentPanel.svelte'
  import HexagonalColumnComponentPanel from './hexagonal-column/HexagonalColumnComponentPanel.svelte'
  import HswCellComponentPanel from './hsw-cell/HswCellComponentPanel.svelte'
  import ModularGridBaseComponentPanel from './modular-grid-base/ModularGridBaseComponentPanel.svelte'
  import OpenGridComponentPanel from './opengrid/OpenGridComponentPanel.svelte'
  import OpenGridDividerComponentPanel from './opengrid-divider/OpenGridDividerComponentPanel.svelte'
  import OpenGridStackableBoxComponentPanel from './opengrid-stackable-box/OpenGridStackableBoxComponentPanel.svelte'
  import OpenGridSnapComponentPanel from './opengrid-snap/OpenGridSnapComponentPanel.svelte'
  import OpenGridPillarComponentPanel from './opengrid-pillar/OpenGridPillarComponentPanel.svelte'
  import type { ComponentPanelProps } from './types'

  type Props = ComponentPanelProps & {
    modelId: ModelId
    parameters: ModelParameterValues
    onOpenGridParametersChange: (parameters: OpenGridParameters) => void
    onOpenGridDimensionCalculationInvalid: () => void
  }

  let {
    modelId,
    parameters,
    rawParameters,
    fieldErrors,
    onInputChange,
    onOpenGridParametersChange,
    onOpenGridDimensionCalculationInvalid,
  }: Props = $props()
</script>

{#if modelId === 'box'}
  <BoxComponentPanel {rawParameters} {fieldErrors} {onInputChange} />
{:else if modelId === 'modular-grid-base'}
  <ModularGridBaseComponentPanel
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'box-normal'}
  <BoxNormalComponentPanel {rawParameters} {fieldErrors} {onInputChange} />
{:else if modelId === 'hsw-cell'}
  <HswCellComponentPanel {rawParameters} {fieldErrors} {onInputChange} />
{:else if modelId === 'hexagonal-column'}
  <HexagonalColumnComponentPanel
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-pillar'}
  <OpenGridPillarComponentPanel {rawParameters} {fieldErrors} {onInputChange} />
{:else if modelId === 'opengrid'}
  <OpenGridComponentPanel
    parameters={parameters as OpenGridParameters}
    {fieldErrors}
    onParametersChange={onOpenGridParametersChange}
    onDimensionCalculationInvalid={onOpenGridDimensionCalculationInvalid}
  />
{:else if modelId === 'opengrid-divider'}
  <OpenGridDividerComponentPanel
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-stackable-box'}
  <OpenGridStackableBoxComponentPanel
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-snap'}
  <OpenGridSnapComponentPanel
    parameters={parameters as OpenGridSnapParameters}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{/if}

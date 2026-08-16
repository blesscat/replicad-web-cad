<script lang="ts">
  import type {
    ModelId,
    ModelParameterValues,
    OpenGridParameters,
    OpenGridSnapParameters,
  } from '../../../cad-contract/units'
  import BoxComponentPanel from './box/BoxComponentPanel.svelte'
  import HexagonalColumnComponentPanel from './hexagonal-column/HexagonalColumnComponentPanel.svelte'
  import HswCellComponentPanel from './hsw-cell/HswCellComponentPanel.svelte'
  import ModularGridBaseComponentPanel from './modular-grid-base/ModularGridBaseComponentPanel.svelte'
  import OpenGridComponentPanel from './opengrid/OpenGridComponentPanel.svelte'
  import OpenGridDividerComponentPanel from './opengrid-divider/OpenGridDividerComponentPanel.svelte'
  import OpenGridStackableBoxComponentPanel from './opengrid-stackable-box/OpenGridStackableBoxComponentPanel.svelte'
  import OpenGridStackableCylinderComponentPanel from './opengrid-stackable-cylinder/OpenGridStackableCylinderComponentPanel.svelte'
  import OpenGridSnapComponentPanel from './opengrid-snap/OpenGridSnapComponentPanel.svelte'
  import OpenGridPillarComponentPanel from './opengrid-pillar/OpenGridPillarComponentPanel.svelte'
  import type { OpenGridSystemContext } from '../../../features/cad/system-entry-context'
  import OpenGridOpenShelfComponentPanel from './opengrid-open-shelf/OpenGridOpenShelfComponentPanel.svelte'
  import type { ComponentPanelProps } from './types'

  type Props = ComponentPanelProps & {
    modelId: ModelId
    parameters: ModelParameterValues
    systemContext?: OpenGridSystemContext
    onOpenGridParametersChange: (parameters: OpenGridParameters) => void
    onOpenGridDimensionCalculationInvalid: () => void
  }

  let {
    locale,
    modelId,
    parameters,
    systemContext,
    rawParameters,
    fieldErrors,
    onInputChange,
    onOpenGridParametersChange,
    onOpenGridDimensionCalculationInvalid,
  }: Props = $props()
</script>

{#if modelId === 'box'}
  <BoxComponentPanel {locale} {rawParameters} {fieldErrors} {onInputChange} />
{:else if modelId === 'modular-grid-base'}
  <ModularGridBaseComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'hsw-cell'}
  <HswCellComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'hexagonal-column'}
  <HexagonalColumnComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-pillar'}
  <OpenGridPillarComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid'}
  <OpenGridComponentPanel
    {locale}
    parameters={parameters as OpenGridParameters}
    {systemContext}
    {fieldErrors}
    onParametersChange={onOpenGridParametersChange}
    onDimensionCalculationInvalid={onOpenGridDimensionCalculationInvalid}
  />
{:else if modelId === 'opengrid-divider'}
  <OpenGridDividerComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-stackable-box'}
  <OpenGridStackableBoxComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-stackable-cylinder'}
  <OpenGridStackableCylinderComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-snap'}
  <OpenGridSnapComponentPanel
    {locale}
    parameters={parameters as OpenGridSnapParameters}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'opengrid-open-shelf'}
  <OpenGridOpenShelfComponentPanel
    {locale}
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{/if}

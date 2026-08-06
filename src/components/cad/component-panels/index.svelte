<script lang="ts">
  import type { ModelId } from '../../../cad-contract/units'
  import BoxComponentPanel from './box/BoxComponentPanel.svelte'
  import HexagonalColumnComponentPanel from './hexagonal-column/HexagonalColumnComponentPanel.svelte'
  import HswCellComponentPanel from './hsw-cell/HswCellComponentPanel.svelte'
  import ModularGridBaseComponentPanel from './modular-grid-base/ModularGridBaseComponentPanel.svelte'
  import type { ComponentPanelProps } from './types'

  type Props = ComponentPanelProps & {
    modelId: ModelId
  }

  let { modelId, rawParameters, fieldErrors, onInputChange }: Props = $props()
</script>

{#if modelId === 'box'}
  <BoxComponentPanel {rawParameters} {fieldErrors} {onInputChange} />
{:else if modelId === 'modular-grid-base'}
  <ModularGridBaseComponentPanel
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{:else if modelId === 'hsw-cell'}
  <HswCellComponentPanel {rawParameters} {fieldErrors} {onInputChange} />
{:else if modelId === 'hexagonal-column'}
  <HexagonalColumnComponentPanel
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{/if}

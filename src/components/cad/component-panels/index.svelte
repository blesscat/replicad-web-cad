<script lang="ts">
  import type { ModelId } from '../../../cad-contract/units'
  import BoxComponentPanel from './box/BoxComponentPanel.svelte'
  import ModularGridBaseComponentPanel from './modular-grid-base/ModularGridBaseComponentPanel.svelte'
  import type { ComponentPanelProps } from './types'

  type Props = ComponentPanelProps & {
    modelId: ModelId
  }

  let { modelId, rawParameters, fieldErrors, onInputChange }: Props = $props()
</script>

{#if modelId === 'box'}
  <BoxComponentPanel {rawParameters} {fieldErrors} {onInputChange} />
{:else}
  <ModularGridBaseComponentPanel
    {rawParameters}
    {fieldErrors}
    {onInputChange}
  />
{/if}

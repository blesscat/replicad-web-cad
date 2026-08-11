<script lang="ts">
  import { onMount } from 'svelte'
  import type { ModelId } from '../../cad-contract/units'
  import {
    parseSystemContext,
    systemContextForModel,
    systemContextLabel,
    type OpenGridSystemContext,
  } from '../../features/cad/system-entry-context'

  type Props = {
    modelId: ModelId
  }

  let { modelId }: Props = $props()
  let systemContext = $state<OpenGridSystemContext | undefined>(undefined)

  onMount(() => {
    systemContext = systemContextForModel(
      modelId,
      parseSystemContext(window.location.search),
    )
  })
</script>

{#if systemContext}
  <p
    class="m-0 text-sm font-semibold text-muted"
    data-testid="cad-system-context"
  >
    目前系統：{systemContextLabel(systemContext)}
  </p>
{/if}

<script lang="ts">
  import { onMount } from 'svelte'
  import type { ModelId } from '../../cad-contract/units'
  import {
    parseSystemContext,
    systemContextForModel,
    type OpenGridSystemContext,
  } from '../../features/cad/system-entry-context'
  import { translate, type Locale } from '../../i18n'

  type Props = {
    modelId: ModelId
    locale: Locale
  }

  let { modelId, locale }: Props = $props()
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
    class="m-0 text-sm font-semibold text-muted-foreground"
    data-testid="cad-system-context"
  >
    {translate(locale, 'cad.system.current', {
      name: translate(locale, `models.context.${systemContext}`),
    })}
  </p>
{/if}

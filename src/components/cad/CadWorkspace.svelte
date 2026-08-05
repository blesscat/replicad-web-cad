<script lang="ts">
  import { onMount } from 'svelte'
  import type { ModelId, ModelParameterKey } from '../../cad-contract/units'
  import type { ExportFormat } from '../../features/cad/download'
  import CadViewport from '../../features/cad/viewport/CadViewport.svelte'
  import CadProgressIndicator from './CadProgressIndicator.svelte'
  import CadWorkspacePanel from './CadWorkspacePanel.svelte'
  import {
    createCadWorkspaceController,
    type CadWorkspaceController,
    type CadWorkspaceControllerSnapshot,
  } from './workspace/createCadWorkspaceController'

  type Props = {
    modelId: ModelId
  }

  let { modelId }: Props = $props()
  let snapshot = $state<CadWorkspaceControllerSnapshot | null>(null)
  let controller: CadWorkspaceController | null = null

  onMount(() => {
    controller = createCadWorkspaceController(modelId, (nextSnapshot) => {
      snapshot = nextSnapshot
    })

    return () => {
      controller?.dispose()
      controller = null
    }
  })

  function handleInputChange(key: ModelParameterKey, value: string): void {
    controller?.onInputChange(key, value)
  }

  function handleExport(format: ExportFormat): void {
    controller?.onExport(format)
  }

  function handleRetry(): void {
    controller?.onRetry()
  }
</script>

{#if snapshot}
  <div
    class="mt-6 grid items-start grid-cols-[minmax(220px,280px)_minmax(0,1fr)] gap-4 max-cad:grid-cols-1"
    data-testid="cad-workspace"
  >
    <CadWorkspacePanel
      state={snapshot.state}
      modelId={snapshot.modelId}
      rawParameters={snapshot.rawParameters}
      fieldErrors={snapshot.fieldErrors}
      status={snapshot.status}
      canExport={snapshot.canExport}
      onInputChange={handleInputChange}
      onExport={handleExport}
      onRetry={handleRetry}
    />
    <CadViewport
      mesh={snapshot.state.committed?.mesh ?? null}
      parameters={snapshot.state.committed?.parameters ?? null}
      stale={snapshot.state.stale}
    />
    {#if snapshot.progress}
      <CadProgressIndicator progress={snapshot.progress} />
    {/if}
  </div>
{/if}

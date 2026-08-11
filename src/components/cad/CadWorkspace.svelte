<script lang="ts">
  import { onMount } from 'svelte'
  import type {
    ModelId,
    ModelParameterKey,
    OpenGridParameters,
  } from '../../cad-contract/units'
  import type { ExportFormat } from '../../features/cad/download'
  import {
    createComponentParameterStore,
    type ComponentParameterStore,
  } from '../../features/cad/parameters'
  import CadViewport from '../../features/cad/viewport/CadViewport.svelte'
  import {
    viewportPresentationForSearch,
    type CadViewportPresentation,
  } from '../../features/cad/viewport/presentation'
  import {
    parseSystemContext,
    systemContextForModel,
    type OpenGridSystemContext,
  } from '../../features/cad/system-entry-context'
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
  let resetVersion = $state(0)
  let presentation = $state<CadViewportPresentation>('workspace')
  let systemContext = $state<OpenGridSystemContext | undefined>(undefined)
  let controller: CadWorkspaceController | null = null
  let parameterStore: ComponentParameterStore | null = null

  onMount(() => {
    presentation = viewportPresentationForSearch(window.location.search)
    systemContext = systemContextForModel(
      modelId,
      parseSystemContext(window.location.search),
    )
    parameterStore = createComponentParameterStore({ systemContext })
    controller = createCadWorkspaceController(
      modelId,
      (nextSnapshot) => {
        snapshot = nextSnapshot
      },
      { parameterStore, systemContext },
    )

    return () => {
      controller?.dispose()
      controller = null
      parameterStore?.dispose()
      parameterStore = null
    }
  })

  function handleInputChange(key: ModelParameterKey, value: string): void {
    controller?.onInputChange(key, value)
  }

  function handleOpenGridParametersChange(
    parameters: OpenGridParameters,
  ): void {
    controller?.onOpenGridParametersChange(parameters)
  }

  function handleOpenGridDimensionCalculationInvalid(): void {
    controller?.onOpenGridDimensionCalculationInvalid()
  }

  function handleExport(format: ExportFormat): void {
    controller?.onExport(format)
  }

  function handleRetry(): void {
    controller?.onRetry()
  }

  function handleRestoreDefaults(): void {
    controller?.onRestoreDefaults()
    resetVersion += 1
  }
</script>

{#if snapshot}
  <div
    class="mt-6 grid items-start grid-cols-[minmax(220px,320px)_minmax(0,1fr)] gap-4 max-cad:grid-cols-1"
    data-testid="cad-workspace"
  >
    <CadWorkspacePanel
      state={snapshot.state}
      modelId={snapshot.modelId}
      parameters={snapshot.state.input}
      rawParameters={snapshot.rawParameters}
      fieldErrors={snapshot.fieldErrors}
      canExport={snapshot.canExport}
      onInputChange={handleInputChange}
      onOpenGridParametersChange={handleOpenGridParametersChange}
      onOpenGridDimensionCalculationInvalid={handleOpenGridDimensionCalculationInvalid}
      onExport={handleExport}
      onRetry={handleRetry}
      {resetVersion}
      onRestoreDefaults={handleRestoreDefaults}
    />
    <CadViewport
      mesh={snapshot.state.committed?.mesh ?? null}
      modelRevision={snapshot.state.committed?.revision ?? null}
      parameters={snapshot.state.committed?.parameters ?? null}
      stale={snapshot.state.stale}
      {presentation}
    />
    {#if snapshot.progress}
      <CadProgressIndicator progress={snapshot.progress} />
    {/if}
  </div>
{/if}

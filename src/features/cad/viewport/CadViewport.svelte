<script lang="ts">
  import { onMount } from 'svelte'
  import { Canvas } from '@threlte/core'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import type { ModelParameterValues } from '../../../cad-contract/units'
  import CadViewportScene from './CadViewportScene.svelte'

  type Props = {
    mesh: MeshSnapshot | null
    modelRevision: string | null
    parameters: ModelParameterValues | null
    stale: boolean
  }

  let { mesh, modelRevision, parameters, stale }: Props = $props()
  let webglSupported = $state(true)

  function canCreateWebGLContext(): boolean {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
    )
  }

  onMount(() => {
    webglSupported = canCreateWebGLContext()
  })
</script>

<div
  class={`viewport relative h-[min(520px,calc(100dvh-16rem))] self-start overflow-hidden rounded-2xl border max-cad:h-[520px] ${stale ? 'border-stale' : 'border-border-card'} bg-viewport`}
  data-testid="cad-viewport"
  role="img"
  aria-label="3D CAD 預覽"
>
  <div class="viewport-surface">
    {#if !webglSupported}
      <div
        class="flex h-full items-center justify-center text-muted"
        role="alert"
      >
        無法建立 3D 預覽，請確認瀏覽器支援 WebGL。
      </div>
    {:else if mesh && modelRevision}
      <!-- Threlte owns the canvas lifecycle and Three.js render loop. -->
      <Canvas>
        <CadViewportScene {mesh} {modelRevision} {parameters} />
      </Canvas>
    {:else}
      <div class="flex h-full items-center justify-center text-muted">
        尚未有可預覽的模型。
      </div>
    {/if}
  </div>
  {#if stale}
    <span
      class="absolute bottom-4 left-4 rounded-full border border-stale bg-stale-background px-[0.7rem] py-[0.35rem] text-[0.85rem] text-stale-text"
    >
      預覽與目前輸入不同步
    </span>
  {/if}
</div>

<style>
  .viewport {
    --viewport-radius: 2rem;
  }

  .viewport-surface {
    height: 100%;
    overflow: hidden;
    border-radius: calc(var(--viewport-radius) - 1px);
    isolation: isolate;
  }

  .viewport :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
    border-radius: calc(var(--viewport-radius) - 1px);
  }
</style>

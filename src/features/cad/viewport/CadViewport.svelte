<script lang="ts">
  import { onMount } from 'svelte'
  import { Canvas } from '@threlte/core'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import type { ModelParameterValues } from '../../../cad-contract/units'
  import CadViewportScene from './CadViewportScene.svelte'

  type Props = {
    mesh: MeshSnapshot | null
    parameters: ModelParameterValues | null
    stale: boolean
  }

  let { mesh, parameters, stale }: Props = $props()
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
  class={`viewport relative h-[520px] self-start overflow-hidden rounded-2xl border ${stale ? 'border-stale' : 'border-border-card'} bg-viewport`}
  data-testid="cad-viewport"
  role="img"
  aria-label="3D CAD 預覽"
>
  {#if !webglSupported}
    <div
      class="flex h-full items-center justify-center text-muted"
      role="alert"
    >
      無法建立 3D 預覽，請確認瀏覽器支援 WebGL。
    </div>
  {:else if mesh}
    <div class="h-full">
      <!-- Threlte owns the canvas lifecycle and Three.js render loop. -->
      <Canvas>
        <CadViewportScene {mesh} {parameters} />
      </Canvas>
    </div>
  {:else}
    <div class="flex h-full items-center justify-center text-muted">
      尚未有可預覽的模型。
    </div>
  {/if}
  {#if stale}
    <span
      class="absolute bottom-4 left-4 rounded-full border border-stale bg-stale-background px-[0.7rem] py-[0.35rem] text-[0.85rem] text-stale-text"
    >
      預覽與目前輸入不同步
    </span>
  {/if}
</div>

<style>
  .viewport :global(canvas) {
    height: 100% !important;
  }
</style>

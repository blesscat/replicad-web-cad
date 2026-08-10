<script lang="ts">
  import { T } from '@threlte/core'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import type { ModelParameterValues } from '../../../cad-contract/units'
  import {
    createDimensionAnnotations,
    type DimensionAnnotation,
  } from './dimensions'
  import DimensionAnnotationView from './DimensionAnnotationView.svelte'
  import type { CadViewportTheme } from './theme'

  type Props = {
    mesh: MeshSnapshot
    parameters: ModelParameterValues | null
    theme: CadViewportTheme
  }

  function getDimensionAnnotations(
    mesh: MeshSnapshot,
    parameters: ModelParameterValues | null,
  ): DimensionAnnotation[] {
    if (!parameters) return []
    return createDimensionAnnotations(mesh.bounds, parameters)
  }

  let { mesh, parameters, theme }: Props = $props()
  let annotations = $derived(getDimensionAnnotations(mesh, parameters))
</script>

{#if annotations.length > 0}
  <T.Group>
    {#each annotations as annotation (annotation.key)}
      <DimensionAnnotationView {annotation} {theme} />
    {/each}
  </T.Group>
{/if}

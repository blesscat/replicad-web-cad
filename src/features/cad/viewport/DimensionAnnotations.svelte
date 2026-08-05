<script lang="ts">
  import { T } from '@threlte/core'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import type { ModelParameterValues } from '../../../cad-contract/units'
  import {
    createDimensionAnnotations,
    type DimensionAnnotation,
  } from './dimensions'
  import DimensionAnnotationView from './DimensionAnnotationView.svelte'

  type Props = {
    mesh: MeshSnapshot
    parameters: ModelParameterValues | null
  }

  let { mesh, parameters }: Props = $props()
  let annotations = $derived<DimensionAnnotation[]>(
    parameters ? createDimensionAnnotations(mesh.bounds, parameters) : [],
  )
</script>

{#if annotations.length > 0}
  <T.Group>
    {#each annotations as annotation (annotation.key)}
      <DimensionAnnotationView {annotation} />
    {/each}
  </T.Group>
{/if}

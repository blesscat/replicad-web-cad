<script lang="ts">
  import { HTML } from '@threlte/extras'
  import { T } from '@threlte/core'
  import type { DimensionAnnotation } from './dimensions'
  import AnnotationLine from './AnnotationLine.svelte'

  type Props = {
    annotation: DimensionAnnotation
  }

  const Z_INDEX_RANGE: [number, number] = [2, 1]
  const ANNOTATION_LABEL_CLASS =
    'pointer-events-none whitespace-nowrap px-1 text-[0.68rem] font-medium text-[#7f8a95]'

  let { annotation }: Props = $props()
</script>

<T.Group>
  {#each annotation.extensionLines as points, index (`${annotation.key}-extension-${index}`)}
    <AnnotationLine {points} opacity={0.34} />
  {/each}
  <AnnotationLine points={annotation.dimensionLine} />
  {#each annotation.endTicks as points, index (`${annotation.key}-tick-${index}`)}
    <AnnotationLine {points} opacity={0.46} />
  {/each}
  <HTML
    center
    pointerEvents="none"
    position={annotation.labelPosition}
    zIndexRange={Z_INDEX_RANGE}
  >
    <span aria-label={annotation.ariaLabel} class={ANNOTATION_LABEL_CLASS}>
      {annotation.valueLabel}
    </span>
  </HTML>
</T.Group>

<script lang="ts">
  import { HTML } from '@threlte/extras'
  import { T } from '@threlte/core'
  import type { DimensionAnnotation } from './dimensions'
  import AnnotationLine from './AnnotationLine.svelte'
  import type { CadViewportTheme } from './theme'

  type Props = {
    annotation: DimensionAnnotation
    theme: CadViewportTheme
  }

  const Z_INDEX_RANGE: [number, number] = [2, 1]
  const ANNOTATION_LABEL_CLASS =
    'pointer-events-none whitespace-nowrap px-1 text-[0.68rem] font-medium'

  let { annotation, theme }: Props = $props()
</script>

<T.Group>
  {#each annotation.extensionLines as points, index (`${annotation.key}-extension-${index}`)}
    <AnnotationLine {points} color={theme.annotation} opacity={0.34} />
  {/each}
  <AnnotationLine points={annotation.dimensionLine} color={theme.annotation} />
  {#each annotation.endTicks as points, index (`${annotation.key}-tick-${index}`)}
    <AnnotationLine {points} color={theme.annotation} opacity={0.46} />
  {/each}
  <HTML
    center
    pointerEvents="none"
    position={annotation.labelPosition}
    zIndexRange={Z_INDEX_RANGE}
  >
    <span
      aria-label={annotation.ariaLabel}
      class={ANNOTATION_LABEL_CLASS}
      style:color={theme.annotationLabel}
    >
      {annotation.valueLabel}
    </span>
  </HTML>
</T.Group>

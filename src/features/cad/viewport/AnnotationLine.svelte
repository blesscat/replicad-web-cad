<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import type { LineSegment } from './dimensions'

  type Props = {
    points: LineSegment
    opacity?: number
  }

  const ANNOTATION_COLOR = '#8d98a3'

  let { points, opacity = 0.58 }: Props = $props()

  function createGeometry(segment: LineSegment): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array([...segment[0], ...segment[1]])
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }

  function createMaterial(alpha: number): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({
      color: ANNOTATION_COLOR,
      depthTest: false,
      opacity: alpha,
      transparent: alpha < 1,
    })
  }

  let geometry = $derived(createGeometry(points))
  let material = $derived(createMaterial(opacity))

  $effect(() => {
    const currentGeometry = geometry
    return () => currentGeometry.dispose()
  })

  $effect(() => {
    const currentMaterial = material
    return () => currentMaterial.dispose()
  })
</script>

<T.LineSegments {geometry} {material} dispose={false} renderOrder={2} />

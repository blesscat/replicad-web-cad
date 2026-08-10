<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import type { LineSegment } from './dimensions'

  type Props = {
    points: LineSegment
    color: string
    opacity?: number
  }

  let { points, color, opacity = 0.58 }: Props = $props()

  function createGeometry(segment: LineSegment): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array([...segment[0], ...segment[1]])
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }

  function createMaterial(
    alpha: number,
    lineColor: string,
  ): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({
      color: lineColor,
      depthTest: false,
      opacity: alpha,
      transparent: alpha < 1,
    })
  }

  let geometry = $derived(createGeometry(points))
  let material = $derived(createMaterial(opacity, color))

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

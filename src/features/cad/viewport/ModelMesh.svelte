<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import { CAD_VIEWPORT_CONFIG } from './config'

  type Props = {
    mesh: MeshSnapshot
  }

  let { mesh }: Props = $props()

  function createGeometry(snapshot: MeshSnapshot): THREE.BufferGeometry {
    const nextGeometry = new THREE.BufferGeometry()
    nextGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(snapshot.positions), 3),
    )
    nextGeometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(snapshot.normals), 3),
    )
    nextGeometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(snapshot.indices), 1),
    )
    nextGeometry.computeBoundingSphere()
    return nextGeometry
  }

  function createMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: CAD_VIEWPORT_CONFIG.modelColor,
      metalness: 0.18,
      roughness: 0.42,
    })
  }

  let geometry = $derived(createGeometry(mesh))
  let material = $derived(createMaterial())

  $effect(() => {
    const currentGeometry = geometry
    return () => currentGeometry.dispose()
  })

  $effect(() => {
    const currentMaterial = material
    return () => currentMaterial.dispose()
  })
</script>

<T.Mesh {geometry} {material} dispose={false} />

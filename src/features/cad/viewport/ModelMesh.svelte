<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import { CAD_VIEWPORT_CONFIG } from './config'
  import type { CadViewportTheme } from './theme'
  import {
    createViewportEdgeGeometry,
    createViewportEdgeMaterial,
  } from './edge-lines'

  type Props = {
    mesh: MeshSnapshot
    theme: CadViewportTheme
  }

  let { mesh, theme }: Props = $props()

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
      emissive: CAD_VIEWPORT_CONFIG.modelColor,
      emissiveIntensity: CAD_VIEWPORT_CONFIG.modelEmissiveIntensity,
      metalness: 0.18,
      roughness: 0.42,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
  }

  let geometry = $derived(createGeometry(mesh))
  let material = $derived(createMaterial())
  let edgeGeometry = $derived(createViewportEdgeGeometry(geometry))
  let edgeMaterial = $derived(createViewportEdgeMaterial(theme.edge))

  $effect(() => {
    const currentGeometry = geometry
    return () => currentGeometry.dispose()
  })

  $effect(() => {
    const currentMaterial = material
    return () => currentMaterial.dispose()
  })

  $effect(() => {
    const currentEdgeGeometry = edgeGeometry
    return () => currentEdgeGeometry.dispose()
  })

  $effect(() => {
    const currentEdgeMaterial = edgeMaterial
    return () => currentEdgeMaterial.dispose()
  })
</script>

<T.Mesh {geometry} {material} dispose={false} />
<T.LineSegments
  geometry={edgeGeometry}
  material={edgeMaterial}
  renderOrder={1}
  dispose={false}
/>

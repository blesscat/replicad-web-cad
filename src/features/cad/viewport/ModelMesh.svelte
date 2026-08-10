<script lang="ts">
  import { T } from '@threlte/core'
  import * as THREE from 'three'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import { createViewportBaseGeometry } from './base-geometry'
  import { CAD_VIEWPORT_CONFIG } from './config'
  import type { CadViewportTheme } from './theme'
  import { createViewportEdgeMaterial } from './edge-lines'
  import { ViewportEdgePreparation } from './edge-preparation'
  import {
    measureViewportGeometry,
    type ViewportGeometryTiming,
  } from './geometry-timing'

  type Props = {
    mesh: MeshSnapshot
    theme: CadViewportTheme
    onPreparationTiming?: (timing: ViewportGeometryTiming) => void
  }

  let { mesh, theme, onPreparationTiming }: Props = $props()

  function createGeometry(snapshot: MeshSnapshot): THREE.BufferGeometry {
    return measureViewportGeometry(
      'base-geometry',
      () => createViewportBaseGeometry(snapshot),
      onPreparationTiming,
    )
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
  let edgeGeometry = $state<THREE.EdgesGeometry | null>(null)
  let edgeMaterial = $derived(createViewportEdgeMaterial(theme.edge))
  let edgePreparation = new ViewportEdgePreparation({
    onTiming: onPreparationTiming,
  })

  $effect(() => {
    const currentGeometry = geometry
    return () => currentGeometry.dispose()
  })

  $effect(() => {
    const currentMaterial = material
    return () => currentMaterial.dispose()
  })

  $effect(() => {
    const currentGeometry = geometry
    edgePreparation.prepare(currentGeometry, mesh.triangleCount, (prepared) => {
      edgeGeometry = prepared
    })

    return () => {
      edgePreparation.dispose()
      edgeGeometry = null
    }
  })

  $effect(() => {
    const currentEdgeMaterial = edgeMaterial
    return () => currentEdgeMaterial.dispose()
  })
</script>

<T.Mesh {geometry} {material} dispose={false} />
{#if edgeGeometry}
  <T.LineSegments
    geometry={edgeGeometry}
    material={edgeMaterial}
    renderOrder={1}
    dispose={false}
  />
{/if}

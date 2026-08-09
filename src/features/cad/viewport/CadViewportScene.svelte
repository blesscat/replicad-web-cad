<script lang="ts">
  import { T } from '@threlte/core'
  import { Bounds, Gizmo, OrbitControls } from '@threlte/extras'
  import type { OrbitControls as OrbitControlsInstance } from 'three/examples/jsm/controls/OrbitControls.js'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import type { ModelParameterValues } from '../../../cad-contract/units'
  import ModelMesh from './ModelMesh.svelte'
  import DimensionAnnotations from './DimensionAnnotations.svelte'
  import { CAD_VIEWPORT_GIZMO, CAD_VIEWPORT_LIGHTING } from './config'
  import {
    CAD_VIEWPORT_CAMERA,
    CAD_VIEWPORT_GRID_ROTATION,
  } from './coordinates'

  type Props = {
    mesh: MeshSnapshot
    modelRevision: string
    parameters: ModelParameterValues | null
  }

  let { mesh, modelRevision, parameters }: Props = $props()
  let orbitControls = $state<OrbitControlsInstance | undefined>(undefined)
</script>

<T.Color attach="background" args={['#eef2f8']} />
<T.HemisphereLight
  args={[
    CAD_VIEWPORT_LIGHTING.hemisphere.skyColor,
    CAD_VIEWPORT_LIGHTING.hemisphere.groundColor,
    CAD_VIEWPORT_LIGHTING.hemisphere.intensity,
  ]}
  position={CAD_VIEWPORT_LIGHTING.hemisphere.position}
/>
<T.DirectionalLight
  color={CAD_VIEWPORT_LIGHTING.key.color}
  position={CAD_VIEWPORT_LIGHTING.key.position}
  intensity={CAD_VIEWPORT_LIGHTING.key.intensity}
/>
<T.DirectionalLight
  color={CAD_VIEWPORT_LIGHTING.oppositeFill.color}
  position={CAD_VIEWPORT_LIGHTING.oppositeFill.position}
  intensity={CAD_VIEWPORT_LIGHTING.oppositeFill.intensity}
/>
<T.GridHelper
  args={[1000, 20, '#b9c4d7', '#d8deea']}
  rotation={CAD_VIEWPORT_GRID_ROTATION}
/>
<T.PerspectiveCamera
  makeDefault
  position={CAD_VIEWPORT_CAMERA.position}
  up={CAD_VIEWPORT_CAMERA.up}
  fov={CAD_VIEWPORT_CAMERA.fov}
>
  <OrbitControls bind:ref={orbitControls} />
</T.PerspectiveCamera>
{#if orbitControls}
  <Gizmo controls={orbitControls} {...CAD_VIEWPORT_GIZMO} />
{/if}
{#key modelRevision}
  <Bounds margin={1.25} animate={false}>
    <ModelMesh {mesh} />
    <DimensionAnnotations {mesh} {parameters} />
  </Bounds>
{/key}

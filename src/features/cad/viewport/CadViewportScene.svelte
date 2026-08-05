<script lang="ts">
  import { T } from '@threlte/core'
  import { Bounds, OrbitControls } from '@threlte/extras'
  import type { MeshSnapshot } from '../../../cad-contract/messages'
  import type { ModelParameterValues } from '../../../cad-contract/units'
  import ModelMesh from './ModelMesh.svelte'
  import DimensionAnnotations from './DimensionAnnotations.svelte'
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
</script>

<T.Color attach="background" args={['#eef2f8']} />
<T.AmbientLight intensity={1.6} />
<T.DirectionalLight position={[100, 120, 80]} intensity={2.2} />
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
  <OrbitControls />
</T.PerspectiveCamera>
{#key modelRevision}
  <Bounds margin={1.25} animate={false}>
    <ModelMesh {mesh} />
    <DimensionAnnotations {mesh} {parameters} />
  </Bounds>
{/key}

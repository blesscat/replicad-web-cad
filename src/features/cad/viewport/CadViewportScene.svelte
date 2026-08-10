<script lang="ts">
  import { T } from '@threlte/core'
  import {
    Bounds,
    Gizmo,
    OrbitControls,
    type GizmoOptions,
  } from '@threlte/extras'
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
  import type { CadViewportTheme } from './theme'

  type Props = {
    mesh: MeshSnapshot
    modelRevision: string
    parameters: ModelParameterValues | null
    theme: CadViewportTheme
  }

  type ViewportGizmoHandle = {
    set: (options?: GizmoOptions) => ViewportGizmoHandle
    update: (controls?: boolean) => ViewportGizmoHandle
  }

  let { mesh, modelRevision, parameters, theme }: Props = $props()
  let orbitControls = $state<OrbitControlsInstance | undefined>(undefined)
  let viewportGizmo = $state<ViewportGizmoHandle | undefined>(undefined)

  $effect(() => {
    const gizmo = viewportGizmo
    if (!gizmo) return

    gizmo.set({
      ...CAD_VIEWPORT_GIZMO,
      background: {
        ...CAD_VIEWPORT_GIZMO.background,
        color: theme.gizmoBackground,
      },
    })
    gizmo.update()
  })
</script>

<T.Color attach="background" args={[theme.background]} />
<T.HemisphereLight
  args={[
    theme.hemisphereSky,
    theme.hemisphereGround,
    CAD_VIEWPORT_LIGHTING.hemisphere.intensity,
  ]}
  position={CAD_VIEWPORT_LIGHTING.hemisphere.position}
/>
<T.DirectionalLight
  color={theme.keyLight}
  position={CAD_VIEWPORT_LIGHTING.key.position}
  intensity={CAD_VIEWPORT_LIGHTING.key.intensity}
/>
<T.DirectionalLight
  color={theme.oppositeFill}
  position={CAD_VIEWPORT_LIGHTING.oppositeFill.position}
  intensity={CAD_VIEWPORT_LIGHTING.oppositeFill.intensity}
/>
<T.GridHelper
  args={[1000, 20, theme.gridMajor, theme.gridMinor]}
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
  <Gizmo
    bind:ref={viewportGizmo}
    controls={orbitControls}
    {...CAD_VIEWPORT_GIZMO}
  />
{/if}
{#key modelRevision}
  <Bounds margin={1.25} animate={false}>
    <ModelMesh {mesh} {theme} />
    <DimensionAnnotations {mesh} {parameters} {theme} />
  </Bounds>
{/key}

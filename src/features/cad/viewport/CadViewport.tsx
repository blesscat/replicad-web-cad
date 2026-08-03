import { Bounds, Html, Line, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { MeshSnapshot } from '../../../cad-contract/messages'
import type { BoxParameters } from '../../../cad-contract/units'
import {
  createDimensionAnnotations,
  type DimensionAnnotation,
  type LineSegment,
} from './dimensions'
import { CAD_VIEWPORT_CAMERA, CAD_VIEWPORT_GRID_ROTATION } from './coordinates'
import styles from './CadViewport.module.scss'

const ANNOTATION_COLOR = '#8d98a3'
const ANNOTATION_LINE_WIDTH = 1
const ANNOTATION_LABEL_CLASS =
  'pointer-events-none whitespace-nowrap px-1 text-[0.68rem] font-medium text-[#7f8a95]'

function ModelMesh({ mesh }: { mesh: MeshSnapshot }) {
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry()
    nextGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(mesh.positions), 3),
    )
    nextGeometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(mesh.normals), 3),
    )
    nextGeometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(mesh.indices), 1),
    )
    nextGeometry.computeBoundingSphere()
    return nextGeometry
  }, [mesh])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#4e7cff',
        metalness: 0.18,
        roughness: 0.42,
      }),
    [],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  return <mesh dispose={null} geometry={geometry} material={material} />
}

type CadViewportProps = {
  mesh: MeshSnapshot | null
  parameters: BoxParameters | null
  stale: boolean
}

function AnnotationLine({
  points,
  opacity = 0.58,
}: {
  points: LineSegment
  opacity?: number
}) {
  return (
    <Line
      points={points}
      color={ANNOTATION_COLOR}
      depthTest={false}
      lineWidth={ANNOTATION_LINE_WIDTH}
      opacity={opacity}
      renderOrder={2}
      transparent={opacity < 1}
    />
  )
}

function dimensionAnnotationsFor(
  mesh: MeshSnapshot,
  parameters: BoxParameters | null,
): DimensionAnnotation[] {
  if (!parameters) return []
  return createDimensionAnnotations(mesh.bounds, parameters)
}

function DimensionAnnotationView({
  annotation,
}: {
  annotation: DimensionAnnotation
}) {
  return (
    <group>
      {annotation.extensionLines.map((points, index) => (
        <AnnotationLine
          key={`${annotation.key}-extension-${index}`}
          points={points}
          opacity={0.34}
        />
      ))}
      <AnnotationLine points={annotation.dimensionLine} />
      {annotation.endTicks.map((points, index) => (
        <AnnotationLine
          key={`${annotation.key}-tick-${index}`}
          points={points}
          opacity={0.46}
        />
      ))}
      <Html
        center
        pointerEvents="none"
        position={annotation.labelPosition}
        zIndexRange={[2, 1]}
      >
        <span
          aria-label={annotation.ariaLabel}
          className={ANNOTATION_LABEL_CLASS}
        >
          {annotation.valueLabel}
        </span>
      </Html>
    </group>
  )
}

function DimensionAnnotations({
  mesh,
  parameters,
}: {
  mesh: MeshSnapshot
  parameters: BoxParameters | null
}) {
  const annotations = useMemo(
    () => dimensionAnnotationsFor(mesh, parameters),
    [mesh, parameters],
  )

  if (annotations.length === 0) return null

  return (
    <group>
      {annotations.map((annotation) => (
        <DimensionAnnotationView key={annotation.key} annotation={annotation} />
      ))}
    </group>
  )
}

function ViewportContent({
  mesh,
  parameters,
}: {
  mesh: MeshSnapshot | null
  parameters: BoxParameters | null
}) {
  if (!mesh) {
    return (
      <div className="flex h-[520px] items-center justify-center text-muted">
        尚未有可預覽的模型。
      </div>
    )
  }

  return (
    <Canvas
      aria-label="3D CAD 預覽"
      fallback={
        <div
          className="flex h-[520px] items-center justify-center text-muted"
          role="alert"
        >
          無法建立 3D 預覽，請確認瀏覽器支援 WebGL。
        </div>
      }
      camera={CAD_VIEWPORT_CAMERA}
    >
      <color attach="background" args={['#eef2f8']} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[100, 120, 80]} intensity={2.2} />
      <gridHelper
        args={[1000, 20, '#b9c4d7', '#d8deea']}
        rotation={CAD_VIEWPORT_GRID_ROTATION}
      />
      <Bounds fit clip observe margin={1.25}>
        <ModelMesh mesh={mesh} />
        <DimensionAnnotations mesh={mesh} parameters={parameters} />
      </Bounds>
      <OrbitControls makeDefault />
    </Canvas>
  )
}

export function CadViewport({ mesh, parameters, stale }: CadViewportProps) {
  const viewportBorderClassName = stale ? 'border-stale' : 'border-border-card'

  return (
    <div
      className={`relative min-h-[520px] overflow-hidden rounded-2xl border ${viewportBorderClassName} bg-viewport ${styles.viewport}`}
      data-testid="cad-viewport"
      role="img"
      aria-label="3D CAD 預覽"
    >
      <ViewportContent mesh={mesh} parameters={parameters} />
      {stale && (
        <span className="absolute bottom-4 left-4 rounded-full border border-stale bg-stale-background px-[0.7rem] py-[0.35rem] text-[0.85rem] text-stale-text">
          預覽與目前輸入不同步
        </span>
      )}
    </div>
  )
}

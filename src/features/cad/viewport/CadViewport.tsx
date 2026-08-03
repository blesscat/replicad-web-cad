import { Bounds, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { MeshSnapshot } from "../../../cad-contract/messages";
import styles from "./CadViewport.module.scss";

function ModelMesh({ mesh }: { mesh: MeshSnapshot }) {
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(mesh.positions), 3));
    nextGeometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(mesh.normals), 3));
    nextGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.indices), 1));
    nextGeometry.computeBoundingSphere();
    return nextGeometry;
  }, [mesh]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4e7cff", metalness: 0.18, roughness: 0.42 }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <mesh dispose={null} geometry={geometry} material={material} />;
}

type CadViewportProps = {
  mesh: MeshSnapshot | null;
  stale: boolean;
};

function ViewportContent({ mesh }: { mesh: MeshSnapshot | null }) {
  if (!mesh) {
    return <div className="flex h-[520px] items-center justify-center text-muted">尚未有可預覽的模型。</div>;
  }

  return (
    <Canvas
      aria-label="3D CAD 預覽"
      fallback={
        <div className="flex h-[520px] items-center justify-center text-muted" role="alert">
          無法建立 3D 預覽，請確認瀏覽器支援 WebGL。
        </div>
      }
      camera={{ position: [100, 100, 100], fov: 45 }}
    >
      <color attach="background" args={["#eef2f8"]} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[100, 120, 80]} intensity={2.2} />
      <gridHelper args={[1000, 20, "#b9c4d7", "#d8deea"]} />
      <Bounds fit clip observe margin={1.25}>
        <ModelMesh mesh={mesh} />
      </Bounds>
      <OrbitControls makeDefault />
    </Canvas>
  );
}

export function CadViewport({ mesh, stale }: CadViewportProps) {
  const viewportBorderClassName = stale ? "border-stale" : "border-border-card";

  return (
    <div
      className={`relative min-h-[520px] overflow-hidden rounded-2xl border ${viewportBorderClassName} bg-viewport ${styles.viewport}`}
      data-testid="cad-viewport"
      role="img"
      aria-label="3D CAD 預覽"
    >
      <ViewportContent mesh={mesh} />
      {stale && (
        <span className="absolute bottom-4 left-4 rounded-full border border-stale bg-stale-background px-[0.7rem] py-[0.35rem] text-[0.85rem] text-stale-text">
          預覽與目前輸入不同步
        </span>
      )}
    </div>
  );
}

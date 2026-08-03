import { describe, expect, it } from "vitest"
import * as THREE from "three"
import {
  CAD_VIEWPORT_CAMERA,
  CAD_VIEWPORT_GRID_ROTATION,
} from "../../src/features/cad/viewport/coordinates"

describe("CAD viewport coordinate system", () => {
  it("uses Z as screen-up and keeps the ground grid on the XY plane", () => {
    const camera = new THREE.PerspectiveCamera(
      CAD_VIEWPORT_CAMERA.fov,
      1,
      0.1,
      1000,
    )
    camera.position.set(...CAD_VIEWPORT_CAMERA.position)
    camera.up.set(...CAD_VIEWPORT_CAMERA.up)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()

    const originOnScreen = new THREE.Vector3(0, 0, 0).project(camera)
    const positiveZOnScreen = new THREE.Vector3(0, 0, 1).project(camera)
    expect(positiveZOnScreen.y).toBeGreaterThan(originOnScreen.y)

    const negativeYOnScreen = new THREE.Vector3(0, -1, 0).project(camera)
    const positiveXOnScreen = new THREE.Vector3(1, 0, 0).project(camera)
    expect(negativeYOnScreen.x).toBeLessThan(originOnScreen.x)
    expect(positiveXOnScreen.x).toBeGreaterThan(originOnScreen.x)

    const gridNormal = new THREE.Vector3(0, 1, 0)
      .applyEuler(new THREE.Euler(...CAD_VIEWPORT_GRID_ROTATION))
      .normalize()
    expect(gridNormal.x).toBeCloseTo(0)
    expect(gridNormal.y).toBeCloseTo(0)
    expect(gridNormal.z).toBeCloseTo(1)
  })
})
